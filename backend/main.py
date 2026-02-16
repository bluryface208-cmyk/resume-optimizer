from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import Optional
import PyPDF2
import io
import os
import json
import re
import tempfile
import subprocess
import shutil
from pathlib import Path
from dotenv import load_dotenv
from docx import Document
from groq import Groq

# Optional imports (if you added them)
try:
    import requests
    from bs4 import BeautifulSoup
    SCRAPING_AVAILABLE = True
except ImportError:
    SCRAPING_AVAILABLE = False

# Load environment variables
load_dotenv()

# Initialize Anthropic client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://resume-optimizer.vercel.app",
        "https://resume-optimizer-azure.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello from Resume Optimizer Backend!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# ==================== ROBUST DOCUMENT EXTRACTION ====================

def extract_text_from_pdf_robust(file_content: bytes) -> str:
    """
    Robust PDF extraction using multiple methods
    Tries pdfplumber first, falls back to PyPDF2
    """
    # Method 1: Try pdfplumber (better for complex PDFs)
    try:
        import pdfplumber
        
        pdf_file = io.BytesIO(file_content)
        text_parts = []
        
        with pdfplumber.open(pdf_file) as pdf:
            for page_num, page in enumerate(pdf.pages):
                # Extract text
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
                
                # Extract tables
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        if row:
                            row_text = [str(cell).strip() for cell in row if cell]
                            if row_text:
                                text_parts.append(' | '.join(row_text))
        
        result = '\n'.join(text_parts).strip()
        if len(result) > 100:  # Got good content
            print(f"✅ PDF extracted using pdfplumber: {len(result)} characters")
            return result
        else:
            print("⚠️ pdfplumber extracted little content, trying PyPDF2...")
            raise Exception("Insufficient content")
            
    except Exception as e:
        print(f"pdfplumber failed: {e}, falling back to PyPDF2...")
    
    # Method 2: Fallback to PyPDF2
    try:
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        text = []
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                text.append(page_text)
        
        result = '\n'.join(text).strip()
        print(f"✅ PDF extracted using PyPDF2: {len(result)} characters")
        return result
        
    except Exception as e:
        return f"Error extracting PDF: {str(e)}"

def extract_text_from_docx_robust(file_content: bytes) -> str:
    """
    Robust DOCX extraction including:
    - Headers and footers
    - Paragraphs
    - Tables
    - Text boxes (where possible)
    """
    try:
        docx_file = io.BytesIO(file_content)
        doc = Document(docx_file)
        
        full_text = []
        
        # 1. Extract from all sections (headers)
        for section in doc.sections:
            # Header
            header = section.header
            for para in header.paragraphs:
                if para.text.strip():
                    full_text.append(para.text.strip())
        
        # 2. Extract main body content in order
        for element in doc.element.body:
            # Paragraphs
            if element.tag.endswith('p'):
                for para in doc.paragraphs:
                    if para._element == element:
                        if para.text.strip():
                            full_text.append(para.text.strip())
                        break
            
            # Tables
            elif element.tag.endswith('tbl'):
                for table in doc.tables:
                    if table._element == element:
                        for row in table.rows:
                            row_text = []
                            for cell in row.cells:
                                cell_text = cell.text.strip()
                                if cell_text:
                                    row_text.append(cell_text)
                            if row_text:
                                full_text.append(' | '.join(row_text))
                        full_text.append('')  # Blank line after table
                        break
        
        # 3. Extract from footers
        for section in doc.sections:
            footer = section.footer
            for para in footer.paragraphs:
                if para.text.strip():
                    full_text.append(para.text.strip())
        
        result = '\n'.join(full_text).strip()
        print(f"✅ DOCX extracted: {len(result)} characters")
        return result
        
    except Exception as e:
        # Fallback to simple extraction
        print(f"⚠️ Advanced DOCX extraction failed: {e}, using simple method...")
        try:
            docx_file = io.BytesIO(file_content)
            doc = Document(docx_file)
            
            text = []
            
            # Get paragraphs
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text.append(paragraph.text.strip())
            
            # Get tables
            for table in doc.tables:
                for row in table.rows:
                    row_data = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                    if row_data:
                        text.append(' | '.join(row_data))
            
            result = '\n'.join(text).strip()
            print(f"✅ DOCX extracted (simple): {len(result)} characters")
            return result
        except Exception as e2:
            return f"Error extracting DOCX: {str(e2)}"

def extract_text_from_txt(file_content: bytes) -> str:
    """Extract text from plain text file with encoding detection"""
    encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
    
    for encoding in encodings:
        try:
            text = file_content.decode(encoding)
            print(f"✅ TXT decoded with {encoding}: {len(text)} characters")
            return text
        except UnicodeDecodeError:
            continue
    
    # If all fail, use utf-8 with error handling
    return file_content.decode('utf-8', errors='ignore')

def validate_extracted_text(text: str, filename: str) -> dict:
    """
    Validate that extraction was successful and warn about issues
    """
    validation = {
        "success": True,
        "warnings": [],
        "text": text,
        "char_count": len(text)
    }
    
    # Check 1: Minimum length
    if len(text) < 100:
        validation["success"] = False
        validation["warnings"].append("Very little text extracted. File might be corrupted, password-protected, or an image.")
    
    # Check 2: Has email?
    if '@' not in text:
        validation["warnings"].append("No email address found. Might be in an image or special formatting.")
    
    # Check 3: Has phone?
    import re
    phone_pattern = r'\+?\d[\d\s\-\(\)]{7,}'
    if not re.search(phone_pattern, text):
        validation["warnings"].append("No phone number detected.")
    
    # Check 4: Has meaningful content?
    words = text.split()
    if len(words) < 50:
        validation["success"] = False
        validation["warnings"].append("Too few words extracted. Extraction may have failed.")
    
    # Check 5: Looks like gibberish?
    avg_word_length = sum(len(word) for word in words[:100]) / min(len(words), 100) if words else 0
    if avg_word_length > 15:  # Average word too long = probably encoding issue
        validation["warnings"].append("Text may have encoding issues.")
    
    return validation

def extract_text_from_file(filename: str, file_content: bytes) -> str:
    """
    ROBUST file extraction with validation and fallbacks
    """
    filename_lower = filename.lower()
    
    print(f"📄 Extracting text from: {filename}")
    
    try:
        # Route to appropriate extractor
        if filename_lower.endswith('.pdf'):
            text = extract_text_from_pdf_robust(file_content)
        
        elif filename_lower.endswith('.docx'):
            text = extract_text_from_docx_robust(file_content)
        
        elif filename_lower.endswith('.txt'):
            text = extract_text_from_txt(file_content)
        
        else:
            return f"❌ Unsupported file format: {filename}. Please use PDF, DOCX, or TXT."
        
        # Validate extraction
        validation = validate_extracted_text(text, filename)
        
        # Log warnings
        if validation["warnings"]:
            print(f"⚠️ Extraction warnings for {filename}:")
            for warning in validation["warnings"]:
                print(f"   - {warning}")
        
        # If extraction completely failed
        if not validation["success"]:
            error_msg = f"Failed to extract sufficient content from {filename}. "
            error_msg += "Possible issues: " + "; ".join(validation["warnings"])
            return error_msg
        
        return text
        
    except Exception as e:
        print(f"❌ Error extracting {filename}: {str(e)}")
        return f"Error extracting file: {str(e)}"

# ==================== AI ANALYSIS FUNCTIONS ====================

# def analyze_with_claude(prompt: str, max_tokens: int = 2000) -> str:
#     """Generic function to call Claude API"""
#     try:
#         message = anthropic_client.messages.create(
#             model="claude-sonnet-4-20250514",
#             max_tokens=max_tokens,
#             messages=[
#                 {"role": "user", "content": prompt}
#             ]
#         )
#         return message.content[0].text
#     except Exception as e:
#         return f"Error calling Claude API: {str(e)}"

def analyze_with_groq(prompt: str, max_tokens: int = 2000) -> str:
    """Generic function to call Groq API"""
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile",  # Fast and smart!
            temperature=0.7,
            max_tokens=max_tokens,
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        return f"Error calling Groq API: {str(e)}"

def analyze_job_description(jd_content: str) -> dict:
    """Extract key information from job description using """
    
    prompt = f"""Analyze this job description and extract key information in a clear, structured format.

Job Description:
{jd_content}

Please provide:

1. **Required Technical Skills** (list the top 10 most important)
2. **Years of Experience Required**
3. **Must-Have Qualifications**
4. **Nice-to-Have Qualifications**
5. **Main Responsibilities** (top 5)
6. **Key ATS Keywords** (top 15 keywords that an ATS system would look for)

Format your response clearly with headers and bullet points."""

    analysis = analyze_with_groq(prompt, max_tokens=2000)
    
    return {
        "analysis": analysis,
        "success": True
    }

def calculate_ats_score(jd_content: str, resume_content: str) -> dict:
    """Calculate ATS score and provide detailed breakdown"""
    
    prompt = f"""You are an ATS (Applicant Tracking System) expert. Analyze this resume against the job description and calculate a compatibility score.

JOB DESCRIPTION:
{jd_content}

RESUME:
{resume_content}

Provide:

1. **Overall ATS Score: X/100**
   
2. **Score Breakdown:**
   - Keyword Match (40 points max): X/40
   - Experience Relevance (30 points max): X/30
   - Skills Alignment (20 points max): X/20
   - Education/Certifications (10 points max): X/10

3. **Top 5 Missing Critical Keywords** (that are in JD but not in resume)

4. **Top 3 Specific Improvements Needed**

5. **Strengths** (what the resume does well)

Be honest and specific. Format clearly with headers."""

    score_analysis = analyze_with_groq(prompt, max_tokens=2500)
    
    return {
        "score_analysis": score_analysis,
        "success": True
    }

def generate_resume_suggestions(jd_content: str, resume_content: str) -> dict:
    """Generate specific resume improvement suggestions"""
    
    prompt = f"""You are an expert resume writer. Based on this job description, suggest specific improvements to the resume.

JOB DESCRIPTION:
{jd_content}

CURRENT RESUME:
{resume_content}

Provide:

1. **Critical Gaps** (what's missing that the JD requires)

2. **Keyword Optimization** (specific keywords to add and where)

3. **Rewritten Bullet Points** (take 3-5 existing bullet points and rewrite them to better match the JD, while staying 100% truthful)

4. **Skills Section Updates** (what to add/remove/emphasize)

5. **Summary/Objective Rewrite** (if applicable, write a new one tailored to this role)

Be specific and actionable. Only suggest changes based on existing experience - never make things up."""

    suggestions = analyze_with_groq(prompt, max_tokens=3000)
    
    return {
        "suggestions": suggestions,
        "success": True
    }

def generate_interview_prep(jd_content: str, resume_content: str) -> dict:
    """Generate comprehensive interview preparation materials"""
    
    prompt = f"""Based on this job description and candidate's resume, create comprehensive interview preparation materials.

JOB DESCRIPTION:
{jd_content}

CANDIDATE RESUME:
{resume_content}

Generate:

1. **Technical Questions (8 questions)**
   - Provide the question
   - Brief answer guidance
   - Difficulty level (Easy/Medium/Hard)

2. **Behavioral Questions (5 questions)**
   - Provide the question  
   - STAR framework hint

3. **Potential Weakness Questions (3 questions)**
   - Questions about gaps or concerns in the resume
   - How to address them

4. **Questions to Ask the Interviewer (5 smart questions)**

5. **Topics to Study** (Top 3 areas to review before interview)

Be specific to this role and candidate."""

    interview_prep = analyze_with_groq(prompt, max_tokens=3500)
    
    return {
        "interview_prep": interview_prep,
        "success": True
    }

def generate_youtube_resources(jd_content: str) -> list:
    """Generate YouTube search links based on job requirements"""
    
    # Extract key topics using groq
    prompt = f"""Based on this job description, identify the top 5 technical topics/skills that someone should study.

Job Description:
{jd_content}

List ONLY the topic names, one per line, no explanations. For example:
React Hooks
System Design
AWS Lambda
Python Django
REST API Design"""

    topics_text = analyze_with_groq(prompt, max_tokens=500)
    
    # Parse topics
    topics = [topic.strip() for topic in topics_text.split('\n') if topic.strip()][:5]
    
    # Generate YouTube search URLs
    youtube_links = []
    for topic in topics:
        search_query = f"{topic} tutorial"
        youtube_url = f"https://www.youtube.com/results?search_query={search_query.replace(' ', '+')}"
        youtube_links.append({
            "topic": topic,
            "url": youtube_url,
            "search_query": search_query
        })
    
    return youtube_links


# ==================== RESUME PARSING FUNCTIONS ====================

# def parse_resume_to_structured_data(resume_text: str) -> dict:
#     """
#     Use AI to extract structured data from resume text
#     """
    
#     prompt = f"""Extract structured information from this resume and return it as JSON.

# Resume:
# {resume_text}

# Extract and return ONLY a JSON object with this exact structure:
# {{
#   "name": "Full Name",
#   "phone": "Phone number",
#   "email": "Email address",
#   "location": "City, State/Country",
#   "linkedin": "LinkedIn URL (or empty string)",
#   "github": "GitHub URL (or empty string)",
#   "education": [
#     {{
#       "degree": "Degree name",
#       "institution": "University/College",
#       "year": "Year range (e.g., 2016 - 2020)"
#     }}
#   ],
#   "technical_skills": {{
#     "languages": ["skill1", "skill2"],
#     "databases": ["db1", "db2"],
#     "frameworks": ["framework1"],
#     "cloud": ["aws", "azure"],
#     "tools": ["tool1", "tool2"]
#   }},
#   "work_experience": [
#     {{
#       "title": "Job Title",
#       "company": "Company Name",
#       "location": "City, State",
#       "duration": "Month Year - Month Year",
#       "achievements": ["bullet point 1", "bullet point 2"]
#     }}
#   ],
#   "projects": [
#     {{
#       "name": "Project Name",
#       "description": "Description",
#       "technologies": "Tech stack"
#     }}
#   ],
#   "certifications": ["Cert 1", "Cert 2"],
#   "achievements": ["Achievement 1", "Achievement 2"]
# }}

# Return ONLY valid JSON, nothing else."""

#     try:
#         response = analyze_with_groq(prompt, max_tokens=4000)
        
#         # Clean response
#         response = response.strip()
        
#         # Remove markdown code blocks if present
#         if response.startswith('```json'):
#             response = response.replace('```json', '').replace('```', '').strip()
#         elif response.startswith('```'):
#             response = response.replace('```', '').strip()
        
#         # Parse JSON
#         # import json
#         parsed_data = json.loads(response)
        
#         return parsed_data
        
#     except Exception as e:
#         print(f"Error parsing resume: {str(e)}")
#         return None

def parse_resume_to_structured_data(resume_text: str) -> dict:
    """
    Use AI to extract structured data from resume text
    """
    
    prompt = f"""Extract structured information from this resume and return it as JSON.

Resume:
{resume_text}

IMPORTANT INSTRUCTIONS:
- Look VERY CAREFULLY for email addresses (look for @), phone numbers (look for digits), education details
- If you find ANYTHING that looks like contact info or education, include it
- Don't leave fields empty unless they're TRULY not in the resume
- Check the entire document thoroughly

Extract and return ONLY a JSON object with this exact structure:
{{
  "name": "Full Name",
  "phone": "Phone number (search entire document for phone numbers)",
  "email": "Email address (search for @ symbol)",
  "location": "City, State/Country",
  "linkedin": "LinkedIn URL (or empty string if not found)",
  "github": "GitHub URL (or empty string if not found)",
  "education": [
    {{
      "degree": "Degree name (BE, BTech, Masters, etc.)",
      "institution": "University/College name",
      "year": "Year range (e.g., 2016 - 2020)"
    }}
  ],
  "technical_skills": {{
    "languages": ["skill1", "skill2"],
    "databases": ["db1", "db2"],
    "frameworks": ["framework1"],
    "cloud": ["aws", "azure"],
    "tools": ["tool1", "tool2"]
  }},
  "work_experience": [
    {{
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, State",
      "duration": "Month Year - Month Year",
      "achievements": ["bullet point 1", "bullet point 2"]
    }}
  ],
  "projects": [
    {{
      "name": "Project Name",
      "description": "Description",
      "technologies": "Tech stack"
    }}
  ],
  "certifications": ["Cert 1", "Cert 2"],
  "achievements": ["Achievement 1", "Achievement 2"]
}}

CRITICAL: Look through the ENTIRE resume text above. Don't skip sections. Return ONLY valid JSON, nothing else."""

    try:
        response = analyze_with_groq(prompt, max_tokens=4000)
        
        # Clean response
        response = response.strip()
        
        # Remove markdown code blocks if present
        if response.startswith('```json'):
            response = response.replace('```json', '').replace('```', '').strip()
        elif response.startswith('```'):
            response = response.replace('```', '').strip()
        
        # Parse JSON
        parsed_data = json.loads(response)
        
        # DEBUG: Print what was extracted
        print("📊 EXTRACTED RESUME DATA:")
        print(f"  Name: {parsed_data.get('name', 'MISSING')}")
        print(f"  Email: {parsed_data.get('email', 'MISSING')}")
        print(f"  Phone: {parsed_data.get('phone', 'MISSING')}")
        print(f"  Education: {len(parsed_data.get('education', []))} entries")
        
        return parsed_data
        
    except Exception as e:
        print(f"❌ Error parsing resume: {str(e)}")
        return None

def enhance_resume_data_with_ai(resume_data: dict, ai_suggestions: str, jd_analysis: str) -> dict:
    """
    Enhance the resume data with AI suggestions
    """
    
    prompt = f"""You are enhancing a resume based on AI suggestions and job requirements.

CURRENT RESUME DATA:
{json.dumps(resume_data, indent=2)}

AI SUGGESTIONS:
{ai_suggestions}

JOB REQUIREMENTS:
{jd_analysis}

Task: Enhance the work experience bullet points and add missing skills.
Return the SAME JSON structure but with:
1. Improved bullet points (keep them truthful, just better worded)
2. Added relevant skills from suggestions
3. Emphasized keywords

Return ONLY the enhanced JSON, no explanations."""

    try:
        response = analyze_with_groq(prompt, max_tokens=4000)
        response = response.strip()
        
        if response.startswith('```json'):
            response = response.replace('```json', '').replace('```', '').strip()
        elif response.startswith('```'):
            response = response.replace('```', '').strip()
        
        # import json
        enhanced_data = json.loads(response)
        return enhanced_data
        
    except Exception as e:
        print(f"Error enhancing data: {str(e)}")
        return resume_data  # Return original if enhancement fails 


def generate_latex_from_template(resume_data: dict) -> str:
    """
    Generate LaTeX resume using the Akshay template format
    """
    
    # Helper to clean LaTeX special characters
    def escape_latex(text):
        if not text:
            return ""
        replacements = {
            '&': r'\&',
            '%': r'\%',
            '$': r'\$',
            '#': r'\#',
            '_': r'\_',
            '{': r'\{',
            '}': r'\}',
            '~': r'\textasciitilde{}',
            '^': r'\^{}',
        }
        for old, new in replacements.items():
            text = text.replace(old, new)
        return text
    
    # Start with template header
    latex = r"""\documentclass{resume}

\usepackage[paperheight=12in,paperwidth=9in,left=0.4 in,top=0.4in,right=0.4 in,bottom=0.4in]{geometry}
\newcommand{\tab}[1]{\hspace{.2667\textwidth}\rlap{#1}} 
\newcommand{\itab}[1]{\hspace{0em}\rlap{#1}}
"""
    
    # Add name
    latex += f"\\name{{{escape_latex(resume_data.get('name', 'Your Name'))}}}\n"
    
    # Add contact info
    phone = resume_data.get('phone', '')
    location = resume_data.get('location', '')
    if phone or location:
        latex += f"\\address{{{escape_latex(phone)} \\\\ {escape_latex(location)}}}\n"
    
    # Add email, LinkedIn, GitHub
    email = resume_data.get('email', '')
    linkedin = resume_data.get('linkedin', '')
    github = resume_data.get('github', '')
    
    contact_line = ""
    if email:
        contact_line += f"\\href{{{email}}}{{{escape_latex(email)}}}"
    if linkedin:
        if contact_line:
            contact_line += " \\\\ "
        contact_line += f"\\href{{{linkedin}}}{{LinkedIn}}"
    if github:
        if contact_line:
            contact_line += " \\\\ "
        contact_line += f"\\href{{{github}}}{{Github}}"
    
    if contact_line:
        latex += f"\\address{{{contact_line}}}\n"
    
    latex += "\n\\begin{document}\n\n"
    
    # EDUCATION SECTION
    latex += "%----------------------------------------------------------------------------------------\n"
    latex += "%\tEDUCATION SECTION\n"
    latex += "%----------------------------------------------------------------------------------------\n\n"
    latex += "\\begin{rSection}{Education}\n\n"
    
    for edu in resume_data.get('education', []):
        degree = escape_latex(edu.get('degree', ''))
        institution = escape_latex(edu.get('institution', ''))
        year = escape_latex(edu.get('year', ''))
        latex += f"{{\\bf {degree}}}, {institution} \\hfill {{{year}}}\n\n"
    
    latex += "\\end{rSection}\n\n"
    
    # TECHNICAL SKILLS SECTION
    latex += "%----------------------------------------------------------------------------------------\n"
    latex += "% TECHNICAL STRENGTHS\n"
    latex += "%----------------------------------------------------------------------------------------\n"
    latex += "\\begin{rSection}{TECHNICAL SKILLS}\n\n"
    latex += "\\begin{tabular}{ @{} >{\\bfseries}l @{\\hspace{6ex}} l }\n"
    
    skills = resume_data.get('technical_skills', {})
    
    if skills.get('languages'):
        latex += f"LANGUAGES: & {', '.join([escape_latex(s) for s in skills['languages']])}\\\\\n"
    if skills.get('databases'):
        latex += f"DATABASES: & {', '.join([escape_latex(s) for s in skills['databases']])}\\\\\n"
    if skills.get('frameworks'):
        latex += f"FRAMEWORKS: & {', '.join([escape_latex(s) for s in skills['frameworks']])}\\\\\n"
    if skills.get('cloud'):
        latex += f"CLOUD: & {', '.join([escape_latex(s) for s in skills['cloud']])}\\\\\n"
    if skills.get('tools'):
        latex += f"TOOLS: & {', '.join([escape_latex(s) for s in skills['tools']])}\\\\\n"
    
    latex += "\\end{tabular}\\\\\n"
    latex += "\\end{rSection}\n\n"
    
    # WORK EXPERIENCE SECTION
    latex += "\\begin{rSection}{WORK EXPERIENCE}\n\n"
    
    for exp in resume_data.get('work_experience', []):
        title = escape_latex(exp.get('title', ''))
        company = escape_latex(exp.get('company', ''))
        location = escape_latex(exp.get('location', ''))
        duration = escape_latex(exp.get('duration', ''))
        
        latex += f"\\textbf{{{title}}} \\hfill {duration}\\\\\n"
        latex += f"{company} \\hfill \\textit{{{location}}}\n"
        latex += " \\begin{itemize}\n"
        latex += "    \\itemsep -3pt {} \n"
        
        for achievement in exp.get('achievements', []):
            latex += f"    \\item {escape_latex(achievement)}\n"
        
        latex += " \\end{itemize}\n\n"
    
    latex += "\\end{rSection}\n\n"
    
    # PROJECTS SECTION
    if resume_data.get('projects'):
        latex += "\\begin{rSection}{PERSONAL PROJECTS}\n"
        latex += "\\begin{itemize}\n"
        latex += "\\itemsep -3pt {}\n"
        
        for project in resume_data['projects']:
            name = escape_latex(project.get('name', ''))
            desc = escape_latex(project.get('description', ''))
            latex += f"\\item \\textbf{{{name}}} - {desc}\n"
        
        latex += "\\end{itemize}\n"
        latex += "\\end{rSection}\n\n"
    
    # ACHIEVEMENTS SECTION
    if resume_data.get('achievements'):
        latex += "\\begin{rSection}{ACHIEVEMENTS}\n"
        latex += "\\begin{itemize}\n"
        
        for achievement in resume_data['achievements']:
            latex += f"    \\item {escape_latex(achievement)}\n"
        
        latex += "\\end{itemize}\n"
        latex += "\\end{rSection}\n\n"
    
    # CERTIFICATIONS SECTION
    if resume_data.get('certifications'):
        latex += "\\begin{rSection}{CERTIFICATION}\n"
        latex += "\\begin{itemize}\n"
        
        for cert in resume_data['certifications']:
            latex += f"    \\item {escape_latex(cert)}\n"
        
        latex += "\\end{itemize}\n"
        latex += "\\end{rSection}\n\n"
    
    latex += "\\end{document}\n"
    
    return latex           

# Upload endpoint
@app.post("/upload")
async def upload_files(
    job_description: Optional[UploadFile] = File(None),
    resume: Optional[UploadFile] = File(None),
    jd_text: Optional[str] = Form(None),
    jd_url: Optional[str] = Form(None)
):
    """
    Accept job description (as file, text, or URL) and resume (as file)
    """
    result = {
        "jd_content": "",
        "resume_content": "",
        "jd_source": "",
        "resume_source": ""
    }
    
    # Process Job Description
    if job_description:
        content = await job_description.read()
        result["jd_content"] = extract_text_from_file(job_description.filename, content)
        result["jd_source"] = f"{job_description.filename}"
    
    elif jd_text:
        result["jd_content"] = jd_text
        result["jd_source"] = "Pasted text"
    
    elif jd_url:
        result["jd_content"] = f"URL fetching coming soon: {jd_url}"
        result["jd_source"] = f"URL: {jd_url}"
    
    # Process Resume
    if resume:
        content = await resume.read()
        result["resume_content"] = extract_text_from_file(resume.filename, content)
        result["resume_source"] = f"{resume.filename}"
    
    # Return extracted content
    return {
        "success": True,
        "data": result,
        "message": "Files processed successfully"
    }

# ==================== RESUME GENERATION FUNCTIONS ====================

def parse_latex_resume(tex_content: str) -> dict:
    """Parse LaTeX resume to extract sections"""
    
    parsed = {
        "name": "",
        "contact": "",
        "education": "",
        "technical_skills": "",
        "work_experience": "",
        "projects": "",
        "achievements": "",
        "certifications": "",
        "full_content": tex_content
    }
    
    # Extract name
    name_match = re.search(r'\\name\{([^}]+)\}', tex_content)
    if name_match:
        parsed["name"] = name_match.group(1)
    
    # Extract sections
    sections = {
        "education": r'\\begin\{rSection\}\{Education\}(.*?)\\end\{rSection\}',
        "technical_skills": r'\\begin\{rSection\}\{TECHNICAL SKILLS\}(.*?)\\end\{rSection\}',
        "work_experience": r'\\begin\{rSection\}\{WORK EXPERIENCE\}(.*?)\\end\{rSection\}',
        "projects": r'\\begin\{rSection\}\{PERSONAL PROJECTS\}(.*?)\\end\{rSection\}',
        "achievements": r'\\begin\{rSection\}\{ACHIEVEMENTS\}(.*?)\\end\{rSection\}',
        "certifications": r'\\begin\{rSection\}\{CERTIFICATION\}(.*?)\\end\{rSection\}',
    }
    
    for key, pattern in sections.items():
        match = re.search(pattern, tex_content, re.DOTALL | re.IGNORECASE)
        if match:
            parsed[key] = match.group(1).strip()
    
    return parsed

def apply_ai_improvements_to_latex(tex_content: str, ai_suggestions: str) -> str:
    """
    Apply AI suggestions to LaTeX resume intelligently
    This is a smart version that doesn't break LaTeX formatting
    """
    
    # For now, we'll add a comment section with AI suggestions at the top
    # In a production version, you'd parse the suggestions and apply them programmatically
    
    improvements_comment = f"""
% ============================================================================
% AI-OPTIMIZED RESUME
% ============================================================================
% AI Suggestions Applied:
% {ai_suggestions.replace(chr(10), chr(10) + '% ')}
% ============================================================================

"""
    
    # Add the comment before \begin{document}
    improved_tex = tex_content.replace(
        r'\begin{document}',
        improvements_comment + r'\begin{document}'
    )
    
    return improved_tex

def enhance_work_experience_bullets(tex_content: str, suggestions: str) -> str:
    """
    Enhance work experience bullets based on AI suggestions
    This is a smarter version that actually modifies content
    """
    
    # Extract bullet points from work experience
    work_exp_match = re.search(
        r'\\begin\{rSection\}\{WORK EXPERIENCE\}(.*?)\\end\{rSection\}',
        tex_content,
        re.DOTALL | re.IGNORECASE
    )
    
    if not work_exp_match:
        return tex_content
    
    work_section = work_exp_match.group(1)
    
    # Find all \item entries
    items = re.findall(r'\\item\s+([^\n]+(?:\n(?!\s*\\item)[^\n]+)*)', work_section)
    
    # Add emphasis to key achievements (simple enhancement)
    enhanced_section = work_section
    
    # Bold important metrics
    enhanced_section = re.sub(
        r'(\d+\s*%)',
        r'\\textbf{\1}',
        enhanced_section
    )
    
    # Replace the work section
    result = tex_content.replace(work_section, enhanced_section)
    
    return result

def generate_optimized_resume(
    original_tex: str,
    ai_suggestions: str,
    jd_analysis: str,
    ats_score: str
) -> str:
    """
    Main function to generate optimized resume
    Combines all improvements
    """
    
    # Parse original resume
    parsed = parse_latex_resume(original_tex)
    
    # Apply AI improvements
    improved_tex = apply_ai_improvements_to_latex(original_tex, ai_suggestions)
    
    # Enhance work experience bullets
    improved_tex = enhance_work_experience_bullets(improved_tex, ai_suggestions)
    
    # Add metadata comment
    metadata = f"""% Resume optimized on {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')}
% ATS Score Considerations: Based on job requirements
% AI-powered optimization applied

"""
    
    improved_tex = improved_tex.replace(
        r'\documentclass{resume}',
        r'\documentclass{resume}' + '\n' + metadata
    )
    
    return improved_tex


# ==================== URL FETCHING WITH SELENIUM ====================

def fetch_job_with_selenium(url: str) -> str:
    """
    Fetch job description using Selenium (handles JavaScript-rendered content)
    Works for sites like Mastercard, Workday, Greenhouse, etc.
    """
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.service import Service
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        from webdriver_manager.chrome import ChromeDriverManager
        import time
        
        print("🤖 Launching headless browser with Selenium...")
        
        # Setup Chrome options
        chrome_options = Options()
        chrome_options.add_argument('--headless')  # Run in background
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        # Initialize driver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.set_page_load_timeout(30)
        
        try:
            # Load the page
            print(f"🌐 Loading: {url}")
            driver.get(url)
            
            # Wait for page to load (try multiple strategies)
            try:
                # Strategy 1: Wait for main content
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.TAG_NAME, "main"))
                )
            except:
                try:
                    # Strategy 2: Wait for body
                    WebDriverWait(driver, 10).until(
                        EC.presence_of_element_located((By.TAG_NAME, "body"))
                    )
                except:
                    pass  # Continue anyway
            
            # Give extra time for JavaScript to render
            print("⏳ Waiting for JavaScript to render...")
            time.sleep(5)  # Adjust if needed
            
            # Scroll to load lazy content
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            
            # Get all text from body
            text = driver.find_element(By.TAG_NAME, "body").text
            
            print(f"✅ Selenium extracted {len(text)} characters")
            
            return text
            
        finally:
            driver.quit()
        
    except Exception as e:
        raise Exception(f"Selenium error: {str(e)}")

def fetch_job_description_from_url(url: str) -> str:
    """
    Fetch and extract job description from URL
    Tries Selenium first (for JS sites), falls back to simple scraping
    """
    
    # Try Method 1: Selenium (for JavaScript-heavy sites)
    try:
        print("🤖 Attempting Selenium extraction (handles JavaScript)...")
        text = fetch_job_with_selenium(url)
        
        if len(text) > 500:
            print(f"✅ Selenium successful: {len(text)} characters")
            return text
        else:
            print("⚠️ Selenium got little content, trying simple scraping...")
            
    except Exception as selenium_error:
        print(f"⚠️ Selenium failed: {selenium_error}")
        print("📄 Falling back to simple HTTP scraping...")
    
    # Try Method 2: Simple HTTP scraping (fallback)
    try:
        # Set headers to mimic a real browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        }
        
        # Fetch the page
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Parse HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(['script', 'style', 'nav', 'header', 'footer']):
            script.decompose()
        
        # Try to find job description in common containers
        jd_selectors = [
            {'class': 'job-description'},
            {'class': 'jobdescription'},
            {'class': 'job_description'},
            {'id': 'job-description'},
            {'id': 'jobDescription'},
            {'class': 'description'},
            {'class': 'job-details'},
            {'class': 'posting-description'},
            {'role': 'main'},
            {'class': 'content'},
        ]
        
        text = None
        for selector in jd_selectors:
            container = soup.find('div', selector) or soup.find('section', selector)
            if container:
                text = container.get_text(separator='\n', strip=True)
                if len(text) > 200:
                    break
        
        # If no specific container found, get all text
        if not text or len(text) < 200:
            for tag in soup.find_all(['nav', 'header', 'footer', 'aside']):
                tag.decompose()
            text = soup.get_text(separator='\n', strip=True)
        
        # Clean up the text
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        text = '\n'.join(lines)
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        if len(text) < 100:
            raise Exception("Could not extract sufficient content from URL")
        
        print(f"✅ Simple scraping successful: {len(text)} characters")
        return text
        
    except requests.exceptions.Timeout:
        raise Exception("Request timed out")
    except requests.exceptions.RequestException as e:
        raise Exception(f"Failed to fetch URL: {str(e)}")
    except Exception as e:
        raise Exception(f"Error extracting content: {str(e)}")

        
        def smart_extract_job_description(text: str, max_length: int = 10000) -> str:
    """
    Clean and extract just the relevant job description parts
    """
    
    # Common section markers
    start_markers = [
        'job description',
        'about the role',
        'responsibilities',
        'what you\'ll do',
        'position summary',
        'overview',
    ]
    
    end_markers = [
        'apply now',
        'submit application',
        'equal opportunity',
        'privacy policy',
        'cookie policy',
        'follow us',
        'share this job',
    ]
    
    text_lower = text.lower()
    
    # Try to find start of actual JD
    start_pos = 0
    for marker in start_markers:
        pos = text_lower.find(marker)
        if pos != -1 and pos < len(text) * 0.3:  # Should be in first 30%
            start_pos = pos
            break
    
    # Try to find end of actual JD
    end_pos = len(text)
    for marker in end_markers:
        pos = text_lower.find(marker, start_pos)
        if pos != -1 and pos > len(text) * 0.3:  # Should be after first 30%
            end_pos = pos
            break
    
    # Extract the relevant portion
    extracted = text[start_pos:end_pos]
    
    # Truncate if too long
    if len(extracted) > max_length:
        extracted = extracted[:max_length] + "\n\n[Content truncated...]"
    
    return extracted.strip()

# ==================== MAIN ANALYSIS ENDPOINT ====================

@app.post("/analyze")
async def analyze_resume(
    job_description: Optional[UploadFile] = File(None),
    resume: Optional[UploadFile] = File(None),
    jd_text: Optional[str] = Form(None),
    jd_url: Optional[str] = Form(None)
):
    """
    Complete AI-powered resume analysis:
    1. Extract text from files
    2. Analyze job description
    3. Calculate ATS score
    4. Generate resume suggestions
    5. Create interview prep materials
    6. Generate YouTube learning resources
    """
    
    try:
        # Extract Job Description
        jd_content = ""
        if job_description:
            content = await job_description.read()
            jd_content = extract_text_from_file(job_description.filename, content)
        elif jd_text:
            jd_content = jd_text
        elif jd_url:
            try:
                print(f"🌐 Fetching job description from URL: {jd_url}")
                raw_content = fetch_job_description_from_url(jd_url)
                jd_content = smart_extract_job_description(raw_content)
                print(f"✅ Extracted {len(jd_content)} characters from URL")
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Failed to fetch URL: {str(e)}"
                }
        
        # Extract Resume
        resume_content = ""
        if resume:
            content = await resume.read()
            resume_content = extract_text_from_file(resume.filename, content)
        
        # Validate inputs
        if not jd_content or not resume_content:
            return {
                "success": False,
                "error": "Both job description and resume are required"
            }
        
        print("📊 Extracting structured data from resume...")
        resume_data = parse_resume_to_structured_data(resume_content)

        print("🔍 Analyzing job description...")
        jd_analysis = analyze_job_description(jd_content)
        
        print("📊 Calculating ATS score...")
        ats_score = calculate_ats_score(jd_content, resume_content)
        
        print("✨ Generating resume suggestions...")
        resume_suggestions = generate_resume_suggestions(jd_content, resume_content)
        
        print("💡 Creating interview prep materials...")
        interview_prep = generate_interview_prep(jd_content, resume_content)
        
        print("🎥 Generating YouTube resources...")
        youtube_resources = generate_youtube_resources(jd_content)

        if resume_data:
            print("🚀 Enhancing resume with AI suggestions...")
            resume_data = enhance_resume_data_with_ai(
                resume_data,
                resume_suggestions.get("suggestions", ""),
                jd_analysis.get("analysis", "")
            )
        
        return {
            "success": True,
            "data": {
                "jd_analysis": jd_analysis,
                "ats_score": ats_score,
                "resume_suggestions": resume_suggestions,
                "interview_prep": interview_prep,
                "youtube_resources": youtube_resources,
                "resume_data": resume_data
            },
            "message": "Analysis complete!"
        }
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

# ==================== RESUME DOWNLOAD ENDPOINT ====================

@app.post("/download-resume")
async def download_optimized_resume(
    resume_data: str = Form(...)  # JSON string of resume data
):
    """
    Generate and download optimized resume PDF
    No need to upload .tex - we use our template!
    """
    try:
        # import json
        
        # Parse resume data
        data = json.loads(resume_data)
        
        # Generate LaTeX from template
        latex_content = generate_latex_from_template(data)
        
        # Try to compile to PDF
        try:
            pdf_path = compile_latex_to_pdf(latex_content, "optimized_resume")
            
            return FileResponse(
                pdf_path,
                media_type='application/pdf',
                filename="optimized_resume.pdf"
            )
            
        except Exception as compile_error:
            print(f"PDF compilation failed: {str(compile_error)}")
            
            # Fallback: Return TEX file
            temp_dir = tempfile.mkdtemp()
            tex_path = os.path.join(temp_dir, "optimized_resume.tex")
            
            with open(tex_path, 'w', encoding='utf-8') as f:
                f.write(latex_content)
            
            return FileResponse(
                tex_path,
                media_type='application/x-tex',
                filename="optimized_resume.tex"
            )
        
    except Exception as e:
        pt Exception as e:
        print(f"Error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }rint(f"Error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }t Exception as e:
        print(f"Error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }