import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Menu from './pages/Menu';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';

function App() {
  const [token, setToken] = useState(localStorage.getItem('admin-token'));

  const handleLogin = (newToken) => {
    setToken(newToken);
    localStorage.setItem('admin-token', newToken);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('admin-token');
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="admin-app">
        <nav className="admin-nav">
          <div className="nav-header">
            <img src="/logo.png" alt="logo" className="nav-logo" />
            <h2>Her Şey Ege</h2>
          </div>
          <ul>
            <li><Link to="/dashboard">📊 Dashboard</Link></li>
            <li><Link to="/orders">🧾 Adisyonlar</Link></li>
            <li><Link to="/menu">🍽️ Menü</Link></li>
            <li><Link to="/reports">📈 Raporlar</Link></li>
            <li><Link to="/settings">⚙️ Ayarlar</Link></li>
<li><button onClick={handleLogout} className="logout-btn">🚪 Çıkış</button></li>
          </ul>
        </nav>

        <div className="admin-content">
          <Routes>
            <Route path="/dashboard" element={<Dashboard token={token} />} />
            <Route path="/orders" element={<Orders token={token} />} />
            <Route path="/menu" element={<Menu token={token} />} />
            <Route path="/settings" element={<Settings token={token} />} />
            <Route path="/reports" element={<Reports token={token} />} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
