import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Menu from './pages/Menu';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Expenses from './pages/Expenses';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('admin-token'));
  const [navOpen, setNavOpen] = useState(false);

  const handleLogin = (newToken) => {
    setToken(newToken);
    localStorage.setItem('admin-token', newToken);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('admin-token');
  };

  const closeNav = () => setNavOpen(false);

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="admin-app">
        <button className="hamburger" onClick={() => setNavOpen(!navOpen)}>☰</button>

        {navOpen && <div className="nav-overlay" onClick={closeNav} />}

        <nav className={`admin-nav ${navOpen ? 'nav-open' : ''}`}>
          <div className="nav-header">
            <img src="/logo.png" alt="logo" className="nav-logo" />
            <h2>Her Şey Ege</h2>
          </div>
          <ul>
            <li><Link to="/dashboard" onClick={closeNav}>📊 Dashboard</Link></li>
            <li><Link to="/orders" onClick={closeNav}>🧾 Adisyonlar</Link></li>
            <li><Link to="/menu" onClick={closeNav}>🍽️ Menü</Link></li>
            <li><Link to="/reports" onClick={closeNav}>📈 Raporlar</Link></li>
            <li><Link to="/expenses" onClick={closeNav}>💸 Giderler</Link></li>
            <li><Link to="/settings" onClick={closeNav}>⚙️ Ayarlar</Link></li>
            <li>
              <a href="https://www.herseyegeden.com.tr/mutfak" target="_blank" rel="noreferrer" className="kitchen-link" onClick={closeNav}>
                👨‍🍳 Mutfak
              </a>
            </li>
            <li><button onClick={handleLogout} className="logout-btn">🚪 Çıkış</button></li>
          </ul>
        </nav>

        <div className="admin-content" onClick={navOpen ? closeNav : undefined}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard token={token} />} />
            <Route path="/orders" element={<Orders token={token} />} />
            <Route path="/menu" element={<Menu token={token} />} />
            <Route path="/settings" element={<Settings token={token} />} />
            <Route path="/reports" element={<Reports token={token} />} />
            <Route path="/expenses" element={<Expenses token={token} />} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
