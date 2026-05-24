import { useState, useEffect } from 'react'
import './Login.css'
const API_URL = import.meta.env.VITE_API_URL || ''

function Login({ onLogin }) {
  const [userType, setUserType] = useState('teacher')
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [error, setError] = useState('')

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${API_URL}/students/all`)
      if (response.ok) {
        const data = await response.json()
        setStudents(data)
        // 첫 번째 학생을 기본 선택
        if (data.length > 0) {
          setSelectedStudent(data[0].name)
        }
      }
    } catch (err) {
      console.error('학생 목록 불러오기 실패:', err)
    }
  }

  useEffect(() => {
    // 학생 목록 불러오기
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStudents()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // 각 사용자 유형별로 mock 데이터 생성
    let mockUser
    switch (userType) {
      case 'teacher':
        mockUser = {
          username: 'teacher1',
          userType: 'teacher'
        }
        break
      case 'student': {
        if (!selectedStudent) {
          setError('학생을 선택해주세요.')
          return
        }
        // 선택된 학생 찾기
        const student = students.find(s => s.name === selectedStudent)
        if (!student) {
          setError('선택된 학생을 찾을 수 없습니다.')
          return
        }
        mockUser = {
          username: student.name,
          userType: 'student',
          studentId: student._id
        }
        break
      }
      case 'parent': {
        if (!selectedStudent) {
          setError('학생을 선택해주세요.')
          return
        }
        const studentForParent = students.find(s => s.name === selectedStudent)
        if (!studentForParent) {
          setError('선택된 학생을 찾을 수 없습니다.')
          return
        }
        mockUser = {
          username: 'parent1',
          userType: 'parent',
          studentId: studentForParent._id,
          studentName: studentForParent.name
        }
        break
      }
      default:
        setError('잘못된 사용자 유형입니다.')
        return
    }

    // 바로 로그인 처리
    onLogin(mockUser)
  }

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>로그인</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>사용자 유형 선택:</label>
            <select value={userType} onChange={(e) => setUserType(e.target.value)}>
              <option value="teacher">교사</option>
              <option value="student">학생</option>
              <option value="parent">학부모</option>
            </select>
          </div>
          
          {(userType === 'student' || userType === 'parent') && (
            <div className="form-group">
              <label>학생 선택:</label>
              <select 
                value={selectedStudent} 
                onChange={(e) => setSelectedStudent(e.target.value)}
              >
                {students.map(student => (
                  <option key={student.studentId || student.name} value={student.name}>
                    {student.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {error && <div className="error">{error}</div>}
          <button type="submit" className="login-btn">로그인</button>
        </form>
        <div className="login-info">
          <p><strong>교사:</strong> 모든 학생 정보 조회 및 관리 가능</p>
          <p><strong>학생:</strong> 선택한 학생의 정보만 조회 가능</p>
          <p><strong>학부모:</strong> 연결된 자녀 정보만 조회 가능</p>
        </div>
      </div>
    </div>
  )
}

export default Login