import { useState, useEffect } from 'react'
import './Login.css'
const API_URL = import.meta.env.VITE_API_URL || ''
const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY || ''

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
          setSelectedStudent(data[0]._id || data[0].studentId || '')
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

  useEffect(() => {
    if (!window.Kakao) {
      const script = document.createElement('script')
      script.src = 'https://developers.kakao.com/sdk/js/kakao.js'
      script.async = true
      script.onload = () => {
        if (window.Kakao && !window.Kakao.isInitialized() && KAKAO_JS_KEY) {
          window.Kakao.init(KAKAO_JS_KEY)
        }
      }
      document.body.appendChild(script)
    } else if (!window.Kakao.isInitialized() && KAKAO_JS_KEY) {
      window.Kakao.init(KAKAO_JS_KEY)
    }
  }, [])

  const handleKakaoLogin = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault()
    }

    setError('')

    if (!KAKAO_JS_KEY) {
      setError('카카오 JS 키가 설정되어 있지 않습니다.')
      return
    }

    if (!window.Kakao) {
      setError('카카오 SDK 로딩에 실패했습니다. 페이지를 새로고침 해주세요.')
      return
    }

    if (!window.Kakao.isInitialized()) {
      window.Kakao.init(KAKAO_JS_KEY)
    }

    window.Kakao.Auth.login({
      // Do not persist tokens in the SDK (prevents automatic re-login/cache)
      persistAccessToken: false,
      persistRefreshToken: false,
      success: async (authObj) => {
        try {
          const token = authObj.access_token
          const profileResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
          const profileData = await profileResponse.json()
          const kakaoId = String(profileData.id)
          const kakaoAccount = profileData.kakao_account || {}
          const nickname = profileData.properties?.nickname || kakaoAccount.profile?.nickname || '카카오 사용자'
          const email = kakaoAccount.email || ''
          const profileImage = profileData.properties?.profile_image || kakaoAccount.profile?.profile_image_url || ''

          if ((userType === 'student' || userType === 'parent') && !selectedStudent) {
            setError('학생을 선택해주세요.')
            return
          }

          const linkedStudent = students.find(s => s._id === selectedStudent || s.studentId === selectedStudent || s.name === selectedStudent)
          if ((userType === 'student' || userType === 'parent') && !linkedStudent) {
            setError('선택한 학생이 등록된 학생 목록에 없습니다.')
            return
          }

          const payload = {
            kakaoId,
            username: nickname,
            email,
            profileImage,
            userType,
            studentId: (userType === 'student' || userType === 'parent') ? (linkedStudent?._id || linkedStudent?.studentId) : undefined
          }

          const response = await fetch(`${API_URL}/students/auth/kakao`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || 'Kakao login failed')
          }

          const data = await response.json()
          onLogin(data.user)

          // Clear any SDK-stored token just in case (defensive)
          try {
            if (window.Kakao && window.Kakao.Auth && typeof window.Kakao.Auth.setAccessToken === 'function') {
              window.Kakao.Auth.setAccessToken('')
            }
          } catch (e) {
            // ignore
          }
        } catch (loginErr) {
          console.error('Kakao login error:', loginErr)
          setError(loginErr.message || '카카오 로그인에 실패했습니다.')
        }
      },
      fail: (err) => {
        console.error('Kakao auth fail:', err)
        setError('카카오 로그인 중 오류가 발생했습니다.')
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await handleKakaoLogin()
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
                  <option key={student._id || student.studentId || student.name} value={student._id || student.studentId || student.name}>
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