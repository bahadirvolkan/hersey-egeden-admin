import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const todayStr = () => new Date().toLocaleDateString('sv-SE');
const thisMonth = () => new Date().toLocaleDateString('sv-SE').slice(0, 7);
const MONTHS_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const fmtMonth = (m) => { const [y, mo] = m.split('-').map(Number); return `${MONTHS_TR[mo-1]} ${y}`; };

const PAYMENT_LABELS = { nakit: '💵 Nakit', kk: '💳 Kredi/Banka', yemek: '🎟 Yemek Kartı' };

function Expenses({ token }) {
  const [tab, setTab] = useState('daily');
  const [date, setDate] = useState(todayStr());
  const [month, setMonth] = useState(thisMonth());
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ date: todayStr(), description: '', amount: '', payment_method: 'nakit' });
  const [saving, setSaving] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const param = tab === 'daily' ? `date=${date}` : `month=${month}`;
      const res = await axios.get(`${BACKEND_URL}/api/admin/expenses?${param}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpenses(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [tab, date, month, token]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleAdd = async () => {
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    try {
      await axios.post(`${BACKEND_URL}/api/admin/expenses`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setForm(prev => ({ ...prev, description: '', amount: '' }));
      fetchExpenses();
    } catch (err) { alert('Eklenemedi'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu gideri silmek istiyor musunuz?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/admin/expenses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err) { alert('Silinemedi'); }
  };

  const exportExcel = () => {
    if (!expenses.length) return;
    const rows = [
      ['Tarih', 'Açıklama', 'Ödeme Yöntemi', 'Tutar (₺)'],
      ...expenses.map(e => [
        e.date,
        e.description,
        PAYMENT_LABELS[e.payment_method] || e.payment_method,
        Number(e.amount).toFixed(2),
      ]),
      ['', '', 'TOPLAM', expenses.reduce((s, e) => s + Number(e.amount), 0).toFixed(2)],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 32 }, { wch: 18 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Giderler');
    XLSX.writeFile(wb, `giderler-${tab === 'daily' ? date : month}.xlsx`);
  };

  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const goDay = (offset) => {
    const d = new Date(date); d.setDate(d.getDate() + offset);
    setDate(d.toLocaleDateString('sv-SE'));
  };
  const prevMonth = (m) => { const [y, mo] = m.split('-').map(Number); return mo === 1 ? `${y-1}-12` : `${y}-${String(mo-1).padStart(2,'0')}`; };
  const nextMonth = (m) => { const [y, mo] = m.split('-').map(Number); return mo === 12 ? `${y+1}-01` : `${y}-${String(mo+1).padStart(2,'0')}`; };

  return (
    <div className="expenses-page">
      <h1>Giderler</h1>

      {/* Gider Ekle */}
      <div className="expense-add-card">
        <h3>Gider Ekle</h3>
        <div className="expense-form">
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
            className="expense-input"
          />
          <input
            type="text"
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Açıklama (örn. Ekmek alımı)"
            className="expense-input expense-desc"
          />
          <input
            type="number"
            value={form.amount}
            onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
            placeholder="Tutar (₺)"
            className="expense-input expense-amount"
            min="0"
            step="0.01"
          />
          <select
            value={form.payment_method}
            onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}
            className="expense-input expense-pay"
          >
            <option value="nakit">💵 Nakit</option>
            <option value="kk">💳 Kredi/Banka</option>
            <option value="yemek">🎟 Yemek Kartı</option>
          </select>
          <button
            className="expense-add-btn"
            onClick={handleAdd}
            disabled={saving || !form.description.trim() || !form.amount}
          >
            {saving ? '...' : '+ Ekle'}
          </button>
        </div>
      </div>

      {/* Liste Başlığı */}
      <div className="expense-list-header">
        <div className="report-type-tabs" style={{ marginBottom: 0 }}>
          <button className={tab === 'daily' ? 'active' : ''} onClick={() => setTab('daily')}>Günlük</button>
          <button className={tab === 'monthly' ? 'active' : ''} onClick={() => setTab('monthly')}>Aylık</button>
        </div>

        {tab === 'daily' ? (
          <div className="date-nav">
            <button onClick={() => goDay(-1)}>◀</button>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="date-input" />
            <button onClick={() => goDay(1)}>▶</button>
            <button className="today-btn" onClick={() => setDate(todayStr())}>Bugün</button>
          </div>
        ) : (
          <div className="date-nav">
            <button onClick={() => setMonth(prevMonth(month))}>◀</button>
            <span className="month-display">{fmtMonth(month)}</span>
            <button onClick={() => setMonth(nextMonth(month))}>▶</button>
            <button className="today-btn" onClick={() => setMonth(thisMonth())}>Bu Ay</button>
          </div>
        )}

        <button className="excel-btn" onClick={exportExcel} disabled={!expenses.length}>
          📥 Excel
        </button>
      </div>

      {/* Özet */}
      {expenses.length > 0 && (
        <div className="expense-summary">
          <span>{expenses.length} kayıt</span>
          <strong>Toplam: {totalExpense.toFixed(2)} ₺</strong>
        </div>
      )}

      {/* Tablo */}
      {loading ? (
        <div className="report-loading">Yükleniyor...</div>
      ) : expenses.length === 0 ? (
        <div className="report-empty">Bu dönem için gider bulunamadı.</div>
      ) : (
        <div className="expense-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Açıklama</th>
                <th>Ödeme</th>
                <th style={{ textAlign: 'right' }}>Tutar</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td>{e.description}</td>
                  <td>{PAYMENT_LABELS[e.payment_method] || e.payment_method}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(e.amount).toFixed(2)} ₺</td>
                  <td>
                    <button className="expense-delete-btn" onClick={() => handleDelete(e.id)}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}><strong>Toplam</strong></td>
                <td style={{ textAlign: 'right' }}><strong>{totalExpense.toFixed(2)} ₺</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export default Expenses;
