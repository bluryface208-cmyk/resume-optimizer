import { useState } from 'react'
import axios from 'axios'
import {
  Container, Paper, Typography, Button, TextField, Box, Tabs, Tab,
  Card, CardContent, CircularProgress, Alert, Divider, Chip, Stack,
  ThemeProvider, createTheme, CssBaseline, LinearProgress, Grid, alpha,
  Collapse, Accordion, AccordionSummary, AccordionDetails,
  useMediaQuery, useTheme as useMuiTheme, Stepper, Step, StepLabel
} from '@mui/material'
import {
  CloudUpload, Description, Link as LinkIcon, AutoAwesome, CheckCircle,
  Error as ErrorIcon, Download, PlayCircleOutline, TipsAndUpdates,
  Psychology, School, ExpandMore, CompareArrows, Lock
} from '@mui/icons-material'

// Helper functions
const formatAIResponse = (text) => {
  if (!text) return ''
  let cleaned = text.replace(/```[\w]*\n?/g, '')
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1')
  cleaned = cleaned.replace(/\*/g, '')
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  return cleaned.trim()
}

const FormattedText = ({ text }) => {
  const lines = text.split('\n')
  return (
    <Box>
      {lines.map((line, index) => {
        const isHeader = /^(\d+\.|[A-Z\s]{3,}:)/.test(line.trim())
        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-')
        
        if (!line.trim()) return <Box key={index} sx={{ height: '0.5em' }} />
        
        if (isHeader) {
          return (
            <Typography key={index} variant="h6" sx={{
              fontWeight: 700, color: 'primary.main',
              mt: index > 0 ? 2 : 0, mb: 1,
              fontSize: { xs: '1rem', md: '1.1rem' }
            }}>
              {line}
            </Typography>
          )
        }
        
        if (isBullet) {
          return (
            <Typography key={index} variant="body2" sx={{
              ml: 2, mb: 0.5, lineHeight: 1.6,
              fontSize: { xs: '0.875rem', md: '1rem' },
              '&::before': {
                content: '"• "', color: 'primary.main',
                fontWeight: 'bold', marginLeft: '-1em', marginRight: '0.5em'
              }
            }}>
              {line.replace(/^[•\-]\s*/, '')}
            </Typography>
          )
        }
        
        return (
          <Typography key={index} variant="body2" sx={{
            mb: 0.5, lineHeight: 1.6,
            fontSize: { xs: '0.875rem', md: '1rem' }
          }}>
            {line}
          </Typography>
        )
      })}
    </Box>
  )
}

// Theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#6366f1', light: '#818cf8', dark: '#4f46e5' },
    secondary: { main: '#ec4899', light: '#f472b6', dark: '#db2777' },
    success: { main: '#10b981', light: '#34d399', dark: '#059669' },
    warning: { main: '#f59e0b' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    text: { primary: '#1e293b', secondary: '#64748b' },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
    h3: { fontWeight: 800, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700 },
    button: { fontWeight: 600, letterSpacing: '0.02em', textTransform: 'none' },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiButton: {
      styleOverrides: { root: { borderRadius: 12, textTransform: 'none', fontWeight: 600 }}
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: 20 }}
    },
  },
})

function TabPanel({ children, value, index }) {
  return <div hidden={value !== index}>{value === index && <Box sx={{ py: 3 }}>{children}</Box>}</div>
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const analysisSteps = [
  'Extracting text',
  'Analyzing job requirements',
  'Calculating ATS score',
  'Generating suggestions',
  'Optimizing resume'
]

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

  const getCacheKey = (jdContent, resumeFileName) => {
    return `${jdContent.substring(0, 100)}_${resumeFileName}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setAnalyzing(true)
    setError('')
    setResult(null)
    setAnalysisStep(0)
    
    try {
      // Check cache
      const cacheKey = getCacheKey(
        jdText || jdFile?.name || jdUrl,
        resumeFile?.name
      )
      
      if (analysisCache[cacheKey]) {
        console.log('✅ Using cached results')
        setResult(analysisCache[cacheKey])
        setLoading(false)
        setAnalyzing(false)
        return
      }
      
      const formData = new FormData()
      
      if (tabValue === 0 && jdFile) formData.append('job_description', jdFile)
      else if (tabValue === 1 && jdText) formData.append('jd_text', jdText)
      else if (tabValue === 2 && jdUrl) formData.append('jd_url', jdUrl)
      
      if (resumeFile) formData.append('resume', resumeFile)
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setAnalysisStep(prev => (prev < analysisSteps.length - 1 ? prev + 1 : prev))
      }, 3000)
      
      const response = await axios.post(`${API_URL}/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      clearInterval(progressInterval)
      setAnalysisStep(analysisSteps.length)
      
      setResult(response.data)
      setAnalysisCache(prev => ({ ...prev, [cacheKey]: response.data }))
      
    } catch (error) {
      console.error('Error:', error)
      setError(error.response?.data?.error || error.message || 'An error occurred')
    } finally {
      setLoading(false)
      setAnalyzing(false)
    }
  }

  const isFormValid = () => {
    const hasJD = (tabValue === 0 && jdFile) || (tabValue === 1 && jdText.trim()) || (tabValue === 2 && jdUrl.trim())
    return hasJD && resumeFile
  }

  const handleDownloadResume = async () => {
    if (!result || !result.success || !result.data.resume_data) {
      alert('Please analyze a resume first!')
      return
    }
    
    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('resume_data', JSON.stringify(result.data.resume_data))
      
      const response = await axios.post(`${API_URL}/download-resume`, formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'optimized_resume.tex')
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      alert('✅ Resume downloaded!')
    } catch (error) {
      alert('Error downloading resume')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pb: 8, overflowX: 'hidden' }}>
        
        {/* Header */}
        <Box sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white', py: { xs: 4, md: 8 }, mb: { xs: 3, md: 6 }
        }}>
          <Container maxWidth="lg">
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 3 }} alignItems="center">
              <Box sx={{
                bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '20px',
                p: { xs: 1.5, md: 2 }, backdropFilter: 'blur(10px)'
              }}>
                <AutoAwesome sx={{ fontSize: { xs: 36, md: 48 } }} />
              </Box>
              <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                <Typography variant={{ xs: 'h4', md: 'h3' }} component="h1" gutterBottom>
                  AI Resume Optimizer
                </Typography>
                <Typography variant={{ xs: 'body1', md: 'h6' }} sx={{ opacity: 0.95 }}>
                  {isMobile ? 'AI-powered resume insights' : 'Transform your resume • Get hired faster'}
                </Typography>
              </Box>
            </Stack>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 } }}>
          
          {/* Privacy Notice */}
          <Alert severity="info" icon={<Lock />} sx={{ mb: 3, borderRadius: 3 }}>
            🔒 <strong>Your data is secure:</strong> We don't store your resume. All processing happens in real-time.
          </Alert>

          {/* Upload Card */}
          <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, mb: 4, border: '1px solid', borderColor: 'divider' }}>
            <form onSubmit={handleSubmit}>
              
              <Typography variant={isMobile ? 'h6' : 'h5'} gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Description color="primary" /> Job Description
              </Typography>
              
              <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant={isMobile ? 'fullWidth' : 'standard'} sx={{ mb: 3 }}>
                <Tab icon={<CloudUpload />} iconPosition="start" label={isMobile ? 'Upload' : 'Upload File'} />
                <Tab icon={<Description />} iconPosition="start" label={isMobile ? 'Paste' : 'Paste Text'} />
                <Tab icon={<LinkIcon />} iconPosition="start" label="URL" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <Paper variant="outlined" sx={{
                  p: { xs: 3, md: 6 }, textAlign: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.03),
                  border: '2px dashed', borderColor: jdFile ? 'primary.main' : 'divider',
                  cursor: 'pointer', transition: 'all 0.3s',
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08), borderColor: 'primary.main' }
                }}>
                  <input accept=".pdf,.txt,.docx" style={{ display: 'none' }} id="jd-file-upload" type="file"
                    onChange={(e) => setJdFile(e.target.files[0])} />
                  <label htmlFor="jd-file-upload" style={{ cursor: 'pointer', width: '100%', display: 'block' }}>
                    <CloudUpload sx={{ fontSize: { xs: 48, md: 72 }, color: 'primary.main', mb: 2, opacity: 0.7 }} />
                    <Typography variant={isMobile ? 'body1' : 'h6'} gutterBottom>
                      {jdFile ? `✓ ${jdFile.name}` : 'Drop job description'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">PDF, DOCX, or TXT</Typography>
                  </label>
                </Paper>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <TextField fullWidth multiline rows={isMobile ? 8 : 10} value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the job description here..." variant="outlined" />
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <TextField fullWidth value={jdUrl} onChange={(e) => setJdUrl(e.target.value)}
                  placeholder="https://example.com/job-posting" variant="outlined" type="url" />
                {isMobile && <Alert severity="info" sx={{ mt: 2 }}>📱 URL works great on mobile!</Alert>}
              </TabPanel>

              <Divider sx={{ my: { xs: 3, md: 5 } }} />

              <Typography variant={isMobile ? 'h6' : 'h5'} gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Description color="secondary" /> Your Resume
              </Typography>
              
              <Paper variant="outlined" sx={{
                p: { xs: 3, md: 6 }, textAlign: 'center',
                bgcolor: alpha(theme.palette.secondary.main, 0.03),
                border: '2px dashed', borderColor: resumeFile ? 'secondary.main' : 'divider',
                cursor: 'pointer', transition: 'all 0.3s',
                '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.08), borderColor: 'secondary.main' }
              }}>
                <input accept=".pdf,.txt,.docx" style={{ display: 'none' }} id="resume-file-upload" type="file"
                  onChange={(e) => setResumeFile(e.target.files[0])} />
                <label htmlFor="resume-file-upload" style={{ cursor: 'pointer', width: '100%', display: 'block' }}>
                  <Description sx={{ fontSize: { xs: 48, md: 72 }, color: 'secondary.main', mb: 2, opacity: 0.7 }} />
                  <Typography variant={isMobile ? 'body1' : 'h6'} gutterBottom>
                    {resumeFile ? `✓ ${resumeFile.name}` : 'Drop your resume'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">PDF, DOCX, or TXT</Typography>
                </label>
              </Paper>

              <Button type="submit" variant="contained" size="large" fullWidth
                disabled={loading || !isFormValid()}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />}
                sx={{
                  mt: { xs: 3, md: 5 }, py: 2, fontSize: { xs: '1rem', md: '1.1rem' },
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #5568d3 0%, #63398d 100%)' }
                }}>
                {loading ? 'Analyzing...' : '✨ Analyze Resume'}
              </Button>
            </form>
          </Paper>

          {/* Loading with Steps */}
          {analyzing && (
            <Paper sx={{ p: { xs: 3, md: 4 }, mb: 4 }}>
              <Stepper activeStep={analysisStep} alternativeLabel={isMobile}>
                {analysisSteps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{isMobile ? '' : label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <CircularProgress size={40} sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  {analysisSteps[analysisStep] || 'Processing...'}
                </Typography>
              </Box>
            </Paper>
          )}

          {/* Error */}
          {error && (
            <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 4, borderRadius: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Results */}
          {result && result.success && (
            <Collapse in={!!result}>
              <Stack spacing={3}>
                
                {/* Success Banner */}
                <Paper sx={{
                  p: { xs: 2, md: 3 },
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white', borderRadius: 3
                }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <CheckCircle sx={{ fontSize: { xs: 32, md: 40 } }} />
                    <Box>
                      <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold">
                        Analysis Complete! 🎉
                      </Typography>
                      <Typography variant="body2">Review insights below</Typography>
                    </Box>
                  </Stack>
                </Paper>

                {/* Changes Summary */}
                {result.data.changes_made && result.data.changes_made.length > 0 && (
                  <Alert severity="success" icon={<CompareArrows />}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Resume Improvements Made:
                    </Typography>
                    {result.data.changes_made.map((change, i) => (
                      <Typography key={i} variant="body2">✓ {change}</Typography>
                    ))}
                  </Alert>
                )}

                {/* ATS Score */}
                <Card elevation={4} sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white'
                }}>
                  <CardContent sx={{ p: { xs: 2, md: 4 } }}>
                    <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                      <Psychology sx={{ fontSize: { xs: 28, md: 32 } }} />
                      <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold">ATS Score</Typography>
                    </Stack>
                    <Paper elevation={0} sx={{
                      p: { xs: 2, md: 3 }, bgcolor: 'rgba(255,255,255,0.95)',
                      color: 'text.primary', borderRadius: 2
                    }}>
                      <FormattedText text={formatAIResponse(result.data.ats_score.score_analysis)} />
                    </Paper>
                  </CardContent>
                </Card>

                {/* Before/After Comparison */}
                {result.data.original_resume_data && result.data.resume_data && (
                  <Paper elevation={2}>
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'grey.50' }}>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <CompareArrows color="primary" sx={{ fontSize: 24 }} />
                          <Typography variant="h6" fontWeight="600" fontSize={{ xs: '1rem', md: '1.25rem' }}>
                            See What Changed
                          </Typography>
                          <Chip label="Before/After" size="small" color="primary" sx={{ ml: 'auto' }} />
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: { xs: 2, md: 3 } }}>
                        <Grid container spacing={2}>
                          {/* Before */}
                          <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2, bgcolor: 'grey.100', height: '100%' }}>
                              <Typography variant="subtitle1" fontWeight="bold" color="error.main" mb={2}>
                                ❌ Original
                              </Typography>
                              {result.data.original_resume_data.work_experience?.slice(0, 1).map((exp, i) => (
                                <Box key={i}>
                                  <Typography variant="body2" fontWeight="600">{exp.title}</Typography>
                                  <Typography variant="caption" color="text.secondary">{exp.company}</Typography>
                                  {exp.achievements?.slice(0, 2).map((ach, j) => (
                                    <Typography key={j} variant="body2" sx={{ mt: 1, fontSize: '0.875rem' }}>
                                      • {ach}
                                    </Typography>
                                  ))}
                                </Box>
                              ))}
                            </Paper>
                          </Grid>
                          {/* After */}
                          <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2, bgcolor: 'success.50', height: '100%' }}>
                              <Typography variant="subtitle1" fontWeight="bold" color="success.dark" mb={2}>
                                ✅ Optimized
                              </Typography>
                              {result.data.resume_data.work_experience?.slice(0, 1).map((exp, i) => (
                                <Box key={i}>
                                  <Typography variant="body2" fontWeight="600">{exp.title}</Typography>
                                  <Typography variant="caption" color="text.secondary">{exp.company}</Typography>
                                  {exp.achievements?.slice(0, 2).map((ach, j) => (
                                    <Typography key={j} variant="body2" sx={{ mt: 1, fontSize: '0.875rem' }}>
                                      • {ach}
                                    </Typography>
                                  ))}
                                </Box>
                              ))}
                            </Paper>
                          </Grid>
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  </Paper>
                )}

                {/* Expandable Sections */}
                <Paper elevation={2}>
                  
                  <Accordion defaultExpanded={!isMobile}>
                    <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'grey.50' }}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <TipsAndUpdates color="warning" sx={{ fontSize: 24 }} />
                        <Typography variant="h6" fontWeight="600" fontSize={{ xs: '1rem', md: '1.25rem' }}>
                          Job Requirements
                        </Typography>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: { xs: 2, md: 3 } }}>
                      <FormattedText text={formatAIResponse(result.data.jd_analysis.analysis)} />
                    </AccordionDetails>
                  </Accordion>

                  <Divider />

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <AutoAwesome color="secondary" sx={{ fontSize: 24 }} />
                        <Typography variant="h6" fontWeight="600" fontSize={{ xs: '1rem', md: '1.25rem' }}>
                          Optimization Tips
                        </Typography>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: { xs: 2, md: 3 } }}>
                      <FormattedText text={formatAIResponse(result.data.resume_suggestions.suggestions)} />
                    </AccordionDetails>
                  </Accordion>

                  <Divider />

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <School color="success" sx={{ fontSize: 24 }} />
                        <Typography variant="h6" fontWeight="600" fontSize={{ xs: '1rem', md: '1.25rem' }}>
                          Interview Prep
                        </Typography>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: { xs: 2, md: 3 } }}>
                      <FormattedText text={formatAIResponse(result.data.interview_prep.interview_prep)} />
                    </AccordionDetails>
                  </Accordion>

                  <Divider />

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Stack direction="row" alignItems="center" spacing={2} width="100%">
                        <PlayCircleOutline color="error" sx={{ fontSize: 24 }} />
                        <Typography variant="h6" fontWeight="600" fontSize={{ xs: '1rem', md: '1.25rem' }}>
                          Learning Resources
                        </Typography>
                        <Chip label={result.data.youtube_resources.length} size="small" sx={{ ml: 'auto' }} />
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: { xs: 2, md: 3 } }}>
                      <Grid container spacing={2}>
                        {result.data.youtube_resources.map((resource, index) => (
                          <Grid item xs={12} sm={6} md={4} key={index}>
                            <Card component="a" href={resource.url} target="_blank" sx={{
                              textDecoration: 'none', transition: 'all 0.2s',
                              '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
                            }}>
                              <Box sx={{
                                height: 100,
                                background: 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}>
                                <PlayCircleOutline sx={{ fontSize: 40, color: 'white' }} />
                              </Box>
                              <CardContent sx={{ p: 1.5 }}>
                                <Typography variant="body2" fontWeight="600" noWrap>
                                  {resource.topic}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Paper>

                {/* Download */}
                <Paper sx={{
                  p: { xs: 2, md: 3 }, textAlign: 'center',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: 'white'
                }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>Ready to apply?</Typography>
                  <Typography variant="body2" sx={{ mb: 2, opacity: 0.95 }}>
                    Download your optimized resume
                  </Typography>
                  <Button variant="contained" size={isMobile ? 'medium' : 'large'}
                    startIcon={<Download />} onClick={handleDownloadResume}
                    sx={{
                      bgcolor: 'white', color: 'primary.main',
                      py: { xs: 1, md: 1.5 }, px: { xs: 3, md: 4 },
                      '&:hover': { bgcolor: 'grey.100' }
                    }}>
                    Download Resume
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

export default App