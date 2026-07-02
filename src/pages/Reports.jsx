import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const todayStr = () => new Date().toLocaleDateString('sv-SE');
const thisMonth = () => new Date().toLocaleDateString('sv-SE').slice(0, 7);

const MONTHS_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

const prevMonth = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return mo === 1 ? `${y-1}-12` : `${y}-${String(mo-1).padStart(2,'0')}`;
};
const nextMonth = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return mo === 12 ? `${y+1}-01` : `${y}-${String(mo+1).padStart(2,'0')}`;
};
const fmtMonth = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return `${MONTHS_TR[mo-1]} ${y}`;
};
const fmtDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('tr-TR', {
  weekday: 'short', day: 'numeric', month: 'long'
});

function SummaryCards({ total_orders, total_revenue, unique_tables, active_days, total_nakit, total_kk, total_yemek, total_tahsilat, total_expense }) {
  const tahsilat = Number(total_tahsilat) || 0;
  const net = tahsilat - (Number(total_expense) || 0);
  return (
    <>
      <div className="report-cards">
        <div className="card">
          <h3>Toplam Sipariş</h3>
          <p className="value">{total_orders ?? '—'}</p>
        </div>
        <div className="card">
          <h3>Toplam Ciro</h3>
          <p className="value">{total_revenue != null ? Number(total_revenue).toFixed(2) + ' ₺' : '—'}</p>
        </div>
        <div className="card">
          <h3>Toplam Tahsilat</h3>
          <p className="value">{tahsilat.toFixed(2)} ₺</p>
        </div>
        <div className="card">
          <h3>Kullanılan Masa</h3>
          <p className="value">{unique_tables ?? '—'}</p>
        </div>
        {active_days != null && (
          <div className="card">
            <h3>Aktif Gün</h3>
            <p className="value">{active_days}</p>
          </div>
        )}
      </div>
      {(total_nakit != null || total_kk != null || total_yemek != null) && (
        <div className="report-cards payment-cards">
          <div className="card">
            <h3>💵 Nakit</h3>
            <p className="value">{Number(total_nakit || 0).toFixed(2)} ₺</p>
          </div>
          <div className="card">
            <h3>💳 Kredi/Banka</h3>
            <p className="value">{Number(total_kk || 0).toFixed(2)} ₺</p>
          </div>
          <div className="card">
            <h3>🎟 Yemek Kartı</h3>
            <p className="value">{Number(total_yemek || 0).toFixed(2)} ₺</p>
          </div>
          {total_expense != null && (
            <div className="card card-expense">
              <h3>Giderler</h3>
              <p className="value">{Number(total_expense || 0).toFixed(2)} ₺</p>
            </div>
          )}
          {total_expense != null && (
            <div className={`card card-net ${net >= 0 ? 'positive' : 'negative'}`}>
              <h3>Net Kazanç</h3>
              <p className="value">{net.toFixed(2)} ₺</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Reports({ token }) {
  const [tab, setTab] = useState('daily');

  const [dailyDate, setDailyDate] = useState(todayStr());
  const [dailySummary, setDailySummary] = useState(null);
  const [dailyDetail, setDailyDetail] = useState(null);
  const [loadingDaily, setLoadingDaily] = useState(false);

  const [month, setMonth] = useState(thisMonth());
  const [monthlyData, setMonthlyData] = useState(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  useEffect(() => {
    if (tab === 'daily') fetchDaily();
  }, [tab, dailyDate]);

  useEffect(() => {
    if (tab === 'monthly') fetchMonthly();
  }, [tab, month]);

  const fetchDaily = async () => {
    setLoadingDaily(true);
    try {
      const [sumRes, detRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/admin/daily-report?date=${dailyDate}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${BACKEND_URL}/api/admin/daily-report-detail?date=${dailyDate}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);
      setDailySummary(sumRes.data);
      setDailyDetail(detRes.data);
    } catch (err) { console.error(err); }
    finally { setLoadingDaily(false); }
  };

  const fetchMonthly = async () => {
    setLoadingMonthly(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/monthly-report?month=${month}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMonthlyData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoadingMonthly(false); }
  };

  const exportDailyExcel = () => {
    const wb = XLSX.utils.book_new();
    if (dailySummary) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{
        'Tarih': dailyDate,
        'Toplam Sipariş': dailySummary.total_orders,
        'Toplam Ciro (₺)': Number(dailySummary.total_revenue).toFixed(2),
        'Toplam Tahsilat (₺)': Number(dailySummary.total_tahsilat || 0).toFixed(2),
        'Nakit (₺)': Number(dailySummary.total_nakit || 0).toFixed(2),
        'Kredi/Banka (₺)': Number(dailySummary.total_kk || 0).toFixed(2),
        'Yemek Kartı (₺)': Number(dailySummary.total_yemek || 0).toFixed(2),
        'Giderler (₺)': Number(dailySummary.total_expense || 0).toFixed(2),
        'Net Kazanç (₺)': (Number(dailySummary.total_tahsilat || 0) - Number(dailySummary.total_expense || 0)).toFixed(2),
        'Kullanılan Masa': dailySummary.unique_tables,
      }]), 'Özet');
    }
    if (dailyDetail?.hourly?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        dailyDetail.hourly.map(h => ({ 'Saat': `${h.hour}:00`, 'Sipariş': h.orders, 'Ciro (₺)': Number(h.revenue).toFixed(2) }))
      ), 'Saatlik');
    }
    if (dailyDetail?.top_items?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        dailyDetail.top_items.map((item, i) => ({ '#': i + 1, 'Ürün': item.name, 'Adet': item.quantity, 'Tutar (₺)': Number(item.revenue).toFixed(2) }))
      ), 'Top Ürünler');
    }
    XLSX.writeFile(wb, `gunluk-rapor-${dailyDate}.xlsx`);
  };

  const exportMonthlyExcel = () => {
    const wb = XLSX.utils.book_new();
    if (monthlyData) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{
        'Ay': fmtMonth(month),
        'Toplam Sipariş': monthlyData.total_orders,
        'Toplam Ciro (₺)': Number(monthlyData.total_revenue).toFixed(2),
        'Toplam Tahsilat (₺)': Number(monthlyData.total_tahsilat || 0).toFixed(2),
        'Nakit (₺)': Number(monthlyData.total_nakit || 0).toFixed(2),
        'Kredi/Banka (₺)': Number(monthlyData.total_kk || 0).toFixed(2),
        'Yemek Kartı (₺)': Number(monthlyData.total_yemek || 0).toFixed(2),
        'Giderler (₺)': Number(monthlyData.total_expense || 0).toFixed(2),
        'Net Kazanç (₺)': (Number(monthlyData.total_tahsilat || 0) - Number(monthlyData.total_expense || 0)).toFixed(2),
        'Kullanılan Masa': monthlyData.unique_tables,
        'Aktif Gün': monthlyData.active_days,
      }]), 'Özet');
    }
    if (monthlyData?.daily?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        monthlyData.daily.map(d => ({
          'Tarih': d.date,
          'Sipariş': d.total_orders,
          'Ciro (₺)': Number(d.total_revenue).toFixed(2),
          'Tahsilat (₺)': Number(d.tahsilat || 0).toFixed(2),
          'Nakit (₺)': Number(d.nakit || 0).toFixed(2),
          'Kredi/Banka (₺)': Number(d.kk || 0).toFixed(2),
          'Yemek Kartı (₺)': Number(d.yemek || 0).toFixed(2),
          'Masa': d.unique_tables,
        }))
      ), 'Günlük');
    }
    if (monthlyData?.expenses?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        monthlyData.expenses.map(e => ({
          'Tarih': e.date,
          'Açıklama': e.description,
          'Ödeme': e.payment_method,
          'Tutar (₺)': Number(e.amount).toFixed(2),
        }))
      ), 'Giderler');
    }
    if (monthlyData?.top_items?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        monthlyData.top_items.map((item, i) => ({ '#': i + 1, 'Ürün': item.name, 'Adet': item.quantity, 'Tutar (₺)': Number(item.revenue).toFixed(2) }))
      ), 'Top Ürünler');
    }
    XLSX.writeFile(wb, `aylik-rapor-${month}.xlsx`);
  };

  const goDay = (offset) => {
    const d = new Date(dailyDate);
    d.setDate(d.getDate() + offset);
    setDailyDate(d.toLocaleDateString('sv-SE'));
  };

  return (
    <div className="reports-page">
      <h1>Raporlar</h1>

      <div className="report-type-tabs">
        <button className={tab === 'daily' ? 'active' : ''} onClick={() => setTab('daily')}>Günlük</button>
        <button className={tab === 'monthly' ? 'active' : ''} onClick={() => setTab('monthly')}>Aylık</button>
      </div>

      {/* ── Günlük ── */}
      {tab === 'daily' && (
        <>
          <div className="date-nav">
            <button onClick={() => goDay(-1)}>◀</button>
            <input
              type="date"
              value={dailyDate}
              onChange={e => setDailyDate(e.target.value)}
              className="date-input"
            />
            <button onClick={() => goDay(1)}>▶</button>
            <button className="today-btn" onClick={() => setDailyDate(todayStr())}>Bugün</button>
            <button className="excel-btn" onClick={exportDailyExcel} disabled={!dailySummary || dailySummary.total_orders === 0}>📥 Excel</button>
          </div>

          {loadingDaily ? (
            <div className="report-loading">Yükleniyor...</div>
          ) : (
            <>
              {dailySummary && (
                <SummaryCards
                  total_orders={dailySummary.total_orders}
                  total_revenue={dailySummary.total_revenue}
                  unique_tables={dailySummary.unique_tables}
                  total_nakit={dailySummary.total_nakit}
                  total_kk={dailySummary.total_kk}
                  total_yemek={dailySummary.total_yemek}
                  total_tahsilat={dailySummary.total_tahsilat}
                  total_expense={dailySummary.total_expense}
                />
              )}

              {dailyDetail?.hourly?.length > 0 && (
                <div className="report-block">
                  <h3>Saatlik Dağılım</h3>
                  <table className="report-table">
                    <thead>
                      <tr><th>Saat</th><th>Sipariş</th><th>Ciro</th></tr>
                    </thead>
                    <tbody>
                      {dailyDetail.hourly.map(h => (
                        <tr key={h.hour}>
                          <td>{h.hour}:00 – {h.hour}:59</td>
                          <td>{h.orders}</td>
                          <td>{Number(h.revenue).toFixed(2)} ₺</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {dailyDetail?.top_items?.length > 0 && (
                <div className="report-block">
                  <h3>En Çok Sipariş Edilenler</h3>
                  <table className="report-table">
                    <thead>
                      <tr><th>#</th><th>Ürün</th><th>Adet</th><th>Tutar</th></tr>
                    </thead>
                    <tbody>
                      {dailyDetail.top_items.map((item, i) => (
                        <tr key={i}>
                          <td className="report-rank">{i + 1}</td>
                          <td>{item.name}</td>
                          <td>{item.quantity}</td>
                          <td>{Number(item.revenue).toFixed(2)} ₺</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {dailySummary?.total_orders === 0 && (
                <div className="report-empty">Bu tarihte sipariş bulunmuyor.</div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Aylık ── */}
      {tab === 'monthly' && (
        <>
          <div className="date-nav">
            <button onClick={() => setMonth(prevMonth(month))}>◀</button>
            <span className="month-display">{fmtMonth(month)}</span>
            <button onClick={() => setMonth(nextMonth(month))}>▶</button>
            <button className="today-btn" onClick={() => setMonth(thisMonth())}>Bu Ay</button>
            <button className="excel-btn" onClick={exportMonthlyExcel} disabled={!monthlyData || monthlyData.total_orders === 0}>📥 Excel</button>
          </div>

          {loadingMonthly ? (
            <div className="report-loading">Yükleniyor...</div>
          ) : (
            <>
              {monthlyData && (
                <SummaryCards
                  total_orders={monthlyData.total_orders}
                  total_revenue={monthlyData.total_revenue}
                  unique_tables={monthlyData.unique_tables}
                  active_days={monthlyData.active_days}
                  total_nakit={monthlyData.total_nakit}
                  total_kk={monthlyData.total_kk}
                  total_yemek={monthlyData.total_yemek}
                  total_tahsilat={monthlyData.total_tahsilat}
                  total_expense={monthlyData.total_expense}
                />
              )}

              {monthlyData?.daily?.length > 0 && (
                <div className="report-block">
                  <h3>Günlük Döküm</h3>
                  <table className="report-table">
                    <thead>
                      <tr><th>Tarih</th><th>Sipariş</th><th>Ciro</th><th>Tahsilat</th><th>Masa</th></tr>
                    </thead>
                    <tbody>
                      {monthlyData.daily.map(d => (
                        <tr key={d.date}>
                          <td>{fmtDate(d.date)}</td>
                          <td>{d.total_orders}</td>
                          <td>{Number(d.total_revenue).toFixed(2)} ₺</td>
                          <td>{Number(d.tahsilat || 0).toFixed(2)} ₺</td>
                          <td>{d.unique_tables}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td><strong>Toplam</strong></td>
                        <td><strong>{monthlyData.total_orders}</strong></td>
                        <td><strong>{Number(monthlyData.total_revenue).toFixed(2)} ₺</strong></td>
                        <td><strong>{Number(monthlyData.total_tahsilat || 0).toFixed(2)} ₺</strong></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {monthlyData?.top_items?.length > 0 && (
                <div className="report-block">
                  <h3>En Çok Sipariş Edilenler</h3>
                  <table className="report-table">
                    <thead>
                      <tr><th>#</th><th>Ürün</th><th>Adet</th><th>Tutar</th></tr>
                    </thead>
                    <tbody>
                      {monthlyData.top_items.map((item, i) => (
                        <tr key={i}>
                          <td className="report-rank">{i + 1}</td>
                          <td>{item.name}</td>
                          <td>{item.quantity}</td>
                          <td>{Number(item.revenue).toFixed(2)} ₺</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {monthlyData?.total_orders === 0 && (
                <div className="report-empty">Bu ayda sipariş bulunmuyor.</div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default Reports;
