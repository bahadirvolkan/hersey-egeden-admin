import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

function Settings({ token }) {
  const [form, setForm] = useState({ current_password: '', admin_password: '', kitchen_password: '' });
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.current_password) { setErr('Mevcut admin şifresi zorunlu'); return; }
    if (!form.admin_password && !form.kitchen_password) { setErr('En az bir şifre giriniz'); return; }
    setErr(null); setMsg(null); setLoading(true);
    try {
      await axios.put(`${BACKEND_URL}/api/admin/settings/passwords`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMsg('Şifreler başarıyla güncellendi.');
      setForm({ current_password: '', admin_password: '', kitchen_password: '' });
    } catch (error) {
      setErr(error.response?.data?.error || 'Güncelleme başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <h1>Ayarlar</h1>

      <div className="settings-card">
        <h2>Şifre Değiştir</h2>
        <p className="settings-desc">Admin ve mutfak şifrelerini buradan güncelleyebilirsiniz.</p>

        {msg && <div className="settings-success">{msg}</div>}
        {err && <div className="settings-error">{err}</div>}

        <form onSubmit={handleSubmit} className="settings-form">
          <div className="settings-field">
            <label>Mevcut Admin Şifresi *</label>
            <input
              type="password"
              name="current_password"
              value={form.current_password}
              onChange={handleChange}
              placeholder="Mevcut şifrenizi girin"
              autoComplete="current-password"
            />
          </div>

          <div className="settings-section-title">Yeni Şifreler (değiştirmek istediklerinizi doldurun)</div>

          <div className="settings-field">
            <label>Yeni Admin Şifresi</label>
            <input
              type="password"
              name="admin_password"
              value={form.admin_password}
              onChange={handleChange}
              placeholder="Boş bırakırsanız değişmez"
              autoComplete="new-password"
            />
          </div>

          <div className="settings-field">
            <label>Yeni Mutfak Şifresi</label>
            <input
              type="password"
              name="kitchen_password"
              value={form.kitchen_password}
              onChange={handleChange}
              placeholder="Boş bırakırsanız değişmez"
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="settings-save-btn" disabled={loading}>
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Settings;
