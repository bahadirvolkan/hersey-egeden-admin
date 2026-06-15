import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

function Dashboard({ token }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('sv-SE'));

  useEffect(() => {
    fetchReport();
  }, [selectedDate]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${BACKEND_URL}/api/admin/daily-report?date=${selectedDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReport(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const goDay = (offset) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toLocaleDateString('sv-SE'));
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="date-nav">
          <button onClick={() => goDay(-1)}>◀</button>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="date-input"
          />
          <button onClick={() => goDay(1)}>▶</button>
          <button className="today-btn" onClick={() => setSelectedDate(new Date().toLocaleDateString('sv-SE'))}>
            Bugün
          </button>
        </div>
      </div>

      {loading ? (
        <div>Yükleniyor...</div>
      ) : report ? (
        <div className="report-cards">
          <div className="card">
            <h3>Toplam Sipariş</h3>
            <p className="value">{report.total_orders}</p>
          </div>
          <div className="card">
            <h3>Toplam Satış</h3>
            <p className="value">{Number(report.total_revenue).toFixed(2)} ₺</p>
          </div>
          <div className="card">
            <h3>Kullanılan Masa</h3>
            <p className="value">{report.unique_tables}</p>
          </div>
        </div>
      ) : (
        <div>Rapor bulunamadı</div>
      )}
    </div>
  );
}

export default Dashboard;
