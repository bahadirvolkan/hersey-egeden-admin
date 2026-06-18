import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import * as XLSX from 'xlsx';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const toUTC = (dt) => dt ? new Date(dt.includes('Z') ? dt : dt + 'Z') : null;

const fmtTime = (dt) => {
  const d = toUTC(dt);
  return d ? d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : null;
};

const fmtDateTime = (dt) => {
  const d = toUTC(dt);
  return d ? d.toLocaleString('tr-TR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : null;
};

const RECEIPT_CSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Verdana, 'Segoe UI', Arial, sans-serif; font-size: 14px; padding: 20px; max-width: 280px; color: #111; }
  h1 { text-align: center; font-size: 21px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 2px; }
  .sub { text-align: center; font-size: 15px; color: #555; margin-bottom: 12px; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; }
  .divider { border: none; border-top: 2px solid #111; margin: 10px 0; }
  .meta { display: flex; justify-content: space-between; font-size: 15px; color: #333; margin-bottom: 10px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 5px 0; vertical-align: top; font-size: 14px; }
  td.r { text-align: right; white-space: nowrap; padding-left: 8px; }
  tr.adj td { color: #555; font-style: italic; font-size: 13px; }
  .total-row td { font-weight: 700; font-size: 17px; border-top: 2px solid #111; padding-top: 8px; }
  .payment-row td { font-size: 14px; color: #333; padding: 3px 0; }
  .note { font-size: 14px; margin-top: 10px; color: #333; }
  .partial-tag { text-align: center; font-size: 14px; color: #777; margin-bottom: 12px; font-weight: 600; }
  .footer { text-align: center; font-size: 15px; color: #888; margin-top: 16px; letter-spacing: 0.5px; }
  @media print { body { padding: 0; } }
`;

function buildPaymentRows(payment) {
  if (!payment || (!payment.nakit && !payment.kk && !payment.yemek)) return '';
  const rows = [
    payment.nakit > 0 ? `<tr class="payment-row"><td>Nakit</td><td class="r">${payment.nakit.toFixed(2)} ₺</td></tr>` : '',
    payment.kk > 0 ? `<tr class="payment-row"><td>Kredi/Banka Kartı</td><td class="r">${payment.kk.toFixed(2)} ₺</td></tr>` : '',
    payment.yemek > 0 ? `<tr class="payment-row"><td>Yemek Kartı</td><td class="r">${payment.yemek.toFixed(2)} ₺</td></tr>` : '',
  ].join('');
  return `<hr class="divider"><table>${rows}</table>`;
}

function autoPrintBill({ table_number, orders, payment = {} }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('tr-TR');
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const combined = {};
  let total = 0;
  for (const order of orders) {
    for (const item of order.items) {
      const key = item.name;
      if (combined[key]) combined[key].quantity += item.quantity;
      else combined[key] = { name: item.name, quantity: item.quantity, price: parseFloat(item.price_at_purchase) };
    }
    total += parseFloat(order.total_price);
  }

  const rows = Object.values(combined).map(i =>
    `<tr><td>${i.quantity}x ${i.name}</td><td class="r">${(i.price * i.quantity).toFixed(2)} ₺</td></tr>`
  ).join('');

  const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
<title>Hesap — Masa ${table_number}</title>
<style>${RECEIPT_CSS}</style></head><body>
<h1>Her Şey Ege'den</h1>
<div class="sub">Kahvaltı &amp; Meze</div>
<hr class="divider">
<div class="meta"><span>Masa ${table_number}</span><span>${dateStr} ${timeStr}</span></div>
<hr class="divider">
<table>${rows}
  <tr class="total-row"><td>TOPLAM</td><td class="r">${total.toFixed(2)} ₺</td></tr>
</table>
${buildPaymentRows(payment)}
<div class="footer">Teşekkürler • Afiyet olsun</div>
<script>window.onload = () => { window.print(); setTimeout(() => window.close(), 800); }</script>
</body></html>`;

  const w = window.open('', '_blank', 'width=400,height=600');
  if (w) { w.document.write(html); w.document.close(); }
}

function autoPrint(order) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('tr-TR');
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const rows = order.items.map(i =>
    `<tr><td>${i.quantity}x ${i.name}</td></tr>`
  ).join('');
  const noteRow = order.customer_note
    ? `<p class="note">Not: ${order.customer_note}</p>` : '';

  const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
<title>Adisyon — Masa ${order.table_number}</title>
<style>${RECEIPT_CSS}</style></head><body>
<h1>Her Şey Ege'den</h1>
<div class="sub">Kahvaltı &amp; Meze</div>
<hr class="divider">
<div class="meta"><span>Masa ${order.table_number}</span><span>#${order.id}</span><span>${dateStr} ${timeStr}</span></div>
<hr class="divider">
<table>${rows}</table>
${noteRow}
<div class="footer">Teşekkürler • Afiyet olsun</div>
<script>window.onload = () => { window.print(); setTimeout(() => window.close(), 800); }</script>
</body></html>`;

  const w = window.open('', '_blank', 'width=400,height=600');
  if (w) { w.document.write(html); w.document.close(); }
}

function Timeline({ order }) {
  const events = [
    { label: 'Sipariş geldi',    time: order.created_at,        icon: '🟢' },
    { label: 'Tamamlandı',       time: order.completed_at,       icon: '✅' },
    { label: 'Hesap istendi',    time: order.bill_requested_at,  icon: '🧾' },
    { label: 'Masa kapatıldı',   time: order.closed_at,          icon: '🔒' },
  ].filter(e => e.time);

  return (
    <div className="order-timeline">
      {events.map((e, i) => (
        <div key={i} className="timeline-event">
          <span className="tl-icon">{e.icon}</span>
          <span className="tl-label">{e.label}</span>
          <span className="tl-time">{fmtTime(e.time)}</span>
        </div>
      ))}
    </div>
  );
}

function EditModal({ order, token, menu, onClose, onSaved, onPrintBill }) {
  const [items, setItems] = useState(
    order.items.map(i => ({
      menu_item_id: i.menu_item_id,
      name_override: i.name_override || null,
      name: i.name,
      quantity: i.quantity,
      price_at_purchase: parseFloat(i.price_at_purchase),
    }))
  );
  const [discount, setDiscount] = useState(parseFloat(order.discount) || 0);
  const [extra, setExtra] = useState(parseFloat(order.extra_charge) || 0);
  const [extraLabel, setExtraLabel] = useState(order.extra_charge_label || '');
  const [addSearch, setAddSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [closing, setClosing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [payVals, setPayVals] = useState({ nakit: '', kk: '', yemek: '' });
  const [tumuField, setTumuField] = useState(null);

  const itemsTotal = items.reduce((s, i) => s + i.price_at_purchase * i.quantity, 0);
  const finalTotal = Math.max(0, itemsTotal - discount + extra);

  const othersPaySum = (field) =>
    ['nakit', 'kk', 'yemek'].filter(f => f !== field)
      .reduce((s, f) => s + (parseFloat(payVals[f]) || 0), 0);
  const computedPayVal = (field) =>
    tumuField === field ? Math.max(0, finalTotal - othersPaySum(field)) : (parseFloat(payVals[field]) || 0);
  const getPayDisplay = (field) =>
    tumuField === field ? computedPayVal(field).toFixed(2) : payVals[field];
  const currentPayment = {
    nakit: computedPayVal('nakit'),
    kk:    computedPayVal('kk'),
    yemek: computedPayVal('yemek'),
  };

  const allMenuItems = menu.flatMap(c => c.items || []);
  const filtered = addSearch.trim()
    ? allMenuItems.filter(m => m.name.toLowerCase().includes(addSearch.toLowerCase()))
    : [];

  const updateQty = (idx, qty) => {
    if (qty < 1) return removeItem(idx);
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: qty } : it));
  };

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const addMenuItem = (menuItem) => {
    const exists = items.findIndex(i => i.menu_item_id === menuItem.id);
    if (exists >= 0) {
      setItems(prev => prev.map((it, i) => i === exists ? { ...it, quantity: it.quantity + 1 } : it));
    } else {
      setItems(prev => [...prev, {
        menu_item_id: menuItem.id,
        name_override: null,
        name: menuItem.name,
        quantity: 1,
        price_at_purchase: parseFloat(menuItem.price),
      }]);
    }
    setAddSearch('');
  };

  const addCustomItem = () => {
    setItems(prev => [...prev, {
      menu_item_id: null,
      name_override: 'Özel Kalem',
      name: 'Özel Kalem',
      quantity: 1,
      price_at_purchase: 0,
    }]);
  };

  const updateCustomName = (idx, val) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, name_override: val, name: val } : it));

  const updateCustomPrice = (idx, val) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, price_at_purchase: parseFloat(val) || 0 } : it));

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${BACKEND_URL}/api/admin/orders/${order.id}`, {
        items, discount, extra_charge: extra, extra_charge_label: extraLabel,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onSaved();
      onClose();
    } catch (err) {
      alert('Kaydetme başarısız');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseTable = async () => {
    setClosing(true);
    try {
      await axios.post(`${BACKEND_URL}/api/admin/table/${order.table_id}/close`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSaved();
      onClose();
    } catch (err) {
      alert('Masa kapatılamadı');
    } finally {
      setClosing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await axios.delete(`${BACKEND_URL}/api/admin/orders/${order.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { password: deletePassword }
      });
      onSaved();
      onClose();
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Silinemedi');
    } finally {
      setDeleting(false);
    }
  };

  const handlePrint = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('tr-TR');
    const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    const rows = items.map(i =>
      `<tr><td>${i.quantity}x ${i.name}</td></tr>`
    ).join('');

    const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
<title>Adisyon — Masa ${order.table_number}</title>
<style>${RECEIPT_CSS}</style></head><body>
<h1>Her Şey Ege'den</h1>
<div class="sub">Kahvaltı &amp; Meze</div>
<hr class="divider">
<div class="meta"><span>Masa ${order.table_number}</span><span>#${order.id}</span><span>${dateStr} ${timeStr}</span></div>
<hr class="divider">
<table>${rows}</table>
<div class="footer">Teşekkürler • Afiyet olsun</div>
<script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
</body></html>`;

    const w = window.open('', '_blank', 'width=400,height=600');
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="edit-modal" onClick={e => e.stopPropagation()}>
        <div className="edit-modal-header">
          <h3>Sipariş #{order.id} — Masa {order.table_number} Düzenle</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="edit-modal-body">
          {/* Ürün Listesi */}
          <div className="edit-section">
            <h4>Ürünler</h4>
            {items.map((item, idx) => (
              <div key={idx} className="edit-item-row">
                {item.menu_item_id === null ? (
                  <input
                    className="edit-custom-name"
                    value={item.name_override || ''}
                    onChange={e => updateCustomName(idx, e.target.value)}
                    placeholder="Kalem adı"
                  />
                ) : (
                  <span className="edit-item-name">{item.name}</span>
                )}
                {item.menu_item_id === null ? (
                  <input
                    className="edit-custom-price"
                    type="number"
                    value={item.price_at_purchase}
                    onChange={e => updateCustomPrice(idx, e.target.value)}
                    min="0"
                  />
                ) : (
                  <span className="edit-item-price">{item.price_at_purchase} ₺</span>
                )}
                <div className="edit-qty-ctrl">
                  <button onClick={() => updateQty(idx, item.quantity - 1)}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQty(idx, item.quantity + 1)}>+</button>
                </div>
                <span className="edit-item-subtotal">{(item.price_at_purchase * item.quantity).toFixed(2)} ₺</span>
                <button className="edit-remove-btn" onClick={() => removeItem(idx)}>🗑</button>
              </div>
            ))}
          </div>

          {/* Ürün Ekle */}
          <div className="edit-section">
            <h4>Ürün Ekle</h4>
            <div className="edit-add-row">
              <input
                className="edit-search"
                value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
                placeholder="Menüden ara..."
              />
              <button className="edit-custom-btn" onClick={addCustomItem}>+ Özel Kalem</button>
            </div>
            {filtered.length > 0 && (
              <div className="edit-search-results">
                {filtered.slice(0, 8).map(m => (
                  <button key={m.id} className="edit-search-item" onClick={() => addMenuItem(m)}>
                    <span>{m.name}</span>
                    <span>{m.price} ₺</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* İndirim & İlave */}
          <div className="edit-section edit-adjustments">
            <div className="edit-adj-row">
              <label>İndirim (₺)</label>
              <input type="number" min="0" value={discount}
                onChange={e => setDiscount(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="edit-adj-row">
              <label>İlave Ücret (₺)</label>
              <input type="number" min="0" value={extra}
                onChange={e => setExtra(parseFloat(e.target.value) || 0)} />
              <input className="edit-extra-label" value={extraLabel}
                onChange={e => setExtraLabel(e.target.value)} placeholder="Açıklama" />
            </div>
          </div>

          {/* Zaman Logu */}
          <Timeline order={order} />

          {/* Özet */}
          <div className="edit-summary">
            <div className="edit-summary-row">
              <span>Ürünler Toplamı</span>
              <span>{itemsTotal.toFixed(2)} ₺</span>
            </div>
            {discount > 0 && (
              <div className="edit-summary-row discount">
                <span>İndirim</span>
                <span>− {discount.toFixed(2)} ₺</span>
              </div>
            )}
            {extra > 0 && (
              <div className="edit-summary-row extra">
                <span>{extraLabel || 'İlave Ücret'}</span>
                <span>+ {extra.toFixed(2)} ₺</span>
              </div>
            )}
            <div className="edit-summary-row total">
              <span>Genel Toplam</span>
              <span>{finalTotal.toFixed(2)} ₺</span>
            </div>
          </div>

          {/* Ödeme Yöntemi */}
          <div className="edit-section">
            <h4>Ödeme Yöntemi</h4>
            <div className="payment-fields edit-payment-fields">
              {[
                { key: 'nakit', label: '💵 Nakit' },
                { key: 'kk',    label: '💳 Kredi / Banka' },
                { key: 'yemek', label: '🎟 Yemek Kartı' },
              ].map(({ key, label }) => (
                <div key={key} className="payment-field">
                  <div className="payment-field-header">
                    <label>{label}</label>
                    <button
                      className={`tumu-btn${tumuField === key ? ' active' : ''}`}
                      onClick={() => setTumuField(prev => prev === key ? null : key)}
                    >Tümü</button>
                  </div>
                  <input
                    type="number" min="0" step="0.01"
                    value={getPayDisplay(key)}
                    onChange={e => setPayVals(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder="0.00"
                    readOnly={tumuField === key}
                    className={tumuField === key ? 'tumu-active-input' : ''}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="edit-modal-footer">
          <div className="edit-footer-left">
            {closeConfirm ? (
              <div className="close-table-confirm">
                <span>Masayı kapatmak istiyor musunuz?</span>
                <button className="close-table-yes" onClick={handleCloseTable} disabled={closing}>
                  {closing ? '...' : 'Evet, Kapat'}
                </button>
                <button className="close-table-no" onClick={() => setCloseConfirm(false)}>İptal</button>
              </div>
            ) : (
              <button className="close-table-trigger" onClick={() => setCloseConfirm(true)}>
                🔒 Masayı Kapat
              </button>
            )}
          </div>
          <div className="edit-footer-right">
            <button className="edit-delete-btn" onClick={() => { setDeleteConfirm(true); setDeletePassword(''); setDeleteError(''); }}>
              🗑️ Sil
            </button>
            <button className="edit-print-btn" onClick={handlePrint}>🖨️ Yazdır</button>
            <button className="bill-print-btn" onClick={() => onPrintBill(order.table_id, currentPayment)}>🧾 Hesap Bas</button>
            <button className="edit-cancel-btn" onClick={onClose}>İptal</button>
            <button className="edit-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(false)}>
          <div className="delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <h3>Adisyon #{order.id} Silinecek</h3>
            <p>Bu işlem geri alınamaz. Onaylamak için admin şifresini girin.</p>
            <input
              type="password"
              placeholder="Admin şifresi"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDelete()}
              autoFocus
            />
            {deleteError && <p className="delete-error">{deleteError}</p>}
            <div className="delete-confirm-actions">
              <button onClick={() => setDeleteConfirm(false)}>İptal</button>
              <button className="delete-confirm-ok" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentModal({ total, onConfirm, onClose }) {
  const [vals, setVals] = useState({ nakit: '', kk: '', yemek: '' });
  const [tumuField, setTumuField] = useState(null); // 'nakit' | 'kk' | 'yemek' | null

  const othersSum = (field) =>
    ['nakit', 'kk', 'yemek']
      .filter(f => f !== field)
      .reduce((s, f) => s + (parseFloat(vals[f]) || 0), 0);

  const computedVal = (field) =>
    tumuField === field
      ? Math.max(0, total - othersSum(field))
      : (parseFloat(vals[field]) || 0);

  const nakit_v = computedVal('nakit');
  const kk_v    = computedVal('kk');
  const yemek_v = computedVal('yemek');
  const totalPaid = nakit_v + kk_v + yemek_v;
  const diff = total - totalPaid;

  const handleTumu = (field) =>
    setTumuField(prev => prev === field ? null : field);

  const getDisplayVal = (field) =>
    tumuField === field ? computedVal(field).toFixed(2) : vals[field];

  const FIELDS = [
    { key: 'nakit', label: '💵 Nakit' },
    { key: 'kk',    label: '💳 Kredi / Banka Kartı' },
    { key: 'yemek', label: '🎟 Yemek Kartı' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={e => e.stopPropagation()}>
        <div className="payment-modal-header">
          <h3>Ödeme Yöntemi</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="payment-total-display">
          <span>Toplam Tutar</span>
          <strong>{total.toFixed(2)} ₺</strong>
        </div>
        <div className="payment-fields">
          {FIELDS.map(({ key, label }) => (
            <div key={key} className="payment-field">
              <div className="payment-field-header">
                <label>{label}</label>
                <button
                  className={`tumu-btn${tumuField === key ? ' active' : ''}`}
                  onClick={() => handleTumu(key)}
                >
                  Tümü
                </button>
              </div>
              <input
                type="number" min="0" step="0.01"
                value={getDisplayVal(key)}
                onChange={e => setVals(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder="0.00"
                readOnly={tumuField === key}
                className={tumuField === key ? 'tumu-active-input' : ''}
              />
            </div>
          ))}
        </div>
        <div className={`payment-diff ${Math.abs(diff) < 0.01 ? 'ok' : diff > 0 ? 'under' : 'over'}`}>
          {Math.abs(diff) < 0.01 ? '✓ Toplam eşleşiyor' :
           diff > 0 ? `Kalan: ${diff.toFixed(2)} ₺` :
           `Fazla: +${Math.abs(diff).toFixed(2)} ₺`}
        </div>
        <div className="payment-modal-actions">
          <button className="payment-cancel-btn" onClick={onClose}>İptal</button>
          <button className="payment-confirm-btn" onClick={() => onConfirm({
            nakit: nakit_v, kk: kk_v, yemek: yemek_v,
          })}>
            🖨️ Adisyon Bas
          </button>
        </div>
      </div>
    </div>
  );
}

function Orders({ token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('sv-SE'));
  const [expandedId, setExpandedId] = useState(null);
  const [orderDetails, setOrderDetails] = useState({});
  const [editingOrder, setEditingOrder] = useState(null);
  const [menu, setMenu] = useState([]);
  const [partialSelections, setPartialSelections] = useState({});
  const [pendingBill, setPendingBill] = useState(null); // { tableId, billData }
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(
    () => localStorage.getItem('autoPrint') !== 'false'
  );
  const autoPrintRef = useRef(autoPrintEnabled);

  useEffect(() => {
    autoPrintRef.current = autoPrintEnabled;
    localStorage.setItem('autoPrint', autoPrintEnabled);
  }, [autoPrintEnabled]);

  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/menu`).then(r => setMenu(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const socket = io(BACKEND_URL);
    let ready = false;
    socket.on('connect', () => { ready = true; });
    socket.on('order:created', async ({ order_id }) => {
      if (!ready || !autoPrintRef.current) return;
      try {
        const res = await axios.get(`${BACKEND_URL}/api/admin/orders/${order_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        autoPrint(res.data);
      } catch (err) { console.error('Auto-print failed:', err); }
    });
    socket.on('table:closed', async ({ table_id }) => {
      if (!ready || !autoPrintRef.current) return;
      try {
        const res = await axios.get(`${BACKEND_URL}/api/admin/table/${table_id}/bill`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPendingBill({ tableId: table_id, billData: res.data });
      } catch (err) { console.error('Bill print failed:', err); }
    });
    return () => socket.close();
  }, [token]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      params.set('date', selectedDate);
      const response = await axios.get(`${BACKEND_URL}/api/admin/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filter, token, selectedDate]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const toggleOrder = async (orderId) => {
    if (expandedId === orderId) { setExpandedId(null); return; }
    setExpandedId(orderId);
    if (!orderDetails[orderId]) {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/admin/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrderDetails(prev => ({ ...prev, [orderId]: res.data }));
      } catch (err) { console.error(err); }
    }
  };

  const openEdit = async (e, orderId) => {
    e.stopPropagation();
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingOrder(res.data);
    } catch (err) { alert('Sipariş detayı alınamadı'); }
  };

  const handleSaved = () => {
    setOrderDetails({});
    fetchOrders();
  };

  const togglePartialItem = (orderId, idx, e) => {
    e.stopPropagation();
    setPartialSelections(prev => {
      const current = { ...(prev[orderId] || {}) };
      if (current[idx] > 0) delete current[idx];
      else current[idx] = orderDetails[orderId].items[idx].quantity;
      return { ...prev, [orderId]: current };
    });
  };

  const adjustPartialQty = (orderId, idx, delta, e) => {
    e.stopPropagation();
    setPartialSelections(prev => {
      const current = { ...(prev[orderId] || {}) };
      const maxQty = orderDetails[orderId].items[idx].quantity;
      const newQty = Math.max(0, Math.min(maxQty, (current[idx] || 0) + delta));
      if (newQty === 0) delete current[idx];
      else current[idx] = newQty;
      return { ...prev, [orderId]: current };
    });
  };

  const printPartialBill = async (orderId) => {
    const order = orderDetails[orderId];
    const selections = partialSelections[orderId] || {};
    const selectedItems = order.items
      .map((item, i) => ({ ...item, selectedQty: selections[i] || 0 }))
      .filter(item => item.selectedQty > 0);
    if (!selectedItems.length) return;

    const total = selectedItems.reduce((s, i) => s + parseFloat(i.price_at_purchase) * i.selectedQty, 0);
    const now = new Date();
    const dateStr = now.toLocaleDateString('tr-TR');
    const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const rows = selectedItems.map(i =>
      `<tr><td>${i.selectedQty}x ${i.name}</td><td class="r">${(parseFloat(i.price_at_purchase) * i.selectedQty).toFixed(2)} ₺</td></tr>`
    ).join('');

    const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
<title>Kısmi Hesap — Masa ${order.table_number}</title>
<style>${RECEIPT_CSS}</style></head><body>
<h1>Her Şey Ege'den</h1>
<div class="sub">Kahvaltı &amp; Meze</div>
<div class="partial-tag">— Kısmi Hesap —</div>
<hr class="divider">
<div class="meta"><span>Masa ${order.table_number}</span><span>#${orderId}</span><span>${dateStr} ${timeStr}</span></div>
<hr class="divider">
<table>${rows}
  <tr class="total-row"><td>TOPLAM</td><td class="r">${total.toFixed(2)} ₺</td></tr>
</table>
<div class="footer">Teşekkürler • Afiyet olsun</div>
<script>window.onload = () => { window.print(); setTimeout(() => window.close(), 800); }</script>
</body></html>`;
    const w = window.open('', '_blank', 'width=400,height=600');
    if (w) { w.document.write(html); w.document.close(); }

    // Seçilen miktarları orijinal siparişten düş
    const remainingItems = order.items
      .map((item, i) => ({ ...item, quantity: item.quantity - (selections[i] || 0) }))
      .filter(item => item.quantity > 0);

    try {
      await axios.put(`${BACKEND_URL}/api/admin/orders/${orderId}`, {
        items: remainingItems.map(item => ({
          menu_item_id: item.menu_item_id || null,
          quantity: item.quantity,
          price_at_purchase: item.price_at_purchase,
          name_override: item.name_override || null,
        })),
        discount: order.discount,
        extra_charge: order.extra_charge,
        extra_charge_label: order.extra_charge_label,
      }, { headers: { Authorization: `Bearer ${token}` } });

      const res = await axios.get(`${BACKEND_URL}/api/admin/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrderDetails(prev => ({ ...prev, [orderId]: res.data }));
      setPartialSelections(prev => { const u = { ...prev }; delete u[orderId]; return u; });
      fetchOrders();
    } catch (err) { console.error('Kısmi düşme hatası:', err); }
  };

  const exportExcel = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/orders-detail?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const detailed = res.data;

      const header = ['No', 'Masa', 'Durum', 'Ürün', 'Adet', 'Birim Fiyat (₺)', 'Tutar (₺)', 'Zaman'];
      const rows = [header];
      const rowMeta = [{ level: 0 }];

      for (const order of detailed) {
        const status = order.status === 'pending' ? 'Hazırlanıyor' : order.status === 'completed' ? 'Tamamlandı' : 'Kapalı';
        rows.push([`#${order.id}`, `Masa ${order.table_number}`, status, '', '', '', parseFloat(order.total_price).toFixed(2), fmtDateTime(order.created_at)]);
        rowMeta.push({ level: 0 });
        for (const item of order.items) {
          rows.push(['', '', '', item.name, item.quantity, parseFloat(item.price_at_purchase).toFixed(2), (item.quantity * parseFloat(item.price_at_purchase)).toFixed(2), '']);
          rowMeta.push({ level: 1 });
        }
      }

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!rows'] = rowMeta;
      ws['!cols'] = [{ wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 28 }, { wch: 6 }, { wch: 16 }, { wch: 12 }, { wch: 16 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Adisyonlar');
      XLSX.writeFile(wb, `adisyonlar-${selectedDate}.xlsx`);
    } catch (err) { alert('Excel oluşturulamadı'); }
  };

  return (
    <div className="orders">
      <div className="orders-header">
        <h1>Adisyonlar</h1>
        <div className="date-nav">
          <button onClick={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - 1);
            setSelectedDate(d.toLocaleDateString('sv-SE'));
          }}>◀</button>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="date-input"
          />
          <button onClick={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + 1);
            setSelectedDate(d.toLocaleDateString('sv-SE'));
          }}>▶</button>
          <button className="today-btn" onClick={() => setSelectedDate(new Date().toLocaleDateString('sv-SE'))}>
            Bugün
          </button>
        </div>
        <button className="excel-btn" onClick={exportExcel} disabled={orders.length === 0}>
          📥 Excel
        </button>
      </div>

      <div className="filter-bar">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Tümü</button>
        <button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>Hazırlanıyor</button>
        <button className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>Tamamlanan</button>
      </div>

      {loading ? (
        <div>Yükleniyor...</div>
      ) : orders.length === 0 ? (
        <div>Sipariş bulunamadı</div>
      ) : (
        <div className="orders-list">
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Masa</th>
                <th>Durum</th>
                <th>Toplam</th>
                <th>Ürün</th>
                <th>Zaman</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <React.Fragment key={order.id}>
                  <tr onClick={() => toggleOrder(order.id)} style={{ cursor: 'pointer' }}>
                    <td>#{order.id}</td>
                    <td>Masa {order.table_number}</td>
                    <td>
                      <span className={`status ${order.status}`}>
                        {order.status === 'pending' ? 'Hazırlanıyor' : 'Tamamlandı'}
                      </span>
                    </td>
                    <td>{parseFloat(order.total_price).toFixed(2)} ₺</td>
                    <td>{order.item_count} ürün</td>
                    <td>{fmtTime(order.created_at)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="edit-order-btn" onClick={e => openEdit(e, order.id)}>
                        ✏️ Düzenle
                      </button>
                      <button className="bill-print-btn" style={{ marginLeft: 6 }} onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const res = await axios.get(`${BACKEND_URL}/api/admin/table/${order.table_id}/bill`, {
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          setPendingBill({ tableId: order.table_id, billData: res.data });
                        } catch (err) { alert('Hesap alınamadı'); }
                      }}>
                        🧾 Hesap
                      </button>
                    </td>
                  </tr>
                  {expandedId === order.id && orderDetails[order.id] && (
                    <tr className="detail-row">
                      <td colSpan={7}>
                        <div className="order-detail">
                          <h4>Sipariş İçeriği</h4>
                          <ul>
                            {orderDetails[order.id].items.map((item, i) => {
                              const sel = partialSelections[order.id] || {};
                              const selQty = sel[i] || 0;
                              return (
                                <li key={i} className="detail-item-row">
                                  <label onClick={e => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={selQty > 0}
                                      onChange={e => togglePartialItem(order.id, i, e)}
                                    />
                                  </label>
                                  <span>{item.name}</span>
                                  {selQty > 0 && item.quantity > 1 ? (
                                    <span className="partial-qty-ctrl" onClick={e => e.stopPropagation()}>
                                      <button onClick={e => adjustPartialQty(order.id, i, -1, e)}>−</button>
                                      <span>{selQty}/{item.quantity}</span>
                                      <button onClick={e => adjustPartialQty(order.id, i, 1, e)}>+</button>
                                    </span>
                                  ) : (
                                    <span>x{item.quantity}</span>
                                  )}
                                  <span>{(item.price_at_purchase * (selQty > 0 ? selQty : item.quantity)).toFixed(2)} ₺</span>
                                </li>
                              );
                            })}
                          </ul>
                          {Object.values(partialSelections[order.id] || {}).some(q => q > 0) && (
                            <button
                              className="partial-bill-btn"
                              onClick={e => { e.stopPropagation(); printPartialBill(order.id); }}
                            >
                              🧾 Kısmi Hesap
                            </button>
                          )}
                          {parseFloat(orderDetails[order.id].discount) > 0 && (
                            <p className="order-adj">İndirim: − {parseFloat(orderDetails[order.id].discount).toFixed(2)} ₺</p>
                          )}
                          {parseFloat(orderDetails[order.id].extra_charge) > 0 && (
                            <p className="order-adj">
                              {orderDetails[order.id].extra_charge_label || 'İlave'}: + {parseFloat(orderDetails[order.id].extra_charge).toFixed(2)} ₺
                            </p>
                          )}
                          {orderDetails[order.id].customer_note && (
                            <p className="order-note"><strong>Not:</strong> {orderDetails[order.id].customer_note}</p>
                          )}
                          <Timeline order={orderDetails[order.id]} />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          <div className="orders-totals">
            <div className="total-card">
              <span className="total-label">Toplam Sipariş</span>
              <span className="total-value">{orders.length}</span>
            </div>
            <div className="total-card">
              <span className="total-label">Toplam Ürün</span>
              <span className="total-value">{orders.reduce((s, o) => s + Number(o.item_count), 0)}</span>
            </div>
            <div className="total-card highlight">
              <span className="total-label">Toplam Tutar</span>
              <span className="total-value">{orders.reduce((s, o) => s + Number(o.total_price), 0).toFixed(2)} ₺</span>
            </div>
          </div>
        </div>
      )}

      {editingOrder && (
        <EditModal
          order={editingOrder}
          token={token}
          menu={menu}
          onClose={() => setEditingOrder(null)}
          onSaved={handleSaved}
          onPrintBill={async (tableId, payment) => {
            try {
              const res = await axios.get(`${BACKEND_URL}/api/admin/table/${tableId}/bill`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (payment) {
                const firstOrderId = res.data.orders[0]?.id;
                if (firstOrderId) {
                  await axios.put(`${BACKEND_URL}/api/admin/orders/${firstOrderId}/payment`, {
                    payment_nakit: payment.nakit,
                    payment_kk: payment.kk,
                    payment_yemek: payment.yemek,
                  }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
                }
                autoPrintBill({ ...res.data, payment });
              } else {
                setPendingBill({ tableId, billData: res.data });
              }
            } catch (err) { alert('Hesap alınamadı'); }
          }}
        />
      )}

      {pendingBill && (
        <PaymentModal
          total={pendingBill.billData.orders.reduce((s, o) => s + parseFloat(o.total_price), 0)}
          onClose={() => setPendingBill(null)}
          onConfirm={async (payment) => {
            const firstOrderId = pendingBill.billData.orders[0]?.id;
            if (firstOrderId) {
              try {
                await axios.put(`${BACKEND_URL}/api/admin/orders/${firstOrderId}/payment`, {
                  payment_nakit: payment.nakit,
                  payment_kk: payment.kk,
                  payment_yemek: payment.yemek,
                }, { headers: { Authorization: `Bearer ${token}` } });
              } catch (err) { console.error('Ödeme kaydetme hatası:', err); }
            }
            autoPrintBill({ ...pendingBill.billData, payment });
            setPendingBill(null);
          }}
        />
      )}
    </div>
  );
}

export default Orders;
