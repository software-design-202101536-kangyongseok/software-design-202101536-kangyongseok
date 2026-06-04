import { useState, useEffect } from 'react'
import './App.css'
import Login from './Login'

const API_URL = import.meta.env.VITE_API_URL || ''
const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY || ''

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('search')
  const [studentName, setStudentName] = useState('')
  const [studentData, setStudentData] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Registration form state
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    gender: '',
    subject: [],
    bio: '',
    kakaoId: '',
    parents: [{ name: '', kakaoId: '', email: '' }]
  })

  // Grade form state
  const [gradeData, setGradeData] = useState({
    subject: '',
    score: '',
    year: new Date().getFullYear(),
    term: 1
  })
  const [showGradeModal, setShowGradeModal] = useState(false)

  // Grade scale state
  const [gradeScale, setGradeScale] = useState({
    'A+': 90,
    'A': 80,
    'B+': 70,
    'B': 60,
    'C+': 50,
    'C': 40,
    'D': 30,
    'F': 0
  })
  const [showGradeScaleModal, setShowGradeScaleModal] = useState(false)

  // Attendance form state
  const [attendanceData, setAttendanceData] = useState({
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    status: 'present'
  })
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)

  // Edit student state
  const [editData, setEditData] = useState({
    name: '',
    birthDate: '',
    gender: '',
    subject: [],
    bio: '',
    kakaoId: '',
    parents: [{ name: '', kakaoId: '', email: '' }]
  })
  const [showEditModal, setShowEditModal] = useState(false)

  // Student info modal state
  const [showStudentModal, setShowStudentModal] = useState(false)

  const isAdminOrTeacher = user?.userType === 'teacher' || user?.userType === 'admin' || user?.isAdmin
  const isViewer = user?.userType === 'student' || user?.userType === 'parent'

  const defaultSubjects = ['국어', '영어', '수학', '사회', '과학']

  // Sorting state
  const [sortColumn, setSortColumn] = useState('term')
  const [sortDirection, setSortDirection] = useState('asc')

  // All students data for ranking
  const [allStudents, setAllStudents] = useState([])
  const [allStudentsLoading, setAllStudentsLoading] = useState(false)
  const [allStudentsError, setAllStudentsError] = useState('')
  const [applications, setApplications] = useState([])
  const [applicationsLoading, setApplicationsLoading] = useState(false)
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [approvalFormData, setApprovalFormData] = useState({
    applicationId: '',
    name: '',
    birthDate: '',
    gender: ''
  })

  // Settings state
  const [subjects, setSubjects] = useState(defaultSubjects)
  const [newSubject, setNewSubject] = useState('')
  // Feedback state
  const [feedbackData, setFeedbackData] = useState({
    studentId: '',
    academicPerformance: '',  // 성적
    attendance: '',            // 출결
    behavior: '',             // 행동
    attitude: '',             // 태도
    additionalComments: '',    // 추가 의견
    shareWithTeachers: false   // 다른 교사와 공유 여부
  })
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [studentFeedbacks, setStudentFeedbacks] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [showNotificationsModal, setShowNotificationsModal] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [counselingRequests, setCounselingRequests] = useState([])
  const [selectedCounseling, setSelectedCounseling] = useState(null)
  const [showCounselingModal, setShowCounselingModal] = useState(false)
  const [counselingForm, setCounselingForm] = useState({ date: new Date().toISOString().split('T')[0], time: '15:00' })
  const [counselingError, setCounselingError] = useState('')
  const [counselingSuccess, setCounselingSuccess] = useState('')
  const [counselingLoading, setCounselingLoading] = useState(false)
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date().toISOString().split('T')[0])  // 피드백 불러오기
  const fetchFeedbacks = async (studentId) => {
    try {
      const viewerParams = user ? `?viewerType=${encodeURIComponent(user.userType)}&viewerName=${encodeURIComponent(user.username)}` : ''
      const response = await fetch(`${API_URL}/students/${studentId}/feedbacks${viewerParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch feedbacks')
      }
      const data = await response.json()
      setStudentFeedbacks(data)
    } catch (err) {
      console.error('Error fetching feedbacks:', err)
      setStudentFeedbacks([])
    }
  }

  const fetchNotifications = async () => {
    if (!user || (user.userType !== 'student' && user.userType !== 'parent')) return

    const studentId = user.studentId || studentData?.studentId
    if (!studentId) return

    setNotificationsLoading(true)
    setNotificationsError('')

    try {
      const queryParams = new URLSearchParams()
      queryParams.append('viewerType', user.userType)
      queryParams.append('studentId', studentId)
      if (user.userType === 'student') {
        queryParams.append('viewerName', user.username)
      }

      const response = await fetch(`${API_URL}/students/notifications?${queryParams.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const data = await response.json()
      setNotifications(data)
      setUnreadNotifications(data.filter(notification => !notification.read).length)
      return data
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setNotifications([])
      setUnreadNotifications(0)
      setNotificationsError(err.message)
      return []
    } finally {
      setNotificationsLoading(false)
    }
  }

  const markNotificationsRead = async () => {
    if (!user) return
    const studentId = user.studentId || studentData?.studentId
    if (!studentId) return

    try {
      const queryParams = new URLSearchParams()
      queryParams.append('viewerType', user.userType)
      queryParams.append('studentId', studentId)
      if (user.userType === 'student') {
        queryParams.append('viewerName', user.username)
      }

      const response = await fetch(`${API_URL}/students/notifications/mark-all-read?${queryParams.toString()}`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to mark notifications as read')
      }

      setNotifications(prev => prev.map(notification => ({ ...notification, read: true })))
      setUnreadNotifications(0)
    } catch (err) {
      console.error('Error marking notifications read:', err)
    }
  }

  const handleNotificationsClick = async () => {
    const notificationsData = await fetchNotifications()
    setShowNotificationsModal(true)
    if (notificationsData.some(notification => !notification.read)) {
      await markNotificationsRead()
    }
  }

  const getMonthDays = (year, month) => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []
    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      days.push(new Date(year, month, day))
    }
    return days
  }

  const formatDateKey = (date) => {
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return ''

    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  const formatSelectedDateLabel = (dateKey) => {
    const d = new Date(dateKey)
    if (Number.isNaN(d.getTime())) return dateKey
    const [year, month, day] = String(dateKey).split('-')
    if (!year || !month || !day) return dateKey
    return `${year}년 ${Number(month)}월 ${Number(day)}일`
  }

  const fetchCounselings = async () => {
    if (!user) return
    try {
      let response
      if (isAdminOrTeacher) {
        response = await fetch(`${API_URL}/students/teacher/counselings`)
      } else {
        const studentId = user.studentId || studentData?.studentId
        if (!studentId) return
        response = await fetch(`${API_URL}/students/${studentId}/counselings`)
      }
      if (!response.ok) {
        throw new Error('Failed to fetch counseling schedules')
      }
      const data = await response.json()
      setCounselingRequests(data)
      if (data.length > 0) {
        setSelectedCalendarDate(formatDateKey(data[0].dateTime))
      }
    } catch (err) {
      console.error('Error fetching counselings:', err)
      setCounselingRequests([])
    }
  }

  const handleCounselingChange = (e) => {
    const { name, value } = e.target
    setCounselingForm(prev => ({ ...prev, [name]: value }))
  }

  const handleCreateCounselingRequest = async (e) => {
    e.preventDefault()
    if (!studentData || !studentData.studentId) {
      setCounselingError('학생 정보를 찾을 수 없습니다.')
      return
    }
    if (!counselingForm.date || !counselingForm.time) {
      setCounselingError('날짜와 시간을 모두 선택해주세요.')
      return
    }

    setCounselingError('')
    setCounselingSuccess('')
    setCounselingLoading(true)

    try {
      const response = await fetch(`${API_URL}/students/${studentData.studentId}/counselings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherName: user.username || 'teacher1',
          date: counselingForm.date,
          time: counselingForm.time
        })
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to request counseling')
      }
      await fetchCounselings()
      setCounselingSuccess('상담 신청이 접수되었습니다.')
    } catch (err) {
      setCounselingError(err.message || '상담 신청에 실패했습니다.')
    } finally {
      setCounselingLoading(false)
    }
  }

  const handleCounselingStatusUpdate = async (counselingId, status, rejectionReason = '') => {
    setCounselingLoading(true)
    try {
      const response = await fetch(`${API_URL}/students/counselings/${counselingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason })
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update counseling status')
      }
      await fetchCounselings()
      setSelectedCounseling(prev => prev && prev._id === counselingId ? { ...prev, status, rejectionReason } : prev)
    } catch (err) {
      console.error('Error updating counseling status:', err)
      setCounselingError(err.message || '상담 상태 업데이트에 실패했습니다.')
    } finally {
      setCounselingLoading(false)
    }
  }

  const handleSaveCounselingNotes = async (counselingId, notes) => {
    setCounselingLoading(true)
    try {
      const response = await fetch(`${API_URL}/students/counselings/${counselingId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherNotes: notes })
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to save counseling notes')
      }
      await fetchCounselings()
      setCounselingSuccess('상담 내용이 저장되었습니다.')
    } catch (err) {
      console.error('Error saving counseling notes:', err)
      setCounselingError(err.message || '상담 내용을 저장하지 못했습니다.')
    } finally {
      setCounselingLoading(false)
    }
  }

  const handleDateSelect = (dateKey) => {
    setSelectedCalendarDate(dateKey)
  }

  const getCounselingsByDate = (dateKey) => {
    return counselingRequests.filter(item => formatDateKey(item.dateTime) === dateKey)
  }

  const getCalendarTitle = () => {
    const monthName = new Date(calendarYear, calendarMonth).toLocaleString('ko-KR', { month: 'long' })
    return `${calendarYear}년 ${monthName}`
  }

  const calendarDays = getMonthDays(calendarYear, calendarMonth)

  const handlePrevMonth = () => {
    const newMonth = calendarMonth - 1
    if (newMonth < 0) {
      setCalendarYear(calendarYear - 1)
      setCalendarMonth(11)
    } else {
      setCalendarMonth(newMonth)
    }
  }

  const handleNextMonth = () => {
    const newMonth = calendarMonth + 1
    if (newMonth > 11) {
      setCalendarYear(calendarYear + 1)
      setCalendarMonth(0)
    } else {
      setCalendarMonth(newMonth)
    }
  }

  const getEventCountForDate = (dateKey) => {
    return counselingRequests.filter(item => formatDateKey(item.dateTime) === dateKey).length
  }

  const getEventStatusesForDate = (dateKey) => {
    const statuses = counselingRequests
      .filter(item => formatDateKey(item.dateTime) === dateKey)
      .map(item => item.status)
    return Array.from(new Set(statuses))
  }

  const getStatusColor = (status) => {
    if (status === 'accepted') return '#1976D2'
    if (status === 'pending') return '#9e9e9e'
    return '#000'
  }

  const getSelectedDateRequests = () => {
    const filtered = getCounselingsByDate(selectedCalendarDate)
    return filtered.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
  }

  const handleShowCounselingDetails = (counseling) => {
    setSelectedCounseling(counseling)
    setShowCounselingModal(true)
  }

  const handleCounselingFormReset = () => {
    setCounselingForm({ date: new Date().toISOString().split('T')[0], time: '15:00' })
    setCounselingError('')
    setCounselingSuccess('')
  }

  const handleTeacherNotesChange = (e) => {
    if (!selectedCounseling) return
    setSelectedCounseling({ ...selectedCounseling, teacherNotes: e.target.value })
  }

  const handleStudentNotesSave = async () => {
    if (!selectedCounseling) return
    await handleSaveCounselingNotes(selectedCounseling._id, selectedCounseling.teacherNotes || '')
  }

  const handleAddFeedback = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!feedbackData.academicPerformance && !feedbackData.attendance && 
        !feedbackData.behavior && !feedbackData.attitude && !feedbackData.additionalComments) {
      setError('최소 한 가지 항목을 작성해주세요.')
      return
    }

    setLoading(true)
    if (!studentData || !studentData.studentId || !studentData.username) {
    setError('학생 정보를 찾을 수 없습니다.')
    setLoading(false)
    return
    }
    // 학생 이름 저장 
    const currentStudentId = studentData.studentId
    const currentStudentName = studentData.username
    try {
      const response = await fetch(`${API_URL}/students/feedbacks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: studentData.studentId,
          academicPerformance: feedbackData.academicPerformance.trim(),
          attendance: feedbackData.attendance.trim(),
          behavior: feedbackData.behavior.trim(),
          attitude: feedbackData.attitude.trim(),
          additionalComments: feedbackData.additionalComments.trim(),
          shareWithTeachers: feedbackData.shareWithTeachers,
          teacherName: user.username
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to add feedback')
      }

      setSuccess('피드백이 성공적으로 등록되었습니다!')
      setFeedbackData({
        studentId: '',
        academicPerformance: '',
        attendance: '',
        behavior: '',
        attitude: '',
        additionalComments: '',
        shareWithTeachers: false
      })

      try {
        await fetchStudent(currentStudentName, false)
        setShowStudentModal(true)
      } catch (fetchErr) {
      console.error('Error fetching student:', fetchErr)
      }

      setShowFeedbackModal(false)
    } catch (err) {
      if (err instanceof TypeError) {
        setError('Network error: Unable to connect to server.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }  // 피드백 폼 변경
  const handleFeedbackChange = (e) => {
    const { name, value, type, checked } = e.target
    setFeedbackData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  useEffect(() => {
    if (!user) return

    if (activeTab === 'settings') {
      fetchSubjects()
    }
    fetchSubjects() // Always fetch subjects for register/edit

    if (activeTab === 'register' && isAdminOrTeacher) {
      fetchApplications()
    }

    if (activeTab === 'search') {
      if (user.userType === 'student') {
        // 학생은 본인 정보 자동 검색 및 표시
        setStudentName(user.username)
        fetchStudent(user.username, true)
      } else if (user.userType === 'parent') {
        // 학부모는 연결된 자녀 정보 자동 검색 및 표시
        if (user.studentName) {
          setStudentName(user.studentName)
          fetchStudent(user.studentName, true)
        }
      } else {
        fetchAllStudents()
      }
    }

    if (activeTab === 'counseling') {
      fetchCounselings()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user])

  useEffect(() => {
    if (!user || (user.userType !== 'student' && user.userType !== 'parent')) return
    
    fetchNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, studentData?.studentId])

  const validateBirthDate = (birthDate) => {
    if (!birthDate) return 'Birth date is required'
    const date = new Date(birthDate)
    if (Number.isNaN(date.getTime())) return 'Birth date must be a valid date'
    return null
  }

  const validateParentData = (parents) => {
    if (!Array.isArray(parents)) return []
    return parents
      .map((parent, index) => {
        const name = (parent.name || '').trim()
        const email = (parent.email || '').trim()
        const kakaoId = (parent.kakaoId || '').trim()
        if (!name && !email && !kakaoId) {
          return null
        }
        if (!name) {
          return `Parent #${index + 1}: name is required when parent information is provided`
        }
        if (!email && !kakaoId) {
          return `Parent #${index + 1}: either email or Kakao ID is required`
        }
        return null
      })
      .filter(Boolean)
  }

  const validateFormData = () => {
    if (!formData.name || !formData.name.trim()) {
      return 'Student name is required'
    }
    if (!formData.birthDate) {
      return 'Birth date is required'
    }
    const birthDateError = validateBirthDate(formData.birthDate)
    if (birthDateError) return birthDateError
    if (!formData.gender || !['male', 'female'].includes(formData.gender)) {
      return 'Gender is required and must be male or female'
    }
    if (!formData.subject || formData.subject.length === 0) {
      return 'At least one subject is required'
    }
    if (!formData.bio || !formData.bio.trim()) {
      return 'Biography is required'
    }
    const parentErrors = validateParentData(formData.parents)
    if (parentErrors.length > 0) {
      return parentErrors[0]
    }
    return null
  }

  const getGrade = (score) => {
    const sortedGrades = Object.entries(gradeScale).sort((a, b) => b[1] - a[1])
    for (const [grade, minScore] of sortedGrades) {
      if (score >= minScore) return grade
    }
    return 'F'
  }

  const getRank = (subject, score) => {
    if (!allStudents.length) return '-'
    
    const allScores = []
    allStudents.forEach(student => {
      student.grades.forEach(grade => {
        if (grade.subject === subject) {
          allScores.push(grade.score)
        }
      })
    })
    
    if (allScores.length === 0) return '-'
    
    allScores.sort((a, b) => b - a) // 내림차순
    const rank = allScores.indexOf(score) + 1
    return `${rank}/${allScores.length}`
  }

  // 새 등수 계산기: 학생별 최신 성적만 한 번만 고려하여 등수 산출
  // 등수: 동일 학기(year+term)에서 같은 과목을 본 학생들 사이의 등수로 계산
  const getRankForStudent = (subject, score, studentId = null, year = null, term = null) => {
    if (!allStudents.length) return '-'

    // 특정 학기 정보가 없으면 기존 동작(학생 최신) 대신 전체 최신을 사용
    if (year === null || term === null) {
      // fallback: 기존 최신 기반 계산
      const perStudentLatest = []
      allStudents.forEach(student => {
        let latest = null
        (student.grades || []).forEach(g => {
          if (g.subject !== subject) return
          const termKey = (Number(g.year) || 0) * 10 + (Number(g.term) || 0)
          if (!latest || termKey > latest.termKey) latest = { score: Number(g.score) || 0, termKey }
        })
        if (latest) perStudentLatest.push({ id: student._id || student.id || student.studentId, score: latest.score })
      })
      if (perStudentLatest.length === 0) return '-'
      const scores = perStudentLatest.map(s => s.score).sort((a, b) => b - a)
      let targetScore = score
      if (studentId) {
        const found = perStudentLatest.find(s => String(s.id) === String(studentId))
        if (found) targetScore = found.score
      }
      const rank = scores.indexOf(Number(targetScore)) + 1
      return `${rank}/${scores.length}`
    }

    // 학기(year, term) 기준으로 각 학생이 해당 학기 동일 과목을 봤는지 확인하여 점수 리스트 구성
    const perStudentTermScores = []
    allStudents.forEach(student => {
      const g = (student.grades || []).find(x => String(x.subject) === String(subject) && Number(x.year) === Number(year) && Number(x.term) === Number(term))
      if (g) perStudentTermScores.push({ id: student._id || student.id || student.studentId, score: Number(g.score) || 0 })
    })

    if (perStudentTermScores.length === 0) return '-'
    const scores = perStudentTermScores.map(s => s.score).sort((a, b) => b - a)

    let targetScore = score
    if (studentId) {
      const found = perStudentTermScores.find(s => String(s.id) === String(studentId))
      if (found) targetScore = found.score
    }

    const rank = scores.indexOf(Number(targetScore)) + 1
    return `${rank}/${scores.length}`
  }

  const downloadReport = async (reportType) => {
    if (!studentData || !studentData.studentId) {
      alert('학생 정보가 없습니다.')
      return
    }
    try {
      const res = await fetch(`${API_URL}/students/${studentData.studentId}/reports/${reportType}?format=xlsx`)
      if (!res.ok) throw new Error('서버에서 파일을 가져오지 못했습니다.')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const namePart = (studentData.username || studentData.studentName || 'student').replace(/\s+/g, '_')
      a.download = `${namePart}-${reportType}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('다운로드 중 오류가 발생했습니다.')
    }
  }

  const getRadarChartData = (grades) => {
    const subjectScores = {}

    grades.forEach((grade) => {
      const subject = grade.subject || 'Unknown'
      subjectScores[subject] = Number(grade.score) || 0
    })

    return Object.keys(subjectScores)
      .sort((a, b) => a.localeCompare(b))
      .map((subject) => ({ subject, score: subjectScores[subject] }))
  }

  const getGradesGroupedByTerm = (grades) => {
    const groups = {}

    grades.forEach((grade) => {
      const year = Number(grade.year)
      const term = Number(grade.term)
      const subject = grade.subject
      if (!year || !term || !subject) return

      const key = `${year}-${term}`
      if (!groups[key]) {
        groups[key] = { year, term, grades: [] }
      }
      groups[key].grades.push(grade)
    })

    return Object.values(groups).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return a.term - b.term
    })
  }

  const renderGradeRadarChart = (grades) => {
    const data = getRadarChartData(grades)
    if (!data.length) {
      return <p style={{ color: '#666', marginTop: '8px' }}>성적이 없어 레이더 차트를 표시할 수 없습니다.</p>
    }

    const size = 260
    const center = size / 2
    const maxRadius = 100
    const stepCount = 5
    const angleStep = (Math.PI * 2) / data.length

    const gridLines = Array.from({ length: stepCount }, (_, index) => {
      const radius = ((index + 1) / stepCount) * maxRadius
      return (
        <circle
          key={`grid-${index}`}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#ddd"
          strokeWidth="1"
        />
      )
    })

    const axisLines = data.map((item, index) => {
      const angle = angleStep * index - Math.PI / 2
      const x = center + Math.cos(angle) * maxRadius
      const y = center + Math.sin(angle) * maxRadius
      return (
        <line
          key={`axis-${item.subject}`}
          x1={center}
          y1={center}
          x2={x}
          y2={y}
          stroke="#bbb"
          strokeWidth="1"
        />
      )
    })

    const polygonPoints = data.map((item, index) => {
      const angle = angleStep * index - Math.PI / 2
      const radius = (Number(item.score) / 100) * maxRadius
      const x = center + Math.cos(angle) * radius
      const y = center + Math.sin(angle) * radius
      return `${x},${y}`
    }).join(' ')

    const labels = data.map((item, index) => {
      const angle = angleStep * index - Math.PI / 2
      const x = center + Math.cos(angle) * (maxRadius + 18)
      const y = center + Math.sin(angle) * (maxRadius + 18)
      const textAnchor = Math.abs(Math.cos(angle)) < 0.1 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end'
      const dy = Math.sin(angle) > 0.2 ? '0.9em' : Math.sin(angle) < -0.2 ? '-0.3em' : '0.35em'
      return (
        <text key={`label-${item.subject}`} x={x} y={y} textAnchor={textAnchor} dy={dy} style={{ fontSize: '12px', fill: '#333' }}>
          {item.subject}
        </text>
      )
    })

    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
        <svg width={size} height={size} style={{ display: 'block' }}>
          {gridLines}
          {axisLines}
          <polygon
            points={polygonPoints}
            fill="rgba(33, 150, 243, 0.25)"
            stroke="#1976D2"
            strokeWidth="2"
          />
          {data.map((item, index) => {
            const angle = angleStep * index - Math.PI / 2
            const radius = (Number(item.score) / 100) * maxRadius
            const x = center + Math.cos(angle) * radius
            const y = center + Math.sin(angle) * radius
            return (
              <circle
                key={`dot-${item.subject}`}
                cx={x}
                cy={y}
                r="4"
                fill="#1976D2"
                stroke="#fff"
                strokeWidth="1.5"
              />
            )
          })}
          {labels}
        </svg>
      </div>
    )
  }

  const renderGradeRadarChartsByTerm = (grades) => {
    const groups = getGradesGroupedByTerm(grades)
    if (!groups.length) {
      return <p style={{ color: '#666', marginTop: '8px' }}>성적이 없어 레이더 차트를 표시할 수 없습니다.</p>
    }

    return (
      <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {groups.map((group) => (
          <div key={`${group.year}-${group.term}`} style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '8px', background: '#fff' }}>
            <h4 style={{ margin: '0 0 12px 0' }}>{group.year}년 Term {group.term}</h4>
            {renderGradeRadarChart(group.grades)}
          </div>
        ))}
      </div>
    )
  }

  const handleGradeScaleChange = (grade, value) => {
    setGradeScale(prev => ({
      ...prev,
      [grade]: Number.parseInt(value) || 0
    }))
  }

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleAddSubject = async () => {
    if (!newSubject.trim()) return
    try {
      const response = await fetch(`${API_URL}/students/subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newSubject.trim() })
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message)
      }
      setNewSubject('')
      fetchSubjects()
    } catch (err) {
      alert('Error adding subject: ' + err.message)
    }
  }

  const handleDeleteSubject = async (subjectName) => {
    if (!confirm(`"${subjectName}" 과목을 삭제하시겠습니까?`)) return
    try {
      const response = await fetch(`${API_URL}/students/subjects/${encodeURIComponent(subjectName)}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message)
      }
      fetchSubjects()
    } catch (err) {
      alert('Error deleting subject: ' + err.message)
    }
  }

  const resetSessionState = () => {
    setActiveTab('search')
    setStudentName('')
    setStudentData(null)
    setError('')
    setSuccess('')
    setSubjectFilter('')
    setLoading(false)
    setAllStudents([])
    setAllStudentsError('')
    setShowStudentModal(false)
    setShowGradeModal(false)
    setShowGradeScaleModal(false)
    setShowAttendanceModal(false)
    setShowEditModal(false)
    setShowFeedbackModal(false)
    setShowNotificationsModal(false)
    setStudentFeedbacks([])
    setFeedbackData({
      studentId: '',
      academicPerformance: '',
      attendance: '',
      behavior: '',
      attitude: '',
      additionalComments: '',
      shareWithTeachers: false
    })
    setNotifications([])
    setUnreadNotifications(0)
    setNotificationsLoading(false)
    setNotificationsError('')
    setFormData({
      name: '',
      birthDate: '',
      gender: '',
      subject: [],
      bio: '',
      kakaoId: '',
      parents: [{ name: '', kakaoId: '', email: '' }]
    })
    setGradeData({ subject: '', score: '', year: new Date().getFullYear(), term: 1 })
    setAttendanceData({ date: new Date().toISOString().split('T')[0], status: 'present' })
    setEditData({
      name: '',
      birthDate: '',
      gender: '',
      subject: [],
      bio: '',
      kakaoId: '',
      parents: [{ name: '', kakaoId: '', email: '' }]
    })
    setApplications([])
    setApplicationsLoading(false)
    setNewSubject('')
  }

  const fetchStudent = async (name = studentName, showModal = false) => {
    const searchName = name || studentName
    if (!searchName || !searchName.trim()) {
      setError('Please enter a student name')
      return
    }
    
    setLoading(true)
    setError('')
    setStudentData(null)
    setShowStudentModal(false)
    
    try {
      const response = await fetch(`${API_URL}/students?name=${encodeURIComponent(searchName)}&subject=${encodeURIComponent(subjectFilter)}`)
      
      if (response.status === 404) {
        throw new Error(`Student "${searchName}" not found`)
      }
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Server error: ${response.status}`)
      }
      
      const data = await response.json()
      setStudentData(data)
      setError('')
      setShowStudentModal(showModal)
      
      if (data && data.studentId) {
        await fetchFeedbacks(data.studentId)
      }

      // Fetch all students for ranking
      fetchAllStudents()
    } catch (err) {
      if (err instanceof TypeError) {
        setError('Network error: Unable to connect to server. Please check if the server is running.')
      } else {
        setError(err.message)
      }
      setStudentData(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllStudents = async () => {
    setAllStudentsLoading(true)
    setAllStudentsError('')
    try {
      const response = await fetch(`${API_URL}/students/all`)
      if (!response.ok) {
        throw new Error('Failed to fetch all students')
      }
      const data = await response.json()
      setAllStudents(data)
      setAllStudentsError('')
    } catch (err) {
      console.error('Error fetching all students:', err)
      setAllStudentsError(err.message || 'Failed to fetch all students')
      setAllStudents([]) // Clear the list on error
    } finally {
      setAllStudentsLoading(false)

    }
  }

  const fetchApplications = async () => {
    setApplicationsLoading(true)
    try {
      const response = await fetch(`${API_URL}/students/applications`)
      if (!response.ok) {
        throw new Error('Failed to fetch student applications')
      }
      const data = await response.json()
      setApplications(data)
    } catch (err) {
      console.error('Error fetching applications:', err)
      setApplications([])
    } finally {
      setApplicationsLoading(false)
    }
  }

  const handleRejectApplication = async (applicationId) => {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/students/applications/${applicationId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: '' })
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to reject application')
      }
      await response.json()
      setSuccess('Application rejected successfully.')
      await fetchApplications()
    } catch (err) {
      if (err instanceof TypeError) {
        setError('Network error: Unable to connect to server. Please check if the server is running.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchSubjects = async () => {
    try {
      const response = await fetch(`${API_URL}/students/subjects`)
      if (!response.ok) {
        throw new Error('Failed to fetch subjects')
      }
      const data = await response.json()
      setSubjects(data)
    } catch (err) {
      console.error('Error fetching subjects:', err)
    }
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        subject: checked 
          ? [...prev.subject, value]
          : prev.subject.filter(s => s !== value)
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleApprovalFormChange = (e) => {
    const { name, value } = e.target
    setApprovalFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const openApprovalModal = (application) => {
    setError('')
    setSuccess('')
    setApprovalFormData({
      applicationId: application._id,
      name: application.name || '',
      birthDate: application.birthDate ? new Date(application.birthDate).toISOString().split('T')[0] : '',
      gender: application.gender || ''
    })
    setApprovalModalOpen(true)
  }

  const closeApprovalModal = () => {
    setApprovalModalOpen(false)
    setApprovalFormData({ applicationId: '', name: '', birthDate: '', gender: '' })
  }

  const validateApprovalData = () => {
    if (!approvalFormData.name || !approvalFormData.name.trim()) {
      return 'Student name is required'
    }
    if (!approvalFormData.birthDate) {
      return 'Birth date is required'
    }
    const birthDateError = validateBirthDate(approvalFormData.birthDate)
    if (birthDateError) return birthDateError
    if (!approvalFormData.gender || !['male', 'female'].includes(approvalFormData.gender)) {
      return 'Gender is required and must be male or female'
    }
    return null
  }

  const approveApplicationRequest = async (applicationId, approvalBody = {}) => {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/students/applications/${applicationId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(approvalBody)
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to approve application')
      }
      const data = await response.json()
      setSuccess(`Application for ${data.student.name} approved and added to the student list.`)
      await fetchApplications()
      fetchAllStudents()
      closeApprovalModal()
    } catch (err) {
      if (err instanceof TypeError) {
        setError('Network error: Unable to connect to server. Please check if the server is running.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleApproveApplication = async (application) => {
    if (!application.birthDate || !application.gender) {
      openApprovalModal(application)
      return
    }
    await approveApplicationRequest(application._id)
  }

  const submitApprovalForm = async () => {
    const validationError = validateApprovalData()
    if (validationError) {
      setError(validationError)
      return
    }
    await approveApplicationRequest(approvalFormData.applicationId, {
      birthDate: approvalFormData.birthDate,
      gender: approvalFormData.gender
    })
  }

  const handleParentChange = (index, field, value, isEdit = false) => {
    const setter = isEdit ? setEditData : setFormData
    setter(prev => {
      const parents = Array.isArray(prev.parents) ? [...prev.parents] : []
      parents[index] = {
        ...(parents[index] || { name: '', kakaoId: '', email: '' }),
        [field]: value
      }
      return { ...prev, parents }
    })
  }

  const addParentField = (isEdit = false) => {
    const setter = isEdit ? setEditData : setFormData
    setter(prev => ({
      ...prev,
      parents: [...(Array.isArray(prev.parents) ? prev.parents : []), { name: '', kakaoId: '', email: '' }]
    }))
  }

  const removeParentField = (index, isEdit = false) => {
    const setter = isEdit ? setEditData : setFormData
    setter(prev => ({
      ...prev,
      parents: (Array.isArray(prev.parents) ? prev.parents : []).filter((_, idx) => idx !== index)
    }))
  }

  const handleGradeChange = (e) => {
    const { name, value } = e.target
    setGradeData(prev => ({
      ...prev,
      [name]: name === 'year' || name === 'term' || name === 'score' ? Number.parseInt(value) : value
    }))
  }

  const handleAddGrade = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!gradeData.subject || !gradeData.subject.trim()) {
      setError('Subject is required')
      return
    }
    if (!gradeData.score || gradeData.score < 0 || gradeData.score > 100) {
      setError('Score must be between 0 and 100')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/students/grades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: studentData.studentId,
          subject: gradeData.subject.trim(),
          score: Number.parseInt(gradeData.score),
          year: gradeData.year,
          term: gradeData.term
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to add grade')
      }

      setSuccess(`Grade for ${gradeData.subject} added successfully!`)
      setGradeData({ subject: '', score: '', year: new Date().getFullYear(), term: 1 })
      
      // 학생 정보 새로고침
      await fetchStudent(studentData.username, false)
      setShowStudentModal(true) // 모달이 닫혀있을 경우 다시 열기
      setShowGradeModal(false)
    } catch (err) {
      if (err instanceof TypeError) {
        setError('Network error: Unable to connect to server.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAttendanceChange = (e) => {
    const { name, value } = e.target
    setAttendanceData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAddAttendance = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!attendanceData.date) {
      setError('Date is required')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/students/attendances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: studentData.studentId,
          date: attendanceData.date,
          status: attendanceData.status
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to add attendance')
      }

      setSuccess(`Attendance for ${attendanceData.date} added successfully!`)
      setAttendanceData({ date: new Date().toISOString().split('T')[0], status: 'present' })
      
      // 학생 정보 새로고침
      await fetchStudent(studentData.username, false)
      setShowStudentModal(true) // 모달 유지
      setShowAttendanceModal(false)
    } catch (err) {
      if (err instanceof TypeError) {
        setError('Network error: Unable to connect to server.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target
    if (type === 'checkbox') {
      setEditData(prev => ({
        ...prev,
        subject: checked 
          ? [...prev.subject, value]
          : prev.subject.filter(s => s !== value)
      }))
    } else {
      setEditData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleUpdateStudent = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!editData.name || !editData.name.trim()) {
      setError('Student name is required')
      return
    }
    if (!editData.birthDate) {
      setError('Birth date is required')
      return
    }
    const birthDateError = validateBirthDate(editData.birthDate)
    if (birthDateError) {
      setError(birthDateError)
      return
    }
    if (!editData.gender || !['male', 'female'].includes(editData.gender)) {
      setError('Gender is required and must be male or female')
      return
    }
    if (!editData.subject || editData.subject.length === 0) {
      setError('At least one subject is required')
      return
    }
    if (!editData.bio || !editData.bio.trim()) {
      setError('Biography is required')
      return
    }

    const validParents = (Array.isArray(editData.parents) ? editData.parents : [])
      .map(p => ({
        name: (p.name || '').trim(),
        kakaoId: (p.kakaoId || '').trim(),
        email: (p.email || '').trim()
      }))
      .filter(p => p.name || p.kakaoId || p.email)

    setLoading(true)
    try {
      const updatePayload = {
        name: editData.name.trim(),
        birthDate: editData.birthDate,
        gender: editData.gender,
        subject: editData.subject,
        bio: editData.bio.trim(),
        parents: validParents
      }
      if ((editData.kakaoId || '').trim()) {
        updatePayload.kakaoId = editData.kakaoId.trim()
      }

      const response = await fetch(`${API_URL}/students/${studentData.username}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update student')
      }

      setSuccess(`Student "${editData.name}" updated successfully!`)
      
      // 학생 정보 새로고침
      await fetchStudent(editData.name.trim(), false)
      setShowStudentModal(true) // 모달이 닫혀있을 경우 다시 열기
      setShowEditModal(false)
    } catch (err) {
      if (err instanceof TypeError) {
        setError('Network error: Unable to connect to server.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteStudent = async () => {
    if (!window.confirm('정말로 이 학생을 삭제하시겠습니까? 삭제하면 해당 학생의 모든 성적과 관련 기록이 함께 제거됩니다.')) {
      return
    }

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/students`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ studentId: studentData.studentId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete student')
      }

      setSuccess(`Student "${studentData.username}" deleted successfully.`)
      setShowEditModal(false)
      setShowStudentModal(false)
      setStudentData(null)
      await fetchAllStudents()
    } catch (err) {
      if (err instanceof TypeError) {
        setError('Network error: Unable to connect to server.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = () => {
    setEditData({
      name: studentData.username,
      birthDate: studentData.birthDate ? new Date(studentData.birthDate).toISOString().split('T')[0] : '',
      gender: studentData.gender || '',
      subject: Array.isArray(studentData.subjects) ? studentData.subjects : [studentData.subjects],
      bio: studentData.bio,
      kakaoId: studentData.kakaoId || '',
      parents: Array.isArray(studentData.parents) && studentData.parents.length > 0
        ? studentData.parents.map(p => ({
            name: p.name || '',
            kakaoId: p.kakaoId || '',
            email: p.email || ''
          }))
        : [{ name: '', kakaoId: '', email: '' }]
    })
    setShowEditModal(true)
  }

  const handleRegisterStudent = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    const validationError = validateFormData()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          birthDate: formData.birthDate,
          gender: formData.gender,
          subject: formData.subject,
          bio: formData.bio.trim(),
          parents: (Array.isArray(formData.parents) ? formData.parents : [])
            .map(p => ({
              name: (p.name || '').trim(),
              kakaoId: (p.kakaoId || '').trim(),
              email: (p.email || '').trim()
            }))
            .filter(p => p.name || p.kakaoId || p.email)
        })
      })

      if (response.status === 400) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Invalid input data')
      }
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const newStudent = await response.json()
      setSuccess(`Student "${newStudent.name}" registered successfully!`)
      setFormData({
        name: '',
        birthDate: '',
        gender: '',
        subject: [],
        bio: '',
        kakaoId: '',
        parents: [{ name: '', kakaoId: '', email: '' }]
      })
      setError('')
    } catch (err) {
      if (err instanceof TypeError) {
        setError('Network error: Unable to connect to server. Please check if the server is running.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (userData) => {
    resetSessionState()
    setUser(userData)
    setIsLoggedIn(true)
  }

  const handleRegisterParentKakao = async () => {
    if (!window.Kakao) {
      alert('카카오 SDK 로딩에 실패했습니다. 페이지를 새로고침 해주세요.')
      return
    }

    if (!window.Kakao.isInitialized()) {
      window.Kakao.init(KAKAO_JS_KEY)
    }

    try {
      const authObj = await new Promise((resolve, reject) => {
        const callback = {
          scope: 'profile_nickname',
          success: (authResult) => {
            resolve(authResult)
          },
          fail: (authError) => {
            reject(authError)
          }
        }

        try {
          const result = window.Kakao.Auth.login(callback)
          if (result && typeof result.then === 'function') {
            result.then(resolve).catch(reject)
          }
        } catch (err) {
          reject(err)
        }
      })

      const token = authObj?.access_token || window.Kakao.Auth.getAccessToken()
      if (!token) {
        throw new Error('Failed to get Kakao access token')
      }

      const profileResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch Kakao profile')
      }

      const profileData = await profileResponse.json()
      const kakaoId = String(profileData.id)
      const kakaoAccount = profileData.kakao_account || {}
      const realName = kakaoAccount.profile?.nickname
        || profileData.properties?.nickname
        || profileData.kakao_account?.profile?.nickname
        || profileData.kakao_account?.profile?.displayName
        || '카카오 사용자'

      // Add parent to current student
      const response = await fetch(`${API_URL}/students/${user.studentId}/add-parent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kakaoId,
          name: realName
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to add parent')
      }

      alert('부모 계정이 성공적으로 등록되었습니다!')

      // Refresh student data to reflect new parent
      if (studentData && studentData.studentId) {
        await fetchStudent(studentData.username, false)
      }

      try {
        window.Kakao.Auth.setAccessToken(null)
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error('Parent registration error:', err)
      alert(err.message || '부모 계정 등록에 실패했습니다.')
    }
  }

  const handleLogout = () => {
    // Reset local app state
    resetSessionState()
    setIsLoggedIn(false)
    setUser(null)

    // If Kakao SDK is present, explicitly log out to prevent automatic re-login
    try {
      if (window && window.Kakao && window.Kakao.isInitialized && window.Kakao.isInitialized() && window.Kakao.Auth && typeof window.Kakao.Auth.logout === 'function') {
        window.Kakao.Auth.logout(() => {
          // logout callback (no-op)
        })
      }
    } catch (e) {
      // ignore
    }
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />
  }

  const renderMainApp = () => (
    <div className="App" style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ textAlign: 'center', color: '#333' }}>Student Management System</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ marginRight: '10px' }}>환영합니다, {user.username} ({isAdminOrTeacher ? '교사/관리자' : user.userType === 'student' ? '학생' : '학부모'})</span>
          {user.userType === 'student' && (
            <button
              onClick={handleRegisterParentKakao}
              style={{
                padding: '5px 12px',
                backgroundColor: '#FF6F00',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              부모 계정 등록
            </button>
          )}
          {(user.userType === 'student' || user.userType === 'parent') && (
            <button
              onClick={handleNotificationsClick}
              style={{
                position: 'relative',
                padding: '5px 12px',
                backgroundColor: '#1976D2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              알림
              {unreadNotifications > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '10px',
                  height: '10px',
                  backgroundColor: '#f44336',
                  borderRadius: '50%'
                }} />
              )}
            </button>
          )}
          <button onClick={handleLogout} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>로그아웃</button>
        </div>
      </div>
      <nav style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '2px solid #e0e0e0', paddingBottom: '10px' }}>
        <button 
          onClick={() => {
            if ((user.userType === 'student' || user.userType === 'parent') && !showStudentModal) {
              setShowStudentModal(true)
            } else {
              setActiveTab('search')
            }
          }}
          style={{ 
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === 'search' || ((user.userType === 'student' || user.userType === 'parent') && !showStudentModal) ? '#2196F3' : '#f0f0f0',
            color: activeTab === 'search' || ((user.userType === 'student' || user.userType === 'parent') && !showStudentModal) ? 'white' : '#333',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: activeTab === 'search' || ((user.userType === 'student' || user.userType === 'parent') && !showStudentModal) ? 'bold' : 'normal'
          }}
        >
          {(user.userType === 'student' || user.userType === 'parent') && !showStudentModal ? '학생 정보' : '학생 검색'}
        </button>
        {(user.userType === 'student' || user.userType === 'parent') && (
          <button 
            onClick={() => setActiveTab('feedback')}
            style={{ 
              padding: '10px 20px',
              border: 'none',
              backgroundColor: activeTab === 'feedback' ? '#2196F3' : '#f0f0f0',
              color: activeTab === 'feedback' ? 'white' : '#333',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'feedback' ? 'bold' : 'normal'
            }}
          >
            피드백 보기
          </button>
        )}
        {isAdminOrTeacher && (
          <button 
            onClick={() => setActiveTab('register')}
            style={{ 
              padding: '10px 20px',
              border: 'none',
              backgroundColor: activeTab === 'register' ? '#2196F3' : '#f0f0f0',
              color: activeTab === 'register' ? 'white' : '#333',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'register' ? 'bold' : 'normal'
            }}
          >
            학생 등록
          </button>
        )}
        {(user.userType === 'teacher' || user.userType === 'admin' || user.userType === 'student' || user.userType === 'parent') && (
          <button 
            onClick={() => setActiveTab('counseling')}
            style={{ 
              padding: '10px 20px',
              border: 'none',
              backgroundColor: activeTab === 'counseling' ? '#673AB7' : '#f0f0f0',
              color: activeTab === 'counseling' ? 'white' : '#333',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'counseling' ? 'bold' : 'normal'
            }}
          >
            상담
          </button>
        )}
        {isAdminOrTeacher && (
          <button 
            onClick={() => setActiveTab('settings')}
            style={{ 
              padding: '10px 20px',
              border: 'none',
              backgroundColor: activeTab === 'settings' ? '#FF5722' : '#f0f0f0',
              color: activeTab === 'settings' ? 'white' : '#333',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'settings' ? 'bold' : 'normal'
            }}
          >
            교사용 설정
          </button>
        )}
      </nav>
            {activeTab === 'search' && renderSearchSection()}
            {activeTab === 'counseling' && renderCounselingSection()}
      
      {showGradeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setShowGradeModal(false)} aria-label="성적 입력 창 닫기" style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'black' }}>×</button>
            <h3>Add Grade</h3>
            <form onSubmit={handleAddGrade} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Subject</label>
                <select
                  name="subject"
                  value={gradeData.subject}
                  onChange={handleGradeChange}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                >
                  <option value="">Select subject</option>
                  {subjects.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Score (0-100)</label>
                <input
                  type="number"
                  name="score"
                  placeholder="Enter score"
                  value={gradeData.score}
                  onChange={handleGradeChange}
                  min="0"
                  max="100"
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Year</label>
                  <input
                    type="number"
                    name="year"
                    value={gradeData.year}
                    onChange={handleGradeChange}
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Term</label>
                  <select
                    name="term"
                    value={gradeData.term}
                    onChange={handleGradeChange}
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  >
                    <option value={1}>Term 1</option>
                    <option value={2}>Term 2</option>
                  </select>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                style={{ 
                  padding: '10px 16px', 
                  backgroundColor: loading ? '#ccc' : '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px'
                }}
              >
                {loading ? 'Adding...' : 'Add Grade'}
              </button>
            </form>
            {success && <p style={{ color: '#388e3c', marginTop: '10px', padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>{success}</p>}
            {error && <p style={{ color: 'red', marginTop: '10px', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px' }}>{error}</p>}
          </div>
        </div>
      )}
      {showGradeScaleModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', maxWidth: '400px', width: '90%', position: 'relative' }}>
            <button onClick={() => setShowGradeScaleModal(false)} aria-label="등급 기준 변경 창 닫기" style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'black' }}>×</button>
            <h3>등급 기준 변경</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(gradeScale).sort((a,b) => b[1] - a[1]).map(([grade, score]) => (
                <div key={grade} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ minWidth: '40px', fontWeight: 'bold' }}>{grade}:</label>
                  <input
                    type="number"
                    value={score}
                    onChange={(e) => handleGradeScaleChange(grade, e.target.value)}
                    min="0"
                    max="100"
                    style={{ width: '80px', padding: '5px' }}
                  />
                  <span>점 이상</span>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setShowGradeScaleModal(false)}
              style={{ 
                marginTop: '20px',
                padding: '10px 16px', 
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              저장
            </button>
          </div>
        </div>
      )}
      {showAttendanceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', maxWidth: '400px', width: '90%', position: 'relative' }}>
            <button onClick={() => setShowAttendanceModal(false)} aria-label="출석 입력 창 닫기" style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'black' }}>×</button>
            <h3>출석 입력</h3>
            <form onSubmit={handleAddAttendance} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>날짜</label>
                <input
                  type="date"
                  name="date"
                  value={attendanceData.date}
                  onChange={handleAttendanceChange}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>상태</label>
                <select
                  name="status"
                  value={attendanceData.status}
                  onChange={handleAttendanceChange}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                >
                  <option value="present">출석</option>
                  <option value="absent">결석</option>
                </select>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                style={{ 
                  padding: '10px 16px', 
                  backgroundColor: loading ? '#ccc' : '#9C27B0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px'
                }}
              >
                {loading ? '추가 중...' : '출석 추가'}
              </button>
            </form>
            {success && <p style={{ color: '#388e3c', marginTop: '10px', padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>{success}</p>}
            {error && <p style={{ color: 'red', marginTop: '10px', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px' }}>{error}</p>}
          </div>
        </div>
      )}
      {showEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', maxWidth: '500px', width: '90%', position: 'relative' }}>
            <button onClick={() => setShowEditModal(false)} aria-label="기본정보 수정 창 닫기" style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'black' }}>×</button>
            <form onSubmit={handleUpdateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>학생 이름</label>
                <input
                  type="text"
                  name="name"
                  placeholder="학생 이름을 입력하세요"
                  value={editData.name}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>생년월일</label>
                <input
                  type="date"
                  name="birthDate"
                  value={editData.birthDate}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>성별</label>
                <select
                  name="gender"
                  value={editData.gender}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                >
                  <option value="">선택하세요</option>
                  <option value="male">남성</option>
                  <option value="female">여성</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>과목</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {subjects.map(sub => (
                    <label key={sub} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <input
                        type="checkbox"
                        name="subject"
                        value={sub}
                        checked={editData.subject.includes(sub)}
                        onChange={handleEditChange}
                      />
                      {sub}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>자기소개</label>
                <textarea
                  name="bio"
                  placeholder="자기소개를 입력하세요"
                  value={editData.bio}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  rows="4"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>부모 정보</label>
                <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '13px' }}>카카오 연동은 학부모가 본인 카카오로 로그인했을 때 이메일 또는 카카오 계정으로 자동 연결됩니다.</p>
                {editData.parents.map((parent, index) => (
                  <div key={index} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <strong>부모 #{index + 1}</strong>
                      {editData.parents.length > 1 && (
                        <button type="button" onClick={() => removeParentField(index, true)} style={{ background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer' }}>
                          삭제
                        </button>
                      )}
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <input
                        type="text"
                        placeholder="부모 이름"
                        value={parent.name}
                        onChange={(e) => handleParentChange(index, 'name', e.target.value, true)}
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginBottom: '10px' }}
                      />
                      <input
                        type="email"
                        placeholder="부모 이메일"
                        value={parent.email}
                        onChange={(e) => handleParentChange(index, 'email', e.target.value, true)}
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => addParentField(true)} style={{ padding: '8px 12px', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  부모 추가
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
              <button 
                type="button"
                onClick={handleDeleteStudent}
                disabled={loading}
                style={{ 
                  padding: '10px 16px', 
                  backgroundColor: '#d32f2f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px'
                }}
              >
                삭제
              </button>
              <button 
                type="submit" 
                disabled={loading}
                style={{ 
                  padding: '10px 16px', 
                  backgroundColor: loading ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px'
                }}
              >
                {loading ? 'Updating...' : '정보 수정'}
              </button>
            </div>
            </form>
            {success && <p style={{ color: '#388e3c', marginTop: '10px', padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>{success}</p>}
            {error && <p style={{ color: 'red', marginTop: '10px', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px' }}>{error}</p>}
          </div>
        </div>
      )}
      {showFeedbackModal && studentData && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setShowFeedbackModal(false)} aria-label="피드백 작성 창 닫기" style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'black' }}>×</button>
            <p style={{ color: '#666', marginBottom: '15px' }}>학생: <strong>{studentData.username}</strong></p>
            <form onSubmit={handleAddFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#2196F3' }}>📚 성적 관련 피드백</label>
                <textarea
                  name="academicPerformance"
                  placeholder="성적에 대한 피드백을 입력하세요"
                  value={feedbackData.academicPerformance}
                  onChange={handleFeedbackChange}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: '80px' }}
                  rows="3"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#4CAF50' }}>📅 출결 관련 피드백</label>
                <textarea
                  name="attendance"
                  placeholder="출결 상태에 대한 피드백을 입력하세요"
                  value={feedbackData.attendance}
                  onChange={handleFeedbackChange}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: '80px' }}
                  rows="3"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#FF9800' }}>👥 행동 관련 피드백</label>
                <textarea
                  name="behavior"
                  placeholder="수업 중 행동에 대한 피드백을 입력하세요"
                  value={feedbackData.behavior}
                  onChange={handleFeedbackChange}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: '80px' }}
                  rows="3"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#9C27B0' }}>💪 태도 관련 피드백</label>
                <textarea
                  name="attitude"
                  placeholder="학습 태도에 대한 피드백을 입력하세요"
                  value={feedbackData.attitude}
                  onChange={handleFeedbackChange}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: '80px' }}
                  rows="3"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#607D8B' }}>💬 추가 의견</label>
                <textarea
                  name="additionalComments"
                  placeholder="기타 의견이나 조언을 입력하세요"
                  value={feedbackData.additionalComments}
                  onChange={handleFeedbackChange}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: '80px' }}
                  rows="3"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#333' }}>
                  <input
                    type="checkbox"
                    name="shareWithTeachers"
                    checked={feedbackData.shareWithTeachers}
                    onChange={handleFeedbackChange}
                  />
                  다른 교사와 공유합니다
                </label>
              </div>
              <p style={{ margin: '0', color: '#666', fontSize: '13px' }}>학생과 학부모에게는 항상 공유됩니다.</p>
              <button 
                type="submit" 
                disabled={loading}
                style={{ 
                  padding: '10px 16px', 
                  backgroundColor: loading ? '#ccc' : '#673AB7',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px'
                }}
              >
                {loading ? '등록 중...' : '피드백 등록'}
              </button>
            </form>
            {success && <p style={{ color: '#388e3c', marginTop: '10px', padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>{success}</p>}
            {error && <p style={{ color: 'red', marginTop: '10px', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px' }}>{error}</p>}
          </div>
        </div>
      )}

      {showNotificationsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setShowNotificationsModal(false)} aria-label="알림 창 닫기" style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'black' }}>×</button>
            {notificationsLoading ? (
              <p>알림을 불러오는 중입니다...</p>
            ) : notificationsError ? (
              <p style={{ color: 'red' }}>{notificationsError}</p>
            ) : notifications.length === 0 ? (
              <p>새로운 알림이 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {notifications.map(notification => (
                  <div key={notification._id} style={{ padding: '14px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: notification.read ? '#fff' : '#fff8e1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <strong style={{ fontSize: '15px' }}>{notification.type === 'grade' ? '성적 알림' : '피드백 알림'}</strong>
                      <span style={{ fontSize: '12px', color: '#666' }}>{new Date(notification.createdAt).toLocaleString('ko-KR')}</span>
                    </div>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{notification.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'register' && (
        <section style={{ maxWidth: '700px' }}>
          {isAdminOrTeacher && (
            <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fafafa' }}>
              <h2 style={{ marginTop: 0 }}>학생 등록 신청 관리</h2>
              {applicationsLoading ? (
                <p>등록 신청서를 불러오는 중입니다...</p>
              ) : applications.length === 0 ? (
                <p>현재 대기 중인 학생 등록 신청이 없습니다.</p>
              ) : (
                <>
                  {approvalModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#fff', borderRadius: '10px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', position: 'relative' }}>
                        <button onClick={closeApprovalModal} aria-label="승인 정보 창 닫기" style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#333' }}>×</button>
                        <h2 style={{ marginTop: 0 }}>학생 등록 승인</h2>
                        <p style={{ marginBottom: '18px', color: '#555' }}>누락된 정보를 입력한 후 승인을 진행해주세요.</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>학생 이름</label>
                            <input type="text" name="name" value={approvalFormData.name} disabled style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px', backgroundColor: '#f5f5f5' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>생년월일</label>
                            <input type="date" name="birthDate" value={approvalFormData.birthDate} onChange={handleApprovalFormChange} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>성별</label>
                            <select name="gender" value={approvalFormData.gender} onChange={handleApprovalFormChange} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }}>
                              <option value="">선택하세요</option>
                              <option value="male">남성</option>
                              <option value="female">여성</option>
                            </select>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                            <button type="button" onClick={closeApprovalModal} style={{ padding: '10px 18px', border: '1px solid #ccc', borderRadius: '6px', backgroundColor: '#fff', color: '#333', cursor: 'pointer' }}>취소</button>
                            <button type="button" onClick={submitApprovalForm} disabled={loading} style={{ padding: '10px 18px', border: 'none', borderRadius: '6px', backgroundColor: '#4CAF50', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer' }}>{loading ? '승인 중...' : '승인'}</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {applications.map((app) => (
                      <div key={app._id} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e0e0e0', backgroundColor: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                          <div>
                            <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{app.name}</p>
                            <p style={{ margin: 0, color: '#555' }}>생년월일: {app.birthDate ? new Date(app.birthDate).toLocaleDateString('ko-KR') : '알 수 없음'}</p>
                            <p style={{ margin: 0, color: '#555' }}>성별: {app.gender || '미지정'}</p>
                            <p style={{ margin: 0, color: '#555' }}>상태: {app.status === 'pending' ? '대기' : app.status === 'accepted' ? '승인' : '거절'}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {app.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveApplication(app)}
                                  disabled={loading}
                                  style={{ padding: '8px 14px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
                                >
                                  승인
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectApplication(app._id)}
                                  disabled={loading}
                                  style={{ padding: '8px 14px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
                                >
                                  반려
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {app.rejectionReason && (
                          <p style={{ margin: '10px 0 0 0', color: '#d32f2f' }}>반려 사유: {app.rejectionReason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <form onSubmit={handleRegisterStudent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>학생 이름</label>
              <input
                type="text"
                name="name"
                placeholder="학생 이름을 입력하세요"
                value={formData.name}
                onChange={handleFormChange}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>생년월일</label>
              <input
                type="date"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleFormChange}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>성별</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleFormChange}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                required
              >
                <option value="">선택하세요</option>
                <option value="male">남성</option>
                <option value="female">여성</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>과목</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {subjects.map(sub => (
                  <label key={sub} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input
                      type="checkbox"
                      name="subject"
                      value={sub}
                      checked={formData.subject.includes(sub)}
                      onChange={handleFormChange}
                    />
                    {sub}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>자기소개</label>
              <textarea
                name="bio"
                placeholder="Enter biography"
                value={formData.bio}
                onChange={handleFormChange}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                required
                rows="4"
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>학생 카카오 연동은 학생이 본인 카카오로 실제 로그인할 때 자동으로 연결됩니다.</p>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>부모 정보</label>
              <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '13px' }}>카카오 연동은 학부모가 본인 카카오로 로그인했을 때 이메일 또는 카카오 계정으로 자동 연결됩니다.</p>
              {formData.parents.map((parent, index) => (
                <div key={index} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <strong>부모 #{index + 1}</strong>
                    {formData.parents.length > 1 && (
                      <button type="button" onClick={() => removeParentField(index)} style={{ background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer' }}>
                        삭제
                      </button>
                    )}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <input
                      type="text"
                      placeholder="부모 이름"
                      value={parent.name}
                      onChange={(e) => handleParentChange(index, 'name', e.target.value)}
                      style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginBottom: '10px' }}
                    />
                    <input
                      type="email"
                      placeholder="부모 이메일"
                      value={parent.email}
                      onChange={(e) => handleParentChange(index, 'email', e.target.value)}
                      style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addParentField()} style={{ padding: '8px 12px', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                부모 추가
              </button>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                padding: '10px 16px', 
                backgroundColor: loading ? '#ccc' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px'
              }}
            >
              {loading ? '등록 중...' : '학생 등록'}
            </button>
          </form>
          {error && <p style={{ color: '#d32f2f', marginTop: '15px', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px' }}>{error}</p>}
          {success && <p style={{ color: '#388e3c', marginTop: '15px', padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>{success}</p>}
        </section>
      )}
      {activeTab === 'settings' && (
        <section style={{ maxWidth: '600px' }}>
          <h2>교사용 설정</h2>
          <div style={{ marginBottom: '20px' }}>
            <h3>과목 관리</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <input
                type="text"
                placeholder="새 과목 이름"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                style={{ flex: 1, padding: '8px' }}
              />
              <button onClick={handleAddSubject} style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>추가</button>
              <button onClick={fetchSubjects} style={{ padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>새로고침</button>
            </div>
            <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '15px' }}>
              <h4>현재 과목 목록:</h4>
              {subjects.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {subjects.map(sub => (
                    <li key={sub} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #eee' }}>
                      <span>{sub}</span>
                      <button onClick={() => handleDeleteSubject(sub)} style={{ padding: '4px 8px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>삭제</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>과목이 없습니다.</p>
              )}
            </div>
          </div>
        </section>
      )}
      {activeTab === 'feedback' && (
        <section style={{ maxWidth: '800px' }}>
          <h2>교사 피드백</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>담당 교사가 작성한 피드백을 확인하세요.</p>

          {studentData ? (
            <>
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px', color: 'black' }}>
                <h3 style={{ marginTop: 0 }}>학생 정보</h3>
                <p><strong>이름:</strong> <span style={{ color: 'black' }}>{studentData.username}</span></p>
                <p><strong>과목:</strong> {studentData.subjects.join(', ')}</p>
              </div>

              {studentFeedbacks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {studentFeedbacks.map((feedback, index) => (
                    <div key={feedback._id || index} style={{ border: '2px solid #673AB7', borderRadius: '12px', padding: '20px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '2px solid #e0e0e0', paddingBottom: '10px' }}>
                        <strong style={{ color: '#673AB7', fontSize: '18px' }}>작성자: {feedback.teacherName}</strong>
                        <span style={{ color: '#666', fontSize: '14px' }}>{new Date(feedback.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                      {feedback.academicPerformance && (
                        <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#E3F2FD', borderRadius: '6px' }}>
                          <strong style={{ color: '#2196F3', fontSize: '16px' }}>📚 성적</strong>
                          <p style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{feedback.academicPerformance}</p>
                        </div>
                      )}
                      {feedback.attendance && (
                        <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#E8F5E9', borderRadius: '6px' }}>
                          <strong style={{ color: '#4CAF50', fontSize: '16px' }}>📅 출결</strong>
                          <p style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{feedback.attendance}</p>
                        </div>
                      )}
                      {feedback.behavior && (
                        <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#FFF3E0', borderRadius: '6px' }}>
                          <strong style={{ color: '#FF9800', fontSize: '16px' }}>👥 행동</strong>
                          <p style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{feedback.behavior}</p>
                        </div>
                      )}
                      {feedback.attitude && (
                        <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#F3E5F5', borderRadius: '6px' }}>
                          <strong style={{ color: '#9C27B0', fontSize: '16px' }}>💪 태도</strong>
                          <p style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{feedback.attitude}</p>
                        </div>
                      )}
                      {feedback.additionalComments && (
                        <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#ECEFF1', borderRadius: '6px' }}>
                          <strong style={{ color: '#607D8B', fontSize: '16px' }}>💬 추가 의견</strong>
                          <p style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{feedback.additionalComments}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                  <p style={{ fontSize: '18px', color: '#666' }}>아직 등록된 피드백이 없습니다.</p>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
              <p style={{ fontSize: '18px', color: '#666' }}>학생 정보를 불러오는 중...</p>
            </div>
          )}
        </section>
      )}
    </div>
  )

  const renderSearchSection = () => (
    <section>
      {isAdminOrTeacher && (
        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="학생 이름을 입력하세요"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            style={{ marginRight: '5px', padding: '8px' }}
          />
          <input
            type="text"
            placeholder="과목으로 필터링 (선택사항)"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            style={{ marginRight: '5px', padding: '8px' }}
          />
          <button onClick={() => { fetchStudent(); setShowStudentModal(true); }} disabled={loading} style={{ padding: '8px 16px' }}>
            {loading ? '검색 중...' : '검색'}
          </button>
        </div>
      )}
      {/* studentData 여부와 관계없이 항상 표시 */}
      {isAdminOrTeacher && !showStudentModal && (
        <div style={{ marginBottom: '20px' }}>
          <h3>전체 학생 목록</h3>
          <button onClick={fetchAllStudents} disabled={allStudentsLoading} style={{ marginBottom: '10px', padding: '5px 10px', backgroundColor: allStudentsLoading ? '#ccc' : '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: allStudentsLoading ? 'not-allowed' : 'pointer' }}>
            {allStudentsLoading ? '로딩중...' : '새로고침'}
          </button>
          {allStudentsError && (
            <p style={{ color: 'red', marginBottom: '10px', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px' }}>
              오류: {allStudentsError}
            </p>
          )}
          {allStudentsLoading ? (
            <p>학생 데이터 로딩 중...</p>
          ) : allStudents.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
              {allStudents.map(student => (
                <li key={student.name} style={{ padding: '8px', borderBottom: '1px solid #eee', cursor: 'pointer', listStyle: 'none' }} onClick={() => {
                  setStudentName(student.name)
                  fetchStudent(student.name, true)
                }} onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setStudentName(student.name)
                    fetchStudent(student.name, true)
                  }
                }} role="button" tabIndex={0}>
                  <strong>{student.name}</strong> - 과목: {Array.isArray(student.subject) ? student.subject.join(', ') : student.subject}
                </li>
              ))}
            </ul>
          ) : (
            <p>등록된 학생이 없습니다.</p>
          )}
        </div>
      )}

      {error && <p style={{ color: 'red', margin: '10px 0' }}>{error}</p>}
      {studentData && showStudentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
<div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', maxWidth: '800px', width: '90%', maxHeight: '80vh', overflowY: 'auto', position: 'relative', color: 'black' }}>
            <button onClick={() => setShowStudentModal(false)} aria-label="학생 정보 창 닫기" style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'black' }}>×</button>
            <h2 style={{ color: 'black' }}>{studentData.username} {isAdminOrTeacher && <button onClick={openEditModal} style={{ marginLeft: '10px', padding: '5px 10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>기본정보 수정</button>}</h2>
            <p><strong>생년월일:</strong> {new Date(studentData.birthDate).toLocaleDateString('ko-KR')}</p>
            <p><strong>성별:</strong> {studentData.gender === 'male' ? '남성' : '여성'}</p>
            <p><strong>과목:</strong> {studentData.subjects.join(', ')}</p>
            <p><strong>자기소개:</strong> {studentData.bio}</p>

            <div style={{ marginTop: '12px', padding: '10px', background: '#f7f7f7', borderRadius: '6px' }}>
              <strong>보고서</strong>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '13px', marginBottom: '6px' }}>성적 분석</div>
                  <button onClick={() => downloadReport('grade-analysis')}>다운로드 (XLSX)</button>
                </div>
                <div>
                  <div style={{ fontSize: '13px', marginBottom: '6px' }}>상담 내역</div>
                  <button onClick={() => downloadReport('counseling-history')}>다운로드 (XLSX)</button>
                </div>
                <div>
                  <div style={{ fontSize: '13px', marginBottom: '6px' }}>피드백 요약</div>
                  <button onClick={() => downloadReport('feedback-summary')}>다운로드 (XLSX)</button>
                </div>
              </div>
            </div>
            <h3>출석 {isAdminOrTeacher && <button onClick={() => setShowAttendanceModal(true)} style={{ marginLeft: '10px', padding: '5px 10px', backgroundColor: '#9C27B0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>출석 입력</button>}</h3>
            <p>Present: {studentData.presentCount}, Absent: {studentData.absentCount}, Attendance Rate: {studentData.presentCount + studentData.absentCount > 0 ? ((studentData.presentCount / (studentData.presentCount + studentData.absentCount)) * 100).toFixed(1) : 0}%</p>
            {studentData.absentDates.length > 0 && (
              <div>
                <p><strong>Absent Dates:</strong></p>
                <ul>
                  {studentData.absentDates.map((date, index) => (
                    <li key={index}>{new Date(date).toLocaleDateString()}</li>
                  ))}
                </ul>
              </div>
            )}
            <h3>성적 {isAdminOrTeacher && <><button onClick={() => setShowGradeModal(true)} style={{ marginLeft: '10px', padding: '5px 10px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>성적 입력</button> <button onClick={() => setShowGradeScaleModal(true)} style={{ marginLeft: '10px', padding: '5px 10px', backgroundColor: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>등급 기준 변경</button></>}</h3>
            {studentData.grades.length > 0 && (
              <div style={{ marginTop: '15px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f8fbff' }}>
                <h4 style={{ margin: '0 0 10px 0' }}>학기별 성적 레이더 차트</h4>
                {renderGradeRadarChartsByTerm(studentData.grades)}
              </div>
            )}
            <div style={{ marginBottom: '10px' }}>
              <strong>등급 기준:</strong>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '5px', backgroundColor: '#f9f9f9' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e0e0e0' }}>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>등급</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>최소 점수</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(gradeScale).sort((a,b) => b[1] - a[1]).map(([grade, score]) => (
                    <tr key={grade}>
                      <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{grade}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{score}점 이상</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {studentData.grades.length > 0 ? (
              (() => {
                const sortedGrades = [...studentData.grades].sort((a, b) => {
                  let aVal, bVal;
                  if (sortColumn === 'term') {
                    aVal = a.year * 10 + a.term;
                    bVal = b.year * 10 + b.term;
                  } else if (sortColumn === 'subject') {
                    aVal = a.subject;
                    bVal = b.subject;
                  } else if (sortColumn === 'score') {
                    aVal = a.score;
                    bVal = b.score;
                  } else if (sortColumn === 'grade') {
                    aVal = getGrade(a.score);
                    bVal = getGrade(b.score);
                  }
                  if (sortDirection === 'asc') {
                    return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                  } else {
                    return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
                  }
                });
                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f5f5f5' }}>
                        <th onClick={() => handleSort('term')} onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleSort('term')
                          }
                        }} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', cursor: 'pointer' }} role="button" tabIndex={0}>학기 {sortColumn === 'term' ? (sortDirection === 'asc' ? '🔼' : '🔽') : '↕️'}</th>
                        <th onClick={() => handleSort('subject')} onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleSort('subject')
                          }
                        }} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', cursor: 'pointer' }} role="button" tabIndex={0}>과목 {sortColumn === 'subject' ? (sortDirection === 'asc' ? '🔼' : '🔽') : '↕️'}</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>성적</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>등급</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>순위</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedGrades.map((grade, index) => (
                        <tr key={index}>
                          <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{grade.year} Term {grade.term}</td>
                          <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{grade.subject}</td>
                          <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{grade.score}</td>
                          <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{getGrade(grade.score)}</td>
                          <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{getRankForStudent(grade.subject, grade.score, studentData?.studentId, grade.year, grade.term)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()
            ) : (
              <p>No grades available</p>
            )}
            <h3>Term Averages</h3>
            {studentData.termAverages.length > 0 ? (
              <ul>
                {studentData.termAverages.map((avg, index) => (
                  <li key={index}>{avg.year} Term {avg.term}: {avg.average}</li>
                ))}
              </ul>
            ) : (
              <p>No term averages available</p>
            )}
            {studentData.subjectAverage && (
              <p><strong>Subject Average:</strong> {studentData.subjectAverage}</p>
            )}
            <h3>교사 피드백 {isAdminOrTeacher && studentData &&<button onClick={() => setShowFeedbackModal(true)} style={{ marginLeft: '10px', padding: '5px 10px', backgroundColor: '#673AB7', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>피드백 작성</button>}</h3>
            {studentFeedbacks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {studentFeedbacks.map((feedback, index) => (
                  <div key={feedback._id || index} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: '#f9f9f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '2px solid #e0e0e0', paddingBottom: '8px' }}>
                      <strong style={{ color: '#673AB7' }}>작성자: {feedback.teacherName}</strong>
                      <span style={{ color: '#666', fontSize: '14px' }}>{new Date(feedback.createdAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <div style={{ marginBottom: '10px', fontSize: '14px', color: '#555' }}>
                      <strong>공유 여부:</strong> {feedback.shareWithTeachers ? '다른 교사와 공유됨' : '다른 교사와 공유되지 않음'}
                    </div>
                    {feedback.academicPerformance && (
                      <div style={{ marginBottom: '8px' }}>
                        <strong style={{ color: '#2196F3' }}>📚 성적:</strong>
                        <p style={{ margin: '5px 0 0 20px', whiteSpace: 'pre-wrap' }}>{feedback.academicPerformance}</p>
                      </div>
                    )}
                    {feedback.attendance && (
                      <div style={{ marginBottom: '8px' }}>
                        <strong style={{ color: '#4CAF50' }}>📅 출결:</strong>
                        <p style={{ margin: '5px 0 0 20px', whiteSpace: 'pre-wrap' }}>{feedback.attendance}</p>
                      </div>
                    )}
                    {feedback.behavior && (
                      <div style={{ marginBottom: '8px' }}>
                        <strong style={{ color: '#FF9800' }}>👥 행동:</strong>
                        <p style={{ margin: '5px 0 0 20px', whiteSpace: 'pre-wrap' }}>{feedback.behavior}</p>
                      </div>
                    )}
                    {feedback.attitude && (
                      <div style={{ marginBottom: '8px' }}>
                        <strong style={{ color: '#9C27B0' }}>💪 태도:</strong>
                        <p style={{ margin: '5px 0 0 20px', whiteSpace: 'pre-wrap' }}>{feedback.attitude}</p>
                      </div>
                    )}
                    {feedback.additionalComments && (
                      <div style={{ marginBottom: '8px' }}>
                        <strong style={{ color: '#607D8B' }}>💬 추가 의견:</strong>
                        <p style={{ margin: '5px 0 0 20px', whiteSpace: 'pre-wrap' }}>{feedback.additionalComments}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p>등록된 피드백이 없습니다.</p>
            )}
          </div>
        </div>
      )}
    </section>
  )

  const renderCounselingSection = () => {
    const eventDays = counselingRequests.reduce((acc, item) => {
      const key = formatDateKey(item.dateTime)
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    const selectedRequests = getSelectedDateRequests()
    const isTeacher = user?.userType === 'teacher' || user?.userType === 'admin'
    const isStudent = user?.userType === 'student'
    const isViewer = user?.userType === 'student' || user?.userType === 'parent'

    return (
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2>상담 일정</h2>
            <p style={{ color: '#555' }}>
              {isTeacher ? '학생의 상담 신청을 확인하고 승인/거부할 수 있습니다.' : '신청한 상담 일정과 진행 내용을 확인할 수 있습니다.'}
            </p>
          </div>
          {isStudent && (
            <button onClick={handleCounselingFormReset} style={{ padding: '10px 16px', backgroundColor: '#1976D2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              상담 신청 초기화
            </button>
          )}
        </div>

        {counselingError && <p style={{ color: 'red', marginBottom: '10px' }}>{counselingError}</p>}
        {counselingSuccess && <p style={{ color: '#388e3c', marginBottom: '10px' }}>{counselingSuccess}</p>}

        {isStudent && (
          <form onSubmit={handleCreateCounselingRequest} style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fafafa' }}>
            <h3>새 상담 신청</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>상담 날짜</label>
                <input type="date" name="date" value={counselingForm.date} onChange={handleCounselingChange} style={{ width: '100%', padding: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>상담 시간</label>
                <input type="time" name="time" value={counselingForm.time} onChange={handleCounselingChange} style={{ width: '100%', padding: '8px' }} />
              </div>
            </div>
            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>신청 메모 (선택)</label>
              <textarea name="note" value={counselingForm.note} onChange={handleCounselingChange} rows="3" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} placeholder="상담에 대한 간단한 내용을 작성하세요."></textarea>
            </div>
            <button type="submit" disabled={counselingLoading} style={{ marginTop: '15px', padding: '10px 16px', backgroundColor: counselingLoading ? '#ccc' : '#1976D2', color: 'white', border: 'none', borderRadius: '4px', cursor: counselingLoading ? 'not-allowed' : 'pointer' }}>
              {counselingLoading ? '신청 중...' : '상담 신청'}
            </button>
          </form>
        )}

        <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div>
              <h3 style={{ margin: 0 }}>{getCalendarTitle()}</h3>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handlePrevMonth} type="button" style={{ padding: '6px 12px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer' }}>◀</button>
              <button onClick={handleNextMonth} type="button" style={{ padding: '6px 12px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer' }}>▶</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' , textAlign: 'center'}}>
            {['일','월','화','수','목','금','토'].map(day => (
              <div key={day} style={{ fontWeight: 'bold', padding: '8px 0', color: '#000' }}>{day}</div>
            ))}
            {Array(calendarDays[0].getDay()).fill(null).map((_, index) => (
              <div key={`empty-${index}`} />
            ))}
            {calendarDays.map(day => {
              const dateKey = formatDateKey(day)
              const count = getEventCountForDate(dateKey)
              const statuses = getEventStatusesForDate(dateKey)
              const selected = dateKey === selectedCalendarDate
              return (
                <button key={dateKey} type="button" onClick={() => handleDateSelect(dateKey)} style={{
                  border: selected ? '2px solid #673AB7' : '1px solid #ddd',
                  backgroundColor: selected ? '#f3e5f5' : '#fff',
                  padding: '10px',
                  minHeight: '70px',
                  cursor: 'pointer',
                  position: 'relative',
                  color: '#000',
                  textAlign: 'center'
                }}>
                  <div style={{ marginBottom: '6px', fontWeight: 'bold' }}>{day.getDate()}</div>
                  {count > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      {statuses.includes('pending') && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#9e9e9e' }} />}
                      {statuses.includes('accepted') && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#1976D2' }} />}
                      <span style={{ fontSize: '10px', color: '#000', lineHeight: '14px' }}>{count}건</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fafafa' }}>
            <h3>{formatSelectedDateLabel(selectedCalendarDate)} 일정</h3>
            {selectedRequests.length > 0 ? (
              selectedRequests.map(item => (
                <div key={item._id} style={{ marginBottom: '15px', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>{item.studentName}</p>
                      <p style={{ margin: '6px 0 0 0', color: '#555' }}>시간: {new Date(item.dateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <button type="button" onClick={() => handleShowCounselingDetails(item)} style={{ padding: '6px 10px', border: 'none', borderRadius: '4px', backgroundColor: '#1976D2', color: 'white', cursor: 'pointer' }}>상세 보기</button>
                  </div>
                  <p style={{ margin: '10px 0 0 0' }}>상태: <strong>{item.status === 'pending' ? '대기' : item.status === 'accepted' ? '승인' : '거절'}</strong></p>
                </div>
              ))
            ) : (
              <p style={{ color: '#555' }}>선택된 날짜에 상담 일정이 없습니다.</p>
            )}
          </div>
          <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fafafa' }}>
            <h3>전체 상담 목록</h3>
            {counselingRequests.length > 0 ? (
              counselingRequests.slice(0, 10).map(item => (
                <div key={item._id} style={{ marginBottom: '12px', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff', cursor: 'pointer' }} onClick={() => { setSelectedCalendarDate(formatDateKey(item.dateTime)); handleShowCounselingDetails(item) }}>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{item.studentName} - {new Date(item.dateTime).toLocaleDateString('ko-KR')}</p>
                  <p style={{ margin: '8px 0 0 0', color: '#555' }}>시간: {new Date(item.dateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p style={{ margin: '4px 0 0 0', color: '#777' }}>상태: {item.status === 'pending' ? '대기' : item.status === 'accepted' ? '승인' : '거절'}</p>
                </div>
              ))
            ) : (
              <p style={{ color: '#555' }}>등록된 상담 일정이 없습니다.</p>
            )}
          </div>
        </div>

        {showCounselingModal && selectedCounseling && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
              <button onClick={() => setShowCounselingModal(false)} aria-label="상담 창 닫기" style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'black' }}>×</button>
              <h3>상담 상세</h3>
              <p><strong>학생:</strong> {selectedCounseling.studentName}</p>
              <p><strong>날짜:</strong> {new Date(selectedCounseling.dateTime).toLocaleDateString('ko-KR')}</p>
              <p><strong>시간:</strong> {new Date(selectedCounseling.dateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
              <p><strong>상태:</strong> {selectedCounseling.status === 'pending' ? '대기' : selectedCounseling.status === 'accepted' ? '승인' : '거절'}</p>
              {selectedCounseling.rejectionReason && (
                <p><strong>거절 사유:</strong> {selectedCounseling.rejectionReason}</p>
              )}
              {selectedCounseling.studentNote && (
                <div style={{ marginTop: '10px', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#E3F2FD' }}>
                  <strong>학생 요청 메모</strong>
                  <p style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>{selectedCounseling.studentNote}</p>
                </div>
              )}
              {selectedCounseling.teacherNotes && (
                <div style={{ marginTop: '10px', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f7f7f7' }}>
                  <strong>상담 내용</strong>
                  <p style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>{selectedCounseling.teacherNotes}</p>
                </div>
              )}

              {isTeacher && (
                <div style={{ marginTop: '20px' }}>
                  <h4>교사용 조치</h4>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
                    <button type="button" onClick={() => handleCounselingStatusUpdate(selectedCounseling._id, 'accepted')} style={{ padding: '10px 14px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>승인</button>
                    <button type="button" onClick={() => handleCounselingStatusUpdate(selectedCounseling._id, 'rejected', selectedCounseling.rejectionReason || '일정 조정 필요')} style={{ padding: '10px 14px', backgroundColor: '#F44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>거절</button>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>거절 사유</label>
                    <textarea value={selectedCounseling.rejectionReason || ''} onChange={(e) => setSelectedCounseling(prev => prev ? { ...prev, rejectionReason: e.target.value } : prev)} rows="3" style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }} placeholder="거절 사유를 입력하세요."></textarea>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>상담 내용 입력</label>
                    {selectedCounseling.status !== 'accepted' && (
                      <p style={{ color: '#F44336', marginBottom: '10px', fontSize: '14px' }}>상담을 승인한 후 상담 내용을 입력할 수 있습니다.</p>
                    )}
                    <textarea value={selectedCounseling.teacherNotes || ''} onChange={handleTeacherNotesChange} disabled={selectedCounseling.status !== 'accepted'} rows="5" style={{ width: '100%', padding: '10px', boxSizing: 'border-box', backgroundColor: selectedCounseling.status !== 'accepted' ? '#f0f0f0' : 'white' }} placeholder="상담 내용을 입력하세요."></textarea>
                    <button type="button" onClick={handleStudentNotesSave} disabled={counselingLoading || selectedCounseling.status !== 'accepted'} style={{ marginTop: '10px', padding: '10px 16px', backgroundColor: selectedCounseling.status === 'accepted' ? '#1976D2' : '#ccc', color: 'white', border: 'none', borderRadius: '4px', cursor: (counselingLoading || selectedCounseling.status !== 'accepted') ? 'not-allowed' : 'pointer' }}>
                      {counselingLoading ? '저장 중...' : '상담 내용 저장'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    )
  }

  return renderMainApp()
}

export default App

