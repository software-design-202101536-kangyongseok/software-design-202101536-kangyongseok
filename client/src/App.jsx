import { useState, useEffect } from 'react'
import './App.css'
import Login from './Login'

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
    bio: ''
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
    bio: ''
  })
  const [showEditModal, setShowEditModal] = useState(false)

  // Student info modal state
  const [showStudentModal, setShowStudentModal] = useState(false)

  const defaultSubjects = ['국어', '영어', '수학', '사회', '과학']

  // Sorting state
  const [sortColumn, setSortColumn] = useState('term')
  const [sortDirection, setSortDirection] = useState('asc')

  // All students data for ranking
  const [allStudents, setAllStudents] = useState([])
  const [allStudentsLoading, setAllStudentsLoading] = useState(false)
  const [allStudentsError, setAllStudentsError] = useState('')

  // Settings state
  const [subjects, setSubjects] = useState(defaultSubjects)
  const [newSubject, setNewSubject] = useState('')

  useEffect(() => {
    if (!user) return

    if (activeTab === 'settings') {
      fetchSubjects()
    }
    fetchSubjects() // Always fetch subjects for register/edit

    if (activeTab === 'search') {
      if (user.userType === 'student' || user.userType === 'parent') {
<<<<<<< HEAD
        // 학생이나 학부모는 본인 정보 자동 검색 및 자동 표시
        setStudentName(user.username)
        fetchStudent(user.username, true)
=======
        // 학생이나 학부모는 본인 정보 자동 검색
        fetchStudent(user.username)
>>>>>>> d449abc640714da98cfec9e982634348250e3920
      } else {
        fetchAllStudents()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user])

  const validateBirthDate = (birthDate) => {
    if (!birthDate) return 'Birth date is required'
    const date = new Date(birthDate)
    if (isNaN(date.getTime())) return 'Birth date must be a valid date'
    return null
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

  const handleGradeScaleChange = (grade, value) => {
    setGradeScale(prev => ({
      ...prev,
      [grade]: parseInt(value) || 0
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
      const response = await fetch('http://localhost:3000/students/subjects', {
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
      const response = await fetch(`http://localhost:3000/students/subjects/${encodeURIComponent(subjectName)}`, {
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

<<<<<<< HEAD
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
    setFormData({ name: '', birthDate: '', gender: '', subject: [], bio: '' })
    setGradeData({ subject: '', score: '', year: new Date().getFullYear(), term: 1 })
    setAttendanceData({ date: new Date().toISOString().split('T')[0], status: 'present' })
    setEditData({ name: '', birthDate: '', gender: '', subject: [], bio: '' })
    setNewSubject('')
  }

  const fetchStudent = async (name = studentName, showModal = false) => {
=======
  const fetchStudent = async (name = studentName) => {
>>>>>>> d449abc640714da98cfec9e982634348250e3920
    const searchName = name || studentName
    if (!searchName || !searchName.trim()) {
      setError('Please enter a student name')
      return
    }
    
    setLoading(true)
    setError('')
    setStudentData(null)
<<<<<<< HEAD
    setShowStudentModal(false)
=======
>>>>>>> d449abc640714da98cfec9e982634348250e3920
    
    try {
      const response = await fetch(`http://localhost:3000/students?name=${encodeURIComponent(searchName)}&subject=${encodeURIComponent(subjectFilter)}`)
      
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
<<<<<<< HEAD
      setShowStudentModal(showModal)
=======
>>>>>>> d449abc640714da98cfec9e982634348250e3920
      
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
      const response = await fetch('http://localhost:3000/students/all')
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

  const fetchSubjects = async () => {
    try {
      const response = await fetch('http://localhost:3000/students/subjects')
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

  const handleGradeChange = (e) => {
    const { name, value } = e.target
    setGradeData(prev => ({
      ...prev,
      [name]: name === 'year' || name === 'term' || name === 'score' ? parseInt(value) : value
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
      const response = await fetch('http://localhost:3000/students/grades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: studentData.studentId,
          subject: gradeData.subject.trim(),
          score: parseInt(gradeData.score),
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
      fetchStudent()
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
      const response = await fetch('http://localhost:3000/students/attendances', {
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
      fetchStudent()
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
    if (!editData.age) {
      setError('Age is required')
      return
    }
    const ageNum = parseInt(editData.age)
    if (isNaN(ageNum)) {
      setError('Age must be a number')
      return
    }
    if (ageNum < 1 || ageNum > 120) {
      setError('Age must be between 1 and 120')
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

    setLoading(true)
    try {
      const response = await fetch(`http://localhost:3000/students/${studentData.username}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editData.name.trim(),
          age: parseInt(editData.age),
          subject: editData.subject,
          bio: editData.bio.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update student')
      }

      setSuccess(`Student "${editData.name}" updated successfully!`)
      
      // 학생 정보 새로고침
      fetchStudent()
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

  const openEditModal = () => {
    setEditData({
      name: studentData.username,
      birthDate: studentData.birthDate ? new Date(studentData.birthDate).toISOString().split('T')[0] : '',
      gender: studentData.gender || '',
      subject: Array.isArray(studentData.subjects) ? studentData.subjects : [studentData.subjects],
      bio: studentData.bio
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
      const response = await fetch('http://localhost:3000/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          birthDate: formData.birthDate,
          gender: formData.gender,
          subject: formData.subject,
          bio: formData.bio.trim()
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
      setFormData({ name: '', birthDate: '', gender: '', subject: '', bio: '' })
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
<<<<<<< HEAD
    resetSessionState()
=======
>>>>>>> d449abc640714da98cfec9e982634348250e3920
    setUser(userData)
    setIsLoggedIn(true)
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="App" style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ textAlign: 'center', color: '#333' }}>Student Management System</h1>
        <div>
          <span style={{ marginRight: '10px' }}>환영합니다, {user.username} ({user.userType === 'teacher' ? '교사' : user.userType === 'student' ? '학생' : '학부모'})</span>
<<<<<<< HEAD
          <button onClick={() => { resetSessionState(); setIsLoggedIn(false); setUser(null); }} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>로그아웃</button>
=======
          <button onClick={() => { setIsLoggedIn(false); setUser(null); }} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>로그아웃</button>
>>>>>>> d449abc640714da98cfec9e982634348250e3920
        </div>
      </div>
      <nav style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '2px solid #e0e0e0', paddingBottom: '10px' }}>
        <button 
          onClick={() => setActiveTab('search')}
          style={{ 
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === 'search' ? '#2196F3' : '#f0f0f0',
            color: activeTab === 'search' ? 'white' : '#333',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: activeTab === 'search' ? 'bold' : 'normal'
          }}
        >
          학생 검색
        </button>
        {user.userType === 'teacher' && (
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
        {user.userType === 'teacher' && (
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
      {activeTab === 'search' && (
        <section>
          {user.userType === 'teacher' && (
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
          {user.userType !== 'teacher' && (
            <div style={{ marginBottom: '15px' }}>
              <p>귀하의 학생 정보입니다.</p>
            </div>
          )}
          
          {!studentData && (
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
                    <li key={student.name} style={{ padding: '8px', borderBottom: '1px solid #eee', cursor: 'pointer' }} onClick={() => {
                      setStudentName(student.name)
                      fetchStudent(student.name)
                      setShowStudentModal(true)
                    }}>
                      <strong>{student.name}</strong> - 과목: {Array.isArray(student.subject) ? student.subject.join(', ') : student.subject}
                    </li>
                  ))}
                </ul>
              ) : (
                <p></p>
              )}
            </div>
          )}
          
          {error && <p style={{ color: 'red', margin: '10px 0' }}>{error}</p>}
          {studentData && showStudentModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', maxWidth: '800px', width: '90%', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
                <button onClick={() => setShowStudentModal(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'black' }}>×</button>
                <h2>{studentData.username} {user.userType === 'teacher' && <button onClick={openEditModal} style={{ marginLeft: '10px', padding: '5px 10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>기본정보 수정</button>}</h2>
                <p><strong>생년월일:</strong> {new Date(studentData.birthDate).toLocaleDateString('ko-KR')}</p>
                <p><strong>성별:</strong> {studentData.gender === 'male' ? '남성' : '여성'}</p>
                <p><strong>과목:</strong> {studentData.subjects.join(', ')}</p>
                <p><strong>자기소개:</strong> {studentData.bio}</p>
                
                <h3>출석 {user.userType === 'teacher' && <button onClick={() => setShowAttendanceModal(true)} style={{ marginLeft: '10px', padding: '5px 10px', backgroundColor: '#9C27B0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>출석 입력</button>}</h3>
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
                
                <h3>성적 {user.userType === 'teacher' && <><button onClick={() => setShowGradeModal(true)} style={{ marginLeft: '10px', padding: '5px 10px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>성적 입력</button> <button onClick={() => setShowGradeScaleModal(true)} style={{ marginLeft: '10px', padding: '5px 10px', backgroundColor: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>등급 기준 변경</button></>}</h3>
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
                            <th onClick={() => handleSort('term')} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', cursor: 'pointer' }}>학기 {sortColumn === 'term' ? (sortDirection === 'asc' ? '🔼' : '🔽') : '↕️'}</th>
                            <th onClick={() => handleSort('subject')} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', cursor: 'pointer' }}>과목 {sortColumn === 'subject' ? (sortDirection === 'asc' ? '🔼' : '🔽') : '↕️'}</th>
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
                              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{getRank(grade.subject, grade.score)}</td>
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
              </div>
            </div>
          )}
        </section>
      )}
      {showGradeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', maxWidth: '500px', width: '90%', position: 'relative' }}>
            <button onClick={() => setShowGradeModal(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'black' }}>×</button>
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
            <button onClick={() => setShowGradeScaleModal(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'black' }}>×</button>
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
            <button onClick={() => setShowAttendanceModal(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'black' }}>×</button>
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
            <button onClick={() => setShowEditModal(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'black' }}>×</button>
            <h3>기본정보 수정</h3>
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
            </form>
            {success && <p style={{ color: '#388e3c', marginTop: '10px', padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>{success}</p>}
            {error && <p style={{ color: 'red', marginTop: '10px', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px' }}>{error}</p>}
          </div>
        </div>
      )}
      {activeTab === 'register' && (
        <section style={{ maxWidth: '500px' }}>
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
    </div>
  )
}

export default App
