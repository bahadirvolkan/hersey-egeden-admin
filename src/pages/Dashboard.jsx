import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

function Dashboard({ token }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      <div className="date-selector">
        <label>Tarih Seç:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
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
            <p className="value">{report.total_revenue} ₺</p>
          </div>
          <div className="card">
            <h3>Kullanılan Masalar</h3>
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
