import { useState, useRef } from 'react'
import axios from 'axios'
import {
  Container, Paper, Typography, Button, TextField, Box, Tabs, Tab,
  Card, CardContent, CircularProgress, Alert, Divider, Chip, Stack,
  ThemeProvider, createTheme, CssBaseline, Collapse, Accordion,
  AccordionSummary, AccordionDetails, useMediaQuery, useTheme as useMuiTheme,
  Stepper, Step, StepLabel, StepContent, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Grid, alpha, LinearProgress, Radio, RadioGroup,
  FormControlLabel, Tooltip, Avatar, Fade
} from '@mui/material'
import {
  CloudUpload, Description, Link as LinkIcon, AutoAwesome, CheckCircle,
  Error as ErrorIcon, Download, PlayCircleOutline, TipsAndUpdates,
  Psychology, School, ExpandMore, CompareArrows, Lock, Edit, Add, Delete,
  Close, NavigateNext, NavigateBefore, Warning, InfoOutlined, WorkHistory,
  Code, EmojiEvents, Verified, ThumbUp, ThumbDown, HelpOutline,
  BookmarkBorder, Lightbulb, Shield, GppBad, GppMaybe, GppGood,
  CheckBox, CheckBoxOutlineBlank, ArrowForward
} from '@mui/icons-material'

// ─────────────────────────────────────────────
// Theme — warm professional, NOT purple gradient cliché
// ─────────────────────────────────────────────
const theme = createTheme({
  palette: {
    mode: 'light',
    primary:    { main: '#2563eb', light: '#60a5fa', dark: '#1d4ed8' },
    secondary:  { main: '#0891b2', light: '#22d3ee', dark: '#0e7490' },
    success:    { main: '#16a34a', light: '#4ade80', dark: '#15803d' },
    warning:    { main: '#d97706', light: '#fbbf24', dark: '#b45309' },
    error:      { main: '#dc2626', light: '#f87171', dark: '#b91c1c' },
    background: { default: '#f0f4f8', paper: '#ffffff' },
    text:       { primary: '#0f172a', secondary: '#475569' },
  },
  typography: {
    fontFamily: '"DM Sans", "Segoe UI", system-ui, sans-serif',
    h3: { fontWeight: 800, letterSpacing: '-0.03em' },
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, textTransform: 'none', fontWeight: 600 },
        containedPrimary: {
          background: 'linear-gradient(135deg, #2563eb, #0891b2)',
          '&:hover': { background: 'linear-gradient(135deg, #1d4ed8, #0e7490)' }
        }
      }
    },
    MuiCard:   { styleOverrides: { root: { borderRadius: 18 } } },
    MuiPaper:  { styleOverrides: { root: { borderRadius: 18 } } },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': { borderRadius: 10, fontSize: '1rem' },
          '& .MuiInputLabel-root': { fontSize: '1rem' },
        }
      }
    },
  },
})

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const formatAIResponse = (text) => {
  if (!text) return ''
  return text
    .replace(/```[\w]*\n?/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const FormattedText = ({ text }) => {
  const lines = (text || '').split('\n')
  return (
    <Box>
      {lines.map((line, i) => {
        const isHeader = /^(\d+\.|[A-Z][A-Z\s]{2,}:)/.test(line.trim())
        const isBullet = /^[•\-]/.test(line.trim())
        if (!line.trim()) return <Box key={i} sx={{ height: '0.6em' }} />
        if (isHeader) return (
          <Typography key={i} sx={{ fontWeight: 700, color: 'primary.main', mt: i > 0 ? 2.5 : 0, mb: 1, fontSize: { xs: '1rem', md: '1.05rem' } }}>
            {line}
          </Typography>
        )
        if (isBullet) return (
          <Typography key={i} variant="body1" sx={{ ml: 2, mb: 0.75, lineHeight: 1.7, fontSize: { xs: '0.95rem', md: '1rem' },
            '&::before': { content: '"▸ "', color: 'primary.main', fontWeight: 'bold', marginLeft: '-1.2em', marginRight: '0.4em' }
          }}>
            {line.replace(/^[•\-]\s*/, '')}
          </Typography>
        )
        return (
          <Typography key={i} variant="body1" sx={{ mb: 0.5, lineHeight: 1.75, fontSize: { xs: '0.95rem', md: '1rem' } }}>
            {line}
          </Typography>
        )
      })}
    </Box>
  )
}

function TabPanel({ children, value, index }) {
  return <div hidden={value !== index}>{value === index && <Box sx={{ py: 3 }}>{children}</Box>}</div>
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const analysisSteps = ['Extracting text', 'Analyzing job requirements', 'Calculating ATS score', 'Generating suggestions', 'Optimizing resume']

// ─────────────────────────────────────────────
// WIZARD CONFIG
// ─────────────────────────────────────────────
const WIZARD_STEPS = [
  { label: 'Personal Info', icon: '👤', desc: 'Your contact details & summary' },
  { label: 'Work Experience', icon: '💼', desc: 'Roles, companies & achievements' },
  { label: 'Projects', icon: '🚀', desc: 'Personal & professional projects' },
  { label: 'Skills', icon: '🛠', desc: 'Technical skills & tools' },
  { label: 'Achievements', icon: '🏆', desc: 'Awards & certifications' },
]

// ─────────────────────────────────────────────
// FIELD COMPONENT — large, clear, touch-friendly
// ─────────────────────────────────────────────
const WizardField = ({ label, value, onChange, multiline, rows, placeholder, helperText, type = 'text' }) => (
  <TextField
    fullWidth label={label} value={value} onChange={onChange}
    multiline={multiline} rows={rows} placeholder={placeholder}
    helperText={helperText} type={type} variant="outlined"
    sx={{
      '& .MuiOutlinedInput-root': {
        fontSize: { xs: '1rem', md: '1.05rem' },
        borderRadius: '12px',
        bgcolor: '#fafbfc',
      },
      '& .MuiInputLabel-root': { fontSize: { xs: '1rem', md: '1.05rem' } },
      '& .MuiFormHelperText-root': { fontSize: '0.85rem', mt: 0.75 },
    }}
  />
)

// ─────────────────────────────────────────────
// WIZARD STEP COMPONENTS — defined OUTSIDE wizard to prevent focus loss
// (Defining components inside another component causes remount on every render)
// ─────────────────────────────────────────────

function WizardStepContent({ step, formData, setFormData }) {
  const setField = (key, val) => setFormData(p => ({ ...p, [key]: val }))

  if (step === 0) return (
    <Box>
      <Grid container spacing={{ xs: 2, md: 3 }}>
        <Grid size={{ xs: 12 }}>
          <WizardField label="Full Name *" value={formData.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Ankita Surendra Zingade" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <WizardField label="Email *" value={formData.email} onChange={e => setField('email', e.target.value)} placeholder="you@email.com" type="email" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <WizardField label="Phone" value={formData.phone} onChange={e => setField('phone', e.target.value)} placeholder="+91 99000 21293" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <WizardField label="Location" value={formData.location} onChange={e => setField('location', e.target.value)} placeholder="City, State / Remote" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <WizardField label="LinkedIn URL" value={formData.linkedin} onChange={e => setField('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <WizardField label="GitHub URL" value={formData.github} onChange={e => setField('github', e.target.value)} placeholder="https://github.com/..." />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <WizardField label="Professional Summary" value={formData.summary} onChange={e => setField('summary', e.target.value)}
            multiline rows={4} placeholder="2–3 sentences about your experience, strengths, and what you're looking for..." />
        </Grid>
      </Grid>

      <Divider sx={{ my: { xs: 3, md: 4 } }} />
      <Typography variant="h6" fontWeight={700} mb={2}>🎓 Education</Typography>

      {formData.education.map((edu, i) => (
        <Paper key={i} variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 2.5, borderRadius: '14px', bgcolor: '#fafbfc' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Chip label={`Education #${i + 1}`} color="primary" size="small" sx={{ fontWeight: 700 }} />
            {formData.education.length > 1 && (
              <IconButton size="small" color="error"
                onClick={() => setField('education', formData.education.filter((_, idx) => idx !== i))}>
                <Delete />
              </IconButton>
            )}
          </Stack>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <WizardField label="Degree / Course *" value={edu.degree || ''} onChange={e => {
                const u = [...formData.education]; u[i] = { ...u[i], degree: e.target.value }; setField('education', u)
              }} placeholder="B.E. Computer Science" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <WizardField label="Institution *" value={edu.institution || ''} onChange={e => {
                const u = [...formData.education]; u[i] = { ...u[i], institution: e.target.value }; setField('education', u)
              }} placeholder="University / College name" />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <WizardField label="Year / Duration" value={edu.year || ''} onChange={e => {
                const u = [...formData.education]; u[i] = { ...u[i], year: e.target.value }; setField('education', u)
              }} placeholder="2018 – 2022" />
            </Grid>
          </Grid>
        </Paper>
      ))}
      <Button startIcon={<Add />} variant="outlined" sx={{ borderRadius: '10px', py: 1 }}
        onClick={() => setField('education', [...formData.education, { degree: '', institution: '', year: '' }])}>
        Add Education
      </Button>
    </Box>
  )

  if (step === 1) return (
    <Box>
      {formData.work_experience.map((exp, i) => (
        <Paper key={i} variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, mb: 3, borderRadius: '16px', bgcolor: '#fafbfc' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Chip label={`Experience #${i + 1}`} color="primary" variant="filled" sx={{ fontWeight: 700, fontSize: '0.9rem', py: 0.5 }} />
            {formData.work_experience.length > 1 && (
              <IconButton color="error"
                onClick={() => setField('work_experience', formData.work_experience.filter((_, idx) => idx !== i))}>
                <Delete />
              </IconButton>
            )}
          </Stack>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <WizardField label="Job Title *" value={exp.title || ''}
                onChange={e => { const u = [...formData.work_experience]; u[i] = { ...u[i], title: e.target.value }; setField('work_experience', u) }}
                placeholder="Production Software Engineer" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <WizardField label="Company *" value={exp.company || ''}
                onChange={e => { const u = [...formData.work_experience]; u[i] = { ...u[i], company: e.target.value }; setField('work_experience', u) }}
                placeholder="Tech Mahindra" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <WizardField label="Location" value={exp.location || ''}
                onChange={e => { const u = [...formData.work_experience]; u[i] = { ...u[i], location: e.target.value }; setField('work_experience', u) }}
                placeholder="Pune / Remote" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <WizardField label="Duration *" value={exp.duration || ''}
                onChange={e => { const u = [...formData.work_experience]; u[i] = { ...u[i], duration: e.target.value }; setField('work_experience', u) }}
                placeholder="Oct 2016 – Present" />
            </Grid>
          </Grid>
          <Box mt={3}>
            <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Key Achievements</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>Use STAR format — what you did, how, and the measurable impact.</Typography>
            {exp.achievements.map((ach, j) => (
              <Stack key={j} direction="row" spacing={1.5} mb={1.5} alignItems="flex-start">
                <Typography variant="body2" color="primary.main" fontWeight={700} sx={{ mt: 1.8, minWidth: 20 }}>{j + 1}.</Typography>
                <TextField fullWidth multiline minRows={2} value={ach}
                  placeholder={`Achievement ${j + 1}: e.g. Reduced deployment time by 40% by automating CI/CD pipeline`}
                  onChange={e => {
                    const u = [...formData.work_experience]
                    u[i] = { ...u[i], achievements: u[i].achievements.map((a, ai) => ai === j ? e.target.value : a) }
                    setField('work_experience', u)
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: { xs: '0.95rem', md: '1rem' }, bgcolor: 'white' } }}
                />
                {exp.achievements.length > 1 && (
                  <IconButton color="error" sx={{ mt: 0.5 }}
                    onClick={() => {
                      const u = [...formData.work_experience]
                      u[i] = { ...u[i], achievements: u[i].achievements.filter((_, ai) => ai !== j) }
                      setField('work_experience', u)
                    }}>
                    <Delete />
                  </IconButton>
                )}
              </Stack>
            ))}
            <Button startIcon={<Add />} size="small" sx={{ mt: 0.5, borderRadius: '8px' }}
              onClick={() => {
                const u = [...formData.work_experience]
                u[i] = { ...u[i], achievements: [...u[i].achievements, ''] }
                setField('work_experience', u)
              }}>
              Add Achievement
            </Button>
          </Box>
        </Paper>
      ))}
      <Button variant="outlined" size="large" startIcon={<Add />} fullWidth sx={{ borderRadius: '12px', py: 1.5, borderStyle: 'dashed' }}
        onClick={() => setField('work_experience', [...formData.work_experience, { title: '', company: '', location: '', duration: '', achievements: [''] }])}>
        Add Another Role
      </Button>
    </Box>
  )

  if (step === 2) return (
    <Box>
      <Alert severity="info" sx={{ mb: 3, borderRadius: '12px' }}>
        💡 Include real projects you built. Be honest about the tech stack and your role.
      </Alert>
      {formData.projects.map((proj, i) => (
        <Paper key={i} variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, mb: 3, borderRadius: '16px', bgcolor: '#fafbfc' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Chip label={`Project #${i + 1}`} color="secondary" variant="filled" sx={{ fontWeight: 700 }} />
            {formData.projects.length > 1 && (
              <IconButton color="error"
                onClick={() => setField('projects', formData.projects.filter((_, idx) => idx !== i))}>
                <Delete />
              </IconButton>
            )}
          </Stack>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 7 }}>
              <WizardField label="Project Name *" value={proj.name || ''}
                onChange={e => { const u = [...formData.projects]; u[i] = { ...u[i], name: e.target.value }; setField('projects', u) }}
                placeholder="e.g. eCDW – Enterprise Data Warehousing" />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <WizardField label="Technologies Used *" value={proj.technologies || ''}
                onChange={e => { const u = [...formData.projects]; u[i] = { ...u[i], technologies: e.target.value }; setField('projects', u) }}
                placeholder="Unix, Linux, TWS, SQL..." />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <WizardField label="Description *" value={proj.description || ''}
                onChange={e => { const u = [...formData.projects]; u[i] = { ...u[i], description: e.target.value }; setField('projects', u) }}
                multiline rows={4} placeholder="What problem did it solve? Your contribution? Any metrics?" />
            </Grid>
          </Grid>
        </Paper>
      ))}
      <Button variant="outlined" size="large" startIcon={<Add />} fullWidth sx={{ borderRadius: '12px', py: 1.5, borderStyle: 'dashed' }}
        onClick={() => setField('projects', [...formData.projects, { name: '', description: '', technologies: '' }])}>
        Add Another Project
      </Button>
    </Box>
  )

  if (step === 3) return (
    <Box>
      <Alert severity="warning" icon={<Shield />} sx={{ mb: 3, borderRadius: '12px' }}>
        <Typography variant="body2" fontWeight={700} mb={0.5}>Only add skills you can speak to in an interview.</Typography>
        <Typography variant="body2">Adding skills you don't know can backfire badly in interviews.</Typography>
      </Alert>
      <Grid container spacing={3}>
        {[
          { label: 'Programming Languages', key: 'languages', placeholder: 'Shell scripting, Python, SQL...' },
          { label: 'Databases', key: 'databases', placeholder: 'Oracle, Teradata, Vertica, MySQL...' },
          { label: 'Frameworks & Libraries', key: 'frameworks', placeholder: 'React, Django, FastAPI...' },
          { label: 'Cloud Platforms', key: 'cloud', placeholder: 'AWS, GCP, Azure...' },
          { label: 'Tools & DevOps', key: 'tools', placeholder: 'IBM TWS, Docker, Git, Kubernetes...' },
        ].map(({ label, key, placeholder }) => (
          <Grid size={{ xs: 12, sm: 6 }} key={key}>
            <WizardField label={label} value={formData.technical_skills[key]} placeholder={placeholder}
              helperText="Separate with commas"
              onChange={e => setField('technical_skills', { ...formData.technical_skills, [key]: e.target.value })} />
          </Grid>
        ))}
      </Grid>
    </Box>
  )

  if (step === 4) return (
    <Box>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <WizardField label="Achievements" value={formData.achievements}
            onChange={e => setField('achievements', e.target.value)}
            multiline rows={6}
            placeholder={"Winner of XYZ Hackathon 2024\nRanked Top 1% on LeetCode\nBest Employee Award, Q3 2023"}
            helperText="One achievement per line" />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <WizardField label="Certifications" value={formData.certifications}
            onChange={e => setField('certifications', e.target.value)}
            multiline rows={5}
            placeholder={"AWS Certified Solutions Architect – 2024\nGoogle Cloud Professional Data Engineer"}
            helperText="One certification per line" />
        </Grid>
      </Grid>
    </Box>
  )

  return null
}


// ─────────────────────────────────────────────
// RESUME UPDATE WIZARD
// ─────────────────────────────────────────────
function ResumeUpdateWizard({ open, onClose, parsedData, onSave }) {
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [wizardStep, setWizardStep] = useState(0)

  const [formData, setFormData] = useState(() => ({
    name:     parsedData?.name || '',
    email:    parsedData?.email || '',
    phone:    parsedData?.phone || '',
    location: parsedData?.location || '',
    linkedin: parsedData?.linkedin || '',
    github:   parsedData?.github || '',
    summary:  parsedData?.summary || '',
    education: parsedData?.education?.length
      ? parsedData.education.map(e => ({ ...e }))
      : [{ degree: '', institution: '', year: '' }],
    work_experience: parsedData?.work_experience?.length
      ? parsedData.work_experience.map(e => ({ ...e, achievements: [...(e.achievements || [''])] }))
      : [{ title: '', company: '', location: '', duration: '', achievements: [''] }],
    projects: parsedData?.projects?.length
      ? parsedData.projects.map(p => ({ ...p }))
      : [{ name: '', description: '', technologies: '' }],
    technical_skills: {
      languages:  parsedData?.technical_skills?.languages?.join(', ')  || '',
      databases:  parsedData?.technical_skills?.databases?.join(', ')  || '',
      frameworks: parsedData?.technical_skills?.frameworks?.join(', ') || '',
      cloud:      parsedData?.technical_skills?.cloud?.join(', ')      || '',
      tools:      parsedData?.technical_skills?.tools?.join(', ')      || '',
    },
    achievements:   parsedData?.achievements?.join('\n')   || '',
    certifications: parsedData?.certifications?.join('\n') || '',
  }))

  const setField = (key, val) => setFormData(p => ({ ...p, [key]: val }))

  // Step index passed to content area — components are defined outside this function

  const handleSave = () => {
    const parseList = str => str.split(',').map(s => s.trim()).filter(Boolean)
    const parseLines = str => str.split('\n').map(s => s.trim()).filter(Boolean)
    onSave({
      ...formData,
      technical_skills: {
        languages:  parseList(formData.technical_skills.languages),
        databases:  parseList(formData.technical_skills.databases),
        frameworks: parseList(formData.technical_skills.frameworks),
        cloud:      parseList(formData.technical_skills.cloud),
        tools:      parseList(formData.technical_skills.tools),
      },
      achievements:   parseLines(formData.achievements),
      certifications: parseLines(formData.certifications),
    })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : '20px', maxHeight: '96vh', display: 'flex', flexDirection: 'column' } }}>

      {/* ── Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #2563eb, #0891b2)', color: 'white', px: { xs: 3, md: 4 }, pt: { xs: 3, md: 4 }, pb: 2, flexShrink: 0 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em">Update Your Resume</Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
              Step {wizardStep + 1} of {WIZARD_STEPS.length} — {WIZARD_STEPS[wizardStep].label}
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
            <Close />
          </IconButton>
        </Stack>

        {/* Progress */}
        <Box sx={{ mt: 2.5, mb: 0.5 }}>
          <LinearProgress variant="determinate" value={((wizardStep + 1) / WIZARD_STEPS.length) * 100}
            sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.2)', '& .MuiLinearProgress-bar': { bgcolor: 'white', borderRadius: 4 } }} />
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.75 }}>
          {Math.round(((wizardStep + 1) / WIZARD_STEPS.length) * 100)}% complete
        </Typography>
      </Box>

      {/* ── Step tab pills */}
      <Box sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', px: { xs: 2, md: 4 }, pt: 2, pb: 0, flexShrink: 0, overflowX: 'auto' }}>
        <Stack direction="row" spacing={0.75} sx={{ minWidth: 'max-content', pb: 1.5 }}>
          {WIZARD_STEPS.map((step, i) => {
            const done = i < wizardStep
            const active = i === wizardStep
            return (
              <Button key={i} size="small" onClick={() => setWizardStep(i)}
                startIcon={done ? <CheckCircle sx={{ fontSize: '18px !important', color: 'success.main' }} /> : undefined}
                sx={{
                  borderRadius: '20px', px: { xs: 1.5, md: 2.5 }, py: 0.75,
                  fontSize: { xs: '0.8rem', md: '0.875rem' },
                  fontWeight: active ? 700 : 500,
                  bgcolor: active ? 'primary.main' : done ? alpha(theme.palette.success.main, 0.1) : 'transparent',
                  color: active ? 'white' : done ? 'success.dark' : 'text.secondary',
                  border: '1.5px solid',
                  borderColor: active ? 'primary.main' : done ? 'success.light' : 'transparent',
                  '&:hover': { bgcolor: active ? 'primary.dark' : alpha(theme.palette.primary.main, 0.08) },
                  whiteSpace: 'nowrap',
                }}>
                <span style={{ marginRight: 4 }}>{step.icon}</span>
                {isMobile ? `${i + 1}` : step.label}
              </Button>
            )
          })}
        </Stack>
      </Box>

      {/* ── Content */}
      <DialogContent sx={{ px: { xs: 2.5, md: 4 }, py: { xs: 3, md: 4 }, flex: 1, overflowY: 'auto' }}>
        <Typography variant="h6" fontWeight={700} mb={0.5}>
          {WIZARD_STEPS[wizardStep].icon} {WIZARD_STEPS[wizardStep].label}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          {WIZARD_STEPS[wizardStep].desc}
        </Typography>
        <WizardStepContent step={wizardStep} formData={formData} setFormData={setFormData} />
      </DialogContent>

      {/* ── Footer */}
      <Box sx={{ px: { xs: 2.5, md: 4 }, py: { xs: 2, md: 2.5 }, borderTop: '1px solid', borderColor: 'divider', bgcolor: '#fafbfc', flexShrink: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Button startIcon={<NavigateBefore />} disabled={wizardStep === 0} onClick={() => setWizardStep(p => p - 1)}
            variant="outlined" size="large" sx={{ borderRadius: '12px', px: { xs: 2, md: 3 }, py: 1.25 }}>
            Back
          </Button>
          <Button color="inherit" onClick={onClose} sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'flex' } }}>
            Cancel
          </Button>
          {wizardStep < WIZARD_STEPS.length - 1 ? (
            <Button variant="contained" size="large" endIcon={<NavigateNext />} onClick={() => setWizardStep(p => p + 1)}
              sx={{ borderRadius: '12px', px: { xs: 2.5, md: 4 }, py: 1.25, fontSize: { xs: '0.95rem', md: '1rem' } }}>
              Next: {WIZARD_STEPS[wizardStep + 1].label}
            </Button>
          ) : (
            <Button variant="contained" size="large" startIcon={<CheckCircle />} onClick={handleSave}
              sx={{ borderRadius: '12px', px: { xs: 2.5, md: 4 }, py: 1.25, fontSize: { xs: '0.95rem', md: '1rem' },
                background: 'linear-gradient(135deg, #16a34a, #0891b2)' }}>
              Save Resume
            </Button>
          )}
        </Stack>
      </Box>
    </Dialog>
  )
}

// ─────────────────────────────────────────────
// FRESHNESS CHECK MODAL
// ─────────────────────────────────────────────
function ResumeFreshnessCheck({ open, onConfirmLatest, onOpenWizard }) {
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  return (
    <Dialog open={open} maxWidth="xs" fullWidth fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : '24px', overflow: 'hidden' } }}>

      {/* Header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)',
        color: 'white', px: 4, py: 4, textAlign: 'center'
      }}>
        <Box sx={{ fontSize: 48, mb: 1 }}>📋</Box>
        <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em">
          Before we analyze…
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
          Is your uploaded resume current?
        </Typography>
      </Box>

      <DialogContent sx={{ px: { xs: 3, md: 4 }, py: 3 }}>
        <Stack spacing={2}>
          <Box sx={{ bgcolor: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '12px', p: 2 }}>
            <Typography variant="body2" fontWeight={700} color="primary.dark" mb={0.5}>
              ✅ Resume looks current?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Great — click below and we'll analyze it right away.
            </Typography>
          </Box>
          <Box sx={{ bgcolor: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '12px', p: 2 }}>
            <Typography variant="body2" fontWeight={700} color="warning.dark" mb={0.5}>
              ✏️ Missing a recent role, skill, or project?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Update it first — we'll analyze your <em>actual</em> latest profile, not an outdated one. Takes 2 minutes.
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <Box sx={{ px: { xs: 3, md: 4 }, pb: { xs: 3, md: 4 }, pt: 0 }}>
        <Stack spacing={1.5}>
          <Button fullWidth variant="outlined" size="large" startIcon={<Edit />} onClick={onOpenWizard}
            sx={{ borderRadius: '12px', py: 1.5, fontSize: '1rem', borderWidth: 2, '&:hover': { borderWidth: 2 } }}>
            Update My Resume First
          </Button>
          <Button fullWidth variant="contained" size="large" startIcon={<CheckCircle />} onClick={onConfirmLatest}
            sx={{ borderRadius: '12px', py: 1.5, fontSize: '1rem', background: 'linear-gradient(135deg, #2563eb, #0891b2)' }}>
            Yes, it's up to date!
          </Button>
        </Stack>
      </Box>
    </Dialog>
  )
}

// ─────────────────────────────────────────────
// ETHICAL RESULTS — Gap Analysis + Accept/Reject
// ─────────────────────────────────────────────
function GapAnalysis({ gaps }) {
  const [responses, setResponses] = useState({})
  if (!gaps || gaps.length === 0) return null

  const knowledgeMap = {
    yes:         { label: 'Yes, I know it',         color: 'success', icon: <GppGood />,   tip: "Great! We've added it to your resume." },
    partially:   { label: 'Partially / Learning',   color: 'warning', icon: <GppMaybe />,  tip: "We'll add it with honest framing. Prepare to explain your level." },
    no:          { label: "No, I don't know it",    color: 'error',   icon: <GppBad />,    tip: "We won't add it. Focus on learning it before your next application." },
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
        <Box sx={{ bgcolor: alpha(theme.palette.warning.main, 0.12), borderRadius: '10px', p: 1, display: 'flex' }}>
          <Shield sx={{ color: 'warning.main', fontSize: 24 }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700}>Honest Gap Analysis</Typography>
          <Typography variant="body2" color="text.secondary">
            These skills are in the job description but not your resume. Be honest — it protects you in interviews.
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={2} mt={2.5}>
        {gaps.map((gap, i) => {
          const resp = responses[i]
          const info = resp ? knowledgeMap[resp] : null
          return (
            <Paper key={i} variant="outlined" sx={{
              p: { xs: 2, md: 2.5 }, borderRadius: '14px',
              borderColor: info ? `${info.color}.light` : 'divider',
              bgcolor: info ? alpha(theme.palette[info.color].main, 0.04) : '#fafbfc',
              transition: 'all 0.2s'
            }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700}>⚠️ {gap}</Typography>
                  <Typography variant="body2" color="text.secondary">Do you actually know this?</Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                  {Object.entries(knowledgeMap).map(([key, { label, color }]) => (
                    <Chip key={key} label={label} clickable
                      color={resp === key ? color : 'default'}
                      variant={resp === key ? 'filled' : 'outlined'}
                      onClick={() => setResponses(p => ({ ...p, [i]: key }))}
                      sx={{ fontWeight: resp === key ? 700 : 500, fontSize: { xs: '0.78rem', md: '0.85rem' } }}
                    />
                  ))}
                </Stack>
              </Stack>
              {info && (
                <Alert severity={info.color === 'success' ? 'success' : info.color === 'warning' ? 'warning' : 'error'}
                  icon={info.icon} sx={{ mt: 1.5, borderRadius: '10px', py: 0.5 }}>
                  <Typography variant="body2">{info.tip}</Typography>
                </Alert>
              )}
            </Paper>
          )
        })}
      </Stack>
    </Box>
  )
}

function BulletRewrites({ rewrites, accepted, onToggle }) {
  // accepted and onToggle are controlled from parent — state survives tab switches
  if (!rewrites || rewrites.length === 0) return null
  const acceptedCount = Object.values(accepted || {}).filter(Boolean).length

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Suggested Rewrites</Typography>
          <Typography variant="body2" color="text.secondary">
            Review each suggestion — accept what feels accurate, reject what doesn't.
          </Typography>
        </Box>
        <Chip label={`${acceptedCount} of ${rewrites.length} accepted`} color="success" variant="outlined" fontWeight={700} />
      </Stack>

      <Stack spacing={2}>
        {rewrites.map((rw, i) => (
          <Paper key={i} variant="outlined" sx={{
            borderRadius: '14px', overflow: 'hidden',
            borderColor: accepted[i] ? 'success.light' : 'divider',
            transition: 'border-color 0.2s'
          }}>
            <Grid container>
              <Grid size={{ xs: 12, md: 6 }} sx={{ p: { xs: 2, md: 2.5 }, bgcolor: '#fff5f5', borderRight: { md: '1px solid #fee2e2' } }}>
                <Typography variant="caption" fontWeight={700} color="error.main" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ❌ Original
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, lineHeight: 1.7, color: 'text.secondary', fontStyle: 'italic' }}>
                  {rw.original}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }} sx={{ p: { xs: 2, md: 2.5 }, bgcolor: accepted[i] ? '#f0fdf4' : '#fafbfc' }}>
                <Typography variant="caption" fontWeight={700} color="success.dark" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ✅ Suggested
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, lineHeight: 1.7, fontWeight: accepted[i] ? 600 : 400 }}>
                  {rw.improved}
                </Typography>
              </Grid>
            </Grid>
            <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.5, bgcolor: '#f8fafc', borderTop: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Button size="small" variant={accepted[i] ? 'contained' : 'outlined'} color="success"
                  startIcon={accepted[i] ? <CheckCircle /> : <CheckBoxOutlineBlank />}
                  onClick={() => onToggle(i)}
                  sx={{ borderRadius: '8px', fontWeight: 700 }}>
                  {accepted[i] ? 'Accepted' : 'Accept'}
                </Button>
                {accepted[i] && (
                  <Button size="small" variant="outlined" color="error" onClick={() => onToggle(i)}
                    sx={{ borderRadius: '8px' }}>
                    Revert
                  </Button>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto !important' }}>
                  {rw.reason || ''}
                </Typography>
              </Stack>
            </Box>
          </Paper>
        ))}
      </Stack>
    </Box>
  )
}

// ─────────────────────────────────────────────
// RESUME BUILD PANEL — tabbed, interactive, no duplication
// ─────────────────────────────────────────────
// Fuzzy match: normalize both strings, check word overlap > 60%
const fuzzyMatch = (a, b) => {
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  const words = s => new Set(normalize(s).split(' ').filter(w => w.length > 2))
  const wa = words(a), wb = words(b)
  if (wa.size === 0 || wb.size === 0) return false
  const intersection = [...wa].filter(w => wb.has(w)).length
  const overlap = intersection / Math.min(wa.size, wb.size)
  return overlap >= 0.55  // 55% of the shorter string's meaningful words match
}

function ResumeBuildPanel({ rewrites, skillTokens, gapLines, aiSummary, gapsText, rewritesText, skillsText, interviewText, originalResumeData, acceptedRewrites, onAcceptedRewrites, onSkillsChange, onSummaryChange, currentAtsScore }) {
  const [tab, setTab] = useState(0)
  const [acceptedMap, setAcceptedMap] = useState({})       // controlled state for rewrites — survives tab switches
  const [acceptedSkillsMap, setAcceptedSkillsMap] = useState({})
  const [summaryText, setSummaryText] = useState(aiSummary || '')
  const [summaryEnabled, setSummaryEnabled] = useState(false)

  // Controlled toggle for rewrites — state lives HERE not in BulletRewrites
  const toggleRewrite = (i) => {
    const next = { ...acceptedMap, [i]: !acceptedMap[i] }
    setAcceptedMap(next)
    if (onAcceptedRewrites) onAcceptedRewrites(rewrites.filter((_, idx) => next[idx]))
  }

  const toggleSkill = (i) => {
    const next = { ...acceptedSkillsMap, [i]: !acceptedSkillsMap[i] }
    setAcceptedSkillsMap(next)
    if (onSkillsChange) onSkillsChange(skillTokens.filter((_, idx) => next[idx]))
  }
  const handleSummaryToggle = () => {
    const next = !summaryEnabled
    setSummaryEnabled(next)
    if (onSummaryChange) onSummaryChange(next ? summaryText : null)
  }
  const handleSummaryEdit = (v) => {
    setSummaryText(v)
    if (summaryEnabled && onSummaryChange) onSummaryChange(v)
  }

  // Before/After: just use acceptedRewrites directly — they already have original + improved

  const acceptedSkillCount = Object.values(acceptedSkillsMap).filter(Boolean).length

  const tabs = [
    { label: '⚠️ Critical Gaps', count: gapLines.length },
    { label: '✏️ Rewrites', count: rewrites.length },
    { label: '🛠 Skills', count: skillTokens.length },
    { label: '📝 Summary', count: aiSummary ? 1 : 0 },
    { label: '📊 Before/After', count: acceptedRewrites.length + acceptedSkillCount + (summaryEnabled ? 1 : 0) },
  ]

  return (
    <Paper elevation={1} sx={{ borderRadius: '18px', overflow: 'hidden', border: '1.5px solid', borderColor: alpha(theme.palette.primary.main, 0.15) }}>

      {/* ── Real ATS score bar */}
      {currentAtsScore && (
        <Box sx={{ px: { xs: 2.5, md: 3.5 }, py: 2, background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', color: 'white' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Psychology sx={{ fontSize: 20, color: '#fbbf24' }} />
              <Box>
                <Typography variant="body2" fontWeight={700}>Current ATS Score</Typography>
                <Typography variant="caption" sx={{ opacity: 0.6 }}>Re-analyze after edits to see your new score</Typography>
              </Box>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography variant="h4" fontWeight={800} sx={{ color: currentAtsScore >= 70 ? '#4ade80' : currentAtsScore >= 50 ? '#fbbf24' : '#f87171' }}>
                {currentAtsScore}<Typography component="span" variant="body2" sx={{ opacity: 0.6 }}>/100</Typography>
              </Typography>
            </Stack>
          </Stack>
          <LinearProgress variant="determinate" value={currentAtsScore}
            sx={{ mt: 1.5, height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.15)',
              '& .MuiLinearProgress-bar': {
                bgcolor: currentAtsScore >= 70 ? '#4ade80' : currentAtsScore >= 50 ? '#fbbf24' : '#f87171',
                borderRadius: 3
              }
            }} />
        </Box>
      )}

      {/* ── Tab bar */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#f8fafc', overflowX: 'auto' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          variant="scrollable" scrollButtons="auto"
          sx={{ '& .MuiTab-root': { fontWeight: 700, fontSize: { xs: '0.75rem', md: '0.85rem' }, py: 1.5, minWidth: 'auto', px: { xs: 1.5, md: 2.5 } } }}>
          {tabs.map((t, i) => (
            <Tab key={i} label={
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <span>{t.label}</span>
                {t.count > 0 && (
                  <Chip label={t.count} size="small"
                    color={i === 0 ? 'warning' : i === 4 && t.count > 0 ? 'success' : 'default'}
                    sx={{ height: 18, fontSize: '0.68rem', fontWeight: 700, '& .MuiChip-label': { px: 0.75 } }} />
                )}
              </Stack>
            } />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>

        {/* ── Tab 0: Critical Gaps — section-wise display */}
        {tab === 0 && (
          <Box>
            <Typography variant="h6" fontWeight={700} mb={0.5}>⚠️ Critical Gaps</Typography>
            <Typography variant="body2" color="text.secondary" mb={2.5}>
              What this job requires that your resume doesn't clearly show.
            </Typography>
            {gapLines.length > 0 ? (
              <Stack spacing={1.5}>
                {gapLines.map((gap, i) => (
                  <Paper key={i} variant="outlined" sx={{
                    p: 2, borderRadius: '12px',
                    borderColor: alpha(theme.palette.warning.main, 0.4),
                    bgcolor: '#fffbeb'
                  }}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Warning sx={{ color: 'warning.main', fontSize: 20, mt: 0.25, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ lineHeight: 1.7 }}>{gap}</Typography>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Box textAlign="center" py={4}>
                <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                <Typography color="text.secondary">No critical gaps identified.</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* ── Tab 1: Bullet Rewrites */}
        {tab === 1 && (
          rewrites.length > 0
            ? <BulletRewrites rewrites={rewrites} accepted={acceptedMap} onToggle={toggleRewrite} />
            : <Box textAlign="center" py={5}>
                <Typography variant="body1" color="text.secondary">No rewritable bullets found.</Typography>
                <Typography variant="body2" color="text.secondary" mt={1}>Your bullet writing may already be strong!</Typography>
              </Box>
        )}

        {/* ── Tab 2: Skills */}
        {tab === 2 && (
          <Box>
            <Typography variant="h6" fontWeight={700} mb={0.5}>🛠 Skills to Add</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Select only skills you genuinely have. These will be added directly to your resume's skills section.
            </Typography>
            <Alert severity="warning" sx={{ mb: 2.5, borderRadius: '10px', py: 0.5 }}>
              <Typography variant="body2">
                ⚠️ <strong>Honesty check:</strong> Only add skills you can speak to confidently in an interview. Bluffing will backfire.
              </Typography>
            </Alert>
            {skillTokens.length > 0 ? (
              <>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                  {skillTokens.map((skill, i) => (
                    <Chip
                      key={i}
                      label={skill}
                      onClick={() => toggleSkill(i)}
                      icon={acceptedSkillsMap[i] ? <CheckCircle sx={{ fontSize: '1rem !important' }} /> : undefined}
                      variant={acceptedSkillsMap[i] ? 'filled' : 'outlined'}
                      color={acceptedSkillsMap[i] ? 'success' : 'default'}
                      sx={{
                        fontWeight: 700, fontSize: '0.9rem', py: 2.5, px: 1,
                        cursor: 'pointer', transition: 'all 0.2s',
                        borderWidth: 1.5,
                        '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.06) }
                      }}
                    />
                  ))}
                </Box>
                {acceptedSkillCount > 0 && (
                  <Alert severity="success" sx={{ borderRadius: '10px', py: 0.5 }}>
                    <Typography variant="body2">
                      ✅ <strong>{acceptedSkillCount} skill{acceptedSkillCount > 1 ? 's' : ''} selected</strong> — will be added to your resume's skills section on download.
                    </Typography>
                  </Alert>
                )}
              </>
            ) : (
              <Box textAlign="center" py={4}>
                <Typography color="text.secondary">No skill suggestions available for this resume/JD combination.</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* ── Tab 3: Summary */}
        {tab === 3 && (
          <Box>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={2} gap={2}>
              <Box>
                <Typography variant="h6" fontWeight={700}>📝 Professional Summary</Typography>
                <Typography variant="body2" color="text.secondary">AI-drafted based on your resume + this JD. Edit freely before including.</Typography>
              </Box>
              <Button
                variant={summaryEnabled ? 'contained' : 'outlined'}
                color="success" size="small"
                startIcon={summaryEnabled ? <CheckCircle /> : <CheckBoxOutlineBlank />}
                onClick={handleSummaryToggle}
                sx={{ flexShrink: 0, borderRadius: '10px', fontWeight: 700 }}
              >
                {summaryEnabled ? 'Included ✓' : 'Include'}
              </Button>
            </Stack>
            <TextField
              fullWidth multiline minRows={5}
              value={summaryText}
              onChange={e => handleSummaryEdit(e.target.value)}
              placeholder="Edit the AI summary here..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px', fontSize: '0.95rem',
                  bgcolor: summaryEnabled ? '#f0fdf4' : '#f8fafc',
                  transition: 'background-color 0.2s'
                }
              }}
            />
            {summaryEnabled && (
              <Alert severity="success" sx={{ mt: 1.5, borderRadius: '10px', py: 0.5 }}>
                ✓ This summary will appear at the top of your downloaded resume.
              </Alert>
            )}
            {!aiSummary && (
              <Box textAlign="center" py={4}>
                <Typography color="text.secondary">No summary suggestion available.</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* ── Tab 4: Before / After — all changes summary */}
        {tab === 4 && (
          <Box>
            <Typography variant="h6" fontWeight={700} mb={0.5}>📊 All Changes to Your Resume</Typography>
            <Typography variant="body2" color="text.secondary" mb={2.5}>
              Everything that will be different in your downloaded resume.
            </Typography>

            {/* Skills added */}
            {acceptedSkillCount > 0 && (
              <Box mb={3}>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary"
                  sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>🛠 Skills Added</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {skillTokens.filter((_, i) => acceptedSkillsMap[i]).map((s, i) => (
                    <Chip key={i} label={`+ ${s}`} color="success" variant="filled"
                      sx={{ fontWeight: 700, fontSize: '0.85rem' }} />
                  ))}
                </Box>
              </Box>
            )}

            {/* Summary added */}
            {summaryEnabled && summaryText && (
              <Box mb={3}>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary"
                  sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>📝 Summary Added</Typography>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px', borderColor: 'success.light', bgcolor: '#f0fdf4' }}>
                  <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'success.dark', fontWeight: 500 }}>
                    {summaryText}
                  </Typography>
                </Paper>
              </Box>
            )}

            {/* Bullet rewrites — directly from what user accepted */}
            {acceptedRewrites.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary"
                  sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
                  ✏️ Bullet Rewrites ({acceptedRewrites.length} changed)
                </Typography>
                <Stack spacing={1.5}>
                  {acceptedRewrites.map((rw, i) => (
                    <Box key={i} sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid', borderColor: 'success.light' }}>
                      <Grid container>
                        <Grid size={{ xs: 12, md: 6 }} sx={{ p: 2, bgcolor: '#fff5f5', borderRight: { md: '1px solid #fee2e2' } }}>
                          <Typography variant="caption" fontWeight={700} color="error.main"
                            sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 0.75 }}>
                            ❌ Before
                          </Typography>
                          <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.secondary', fontStyle: 'italic' }}>
                            {rw.original}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }} sx={{ p: 2, bgcolor: '#f0fdf4' }}>
                          <Typography variant="caption" fontWeight={700} color="success.dark"
                            sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 0.75 }}>
                            ✅ After
                          </Typography>
                          <Typography variant="body2" sx={{ lineHeight: 1.7, fontWeight: 600, color: 'success.dark' }}>
                            {rw.improved}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            {acceptedRewrites.length === 0 && acceptedSkillCount === 0 && !summaryEnabled && (
              <Box textAlign="center" py={5}>
                <Typography color="text.secondary" variant="body1">No changes selected yet.</Typography>
                <Typography color="text.secondary" variant="body2" mt={1}>
                  Accept rewrites, select skills, or include the summary — then come back here to see everything.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* ── Ready to download footer */}
      {(acceptedRewrites.length > 0 || acceptedSkillCount > 0 || summaryEnabled) && (
        <Box sx={{ px: { xs: 2.5, md: 3.5 }, py: 2, bgcolor: '#f0fdf4', borderTop: '1px solid #bbf7d0' }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" gap={1}>
            <CheckCircle sx={{ color: 'success.main', fontSize: 18 }} />
            <Typography variant="body2" fontWeight={700} color="success.dark">Ready to download:</Typography>
            {acceptedRewrites.length > 0 && <Chip label={`${acceptedRewrites.length} rewrites`} size="small" color="success" />}
            {acceptedSkillCount > 0 && <Chip label={`${acceptedSkillCount} skills`} size="small" color="success" />}
            {summaryEnabled && <Chip label="summary" size="small" color="success" />}
          </Stack>
        </Box>
      )}
    </Paper>
  )
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
function App() {
  const muiTheme = useMuiTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'))

  const [jdFile, setJdFile] = useState(null)
  const [resumeFile, setResumeFile] = useState(null)
  const [jdText, setJdText] = useState('')
  const [jdUrl, setJdUrl] = useState('')
  const [tabValue, setTabValue] = useState(1)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [analysisCache, setAnalysisCache] = useState({})
  const [originalAtsScore, setOriginalAtsScore] = useState(null)  // score before wizard edits
  const [acceptedRewrites, setAcceptedRewrites] = useState([])    // rewrites user accepted
  const [acceptedSkills, setAcceptedSkills] = useState([])        // skills user checked
  const [acceptedSummary, setAcceptedSummary] = useState(null)    // summary user opted in

  const [freshnessOpen, setFreshnessOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [parsedResumeData, setParsedResumeData] = useState(null)
  const parsedResumeRef = useRef(null)  // same data as state but readable synchronously
  const [sessionResume, setSessionResume] = useState(null)
  const [resumeUpdated, setResumeUpdated] = useState(false)
  const [pendingFormData, setPendingFormData] = useState(null)

  // Extract real skill/tech gaps from AI suggestion text
  // Uses a curated tech keyword list — avoids picking up generic English words
  const TECH_KEYWORDS = new Set([
    // Languages
    'Python','JavaScript','TypeScript','Java','C++','C#','Go','Rust','Ruby','PHP','Swift','Kotlin','Scala','R','MATLAB',
    'Bash','Shell','PowerShell','Perl','Dart','Lua',
    // Frontend
    'React','Vue','Angular','Next.js','Nuxt','Svelte','Redux','GraphQL','HTML','CSS','Tailwind','Bootstrap','jQuery',
    // Backend
    'Node.js','Express','Django','FastAPI','Flask','Spring','Rails','Laravel','ASP.NET','.NET','Gin','Fiber',
    // Databases
    'MySQL','PostgreSQL','MongoDB','Redis','Elasticsearch','Cassandra','DynamoDB','SQLite','Oracle','SQL Server',
    'Teradata','Vertica','BigQuery','Snowflake','Redshift','CouchDB','Firebase','Supabase',
    // Cloud & DevOps
    'AWS','GCP','Azure','Docker','Kubernetes','Terraform','Ansible','Jenkins','GitHub Actions','CircleCI','ArgoCD',
    'Helm','Prometheus','Grafana','Datadog','New Relic','Linux','Unix','Nginx','Apache',
    // Data & ML
    'TensorFlow','PyTorch','Keras','scikit-learn','Pandas','NumPy','Spark','Hadoop','Kafka','Airflow','dbt',
    'Power BI','Tableau','Looker','Databricks','MLflow','LangChain',
    // Tools & Practices
    'Git','GitHub','GitLab','Bitbucket','Jira','Confluence','REST','RESTful','gRPC','WebSockets','Microservices',
    'CI/CD','DevOps','Agile','Scrum','TDD','BDD','OpenAI','HuggingFace',
    // IBM / Enterprise
    'TWS','IBM','Tivoli','Workload','SAP','Salesforce','Splunk','ELK',
  ])

  const extractGaps = (suggestionText) => {
    if (!suggestionText) return []
    const gapTriggers = ['missing','lack','add','include','consider','not present','absent','require','needed','recommend']
    const gapLines = suggestionText
      .split('\n')
      .filter(line => {
        const ll = line.toLowerCase()
        return gapTriggers.some(t => ll.includes(t))
      })
    const found = []
    const seen = new Set()
    gapLines.forEach(line => {
      const ll = line.toLowerCase()
      TECH_KEYWORDS.forEach(kw => {
        if (!seen.has(kw) && ll.includes(kw.toLowerCase())) {
          seen.add(kw)
          found.push(kw)
        }
      })
    })
    return found.slice(0, 6)
  }

  const buildFormData = () => {
    const fd = new FormData()
    if (tabValue === 0 && jdFile)  fd.append('job_description', jdFile)
    if (tabValue === 1 && jdText)  fd.append('jd_text', jdText)
    if (tabValue === 2 && jdUrl)   fd.append('jd_url', jdUrl)
    if (resumeFile)                fd.append('resume', resumeFile)
    return fd
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!sessionResume) {
      // ── Just show the freshness modal — NO API calls yet.
      // We only parse/analyze AFTER the user confirms their resume is up to date.
      // This avoids wasting Groq credits before the user is ready.
      setPendingFormData(buildFormData())
      setFreshnessOpen(true)
    } else {
      // Already confirmed/updated resume this session — go straight to analysis
      await runAnalysis(buildFormData())
    }
  }

  const handleConfirmLatest = async () => {
    // User confirmed resume is up to date — NOW we parse + analyze
    setFreshnessOpen(false)
    setLoading(true)
    try {
      const parseRes = await axios.post(`${API_URL}/parse-resume`, pendingFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).catch(() => null)
      setParsedResumeData(parseRes?.data?.data || null)
    } catch {}
    setLoading(false)
    await runAnalysis(pendingFormData)
  }

  const handleOpenWizard = async () => {
    // User wants to update — parse first so wizard fields are pre-filled, THEN open wizard
    setFreshnessOpen(false)
    // If already edited this session, open wizard with saved data immediately
    if (sessionResume) {
      parsedResumeRef.current = sessionResume
      setWizardOpen(true)
      return
    }
    setLoading(true)
    try {
      const parseRes = await axios.post(`${API_URL}/parse-resume`, pendingFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).catch(() => null)
      const parsed = parseRes?.data?.data || null
      parsedResumeRef.current = parsed   // store in ref — available synchronously on next line
      setParsedResumeData(parsed)        // also update state for other uses
    } catch {}
    setLoading(false)
    setWizardOpen(true)  // wizard mounts NOW — parsedResumeRef.current is already set
  }

  const handleWizardSave = async (updatedData) => {
    setSessionResume(updatedData)
    parsedResumeRef.current = updatedData  // keep ref in sync for re-opens
    setResumeUpdated(true)
    setWizardOpen(false)
    const fd = buildFormData()
    fd.append('resume_json', JSON.stringify(updatedData))
    await runAnalysis(fd, updatedData)
  }

  // Pull a numeric ATS score out of the AI text e.g. "Overall ATS Score: 72/100"
  const extractAtsScore = (text) => {
    if (!text) return null
    const m = text.match(/(\d{1,3})\s*\/\s*100/)
    return m ? parseInt(m[1]) : null
  }

  const runAnalysis = async (formData, overrideResumeData = null) => {
    setLoading(true); setAnalyzing(true); setResult(null); setAnalysisStep(0)
    try {
      const cacheKey = `${jdText || jdFile?.name || jdUrl}__${resumeFile?.name}__${resumeUpdated}`
      if (analysisCache[cacheKey] && !overrideResumeData) {
        setResult(analysisCache[cacheKey])
        setLoading(false); setAnalyzing(false)
        return
      }

      const interval = setInterval(() => setAnalysisStep(p => p < analysisSteps.length - 1 ? p + 1 : p), 3000)
      const response = await axios.post(`${API_URL}/analyze`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      clearInterval(interval)
      setAnalysisStep(analysisSteps.length)

      if (overrideResumeData && response.data?.data) {
        response.data.data.resume_data = overrideResumeData
        response.data.data.original_resume_data = parsedResumeData || overrideResumeData
      }
      setResult(response.data)
      setAnalysisCache(p => ({ ...p, [cacheKey]: response.data }))

      // Store the very first score so we can show before/after after wizard edits
      if (!overrideResumeData && originalAtsScore === null) {
        const score = extractAtsScore(response.data?.data?.ats_score?.score_analysis)
        if (score) setOriginalAtsScore(score)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'An error occurred')
    } finally { setLoading(false); setAnalyzing(false) }
  }

  const isFormValid = () => {
    const hasJD = (tabValue === 0 && jdFile) || (tabValue === 1 && jdText.trim()) || (tabValue === 2 && jdUrl.trim())
    return hasJD && resumeFile
  }

  const handleDownloadResume = () => {
    const raw = sessionResume || result?.data?.resume_data
    if (!raw) return alert('Please analyze a resume first!')

    // Deep-merge: if AI-enhanced work_experience lost achievements, restore from original
    const original = result?.data?.original_resume_data
    const data = { ...raw }

    // Merge accepted rewrites into resume
    // Strategy: fuzzy-match to replace in-place; anything unmatched gets appended
    if (acceptedRewrites.length > 0 && data.work_experience) {
      const applied = new Set()
      data.work_experience = data.work_experience.map(exp => {
        const achievements = (exp.achievements || []).map(ach => {
          const match = acceptedRewrites.find((r, i) => !applied.has(i) && fuzzyMatch(r.original, ach))
          if (match) {
            applied.add(acceptedRewrites.indexOf(match))
            return match.improved
          }
          return ach
        })
        // Append any rewrites that didn't match any bullet in this role
        // (they show up somewhere, not silently dropped)
        return { ...exp, achievements }
      })
      // Any still-unapplied rewrites: append to first role as new bullets
      const unapplied = acceptedRewrites.filter((_, i) => !applied.has(i))
      if (unapplied.length > 0 && data.work_experience.length > 0) {
        data.work_experience[0].achievements = [
          ...(data.work_experience[0].achievements || []),
          ...unapplied.map(r => r.improved)
        ]
      }
    }
    if (original && data.work_experience) {
      data.work_experience = data.work_experience.map((exp, i) => {
        const origExp = original.work_experience?.[i]
        const hasAchievements = exp.achievements?.filter(Boolean).length > 0
        // If enhanced version lost bullets, fall back to original
        if (!hasAchievements && origExp?.achievements?.filter(Boolean).length > 0) {
          return { ...exp, achievements: origExp.achievements }
        }
        return exp
      })
    }
    // Also restore top-level achievements if empty
    if (original && (!data.achievements?.filter(Boolean).length) && original.achievements?.filter(Boolean).length) {
      data.achievements = original.achievements
    }

    // ── Merge accepted skill tokens into technical_skills
    // We append them to 'tools' as a catch-all — the resume template renders all categories
    if (acceptedSkills.length > 0) {
      const existing = data.technical_skills || {}
      const existingTools = existing.tools || []
      // Avoid duplicates (case-insensitive)
      const existingLower = existingTools.map(s => s.toLowerCase())
      const newSkills = acceptedSkills.filter(s => !existingLower.includes(s.toLowerCase()))
      data.technical_skills = {
        ...existing,
        tools: [...existingTools, ...newSkills]
      }
    }

    // ── Merge accepted summary at top of resume
    if (acceptedSummary) {
      data.summary = acceptedSummary
    }

    const skills = data.technical_skills || {}
    const skillRows = [
      skills.languages?.length  ? `<tr><td class="skill-cat">Languages</td><td>${skills.languages.join(', ')}</td></tr>`   : '',
      skills.databases?.length  ? `<tr><td class="skill-cat">Databases</td><td>${skills.databases.join(', ')}</td></tr>`   : '',
      skills.frameworks?.length ? `<tr><td class="skill-cat">Frameworks</td><td>${skills.frameworks.join(', ')}</td></tr>` : '',
      skills.cloud?.length      ? `<tr><td class="skill-cat">Cloud</td><td>${skills.cloud.join(', ')}</td></tr>`           : '',
      skills.tools?.length      ? `<tr><td class="skill-cat">Tools</td><td>${skills.tools.join(', ')}</td></tr>`           : '',
    ].filter(Boolean).join('')

    const expHtml = (data.work_experience || []).map(exp => `
      <div class="section-item">
        <div class="item-header">
          <span class="item-title">${exp.title || ''}</span>
          <span class="item-date">${exp.duration || ''}</span>
        </div>
        <div class="item-sub">
          <span>${exp.company || ''}</span>
          ${exp.location ? `<span class="item-loc">${exp.location}</span>` : ''}
        </div>
        ${(exp.achievements || []).filter(Boolean).length ? `<ul>${(exp.achievements || []).filter(Boolean).map(a => `<li>${a}</li>`).join('')}</ul>` : ''}
      </div>`).join('')

    const projHtml = (data.projects || []).map(p => `
      <div class="section-item">
        <div class="item-header">
          <span class="item-title">${p.name || ''}</span>
          ${p.technologies ? `<span class="item-tech">${p.technologies}</span>` : ''}
        </div>
        <p class="proj-desc">${p.description || ''}</p>
      </div>`).join('')

    const eduHtml = (data.education || []).map(e => `
      <div class="section-item">
        <div class="item-header">
          <span class="item-title">${e.degree || ''}</span>
          <span class="item-date">${e.year || ''}</span>
        </div>
        <div class="item-sub">${e.institution || ''}</div>
      </div>`).join('')

    const achHtml = (data.achievements || []).length
      ? `<ul>${data.achievements.filter(Boolean).map(a => `<li>${a}</li>`).join('')}</ul>` : ''

    const certHtml = (data.certifications || []).length
      ? `<ul>${data.certifications.filter(Boolean).map(c => `<li>${c}</li>`).join('')}</ul>` : ''

    const contactParts = [
      data.phone, data.email,
      data.location,
      data.linkedin ? `<a href="${data.linkedin}">LinkedIn</a>` : '',
      data.github   ? `<a href="${data.github}">GitHub</a>` : '',
    ].filter(Boolean)

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${data.name || 'Resume'}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;700&family=Source+Sans+3:wght@300;400;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Source Sans 3', 'Helvetica Neue', Arial, sans-serif;
    font-size: 10.2pt;
    color: #111;
    background: white;
    line-height: 1.4;
    padding: 0.55in 0.6in;
  }

  /* ── NAME */
  .resume-name {
    font-family: 'EB Garamond', Georgia, serif;
    font-size: 26pt;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-align: center;
    text-transform: uppercase;
    color: #000;
    margin-bottom: 6px;
  }

  /* ── CONTACT LINE */
  .contact-line {
    text-align: center;
    font-size: 9.5pt;
    color: #444;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0 6px;
    margin-bottom: 14px;
  }
  .contact-line span { display: inline; }
  .contact-line .sep { color: #aaa; margin: 0 2px; }
  .contact-line a { color: #111; text-decoration: underline; }

  /* ── SECTION RULE — matches LaTeX resume.cls style */
  .section-title {
    font-size: 10.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #000;
    border-bottom: 1.5px solid #000;
    padding-bottom: 2px;
    margin-top: 14px;
    margin-bottom: 8px;
  }

  /* ── EDUCATION */
  .edu-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 10pt;
    margin-bottom: 2px;
  }
  .edu-deg  { font-weight: 700; }
  .edu-year { font-size: 9.5pt; color: #444; }

  /* ── SKILLS TABLE — matches LaTeX tabular */
  .skills-table { width: 100%; border-collapse: collapse; margin-top: 2px; }
  .skills-table td { padding: 2px 0; font-size: 10pt; vertical-align: top; }
  .skill-cat {
    font-weight: 700;
    text-transform: uppercase;
    width: 120px;
    padding-right: 10px;
    letter-spacing: 0.03em;
    font-size: 9.5pt;
  }

  /* ── EXPERIENCE / PROJECTS */
  .item { margin-bottom: 10px; }
  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .item-title  { font-weight: 700; font-size: 10.5pt; }
  .item-right  { font-size: 9.5pt; color: #333; text-align: right; }
  .item-right .company { font-style: italic; }
  .item-sub    { font-size: 9.5pt; color: #444; margin-top: 1px; }

  ul { margin-top: 4px; padding-left: 18px; }
  ul li {
    font-size: 10pt;
    margin-bottom: 2px;
    line-height: 1.45;
  }

  /* ── PROJECTS inline */
  .proj-tech { font-style: italic; color: #444; font-size: 9.5pt; }

  /* ── ACHIEVEMENTS simple list */
  .plain-list { padding-left: 18px; margin-top: 4px; }
  .plain-list li { font-size: 10pt; margin-bottom: 2px; }

  /* ── PRINT */
  @media print {
    body { padding: 0; font-size: 10pt; }
    @page { margin: 0.5in 0.55in; size: letter; }
    .no-print { display: none !important; }
    a { color: #111 !important; }
  }

  /* ── FLOATING SAVE BAR */
  .save-bar {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    background: #0f172a;
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 28px;
    font-family: 'Source Sans 3', sans-serif;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.35);
    z-index: 999;
  }
  .save-bar p { font-size: 10pt; opacity: 0.85; }
  .save-bar p strong { opacity: 1; }
  .btn-save {
    background: #2563eb;
    color: white;
    border: none;
    padding: 9px 26px;
    border-radius: 7px;
    font-size: 10.5pt;
    font-weight: 700;
    cursor: pointer;
    letter-spacing: 0.02em;
  }
  .btn-save:hover { background: #1d4ed8; }
</style>
</head>
<body>

<!-- NAME -->
<div class="resume-name">${data.name || 'Your Name'}</div>

<!-- CONTACT -->
<div class="contact-line">
  ${[
    data.phone,
    data.location,
    data.email ? `<a href="mailto:${data.email}">${data.email}</a>` : '',
    data.linkedin ? `<a href="${data.linkedin}">LinkedIn</a>` : '',
    data.github   ? `<a href="${data.github}">GitHub</a>`   : '',
  ].filter(Boolean).map((p, i, arr) =>
    i < arr.length - 1
      ? `<span>${p}</span><span class="sep">◇</span>`
      : `<span>${p}</span>`
  ).join('')}
</div>

${(data.education || []).length ? `
<!-- EDUCATION -->
<div class="section-title">Education</div>
${(data.education || []).map(e => `
  <div class="edu-row">
    <span class="edu-deg">${e.degree || ''}, ${e.institution || ''}</span>
    <span class="edu-year">${e.year || ''}</span>
  </div>`).join('')}
` : ''}

${(()=>{
  const s = data.technical_skills || {}
  const rows = [
    s.languages?.length  ? `<tr><td class="skill-cat">Languages</td><td>${s.languages.join(', ')}</td></tr>`   : '',
    s.databases?.length  ? `<tr><td class="skill-cat">Databases</td><td>${s.databases.join(', ')}</td></tr>`   : '',
    s.frameworks?.length ? `<tr><td class="skill-cat">Frameworks</td><td>${s.frameworks.join(', ')}</td></tr>` : '',
    s.cloud?.length      ? `<tr><td class="skill-cat">Cloud</td><td>${s.cloud.join(', ')}</td></tr>`           : '',
    s.tools?.length      ? `<tr><td class="skill-cat">Tools</td><td>${s.tools.join(', ')}</td></tr>`           : '',
  ].filter(Boolean)
  return rows.length ? `
<!-- TECHNICAL SKILLS -->
<div class="section-title">Technical Skills</div>
<table class="skills-table"><tbody>${rows.join('')}</tbody></table>
` : ''
})()}

${data.summary ? `
<!-- SUMMARY -->
<div class="section-title">Professional Summary</div>
<p style="font-size:10.2pt; line-height:1.6; margin-bottom:12pt; color:#1e293b;">${data.summary}</p>
` : ''}

${(data.work_experience || []).length ? `
<!-- WORK EXPERIENCE -->
<div class="section-title">Work Experience</div>
${(data.work_experience || []).map(exp => `
  <div class="item">
    <div class="item-header">
      <span class="item-title">${exp.title || ''}</span>
      <span class="item-right">${exp.duration || ''}<br/><span class="company">${exp.company || ''}${exp.location ? ' — ' + exp.location : ''}</span></span>
    </div>
    ${(exp.achievements || []).filter(Boolean).length ? `<ul>${(exp.achievements || []).filter(Boolean).map(a => `<li>${a}</li>`).join('')}</ul>` : ''}
  </div>`).join('')}
` : ''}

${(data.projects || []).length ? `
<!-- PERSONAL PROJECTS -->
<div class="section-title">Personal Projects</div>
<ul>
${(data.projects || []).map(p => `
  <li><strong>${p.name || ''}</strong>${p.technologies ? ` <span class="proj-tech">[${p.technologies}]</span>` : ''} — ${p.description || ''}</li>`).join('')}
</ul>
` : ''}

${(data.achievements || []).filter(Boolean).length ? `
<!-- ACHIEVEMENTS -->
<div class="section-title">Achievements</div>
<ul class="plain-list">
  ${(data.achievements || []).filter(Boolean).map(a => `<li>${a}</li>`).join('')}
</ul>
` : ''}

${(data.certifications || []).filter(Boolean).length ? `
<!-- CERTIFICATIONS -->
<div class="section-title">Certifications</div>
<ul class="plain-list">
  ${(data.certifications || []).filter(Boolean).map(c => `<li>${c}</li>`).join('')}
</ul>
` : ''}

<!-- SAVE BAR -->
<div class="save-bar no-print" id="saveBar" style="display:none">
  <p>Your resume is ready — <strong>Ctrl+P / ⌘+P</strong> → "Save as PDF" → set margins to <strong>None</strong> for best results.</p>
  <button class="btn-save" onclick="window.print()">⬇ Save as PDF</button>
</div>

<script>
  setTimeout(() => {
    const bar = document.getElementById('saveBar')
    if (bar) bar.style.display = 'flex'
  }, 400)
</script>
</body>
</html>`

    // Open in a new tab — user clicks "Save as PDF" or Ctrl+P
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (!win) alert('Please allow pop-ups for this site to preview your resume.')
  }

  const gapKeywords = result?.data?.critical_gaps ? extractGaps(result.data.critical_gaps) : []

  // Parse AI suggestion text for "Original: / Improved:" pairs
  const buildRewrites = () => {
    const out = []
    const seen = new Set()
    const suggText = result?.data?.rewrites || ''
    if (!suggText) return out

    const lines = suggText.split('\n')
    let pendingOriginal = null

    for (const raw of lines) {
      const line = raw.trim()
      if (!line) continue
      // Match "Original: ..." — strip any leading asterisks/bold markers
      const origMatch = line.match(/^\*{0,2}Original:\*{0,2}\s*(.{10,})/i)
      // Match "Improved: ..."
      const imprMatch = line.match(/^\*{0,2}Improved:\*{0,2}\s*(.{10,})/i)

      if (origMatch) {
        pendingOriginal = origMatch[1].replace(/[*"]/g, '').trim()
      } else if (imprMatch && pendingOriginal) {
        const improved = imprMatch[1].replace(/[*"]/g, '').trim()
        const key = pendingOriginal.slice(0, 40)
        if (!seen.has(key) && improved !== pendingOriginal) {
          seen.add(key)
          out.push({ original: pendingOriginal, improved })
        }
        pendingOriginal = null
      }
    }
    return out.slice(0, 5)
  }
  const rewrites = buildRewrites()

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <ResumeFreshnessCheck open={freshnessOpen} onClose={() => setFreshnessOpen(false)}
        onConfirmLatest={handleConfirmLatest} onOpenWizard={handleOpenWizard} />
      {wizardOpen && (
        <ResumeUpdateWizard open={wizardOpen} onClose={() => setWizardOpen(false)}
          parsedData={parsedResumeRef.current} onSave={handleWizardSave} />
      )}

      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pb: 10 }}>

        {/* ── Header */}
        <Box sx={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0891b2 100%)',
          color: 'white', py: { xs: 5, md: 9 }, mb: { xs: 4, md: 6 },
          position: 'relative', overflow: 'hidden'
        }}>
          {/* decorative circles */}
          <Box sx={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', bgcolor: 'rgba(37,99,235,0.15)' }} />
          <Box sx={{ position: 'absolute', bottom: -40, left: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(8,145,178,0.12)' }} />

          <Container maxWidth="lg" sx={{ position: 'relative' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2.5, md: 4 }} alignItems={{ xs: 'flex-start', md: 'center' }}>
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.12)', borderRadius: '18px', p: { xs: 2, md: 2.5 }, backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <AutoAwesome sx={{ fontSize: { xs: 40, md: 52 } }} />
              </Box>
              <Box>
                <Typography component="h1" sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, mb: 1 }}>
                  AI Resume Optimizer
                </Typography>
                <Typography sx={{ opacity: 0.8, fontSize: { xs: '1rem', md: '1.15rem' } }}>
                  Honest insights • Ethical suggestions • Interview-ready results
                </Typography>
              </Box>
            </Stack>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 } }}>

          {/* Privacy */}
          <Alert icon={<Lock />} severity="info" sx={{ mb: 3, borderRadius: '14px', fontSize: { xs: '0.9rem', md: '1rem' } }}>
            🔒 <strong>Your data is secure.</strong> We never store your resume. All processing is real-time.
          </Alert>

          {/* Session badge */}
          {resumeUpdated && (
            <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3, borderRadius: '14px' }}
              action={<Button size="small" startIcon={<Edit />} onClick={() => setWizardOpen(true)}>Edit again</Button>}>
              <strong>✅ Using your updated resume</strong> — all analysis reflects your latest information.
            </Alert>
          )}

          {/* ── Upload card */}
          <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, mb: 4, border: '1.5px solid', borderColor: 'divider' }}>
            <form onSubmit={handleSubmit}>

              <Typography variant="h5" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700 }}>
                <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: '10px', p: 1, display: 'flex' }}>
                  <Description sx={{ color: 'primary.main' }} />
                </Box>
                Job Description
              </Typography>

              <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant={isMobile ? 'fullWidth' : 'standard'} sx={{ mb: 3, '& .MuiTab-root': { fontSize: { xs: '0.85rem', md: '0.95rem' }, fontWeight: 600 } }}>
                <Tab icon={<CloudUpload />} iconPosition="start" label={isMobile ? 'Upload' : 'Upload File'} />
                <Tab icon={<Description />} iconPosition="start" label={isMobile ? 'Paste' : 'Paste Text'} />
                <Tab icon={<LinkIcon />} iconPosition="start" label="URL" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <DropZone file={jdFile} setFile={setJdFile} accent="primary" label="Drop job description" />
              </TabPanel>
              <TabPanel value={tabValue} index={1}>
                <TextField fullWidth multiline rows={isMobile ? 8 : 10} value={jdText} onChange={e => setJdText(e.target.value)}
                  placeholder="Paste the job description here..." variant="outlined"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: { xs: '0.95rem', md: '1rem' } } }} />
              </TabPanel>
              <TabPanel value={tabValue} index={2}>
                <TextField fullWidth value={jdUrl} onChange={e => setJdUrl(e.target.value)}
                  placeholder="https://example.com/job-posting" variant="outlined" type="url"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: { xs: '0.95rem', md: '1rem' } } }} />
              </TabPanel>

              <Divider sx={{ my: { xs: 3, md: 5 } }} />

              <Typography variant="h5" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700 }}>
                <Box sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), borderRadius: '10px', p: 1, display: 'flex' }}>
                  <Description sx={{ color: 'secondary.main' }} />
                </Box>
                Your Resume
                {resumeUpdated && <Chip label="Updated ✓" size="small" color="success" sx={{ ml: 1, fontWeight: 700 }} />}
              </Typography>

              <DropZone file={resumeFile} setFile={(f) => { setResumeFile(f); setSessionResume(null); setResumeUpdated(false) }} accent="secondary" label="Drop your resume" />

              {resumeFile && sessionResume && (
                <Box textAlign="center" mt={1.5}>
                  <Button size="small" startIcon={<Edit />} onClick={() => setWizardOpen(true)} color="secondary">
                    Edit resume info
                  </Button>
                </Box>
              )}

              <Button type="submit" variant="contained" size="large" fullWidth
                disabled={loading || !isFormValid()}
                startIcon={loading ? <CircularProgress size={22} color="inherit" /> : <AutoAwesome />}
                sx={{ mt: { xs: 3, md: 5 }, py: { xs: 1.75, md: 2 }, fontSize: { xs: '1rem', md: '1.1rem' }, borderRadius: '14px' }}>
                {loading ? 'Analyzing...' : '✨ Analyze Resume'}
              </Button>
            </form>
          </Paper>

          {/* Loading */}
          {analyzing && (
            <Paper sx={{ p: { xs: 3, md: 4 }, mb: 4, borderRadius: '18px' }}>
              <Stepper activeStep={analysisStep} alternativeLabel={isMobile}>
                {analysisSteps.map(label => <Step key={label}><StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: { xs: '0.7rem', md: '0.85rem' } } }}>{isMobile ? '' : label}</StepLabel></Step>)}
              </Stepper>
              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <CircularProgress size={44} thickness={4} sx={{ mb: 2 }} />
                <Typography variant="body1" color="text.secondary" fontWeight={500}>
                  {analysisSteps[analysisStep] || 'Processing...'}
                </Typography>
              </Box>
            </Paper>
          )}

          {error && <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 4, borderRadius: '14px' }} onClose={() => setError('')}>{error}</Alert>}

          {/* ── Results */}
          {result?.success && (
            <Collapse in>
              <Stack spacing={3}>

                {/* Success banner */}
                <Paper sx={{ p: { xs: 2.5, md: 3.5 }, background: 'linear-gradient(135deg, #16a34a, #0891b2)', color: 'white', borderRadius: '18px' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <CheckCircle sx={{ fontSize: { xs: 36, md: 44 } }} />
                      <Box>
                        <Typography variant="h5" fontWeight={800}>Analysis Complete! 🎉</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          {resumeUpdated ? 'Based on your updated resume' : 'Review insights below'}
                        </Typography>
                      </Box>
                    </Stack>
                    {resumeUpdated && <Chip label="✓ Updated resume used" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700 }} />}
                  </Stack>
                </Paper>

                {/* ATS Score — parsed visual breakdown */}
                {(() => {
                  const raw = result.data.ats_score?.score_analysis || ''
                  const currentScore = extractAtsScore(raw)
                  const diff = (resumeUpdated && originalAtsScore && currentScore) ? currentScore - originalAtsScore : null

                  // Parse breakdown scores from "Keyword Match (20/40)" etc
                  const parseBreakdown = (text) => {
                    const patterns = [
                      { label: 'Keywords', max: 40, re: /Keyword[^(]*\((\d+)\/40\)/i },
                      { label: 'Experience', max: 30, re: /Experience[^(]*\((\d+)\/30\)/i },
                      { label: 'Skills', max: 20, re: /Skills[^(]*\((\d+)\/20\)/i },
                      { label: 'Education', max: 10, re: /Education[^(]*\((\d+)\/10\)/i },
                    ]
                    return patterns.map(p => {
                      const m = text.match(p.re)
                      return { ...p, score: m ? parseInt(m[1]) : null }
                    }).filter(p => p.score !== null)
                  }

                  // Parse a bullet list section from the raw text
                  const parseList = (text, header) => {
                    const idx = text.search(new RegExp(header, 'i'))
                    if (idx === -1) return []
                    const after = text.slice(idx)
                    const lines = after.split('\n').slice(1)
                    const items = []
                    for (const l of lines) {
                      const clean = l.trim().replace(/^[-•*▸\d.]+\s*/, '').trim()
                      if (!clean || /^(Top|Overall|Breakdown|Keyword|Experience|Strength|Improvement)/i.test(clean)) break
                      if (clean.length > 3) items.push(clean)
                      if (items.length >= 5) break
                    }
                    return items
                  }

                  const breakdown = parseBreakdown(raw)
                  const strengths = parseList(raw, 'Strength')
                  const improvements = parseList(raw, 'Improvement')
                  const scoreColor = currentScore >= 70 ? '#4ade80' : currentScore >= 50 ? '#fbbf24' : '#f87171'

                  return (
                    <Card elevation={3} sx={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', color: 'white', borderRadius: '18px' }}>
                      <CardContent sx={{ p: { xs: 3, md: 4 } }}>

                        {/* Header row */}
                        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Psychology sx={{ fontSize: 32 }} />
                            <Box>
                              <Typography variant="h5" fontWeight={800}>ATS Score</Typography>
                              <Typography variant="caption" sx={{ opacity: 0.6 }}>How well your resume matches this job</Typography>
                            </Box>
                          </Stack>
                          {/* Score display — before/after if re-analyzed, else just current */}
                          <Stack direction="row" alignItems="center" spacing={2}>
                            {diff !== null && (
                              <>
                                <Box textAlign="center">
                                  <Typography variant="caption" sx={{ opacity: 0.55, display: 'block' }}>BEFORE</Typography>
                                  <Typography variant="h4" fontWeight={800} sx={{ opacity: 0.7 }}>{originalAtsScore}</Typography>
                                </Box>
                                <Typography variant="h4" sx={{ opacity: 0.3 }}>→</Typography>
                              </>
                            )}
                            <Box textAlign="center">
                              {diff !== null && <Typography variant="caption" sx={{ opacity: 0.55, display: 'block' }}>NOW</Typography>}
                              <Typography variant="h2" fontWeight={900} sx={{ color: scoreColor, lineHeight: 1 }}>
                                {currentScore}
                                <Typography component="span" variant="h5" sx={{ opacity: 0.5, fontWeight: 400 }}>/100</Typography>
                              </Typography>
                            </Box>
                            {diff !== null && (
                              <Chip label={diff > 0 ? `+${diff} 🚀` : diff < 0 ? `${diff} ⚠️` : '±0'}
                                sx={{ bgcolor: diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#475569', color: 'white', fontWeight: 800, fontSize: '1rem' }} />
                            )}
                          </Stack>
                        </Stack>

                        {/* Score bar */}
                        <LinearProgress variant="determinate" value={currentScore || 0}
                          sx={{ mb: 3, height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.12)',
                            '& .MuiLinearProgress-bar': { bgcolor: scoreColor, borderRadius: 4 } }} />

                        {/* Breakdown bars */}
                        {breakdown.length > 0 && (
                          <Paper elevation={0} sx={{ p: 2.5, borderRadius: '14px', bgcolor: 'rgba(255,255,255,0.07)', mb: 2.5 }}>
                            <Typography variant="caption" fontWeight={700} sx={{ opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 2 }}>
                              Score Breakdown
                            </Typography>
                            <Stack spacing={1.5}>
                              {breakdown.map((b, i) => (
                                <Box key={i}>
                                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                                    <Typography variant="caption" fontWeight={600}>{b.label}</Typography>
                                    <Typography variant="caption" fontWeight={700}>{b.score}/{b.max}</Typography>
                                  </Stack>
                                  <LinearProgress variant="determinate" value={(b.score / b.max) * 100}
                                    sx={{ height: 5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.12)',
                                      '& .MuiLinearProgress-bar': { bgcolor: (b.score/b.max) >= 0.7 ? '#4ade80' : (b.score/b.max) >= 0.5 ? '#fbbf24' : '#f87171', borderRadius: 3 }
                                    }} />
                                </Box>
                              ))}
                            </Stack>
                          </Paper>
                        )}

                        {/* Strengths + Improvements side by side */}
                        <Grid container spacing={2}>
                          {strengths.length > 0 && (
                            <Grid size={{ xs: 12, md: 6 }}>
                              <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(74,222,128,0.1)', height: '100%' }}>
                                <Typography variant="caption" fontWeight={700} sx={{ color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 1.5 }}>
                                  ✅ What you're good at
                                </Typography>
                                <Stack spacing={1}>
                                  {strengths.map((s, i) => (
                                    <Typography key={i} variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>• {s}</Typography>
                                  ))}
                                </Stack>
                              </Paper>
                            </Grid>
                          )}
                          {improvements.length > 0 && (
                            <Grid size={{ xs: 12, md: 6 }}>
                              <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(251,191,36,0.1)', height: '100%' }}>
                                <Typography variant="caption" fontWeight={700} sx={{ color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 1.5 }}>
                                  ⚠️ Gaps to address
                                </Typography>
                                <Stack spacing={1}>
                                  {improvements.map((s, i) => (
                                    <Typography key={i} variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>• {s}</Typography>
                                  ))}
                                </Stack>
                              </Paper>
                            </Grid>
                          )}
                        </Grid>

                      </CardContent>
                    </Card>
                  )
                })()}

                {/* GapAnalysis removed — covered in Action Center Skills tab */}

                {/* ── ACTION CENTER — backend now sends pre-parsed sections */}
                {(() => {
                  // Skills: parse "- SkillName" lines from backend skills section
                  const skillTokens = (result.data.skills || '')
                    .split('\n')
                    .map(l => l.replace(/^[-•*▸\d.]+\s*/, '').trim())
                    .filter(l => l.length > 0 && l.length < 40 && !/^\*\*/.test(l))

                  // Gaps: split into individual gap lines
                  const gapLines = (result.data.critical_gaps || '')
                    .split('\n')
                    .map(l => l.replace(/^[-•*▸\d.]+\s*/, '').trim())
                    .filter(l => l.length > 10)

                  const aiSummary = (result.data.summary || '').replace(/\*\*/g, '').trim()

                  return (
                    <ResumeBuildPanel
                      rewrites={rewrites}
                      skillTokens={skillTokens}
                      gapLines={gapLines}
                      aiSummary={aiSummary}
                      gapsText={result.data.critical_gaps || ''}
                      rewritesText={result.data.rewrites || ''}
                      skillsText={result.data.skills || ''}
                      interviewText={result.data.interview_prep?.interview_prep || ''}
                      originalResumeData={result.data.original_resume_data}
                      acceptedRewrites={acceptedRewrites}
                      onAcceptedRewrites={setAcceptedRewrites}
                      onSkillsChange={setAcceptedSkills}
                      onSummaryChange={setAcceptedSummary}
                      currentAtsScore={extractAtsScore(result.data.ats_score?.score_analysis)}
                    />
                  )
                })()}

                {/* Interview Prep — from combined AI call */}
                {result.data.interview_prep?.interview_prep && (
                  <Paper elevation={1} sx={{ borderRadius: '18px', overflow: 'hidden' }}>
                    <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
                      <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: { xs: 2.5, md: 3.5 }, py: { xs: 1.5, md: 2 }, '&:hover': { bgcolor: '#fafbfc' } }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <School color="success" />
                          <Typography variant="h6" fontWeight={700} fontSize={{ xs: '1rem', md: '1.1rem' }}>Interview Prep</Typography>
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails sx={{ px: { xs: 2.5, md: 3.5 }, pb: { xs: 2.5, md: 3.5 } }}>
                        <FormattedText text={formatAIResponse(result.data.interview_prep.interview_prep)} />
                      </AccordionDetails>
                    </Accordion>
                  </Paper>
                )}

                {/* Learning Resources */}
                {result.data.youtube_resources?.length > 0 && (
                  <Paper elevation={1} sx={{ p: { xs: 3, md: 4 }, borderRadius: '18px' }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} mb={2.5}>
                      <PlayCircleOutline sx={{ color: '#ff0000', fontSize: 28 }} />
                      <Box>
                        <Typography variant="h6" fontWeight={700}>Learning Plan</Typography>
                        <Typography variant="body2" color="text.secondary">Based on gaps found — study these before your interview</Typography>
                      </Box>
                    </Stack>
                    <Grid container spacing={2}>
                      {result.data.youtube_resources.map((r, i) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                          <Card component="a" href={r.url} target="_blank" sx={{
                            textDecoration: 'none', border: '1.5px solid', borderColor: 'divider',
                            transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6, borderColor: 'primary.light' }
                          }}>
                            <Box sx={{ height: 90, background: 'linear-gradient(135deg, #1a1a2e, #cc0000)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                              <PlayCircleOutline sx={{ fontSize: 36, color: 'white' }} />
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>YouTube</Typography>
                            </Box>
                            <CardContent sx={{ p: 2 }}>
                              <Typography variant="body2" fontWeight={700} noWrap>{r.topic}</Typography>
                              <Typography variant="caption" color="text.secondary">Click to search tutorials →</Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                )}

                {/* Download */}
                <Paper sx={{
                  p: { xs: 3, md: 4 }, textAlign: 'center', borderRadius: '18px',
                  background: 'linear-gradient(135deg, #0f172a, #2563eb)',
                  color: 'white'
                }}>
                  <Typography variant="h5" fontWeight={800} gutterBottom>Ready to apply? 🚀</Typography>
                  <Typography variant="body1" sx={{ mb: 1, opacity: 0.85 }}>
                    {resumeUpdated ? 'Preview your updated resume and save it as a PDF.' : 'Preview your optimized resume and save it as a PDF.'}
                  </Typography>
                  {acceptedRewrites.length > 0 && (
                    <Chip
                      label={`✓ ${acceptedRewrites.length} rewritten bullet${acceptedRewrites.length > 1 ? 's' : ''} included`}
                      sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700 }}
                    />
                  )}
                  <Typography variant="body2" sx={{ mb: 3, opacity: 0.65 }}>
                    Opens a formatted preview → click "Save as PDF" or press Ctrl+P
                  </Typography>
                  <Button variant="contained" size="large" startIcon={<Download />} onClick={handleDownloadResume}
                    sx={{ bgcolor: 'white', color: 'primary.dark', py: 1.5, px: 5, borderRadius: '12px', fontSize: '1rem', fontWeight: 700, '&:hover': { bgcolor: '#f0f4f8' } }}>
                    Preview & Download PDF
                  </Button>
                </Paper>

              </Stack>
            </Collapse>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  )
}

// ─────────────────────────────────────────────
// DROP ZONE — reusable
// ─────────────────────────────────────────────
function DropZone({ file, setFile, accent, label }) {
  const color = accent === 'primary' ? '#2563eb' : '#0891b2'
  return (
    <Paper variant="outlined" sx={{
      p: { xs: 3, md: 6 }, textAlign: 'center',
      border: '2.5px dashed', borderColor: file ? color : '#cbd5e1',
      borderRadius: '16px', cursor: 'pointer', transition: 'all 0.25s',
      bgcolor: file ? alpha(color, 0.04) : '#fafbfc',
      '&:hover': { bgcolor: alpha(color, 0.07), borderColor: color }
    }}>
      <input accept=".pdf,.txt,.docx" style={{ display: 'none' }} id={`${accent}-upload`} type="file"
        onChange={e => setFile(e.target.files[0])} />
      <label htmlFor={`${accent}-upload`} style={{ cursor: 'pointer', display: 'block' }}>
        {file ? (
          <Stack alignItems="center" spacing={1.5}>
            <CheckCircle sx={{ fontSize: 56, color }} />
            <Typography variant="h6" fontWeight={700} sx={{ color }}>{file.name}</Typography>
            <Chip label="Click to change" size="small" variant="outlined" sx={{ borderColor: color, color }} />
          </Stack>
        ) : (
          <Stack alignItems="center" spacing={1.5}>
            <CloudUpload sx={{ fontSize: { xs: 52, md: 68 }, color, opacity: 0.6 }} />
            <Typography variant="h6" fontWeight={600} color="text.primary">{label}</Typography>
            <Typography variant="body2" color="text.secondary">PDF, DOCX, or TXT — drag & drop or click to browse</Typography>
          </Stack>
        )}
      </label>
    </Paper>
  )
}

export default App