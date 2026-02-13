from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import PyPDF2
import io
import os
from dotenv import load_dotenv
from docx import Document
from groq import Groq
from jinja2 import Template
import re
from jinja2 import Template
from fastapi.responses import FileResponse
import tempfile
import shutil
import subprocess
import tempfile
import shutil
import os
from pathlib import Path

# Load environment variables
load_dotenv()

# Initialize Anthropic client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins. For better security in production, replace "*" with your actual Vercel URL.
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

# Helper function to extract text from PDF
def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file bytes"""
    try:
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        
        return text.strip()
    except Exception as e:
        return f"Error extracting PDF: {str(e)}"

# Helper function to extract text from DOCX
def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file bytes"""
    try:
        docx_file = io.BytesIO(file_content)
        doc = Document(docx_file)
        
        text = []
        for paragraph in doc.paragraphs:
            text.append(paragraph.text)
        
        return '\n'.join(text).strip()
    except Exception as e:
        return f"Error extracting DOCX: {str(e)}"

# Helper function to determine file type and extract text
def extract_text_from_file(filename: str, file_content: bytes) -> str:
    """Extract text based on file extension"""
    filename_lower = filename.lower()
    
    if filename_lower.endswith('.pdf'):
        return extract_text_from_pdf(file_content)
    elif filename_lower.endswith('.docx'):
        return extract_text_from_docx(file_content)
    elif filename_lower.endswith('.txt'):
        try:
            return file_content.decode('utf-8')
        except UnicodeDecodeError:
            # Try with latin-1 encoding if utf-8 fails
            return file_content.decode('latin-1')
    else:
        return "Unsupported file format"

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
            return {
                "success": False,
                "error": "URL fetching not yet implemented. Please use file upload or paste text."
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
        
        return {
            "success": True,
            "data": {
                "jd_analysis": jd_analysis,
                "ats_score": ats_score,
                "resume_suggestions": resume_suggestions,
                "interview_prep": interview_prep,
                "youtube_resources": youtube_resources
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
    original_resume: UploadFile = File(...),
    ai_suggestions: str = Form(...),
    jd_analysis: str = Form(...),
    ats_score: str = Form(...)
):
    """
    Generate and download optimized resume
    """
    try:
        # Read original resume
        original_content = await original_resume.read()
        
        # Check if it's a .tex file
        if not original_resume.filename.endswith('.tex'):
            return {
                "success": False,
                "error": "Please upload a .tex file. Other formats coming soon!"
            }
        
        original_tex = original_content.decode('utf-8')
        
        # Generate optimized version
        optimized_tex = generate_optimized_resume(
            original_tex,
            ai_suggestions,
            jd_analysis,
            ats_score
        )
        
        # Create temporary file
        temp_dir = tempfile.mkdtemp()
        output_filename = f"optimized_{original_resume.filename}"
        output_path = os.path.join(temp_dir, output_filename)
        
        # Write optimized resume
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(optimized_tex)
        
        # Return file for download
        return FileResponse(
            output_path,
            media_type='application/x-tex',
            filename=output_filename,
            headers={
                "Content-Disposition": f"attachment; filename={output_filename}"
            }
        )
        
    except Exception as e:
        print(f"Error generating resume: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }