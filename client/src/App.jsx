import React, { useState } from 'react'
import './App.css'
import Login from './Login'

const API_URL = import.meta.env.VITE_API_URL || ''

function App() {
  const [user, setUser] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const handleLogin = (u) => {
    setUser(u)
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    setUser(null)
    setIsLoggedIn(false)
  }

  return (
    <div className="App">
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <div style={{ padding: 24 }}>
          <h2>환영합니다, {user?.username || '사용자'}</h2>
          <button onClick={handleLogout}>로그아웃</button>
        </div>
      )}
    </div>
  )
}

export default App
