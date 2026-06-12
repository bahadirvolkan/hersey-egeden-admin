import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

function ConfirmModal({ message, onConfirm, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!password) { setError('Şifre gerekli'); return; }
    setLoading(true);
    setError('');
    try {
      await axios.post(`${BACKEND_URL}/api/admin/login`, { password });
      onConfirm();
    } catch {
      setError('Hatalı şifre');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-box" onClick={e => e.stopPropagation()}>
        <p>{message}</p>
        <input
          type="password"
          placeholder="Admin şifresi"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          className="confirm-password-input"
          autoFocus
        />
        {error && <p className="confirm-error">{error}</p>}
        <div className="confirm-btns">
          <button className="confirm-cancel-btn" onClick={onCancel}>Vazgeç</button>
          <button className="confirm-delete-btn" onClick={handleConfirm} disabled={loading}>
            {loading ? '...' : 'Sil'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
