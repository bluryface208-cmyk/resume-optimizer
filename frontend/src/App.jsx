import { useState } from 'react'
import axios from 'axios'
import {
  Container,
  Paper,
  Typography,
  Button,
  TextField,
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Stack,
  ThemeProvider,
  createTheme,
  CssBaseline,
  LinearProgress,
  Grid,
  alpha,
  Collapse
} from '@mui/material'
import {
  CloudUpload,
  Description,
  Link as LinkIcon,
  AutoAwesome,
  CheckCircle,
  Error as ErrorIcon,
  Download,
  PlayCircleOutline,
  TipsAndUpdates,
  Psychology,
  School
} from '@mui/icons-material'

// Helper function to clean and format AI responses
const formatAIResponse = (text) => {
  if (!text) return ''
  
  // Remove markdown code blocks
  let cleaned = text.replace(/```[\w]*\n?/g, '')
  
  // Convert **bold** to actual bold (we'll handle this in rendering)
  // For now, just clean it up
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1')
  
  // Remove extra asterisks
  cleaned = cleaned.replace(/\*/g, '')
  
  // Clean up extra newlines (keep max 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  
  return cleaned.trim()
}

// Helper component to render formatted text with bold support
const FormattedText = ({ text }) => {
  const lines = text.split('\n')
  
  return (
    <Box>
      {lines.map((line, index) => {
        // Check if line is a header (starts with number followed by period, or all caps)
        const isHeader = /^(\d+\.|[A-Z\s]{3,}:)/.test(line.trim())
        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-')
        
        if (!line.trim()) {
          return <Box key={index} sx={{ height: '0.5em' }} />
        }
        
        if (isHeader) {
          return (
            <Typography
              key={index}
              variant="h6"
              sx={{
                fontWeight: 700,
                color: 'primary.main',
                mt: index > 0 ? 3 : 0,
                mb: 1.5,
                fontSize: '1.1rem',
              }}
            >
              {line}
            </Typography>
          )
        }
        
        if (isBullet) {
          return (
            <Typography
              key={index}
              variant="body1"
              sx={{
                ml: 2,
                mb: 1,
                lineHeight: 1.8,
                '&::before': {
                  content: '"• "',
                  color: 'primary.main',
                  fontWeight: 'bold',
                  marginLeft: '-1em',
                  marginRight: '0.5em',
                }
              }}
            >
              {line.replace(/^[•\-]\s*/, '')}
            </Typography>
          )
        }
        
        return (
          <Typography
            key={index}
            variant="body1"
            sx={{ mb: 1, lineHeight: 1.8 }}
          >
            {line}
          </Typography>
        )
      })}
    </Box>
  )
}

// Enhanced Modern Theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
      contrastText: '#fff',
    },
    secondary: {
      main: '#ec4899',
      light: '#f472b6',
      dark: '#db2777',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    },
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
    h3: {
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: 16,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0,0,0,0.04)',
    '0px 4px 8px rgba(0,0,0,0.06)',
    '0px 8px 16px rgba(0,0,0,0.08)',
    '0px 12px 24px rgba(0,0,0,0.1)',
    '0px 16px 32px rgba(0,0,0,0.12)',
    ...Array(19).fill('0px 20px 40px rgba(0,0,0,0.15)'),
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(0,0,0,0.15)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0px 6px 16px rgba(0,0,0,0.2)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: '0px 4px 20px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 16,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '1rem',
          minHeight: 60,
        },
      },
    },
  },
})

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

// Define API URL: Use environment variable in production, or localhost in development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  const [jdFile, setJdFile] = useState(null)
  const [resumeFile, setResumeFile] = useState(null)
  const [jdText, setJdText] = useState('')
  const [jdUrl, setJdUrl] = useState('')
  const [tabValue, setTabValue] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setAnalyzing(true)
    setError('')
    setResult(null)
    
    try {
      const formData = new FormData()
      
      if (tabValue === 0 && jdFile) {
        formData.append('job_description', jdFile)
      } else if (tabValue === 1 && jdText) {
        formData.append('jd_text', jdText)
      } else if (tabValue === 2 && jdUrl) {
        formData.append('jd_url', jdUrl)
      }
      
      if (resumeFile) {
        formData.append('resume', resumeFile)
      }
      
      const response = await axios.post(`${API_URL}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      setResult(response.data)
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
  if (!result || !result.success) {
    alert('Please analyze a resume first!')
    return
  }
  
  if (!result.data.resume_data) {
    alert('No resume data available. Please re-analyze your resume.')
    return
  }
  
  try {
    setLoading(true)
    
    const formData = new FormData()
    formData.append('resume_data', JSON.stringify(result.data.resume_data))
    
    const response = await axios.post(
      `${API_URL}/download-resume`,
      formData,
      {
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    )
    
    // Determine file extension from response
    const contentType = response.headers['content-type']
    const extension = contentType.includes('pdf') ? 'pdf' : 'tex'
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `optimized_resume.${extension}`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    
    alert(`✅ Resume downloaded as ${extension.toUpperCase()}!`)
  } catch (error) {
    console.error('Download error:', error)
    alert('Error downloading resume. Please try again.')
  } finally {
    setLoading(false)
  }
}

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pb: 8 }}>
        
        {/* Hero Header with Gradient */}
        <Box sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: 8,
          mb: 6,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          },
        }}>
          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
            <Stack direction="row" spacing={3} alignItems="center" mb={2}>
              <Box sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                borderRadius: '20px',
                p: 2,
                backdropFilter: 'blur(10px)',
              }}>
                <AutoAwesome sx={{ fontSize: 48 }} />
              </Box>
              <Box>
                <Typography variant="h3" component="h1" gutterBottom sx={{ mb: 1 }}>
                  AI Resume Optimizer
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.95, fontWeight: 400 }}>
                  Transform your resume with AI-powered insights • Get hired faster
                </Typography>
              </Box>
            </Stack>
          </Container>
        </Box>

        <Container maxWidth="lg">
          
          {/* Main Upload Card */}
          <Paper 
            elevation={0}
            sx={{ 
              p: 5, 
              mb: 4,
              border: '1px solid',
              borderColor: 'divider',
              background: 'linear-gradient(to bottom, #ffffff 0%, #fafafa 100%)',
            }}
          >
            <form onSubmit={handleSubmit}>
              
              <Typography variant="h5" gutterBottom sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Description color="primary" />
                Job Description
              </Typography>
              
              <Tabs 
                value={tabValue} 
                onChange={(e, newValue) => setTabValue(newValue)}
                sx={{ 
                  mb: 3,
                  '& .MuiTab-root': {
                    minWidth: 'auto',
                    px: 3,
                  }
                }}
                TabIndicatorProps={{
                  style: {
                    height: 4,
                    borderRadius: '4px 4px 0 0',
                  }
                }}
              >
                <Tab icon={<CloudUpload />} iconPosition="start" label="Upload File" />
                <Tab icon={<Description />} iconPosition="start" label="Paste Text" />
                <Tab icon={<LinkIcon />} iconPosition="start" label="URL" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 6, 
                    textAlign: 'center',
                    bgcolor: alpha(theme.palette.primary.main, 0.03),
                    border: '2px dashed',
                    borderColor: jdFile ? 'primary.main' : 'divider',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      borderColor: 'primary.main',
                      transform: 'translateY(-2px)',
                    }
                  }}
                >
                  <input
                    accept=".pdf,.txt,.docx,.doc,.rtf,.odt,.html,.htm,.md"
                    style={{ display: 'none' }}
                    id="jd-file-upload"
                    type="file"
                    onChange={(e) => setJdFile(e.target.files[0])}
                  />
                  <label htmlFor="jd-file-upload" style={{ cursor: 'pointer', width: '100%', display: 'block' }}>
                    <CloudUpload sx={{ fontSize: 72, color: 'primary.main', mb: 2, opacity: 0.7 }} />
                    <Typography variant="h6" gutterBottom color="text.primary">
                      {jdFile ? `✓ ${jdFile.name}` : 'Drop your job description here'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      PDF, DOCX, TXT, or other formats supported
                    </Typography>
                  </label>
                </Paper>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <TextField
                  fullWidth
                  multiline
                  rows={10}
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the complete job description here...&#10;&#10;Include:&#10;• Job title and company&#10;• Required skills and qualifications&#10;• Responsibilities&#10;• Experience requirements"
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'background.paper',
                    }
                  }}
                />
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <TextField
                  fullWidth
                  value={jdUrl}
                  onChange={(e) => setJdUrl(e.target.value)}
                  placeholder="https://example.com/job-posting"
                  variant="outlined"
                  type="url"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'background.paper',
                    }
                  }}
                />
              </TabPanel>

              <Divider sx={{ my: 5 }} />

              <Typography variant="h5" gutterBottom sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Description color="secondary" />
                Your Resume
              </Typography>
              
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 6, 
                  textAlign: 'center',
                  bgcolor: alpha(theme.palette.secondary.main, 0.03),
                  border: '2px dashed',
                  borderColor: resumeFile ? 'secondary.main' : 'divider',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.secondary.main, 0.08),
                    borderColor: 'secondary.main',
                    transform: 'translateY(-2px)',
                  }
                }}
              >
                <input
                  accept=".pdf,.txt,.docx,.doc,.rtf,.odt"
                  style={{ display: 'none' }}
                  id="resume-file-upload"
                  type="file"
                  onChange={(e) => setResumeFile(e.target.files[0])}
                />
                <label htmlFor="resume-file-upload" style={{ cursor: 'pointer', width: '100%', display: 'block' }}>
                  <Description sx={{ fontSize: 72, color: 'secondary.main', mb: 2, opacity: 0.7 }} />
                  <Typography variant="h6" gutterBottom color="text.primary">
                    {resumeFile ? `✓ ${resumeFile.name}` : 'Drop your resume here'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    PDF, DOCX, or TXT format
                  </Typography>
                </label>
              </Paper>

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading || !isFormValid()}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />}
                sx={{ 
                  mt: 5,
                  py: 2.5,
                  fontSize: '1.1rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #63398d 100%)',
                  },
                  '&:disabled': {
                    background: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)',
                  }
                }}
              >
                {loading ? 'Analyzing with AI...' : '✨ Analyze & Optimize Resume'}
              </Button>
            </form>
          </Paper>

          {/* Loading State */}
          {analyzing && (
            <Paper sx={{ p: 4, mb: 4, textAlign: 'center' }}>
              <CircularProgress size={60} sx={{ mb: 3 }} />
              <Typography variant="h6" gutterBottom>
                AI is analyzing your resume...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This may take 10-20 seconds
              </Typography>
              <LinearProgress sx={{ mt: 3, borderRadius: 2 }} />
            </Paper>
          )}

          {/* Error Alert */}
          {error && (
            <Alert 
              severity="error" 
              icon={<ErrorIcon />} 
              sx={{ mb: 4, borderRadius: 3 }}
              onClose={() => setError('')}
            >
              <strong>Error:</strong> {error}
            </Alert>
          )}

          {/* Results */}
          {result && result.success && (
            <Collapse in={!!result}>
              <Stack spacing={4}>
                
                {/* Success Banner */}
                <Paper
                  sx={{
                    p: 4,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <CheckCircle sx={{ fontSize: 48 }} />
                    <Box>
                      <Typography variant="h5" fontWeight="bold" gutterBottom>
                        Analysis Complete! 🎉
                      </Typography>
                      <Typography variant="body1">
                        Your resume has been analyzed by AI. Review the insights below and download your optimized version.
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>

                {/* ATS Score - Featured Card */}
                <Card 
                  elevation={4}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                      <Psychology sx={{ fontSize: 40 }} />
                      <Typography variant="h4" fontWeight="bold">
                        ATS Compatibility Score
                      </Typography>
                    </Stack>
                    <Paper 
                        elevation={0}
                        sx={{ 
                          p: 4, 
                          bgcolor: 'rgba(255,255,255,0.95)',
                          color: 'text.primary',
                          borderRadius: 3,
                        }}
      >
  <FormattedText text={formatAIResponse(result.data.ats_score.score_analysis)} />
</Paper>
                  </CardContent>
                </Card>

                <Grid container spacing={3}>
                  
                  {/* Job Analysis */}
                  <Grid item xs={12} md={6}>
                    <Card elevation={2} sx={{ height: '100%' }}>
                      <CardContent sx={{ p: 4 }}>
                        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                          <TipsAndUpdates color="warning" sx={{ fontSize: 32 }} />
                          <Typography variant="h6" fontWeight="bold">
                            Job Requirements
                          </Typography>
                        </Stack>
                        <Paper 
  elevation={0}
  sx={{ 
    p: 3, 
    bgcolor: 'grey.50',
    maxHeight: 400,
    overflow: 'auto',
  }}
>
  <FormattedText text={formatAIResponse(result.data.jd_analysis.analysis)} />
</Paper>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Resume Suggestions */}
                  <Grid item xs={12} md={6}>
                    <Card elevation={2} sx={{ height: '100%' }}>
                      <CardContent sx={{ p: 4 }}>
                        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                          <AutoAwesome color="secondary" sx={{ fontSize: 32 }} />
                          <Typography variant="h6" fontWeight="bold">
                            Optimization Tips
                          </Typography>
                        </Stack>
                        <Paper 
  elevation={0}
  sx={{ 
    p: 3, 
    bgcolor: 'grey.50',
    maxHeight: 400,
    overflow: 'auto',
  }}
>
  <FormattedText text={formatAIResponse(result.data.resume_suggestions.suggestions)} />
</Paper>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Interview Prep */}
                <Card elevation={2}>
                  <CardContent sx={{ p: 4 }}>
                    <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                      <School color="success" sx={{ fontSize: 32 }} />
                      <Typography variant="h5" fontWeight="bold">
                        Interview Preparation Guide
                      </Typography>
                    </Stack>
                    <Paper 
  elevation={0}
  sx={{ 
    p: 4, 
    bgcolor: 'grey.50',
  }}
>
  <FormattedText text={formatAIResponse(result.data.interview_prep.interview_prep)} />
</Paper>
                  </CardContent>
                </Card>

                {/* YouTube Resources */}
<Card elevation={2}>
  <CardContent sx={{ p: 4 }}>
    <Stack direction="row" alignItems="center" spacing={2} mb={3}>
      <PlayCircleOutline color="error" sx={{ fontSize: 32 }} />
      <Typography variant="h5" fontWeight="bold">
        Learning Resources
      </Typography>
    </Stack>
    <Typography variant="body2" color="text.secondary" mb={3}>
      Master these topics to ace your interview:
    </Typography>
    <Grid container spacing={3}>
      {result.data.youtube_resources.map((resource, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Card
            component="a"
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              textDecoration: 'none',
              display: 'block',
              transition: 'all 0.3s',
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: 6,
              }
            }}
          >
            {/* Thumbnail Area */}
            <Box
              sx={{
                height: 160,
                background: 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                '&:hover .play-icon': {
                  transform: 'scale(1.2)',
                }
              }}
            >
              <PlayCircleOutline
                className="play-icon"
                sx={{
                  fontSize: 64,
                  color: 'white',
                  transition: 'transform 0.3s',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                }}
              />
            </Box>
            
            {/* Content Area */}
            <CardContent sx={{ p: 2.5 }}>
              <Typography 
                variant="body1" 
                fontWeight="600"
                color="text.primary"
                sx={{
                  mb: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  minHeight: '3em',
                }}
              >
                {resource.topic}
              </Typography>
              <Chip
                label="Search on YouTube"
                size="small"
                icon={<PlayCircleOutline />}
                sx={{
                  bgcolor: '#ff0000',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  '&:hover': {
                    bgcolor: '#cc0000',
                  }
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  </CardContent>
</Card>

                {/* Download Button - Prominent */}
                <Paper 
                  sx={{ 
                    p: 4, 
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    color: 'white',
                  }}
                >
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Ready to apply?
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 3, opacity: 0.95 }}>
                    Download your AI-optimized resume and start applying!
                  </Typography>

                  {/* DEBUG BUTTON - Add this temporarily */}
  <Button
    variant="outlined"
    size="small"
    onClick={() => {
      console.log('=== RESUME DATA ===')
      console.log(JSON.stringify(result.data.resume_data, null, 2))
      console.log('===================')
      alert('Check browser console (F12) for resume data')
    }}
    sx={{
      mb: 2,
      bgcolor: 'rgba(255,255,255,0.2)',
      color: 'white',
      borderColor: 'white',
      '&:hover': {
        bgcolor: 'rgba(255,255,255,0.3)',
      }
    }}
  >
    🔍 Debug: Show Resume Data
  </Button>

                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Download />}
                    onClick={handleDownloadResume}
                    sx={{
                      bgcolor: 'white',
                      color: 'primary.main',
                      py: 2,
                      px: 5,
                      fontSize: '1.1rem',
                      '&:hover': {
                        bgcolor: 'grey.100',
                      }
                    }}
                  >
                    Download Optimized Resume
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