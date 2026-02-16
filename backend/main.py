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

# Optional imports
try:
    import requests
    from bs4 import BeautifulSoup
    SCRAPING_AVAILABLE = True
except ImportError:
    SCRAPING_AVAILABLE = False

try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False

# Load environment variables
load_dotenv()

# Initialize Groq client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://resume-optimizer.vercel.app","https://resume-optimizer-azure.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello from Resume Optimizer Backend!"}

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "ai_provider": "groq",
        "available_models": len(GROQ_MODELS),
        "primary_model": GROQ_MODELS[0]
    }

# ==================== GROQ MULTI-MODEL SUPPORT ====================

# Groq models in priority order (all FREE - 6,000 requests/day each)
GROQ_MODELS = [
    "llama-3.3-70b-versatile",  # Best quality (primary)
    "llama-3.1-8b-instant",  # Good quality (fallback 1)
    "openai/gpt-oss-120b",       # Faster, good quality (fallback 2)
    "openai/gpt-oss-20b"              # Fastest, decent quality (fallback 3)
]

def analyze_with_groq(prompt: str, max_tokens: int = 2000) -> str:
    """
    Call Groq API with automatic model fallback
    Tries all 4 models if one fails (rate limit/credits)
    """
    
    last_error = None
    
    for model in GROQ_MODELS:
        try:
            print(f"🤖 Trying Groq: {model}")
            
            chat_completion = groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=model,
                temperature=0.7,
                max_tokens=max_tokens,
            )
            
            response = chat_completion.choices[0].message.content
            print(f"✅ Success with {model}")
            return response
            
        except Exception as e:
            error_msg = str(e).lower()
            last_error = str(e)
            
            print(f"⚠️ {model} failed: {error_msg[:100]}")
            
            # Check if it's a rate limit or credit issue
            if any(keyword in error_msg for keyword in ['rate', 'limit', 'quota', 'credit', 'exhausted']):
                print(f"💡 Rate limit on {model}, trying next model...")
                continue
            else:
                # Other error, try next model anyway
                print(f"⚠️ Error on {model}, trying next model...")
                continue
    
    # All models failed
    raise Exception(
        f"All Groq models exhausted. Last error: {last_error}\n\n"
        f"Solutions:\n"
        f"1. Wait a few minutes and try again\n"
        f"2. Groq free tier resets daily (6,000 requests per model)\n"
        f"3. You have {len(GROQ_MODELS)} models = {len(GROQ_MODELS) * 6000} total free requests/day\n"
        f"4. Create another Groq account for more free credits"
    )

# ==================== DOCUMENT EXTRACTION ====================

def extract_text_from_pdf_robust(file_content: bytes) -> str:
    """Robust PDF extraction"""
    if PDFPLUMBER_AVAILABLE:
        try:
            import pdfplumber
            pdf_file = io.BytesIO(file_content)
            text_parts = []
            with pdfplumber.open(pdf_file) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
                    tables = page.extract_tables()
                    for table in tables:
                        for row in table:
                            if row:
                                row_text = [str(cell).strip() for cell in row if cell]
                                if row_text:
                                    text_parts.append(' | '.join(row_text))
            result = '\n'.join(text_parts).strip()
            if len(result) > 100:
                print(f"✅ PDF extracted: {len(result)} chars")
                return result
        except Exception as e:
            print(f"pdfplumber failed: {e}")
    
    try:
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = [page.extract_text() for page in pdf_reader.pages if page.extract_text()]
        result = '\n'.join(text).strip()
        print(f"✅ PDF extracted: {len(result)} chars")
        return result
    except Exception as e:
        return f"Error extracting PDF: {str(e)}"

def extract_text_from_docx_robust(file_content: bytes) -> str:
    """Robust DOCX extraction"""
    try:
        docx_file = io.BytesIO(file_content)
        doc = Document(docx_file)
        full_text = []
        
        for section in doc.sections:
            for para in section.header.paragraphs:
                if para.text.strip():
                    full_text.append(para.text.strip())
        
        for element in doc.element.body:
            if element.tag.endswith('p'):
                for para in doc.paragraphs:
                    if para._element == element and para.text.strip():
                        full_text.append(para.text.strip())
                        break
            elif element.tag.endswith('tbl'):
                for table in doc.tables:
                    if table._element == element:
                        for row in table.rows:
                            row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                            if row_text:
                                full_text.append(' | '.join(row_text))
                        full_text.append('')
                        break
        
        for section in doc.sections:
            for para in section.footer.paragraphs:
                if para.text.strip():
                    full_text.append(para.text.strip())
        
        result = '\n'.join(full_text).strip()
        print(f"✅ DOCX extracted: {len(result)} chars")
        return result
    except Exception as e:
        print(f"Advanced extraction failed: {e}")
        try:
            docx_file = io.BytesIO(file_content)
            doc = Document(docx_file)
            text = []
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text.append(paragraph.text.strip())
            for table in doc.tables:
                for row in table.rows:
                    row_data = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                    if row_data:
                        text.append(' | '.join(row_data))
            return '\n'.join(text)
        except:
            return f"Error extracting DOCX: {str(e)}"

def extract_text_from_file(filename: str, file_content: bytes) -> str:
    """Main extraction router"""
    filename_lower = filename.lower()
    print(f"📄 Extracting: {filename}")
    
    try:
        if filename_lower.endswith('.pdf'):
            return extract_text_from_pdf_robust(file_content)
        elif filename_lower.endswith('.docx'):
            return extract_text_from_docx_robust(file_content)
        elif filename_lower.endswith('.txt'):
            for encoding in ['utf-8', 'latin-1', 'cp1252']:
                try:
                    return file_content.decode(encoding)
                except:
                    continue
            return file_content.decode('utf-8', errors='ignore')
        else:
            return f"Unsupported format: {filename}"
    except Exception as e:
        return f"Error: {str(e)}"

# ==================== AI ANALYSIS FUNCTIONS ====================

def analyze_job_description(jd_content: str) -> dict:
    """Extract key information from job description"""
    prompt = f"""Analyze this job description concisely.

Job Description:
{jd_content}

Provide:
1. **Top 10 Required Skills**
2. **Years of Experience**
3. **Must-Have Qualifications**
4. **Key Responsibilities** (top 5)
5. **ATS Keywords** (top 15)

Be concise and clear."""

    analysis = analyze_with_groq(prompt, max_tokens=2000)
    return {"analysis": analysis, "success": True}

def calculate_ats_score(jd_content: str, resume_content: str) -> dict:
    """Calculate ATS score"""
    prompt = f"""You are an ATS expert. Analyze and score this resume.

JOB DESCRIPTION:
{jd_content[:2000]}

RESUME:
{resume_content[:2000]}

Provide:
1. **Overall ATS Score: X/100**
2. **Breakdown:** Keyword Match (X/40), Experience (X/30), Skills (X/20), Education (X/10)
3. **Top 5 Missing Keywords**
4. **Top 3 Improvements**
5. **Strengths**

Be specific."""

    score_analysis = analyze_with_groq(prompt, max_tokens=2500)
    return {"score_analysis": score_analysis, "success": True}

def generate_resume_suggestions(jd_content: str, resume_content: str) -> dict:
    """Generate resume improvement suggestions"""
    prompt = f"""Expert resume writer: Suggest improvements.

JOB DESCRIPTION:
{jd_content[:2000]}

RESUME:
{resume_content[:2000]}

Provide:
1. **Critical Gaps**
2. **Keywords to Add**
3. **3-5 Rewritten Bullet Points** (Use STAR format with metrics)
4. **Skills Updates**
5. **Summary/Objective**

Be specific and truthful."""

    suggestions = analyze_with_groq(prompt, max_tokens=3000)
    return {"suggestions": suggestions, "success": True}

def generate_interview_prep(jd_content: str, resume_content: str) -> dict:
    """Generate interview prep"""
    prompt = f"""Create interview prep.

JOB: {jd_content[:1500]}
RESUME: {resume_content[:1500]}

Generate:
1. **Technical Questions** (5)
2. **Behavioral Questions** (3)
3. **Questions to Ask** (3)
4. **Topics to Study** (top 3)

Be specific."""

    prep = analyze_with_groq(prompt, max_tokens=3000)
    return {"interview_prep": prep, "success": True}

def generate_youtube_resources(jd_content: str) -> list:
    """Generate YouTube search links"""
    prompt = f"""List 5 technical topics to study for this job.

Job: {jd_content[:1000]}

List ONLY topic names, one per line."""

    topics_text = analyze_with_groq(prompt, max_tokens=500)
    topics = [t.strip() for t in topics_text.split('\n') if t.strip()][:5]
    
    return [{
        "topic": topic,
        "url": f"https://www.youtube.com/results?search_query={topic.replace(' ', '+')}+tutorial"
    } for topic in topics]

# ==================== RESUME PARSING ====================

def parse_resume_to_structured_data(resume_text: str) -> dict:
    """Extract structured data from resume"""
    prompt = f"""Extract resume information as JSON.

Resume:
{resume_text}

Return ONLY valid JSON:
{{
  "name": "Full Name",
  "phone": "Phone",
  "email": "Email",
  "location": "City, State",
  "linkedin": "URL or empty",
  "github": "URL or empty",
  "education": [{{"degree": "BE", "institution": "University", "year": "2020"}}],
  "technical_skills": {{
    "languages": ["Python"],
    "databases": ["SQL"],
    "frameworks": [],
    "cloud": [],
    "tools": []
  }},
  "work_experience": [{{
    "title": "Title",
    "company": "Company",
    "location": "City",
    "duration": "2020-Present",
    "achievements": ["Achievement 1"]
  }}],
  "projects": [{{"name": "Project", "description": "Desc", "technologies": "Tech"}}],
  "certifications": [],
  "achievements": []
}}"""

    try:
        response = analyze_with_groq(prompt, max_tokens=4000)
        response = response.strip()
        
        if '{' in response:
            response = response[response.find('{'):response.rfind('}')+1]
        response = response.replace('```json', '').replace('```', '').strip()
        
        parsed_data = json.loads(response)
        print(f"✅ Parsed: {parsed_data.get('name', 'Unknown')}")
        return parsed_data
    except Exception as e:
        print(f"❌ Parse error: {str(e)}")
        return None

def enhance_resume_data_with_ai(resume_data: dict, ai_suggestions: str, jd_analysis: str) -> dict:
    """Enhance resume with before/after tracking"""
    prompt = f"""Enhance resume with suggestions.

ORIGINAL:
{json.dumps(resume_data, indent=2)}

SUGGESTIONS:
{ai_suggestions}

Return ONLY JSON (no markdown, no explanations):"""

    try:
        response = analyze_with_groq(prompt, max_tokens=4000)
        response = response.strip()
        
        if '{' in response:
            response = response[response.find('{'):response.rfind('}')+1]
        response = response.replace('```json', '').replace('```', '').strip()
        
        enhanced_data = json.loads(response)
        
        # Track changes
        changes = []
        orig_skills = set()
        new_skills = set()
        for category in ['languages', 'databases', 'frameworks', 'cloud', 'tools']:
            orig_skills.update(resume_data.get('technical_skills', {}).get(category, []))
            new_skills.update(enhanced_data.get('technical_skills', {}).get(category, []))
        
        added_skills = new_skills - orig_skills
        if added_skills:
            changes.append(f"Added {len(added_skills)} skills: {', '.join(list(added_skills)[:3])}")
        
        orig_exp = resume_data.get('work_experience', [])
        new_exp = enhanced_data.get('work_experience', [])
        if orig_exp and new_exp:
            changes.append(f"Enhanced work experience bullets")
        
        print("✅ Enhanced successfully")
        return {
            "original": resume_data,
            "enhanced": enhanced_data,
            "changes": changes,
            "success": True
        }
    except Exception as e:
        print(f"⚠️ Enhancement failed: {str(e)}")
        return {
            "original": resume_data,
            "enhanced": resume_data,
            "changes": ["Enhancement failed - using original data"],
            "success": False
        }

# ==================== URL FETCHING ====================

def fetch_job_description_from_url(url: str) -> str:
    """Fetch JD from URL"""
    if not SCRAPING_AVAILABLE:
        raise Exception("BeautifulSoup not installed")
    
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        for element in soup(['script', 'style', 'nav', 'header', 'footer']):
            element.decompose()
        
        text = soup.get_text(separator='\n', strip=True)
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        text = '\n'.join(lines)
        print(f"✅ URL fetched: {len(text)} chars")
        return text
    except Exception as e:
        raise Exception(f"URL fetch failed: {str(e)}")

# ==================== LATEX GENERATION ====================

def generate_latex_from_template(resume_data: dict) -> str:
    """Generate LaTeX resume"""
    def escape_latex(text):
        if not text:
            return ""
        replacements = {
            '&': r'\&', '%': r'\%', '$': r'\$', '#': r'\#',
            '_': r'\_', '{': r'\{', '}': r'\}',
            '~': r'\textasciitilde{}', '^': r'\^{}'
        }
        for old, new in replacements.items():
            text = text.replace(old, new)
        return text
    
    latex = r"""\documentclass{resume}
\usepackage[paperheight=12in,paperwidth=9in,left=0.4in,top=0.4in,right=0.4in,bottom=0.4in]{geometry}
\newcommand{\tab}[1]{\hspace{.2667\textwidth}\rlap{#1}}
\newcommand{\itab}[1]{\hspace{0em}\rlap{#1}}
"""
    
    latex += f"\\name{{{escape_latex(resume_data.get('name', 'Your Name'))}}}\n"
    
    phone = resume_data.get('phone', '')
    location = resume_data.get('location', '')
    if phone or location:
        latex += f"\\address{{{escape_latex(phone)} \\\\ {escape_latex(location)}}}\n"
    
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
    
    latex += "\\begin{document}\n\n"
    latex += "\\begin{rSection}{Education}\n"
    for edu in resume_data.get('education', []):
        degree = escape_latex(edu.get('degree', ''))
        institution = escape_latex(edu.get('institution', ''))
        year = escape_latex(edu.get('year', ''))
        latex += f"{{\\bf {degree}}}, {institution} \\hfill {{{year}}}\n"
    latex += "\\end{rSection}\n\n"
    
    latex += "\\begin{rSection}{TECHNICAL SKILLS}\n"
    latex += "\\begin{tabular}{ @{} >{\\bfseries}l @{\\hspace{6ex}} l }\n"
    skills = resume_data.get('technical_skills', {})
    if skills.get('languages'):
        latex += f"LANGUAGES: & {', '.join([escape_latex(s) for s in skills['languages']])}\\\\\n"
    if skills.get('databases'):
        latex += f"DATABASES: & {', '.join([escape_latex(s) for s in skills['databases']])}\\\\\n"
    if skills.get('cloud'):
        latex += f"CLOUD: & {', '.join([escape_latex(s) for s in skills['cloud']])}\\\\\n"
    if skills.get('tools'):
        latex += f"TOOLS: & {', '.join([escape_latex(s) for s in skills['tools']])}\\\\\n"
    latex += "\\end{tabular}\\\\\n\\end{rSection}\n\n"
    
    latex += "\\begin{rSection}{WORK EXPERIENCE}\n"
    for exp in resume_data.get('work_experience', []):
        title = escape_latex(exp.get('title', ''))
        company = escape_latex(exp.get('company', ''))
        location = escape_latex(exp.get('location', ''))
        duration = escape_latex(exp.get('duration', ''))
        latex += f"\\textbf{{{title}}} \\hfill {duration}\\\\\n"
        latex += f"{company} \\hfill \\textit{{{location}}}\n"
        latex += "\\begin{itemize}\n\\itemsep -3pt {}\n"
        for achievement in exp.get('achievements', []):
            latex += f"\\item {escape_latex(achievement)}\n"
        latex += "\\end{itemize}\n\n"
    latex += "\\end{rSection}\n\n"
    
    if resume_data.get('projects'):
        latex += "\\begin{rSection}{PERSONAL PROJECTS}\n\\begin{itemize}\n\\itemsep -3pt {}\n"
        for project in resume_data['projects']:
            name = escape_latex(project.get('name', ''))
            desc = escape_latex(project.get('description', ''))
            latex += f"\\item \\textbf{{{name}}} - {desc}\n"
        latex += "\\end{itemize}\n\\end{rSection}\n\n"
    
    if resume_data.get('achievements'):
        latex += "\\begin{rSection}{ACHIEVEMENTS}\n\\begin{itemize}\n"
        for achievement in resume_data['achievements']:
            latex += f"\\item {escape_latex(achievement)}\n"
        latex += "\\end{itemize}\n\\end{rSection}\n\n"
    
    if resume_data.get('certifications'):
        latex += "\\begin{rSection}{CERTIFICATION}\n\\begin{itemize}\n"
        for cert in resume_data['certifications']:
            latex += f"\\item {escape_latex(cert)}\n"
        latex += "\\end{itemize}\n\\end{rSection}\n\n"
    
    latex += "\\end{document}\n"
    return latex

# ==================== ENDPOINTS ====================

@app.post("/analyze")
async def analyze_resume(
    job_description: Optional[UploadFile] = File(None),
    resume: Optional[UploadFile] = File(None),
    jd_text: Optional[str] = Form(None),
    jd_url: Optional[str] = Form(None)
):
    """Complete AI-powered resume analysis"""
    try:
        # Extract JD
        jd_content = ""
        if job_description:
            content = await job_description.read()
            jd_content = extract_text_from_file(job_description.filename, content)
        elif jd_text:
            jd_content = jd_text
        elif jd_url:
            jd_content = fetch_job_description_from_url(jd_url)
        
        # Extract Resume
        resume_content = ""
        if resume:
            content = await resume.read()
            resume_content = extract_text_from_file(resume.filename, content)
        
        if not jd_content or not resume_content:
            return {"success": False, "error": "Both JD and resume required"}
        
        # Run analyses
        print("📊 Parsing...")
        resume_data = parse_resume_to_structured_data(resume_content)
        
        print("🔍 Analyzing JD...")
        jd_analysis = analyze_job_description(jd_content)
        
        print("📊 ATS score...")
        ats_score = calculate_ats_score(jd_content, resume_content)
        
        print("✨ Suggestions...")
        resume_suggestions = generate_resume_suggestions(jd_content, resume_content)
        
        print("💡 Interview prep...")
        interview_prep = generate_interview_prep(jd_content, resume_content)
        
        print("🎥 Resources...")
        youtube_resources = generate_youtube_resources(jd_content)
        
        # Enhancement
        enhancement_result = None
        if resume_data:
            print("🚀 Enhancing...")
            enhancement_result = enhance_resume_data_with_ai(
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
                "resume_data": enhancement_result.get("enhanced") if enhancement_result else resume_data,
                "original_resume_data": enhancement_result.get("original") if enhancement_result else resume_data,
                "changes_made": enhancement_result.get("changes", []) if enhancement_result else []
            },
            "message": "Analysis complete!"
        }
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return {"success": False, "error": str(e)}

@app.post("/download-resume")
async def download_optimized_resume(resume_data: str = Form(...)):
    """Generate optimized resume"""
    try:
        data = json.loads(resume_data)
        latex_content = generate_latex_from_template(data)
        
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
        return {"success": False, "error": str(e)}