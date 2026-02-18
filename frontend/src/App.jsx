import { useMemo, useState } from 'react'
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

function BulletRewrites({ rewrites, acceptedMap = {}, onToggle }) {
  if (!rewrites || rewrites.length === 0) return null

  const acceptedCount = Object.values(acceptedMap).filter(Boolean).length

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
            borderColor: acceptedMap[i] ? 'success.light' : 'divider',
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
              <Grid size={{ xs: 12, md: 6 }} sx={{ p: { xs: 2, md: 2.5 }, bgcolor: acceptedMap[i] ? '#f0fdf4' : '#fafbfc' }}>
                <Typography variant="caption" fontWeight={700} color="success.dark" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ✅ Suggested
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, lineHeight: 1.7, fontWeight: acceptedMap[i] ? 600 : 400 }}>
                  {rw.improved}
                </Typography>
              </Grid>
            </Grid>
            <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.5, bgcolor: '#f8fafc', borderTop: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Button size="small" variant={acceptedMap[i] ? 'contained' : 'outlined'} color="success"
                  startIcon={acceptedMap[i] ? <CheckCircle /> : <CheckBoxOutlineBlank />}
                  onClick={() => onToggle?.(i)}
                  sx={{ borderRadius: '8px', fontWeight: 700 }}>
                  {acceptedMap[i] ? 'Accepted' : 'Accept'}
                </Button>
                {acceptedMap[i] && (
                  <Button size="small" variant="outlined" color="error" onClick={() => onToggle?.(i)}
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

  const [freshnessOpen, setFreshnessOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [parsedResumeData, setParsedResumeData] = useState(null)
  const [sessionResume, setSessionResume] = useState(null)
  const [resumeUpdated, setResumeUpdated] = useState(false)
  const [pendingFormData, setPendingFormData] = useState(null)
  const [sessionRevision, setSessionRevision] = useState(0)
  const [previousAtsAnalysis, setPreviousAtsAnalysis] = useState('')
  const [acceptedRewrites, setAcceptedRewrites] = useState({})
  const toggleAcceptedRewrite = (index) => setAcceptedRewrites((prev) => ({ ...prev, [index]: !prev[index] }))

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

  const buildFormData = (resumeOverride = null) => {
    const fd = new FormData()
    if (tabValue === 0 && jdFile)  fd.append('job_description', jdFile)
    if (tabValue === 1 && jdText)  fd.append('jd_text', jdText)
    if (tabValue === 2 && jdUrl)   fd.append('jd_url', jdUrl)
    if (resumeFile)                fd.append('resume', resumeFile)
    const dataToUse = resumeOverride || sessionResume
    if (dataToUse) fd.append('resume_json', JSON.stringify(dataToUse))
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
      await runAnalysis(buildFormData(), sessionResume || null)
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
    setLoading(true)
    try {
      const parseRes = await axios.post(`${API_URL}/parse-resume`, pendingFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).catch(() => null)
      setParsedResumeData(parseRes?.data?.data || null)
    } catch {}
    setLoading(false)
    setWizardOpen(true)
  }

  const handleWizardSave = async (updatedData) => {
    setAcceptedRewrites({})
    if (result?.data?.ats_score?.score_analysis) {
      setPreviousAtsAnalysis(result.data.ats_score.score_analysis)
    }
    setSessionResume(updatedData)
    setResumeUpdated(true)
    setSessionRevision(v => v + 1)
    setWizardOpen(false)
    const fd = buildFormData(updatedData)
    await runAnalysis(fd, updatedData)
  }

  const runAnalysis = async (formData, overrideResumeData = null) => {
    setAcceptedRewrites({})
    setLoading(true); setAnalyzing(true); setResult(null); setAnalysisStep(0)
    try {
      const cacheKey = `${jdText || jdFile?.name || jdUrl}__${resumeFile?.name}__${resumeUpdated}__${sessionRevision}`
      if (analysisCache[cacheKey] && !overrideResumeData) { setResult(analysisCache[cacheKey]); return }

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

    // Keep section boundaries stable: prevent work entries from drifting into Projects
    // due to model output quirks.
    const normalizedProjects = []
    const migratedToExperience = []
    ;(data.projects || []).forEach((p) => {
      const looksLikeExperience = Boolean(p?.company || p?.title || p?.duration || p?.location || Array.isArray(p?.achievements))
      if (looksLikeExperience) {
        migratedToExperience.push({
          title: p.title || p.name || '',
          company: p.company || '',
          location: p.location || '',
          duration: p.duration || '',
          achievements: Array.isArray(p.achievements)
            ? p.achievements.filter(Boolean)
            : [p.description, p.technologies].filter(Boolean),
        })
      } else {
        normalizedProjects.push(p)
      }
    })
    if (migratedToExperience.length > 0) {
      data.work_experience = [...(data.work_experience || []), ...migratedToExperience]
      data.projects = normalizedProjects
    }

    // Safety fallback: if enhanced output emptied a section, restore from original parse.
    if (original?.work_experience?.length && !(data.work_experience || []).length) {
      data.work_experience = original.work_experience
    }
    if (original?.projects?.length && !(data.projects || []).length) {
      data.projects = original.projects
    }

    // Apply only user-accepted rewrites into the downloadable resume.
    const chosenRewrites = (rewrites || []).filter((_, i) => acceptedRewrites[i])
    if ((rewrites || []).length > 0 && chosenRewrites.length === 0) {
      const proceed = window.confirm('You have AI suggestions but none are accepted yet. Continue download without applying suggestions?')
      if (!proceed) return
    }
    if (chosenRewrites.length > 0) {
      data.work_experience = [...(data.work_experience || [])]
      chosenRewrites.forEach((rw) => {
        let replaced = false
        data.work_experience = data.work_experience.map((exp) => {
          const achievements = [...(exp.achievements || [])]
          const idx = achievements.findIndex((a) =>
            rw.original && rw.original !== 'Current bullet can be stronger.'
              ? a?.trim() === rw.original.trim()
              : false
          )
          if (idx !== -1) {
            achievements[idx] = rw.improved
            replaced = true
          }
          return { ...exp, achievements }
        })

        if (!replaced && data.work_experience.length > 0) {
          const first = data.work_experience[0]
          data.work_experience[0] = {
            ...first,
            achievements: [...(first.achievements || []), rw.improved]
          }
        }
      })
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

  const gapKeywords = result?.data?.resume_suggestions?.suggestions ? extractGaps(result.data.resume_suggestions.suggestions) : []

  // Build rewrite suggestions from either structured diff (best) or AI suggestion text fallback.
  const buildRewrites = () => {
    const out = []

    if (result?.data?.original_resume_data && result?.data?.resume_data) {
      const orig = result.data.original_resume_data.work_experience || []
      const opt = result.data.resume_data.work_experience || []
      orig.forEach((exp, ei) => {
        const optExp = opt[ei]
        if (!optExp) return
        ;(exp.achievements || []).forEach((ach, ai) => {
          const improved = optExp.achievements?.[ai]
          if (improved && improved !== ach) out.push({ original: ach, improved, reason: `${exp.title} @ ${exp.company}` })
        })
      })
    }

    if (out.length > 0) return out.slice(0, 5)

    // Fallback: parse rewritten bullet points from suggestion text so users still
    // get accept/reject quick fixes even when structured diffs are unavailable.
    const suggestionText = result?.data?.resume_suggestions?.suggestions || ''
    const lines = suggestionText.split('\n').map(l => l.trim()).filter(Boolean)
    const rewriteLines = []
    let inRewriteSection = false
    for (const line of lines) {
      const ll = line.toLowerCase()
      if (ll.includes('rewritten bullet') || ll.includes('bullet points')) {
        inRewriteSection = true
        continue
      }
      if (inRewriteSection && /^\d+\./.test(line) && !line.toLowerCase().includes('star')) {
        rewriteLines.push(line.replace(/^\d+\.\s*/, ''))
      } else if (inRewriteSection && /^[-•]/.test(line)) {
        rewriteLines.push(line.replace(/^[-•]\s*/, ''))
      } else if (inRewriteSection && /^\d+\./.test(line) && line.toLowerCase().includes('skills')) {
        break
      }
    }

    const currentBullets = (
      result?.data?.original_resume_data?.work_experience ||
      sessionResume?.work_experience ||
      result?.data?.resume_data?.work_experience ||
      []
    ).flatMap((exp) => (exp.achievements || []).filter(Boolean))

    const normalize = (text = '') => text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
    const STOPWORDS = new Set(['and', 'or', 'the', 'a', 'an', 'to', 'for', 'with', 'of', 'in', 'on', 'by', 'at'])
    const tokens = (text) => normalize(text).split(/\s+/).filter(t => t && !STOPWORDS.has(t))
    const overlapScore = (a, b) => {
      const ta = new Set(tokens(a))
      const tb = new Set(tokens(b))
      if (!ta.size || !tb.size) return 0
      let overlap = 0
      ta.forEach(t => { if (tb.has(t)) overlap += 1 })
      return overlap
    }

    const available = [...currentBullets]
    return rewriteLines
      .filter(Boolean)
      .slice(0, 5)
      .map((improved, i) => {
        let bestIdx = -1
        let bestScore = -1
        available.forEach((bullet, bi) => {
          const score = overlapScore(improved, bullet)
          if (score > bestScore) {
            bestScore = score
            bestIdx = bi
          }
        })
        const matchedOriginal = bestIdx >= 0 ? available.splice(bestIdx, 1)[0] : null
        return {
          original: matchedOriginal || currentBullets[i] || 'Current bullet can be stronger.',
          improved,
          reason: `AI quick fix ${i + 1}`
        }
      })
  }
  const rewrites = useMemo(() => buildRewrites(), [result, sessionResume])
  const resumeExt = resumeFile?.name?.split('.').pop()?.toLowerCase()
  const atsParsable = resumeExt ? ['pdf', 'docx', 'txt'].includes(resumeExt) : null

  const extractAtsNumber = (text) => {
    if (!text) return null
    const match = text.match(/overall\s*ats\s*score[^\d]*(\d{1,3})\s*\/\s*100/i) || text.match(/(\d{1,3})\s*\/\s*100/)
    return match ? Math.min(100, Number(match[1])) : null
  }
  const currentAtsNumber = extractAtsNumber(result?.data?.ats_score?.score_analysis)
  const previousAtsNumber = extractAtsNumber(previousAtsAnalysis)
  const atsDelta = (currentAtsNumber !== null && previousAtsNumber !== null)
    ? currentAtsNumber - previousAtsNumber
    : null

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <ResumeFreshnessCheck open={freshnessOpen} onClose={() => setFreshnessOpen(false)}
        onConfirmLatest={handleConfirmLatest} onOpenWizard={handleOpenWizard} />
      {wizardOpen && (
        <ResumeUpdateWizard open={wizardOpen} onClose={() => setWizardOpen(false)}
          parsedData={sessionResume || parsedResumeData} onSave={handleWizardSave} />
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

          {resumeFile && (
            <Alert severity={atsParsable ? 'success' : 'warning'} sx={{ mb: 3, borderRadius: '14px' }}>
              {atsParsable
                ? '🟢 ATS Parsability: likely readable format (' + resumeExt.toUpperCase() + ').'
                : '🔴 ATS Parsability: this format may fail ATS parsing. Prefer PDF or DOCX.'}
            </Alert>
          )}

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

              <DropZone file={resumeFile} setFile={(f) => { setResumeFile(f); setSessionResume(null); setResumeUpdated(false); setSessionRevision(0); setPreviousAtsAnalysis(''); setAcceptedRewrites({}) }} accent="secondary" label="Drop your resume" />

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

                {resumeUpdated && result?.data?.ats_score?.score_analysis && (
                  <Paper elevation={1} sx={{ p: { xs: 3, md: 4 }, borderRadius: '18px' }}>
                    {!previousAtsAnalysis && (
                      <Alert severity="info" sx={{ mb: 2, borderRadius: '10px' }}>
                        ATS before/after comparison appears after at least one more edit + re-analyze in this session.
                      </Alert>
                    )}
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={1.5}>
                      <Typography variant="h6" fontWeight={800}>ATS comparison (before vs after edit)</Typography>
                      {atsDelta !== null && (
                        <Chip
                          color={atsDelta >= 0 ? 'success' : 'error'}
                          label={`ATS ${previousAtsNumber} → ${currentAtsNumber} (${atsDelta >= 0 ? '+' : ''}${atsDelta})`}
                          sx={{ fontWeight: 700 }}
                        />
                      )}
                    </Stack>
                    {previousAtsAnalysis ? (
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Before edit</Typography>
                          <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#fff7ed', border: '1px solid #fed7aa', maxHeight: 240, overflow: 'auto' }}>
                            <FormattedText text={formatAIResponse(previousAtsAnalysis)} />
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>After edit</Typography>
                          <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#ecfeff', border: '1px solid #a5f3fc', maxHeight: 240, overflow: 'auto' }}>
                            <FormattedText text={formatAIResponse(result.data.ats_score.score_analysis)} />
                          </Box>
                        </Grid>
                      </Grid>
                    ) : (
                      <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#ecfeff', border: '1px solid #a5f3fc' }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>Current ATS analysis</Typography>
                        <FormattedText text={formatAIResponse(result.data.ats_score.score_analysis)} />
                      </Box>
                    )}
                  </Paper>
                )}

                {resumeUpdated && result?.data?.original_resume_data && result?.data?.resume_data && (
                  <Paper elevation={1} sx={{ p: { xs: 3, md: 4 }, borderRadius: '18px' }}>
                    <Typography variant="h6" fontWeight={800} gutterBottom>Resume content comparison (before vs after)</Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      Review this carefully. Only download once you accept changes you can confidently explain in interviews.
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>Current data (before)</Typography>
                        <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#fff7ed', border: '1px solid #fed7aa', maxHeight: 280, overflow: 'auto' }}>
                          <Typography variant="body2" fontWeight={700} mb={0.5}>Experience bullets</Typography>
                          <ul style={{ marginTop: 4 }}>
                            {(result.data.original_resume_data.work_experience || []).flatMap((e) => e.achievements || []).filter(Boolean).slice(0, 6).map((a, i) => <li key={`ob-${i}`}><Typography variant="body2">{a}</Typography></li>)}
                          </ul>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>AI-updated data (after)</Typography>
                        <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#ecfeff', border: '1px solid #a5f3fc', maxHeight: 280, overflow: 'auto' }}>
                          <Typography variant="body2" fontWeight={700} mb={0.5}>Experience bullets</Typography>
                          <ul style={{ marginTop: 4 }}>
                            {(result.data.resume_data.work_experience || []).flatMap((e) => e.achievements || []).filter(Boolean).slice(0, 6).map((a, i) => <li key={`nb-${i}`}><Typography variant="body2">{a}</Typography></li>)}
                          </ul>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                )}

                {/* ATS Score */}
                <Card elevation={3} sx={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', color: 'white', borderRadius: '18px' }}>
                  <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                    <Stack direction="row" alignItems="center" spacing={2} mb={2.5}>
                      <Psychology sx={{ fontSize: 32 }} />
                      <Typography variant="h5" fontWeight={800}>ATS Score</Typography>
                    </Stack>
                    <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, bgcolor: 'rgba(255,255,255,0.97)', color: 'text.primary', borderRadius: '14px' }}>
                      <FormattedText text={formatAIResponse(result.data.ats_score.score_analysis)} />
                      {Array.isArray(result.data.ats_score?.missing_keywords) && result.data.ats_score.missing_keywords.length > 0 && (
                        <Box mt={2}>
                          <Typography variant="subtitle2" fontWeight={700} gutterBottom>Verified missing keywords (rule-based)</Typography>
                          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            {result.data.ats_score.missing_keywords.map((kw) => (
                              <Chip key={kw} size="small" color="warning" variant="outlined" label={kw} />
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </Paper>
                  </CardContent>
                </Card>

                {/* ── ETHICAL: Gap Analysis */}
                {gapKeywords.length > 0 && (
                  <Paper elevation={1} sx={{ p: { xs: 3, md: 4 }, borderRadius: '18px', border: '1.5px solid', borderColor: alpha(theme.palette.warning.main, 0.3) }}>
                    <GapAnalysis gaps={gapKeywords} />
                  </Paper>
                )}

                {/* ── ETHICAL: Bullet Rewrites with Accept/Reject */}
                {rewrites.length > 0 && (
                  <Paper elevation={1} sx={{ p: { xs: 3, md: 4 }, borderRadius: '18px' }}>
                    <Alert severity="info" sx={{ mb: 2, borderRadius: '10px' }}>
                      Only the rewrites you <strong>Accept</strong> are applied in Preview & Download.
                    </Alert>
                    <BulletRewrites rewrites={rewrites} acceptedMap={acceptedRewrites} onToggle={toggleAcceptedRewrite} />
                  </Paper>
                )}

                {/* Expandable sections */}
                <Paper elevation={1} sx={{ borderRadius: '18px', overflow: 'hidden' }}>
                  {[
                    { icon: <TipsAndUpdates color="warning" />, label: 'Full Optimization Tips', content: <FormattedText text={formatAIResponse(result.data.resume_suggestions?.suggestions)} /> },
                    { icon: <School color="success" />, label: 'Interview Prep', content: <FormattedText text={formatAIResponse(result.data.interview_prep?.interview_prep)} /> },
                    { icon: <TipsAndUpdates color="primary" />, label: 'Job Requirements Analysis', content: <FormattedText text={formatAIResponse(result.data.jd_analysis?.analysis)} /> },
                  ].map(({ icon, label, content }, idx) => (
                    <Box key={idx}>
                      {idx > 0 && <Divider />}
                      <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
                        <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: { xs: 2.5, md: 3.5 }, py: { xs: 1.5, md: 2 }, '&:hover': { bgcolor: '#fafbfc' } }}>
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            {icon}
                            <Typography variant="h6" fontWeight={700} fontSize={{ xs: '1rem', md: '1.1rem' }}>{label}</Typography>
                          </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: { xs: 2.5, md: 3.5 }, pb: { xs: 2.5, md: 3.5 } }}>
                          {content}
                        </AccordionDetails>
                      </Accordion>
                    </Box>
                  ))}
                </Paper>

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