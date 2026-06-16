import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import ConfirmModal from '../components/ConfirmModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const emptyItem = { name: '', description: '', price: '', image_url: '' };

function Menu({ token }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [newCat, setNewCat] = useState({ name: '', image_url: '' });
  const [showAddCat, setShowAddCat] = useState(false);

  const [addItemCatId, setAddItemCatId] = useState(null);
  const [newItem, setNewItem] = useState(emptyItem);

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [confirmModal, setConfirmModal] = useState(null);

  // Drag state
  const [dragCatId, setDragCatId] = useState(null);
  const [dragOverCatId, setDragOverCatId] = useState(null);
  const [dragItem, setDragItem] = useState(null); // {id, catId}
  const [dragOverItemId, setDragOverItemId] = useState(null);
  const isDraggingItem = useRef(false);
  const scrollInterval = useRef(null);

  useEffect(() => { fetchMenu(); }, []);

  const checkAutoScroll = (clientY) => {
    const THRESHOLD = 80;
    const MAX_SPEED = 12;
    if (scrollInterval.current) clearInterval(scrollInterval.current);
    if (clientY < THRESHOLD) {
      const speed = Math.round(MAX_SPEED * (1 - clientY / THRESHOLD));
      scrollInterval.current = setInterval(() => window.scrollBy(0, -speed), 16);
    } else if (clientY > window.innerHeight - THRESHOLD) {
      const speed = Math.round(MAX_SPEED * (1 - (window.innerHeight - clientY) / THRESHOLD));
      scrollInterval.current = setInterval(() => window.scrollBy(0, speed), 16);
    }
  };

  const stopAutoScroll = () => {
    if (scrollInterval.current) { clearInterval(scrollInterval.current); scrollInterval.current = null; }
  };

  useEffect(() => {
    const onDragOver = (e) => checkAutoScroll(e.clientY);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragend', stopAutoScroll);
    window.addEventListener('drop', stopAutoScroll);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragend', stopAutoScroll);
      window.removeEventListener('drop', stopAutoScroll);
      stopAutoScroll();
    };
  }, []);

  const findCatIdFromPoint = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const catEl = el && el.closest('.category-admin');
    return catEl ? Number(catEl.dataset.catId) : null;
  };

  const findItemFromPoint = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const itemEl = el && el.closest('.item-admin[data-item-id]');
    if (!itemEl) return null;
    const catEl = itemEl.closest('.category-admin');
    return { id: Number(itemEl.dataset.itemId), catId: catEl ? Number(catEl.dataset.catId) : null };
  };

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/menu?all=1`);
      const catRes = await axios.get(`${BACKEND_URL}/api/admin/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const menuData = res.data;
      const merged = catRes.data.map(cat => {
        const found = menuData.find(m => m.id === cat.id);
        return { ...cat, items: found ? found.items : [] };
      });
      setCategories(merged);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file) => {
    if (!file) return null;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await axios.post(`${BACKEND_URL}/api/admin/upload`, fd, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.url;
    } catch { alert('Resim yüklenemedi'); return null; }
    finally { setUploading(false); }
  };

  const handleAddCategory = async () => {
    if (!newCat.name.trim()) return alert('Kategori adı gerekli');
    try {
      await axios.post(`${BACKEND_URL}/api/admin/categories`, newCat, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewCat({ name: '', image_url: '' });
      setShowAddCat(false);
      fetchMenu();
    } catch { alert('Kategori eklenemedi'); }
  };

  const handleCatToggle = async (cat) => {
    await axios.put(`${BACKEND_URL}/api/admin/categories/${cat.id}`,
      { is_available: !cat.is_available },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    fetchMenu();
  };

  const handleCatDelete = (catId) => {
    setConfirmModal({
      message: 'Kategori ve içindeki tüm ürünler silinecek. Emin misiniz?',
      onConfirm: async () => {
        setConfirmModal(null);
        await axios.delete(`${BACKEND_URL}/api/admin/categories/${catId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchMenu();
      }
    });
  };

  const handleAddItem = async (catId) => {
    if (!newItem.name.trim() || !newItem.price) return alert('İsim ve fiyat gerekli');
    try {
      await axios.post(`${BACKEND_URL}/api/admin/menu`,
        { ...newItem, category_id: catId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAddItemCatId(null);
      setNewItem(emptyItem);
      fetchMenu();
    } catch { alert('Ürün eklenemedi'); }
  };

  const handleSaveItem = async (itemId) => {
    try {
      await axios.put(`${BACKEND_URL}/api/admin/menu/${itemId}`, editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingId(null);
      fetchMenu();
    } catch { alert('Güncelleme başarısız'); }
  };

  const handleItemToggle = async (item) => {
    await axios.put(`${BACKEND_URL}/api/admin/menu/${item.id}`,
      { is_available: !item.is_available },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    fetchMenu();
  };

  const handleDeleteItem = (itemId) => {
    setConfirmModal({
      message: 'Bu ürünü silmek istediğinize emin misiniz?',
      onConfirm: async () => {
        setConfirmModal(null);
        await axios.delete(`${BACKEND_URL}/api/admin/menu/${itemId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchMenu();
      }
    });
  };

  // ─── Drag: Categories ───────────────────────────────────────────
  const reorderCategories = (fromCatId, targetCatId) => {
    if (fromCatId === targetCatId) return;
    const newCats = [...categories];
    const fromIdx = newCats.findIndex(c => c.id === fromCatId);
    const toIdx = newCats.findIndex(c => c.id === targetCatId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = newCats.splice(fromIdx, 1);
    newCats.splice(toIdx, 0, moved);

    setCategories(newCats);

    axios.put(
      `${BACKEND_URL}/api/admin/categories/reorder`,
      { order: newCats.map((c, i) => ({ id: c.id, order: i + 1 })) },
      { headers: { Authorization: `Bearer ${token}` } }
    ).catch(console.error);
  };

  const handleCatDragStart = (e, catId) => {
    setDragCatId(catId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCatDragEnd = () => {
    setDragCatId(null);
    setDragOverCatId(null);
  };

  const handleCatDragOver = (e, catId) => {
    if (!dragCatId || isDraggingItem.current) return;
    e.preventDefault();
    setDragOverCatId(catId);
  };

  const handleCatDrop = (e, targetCatId) => {
    if (!dragCatId || isDraggingItem.current) return;
    e.preventDefault();
    reorderCategories(dragCatId, targetCatId);
    setDragCatId(null);
    setDragOverCatId(null);
  };

  const handleCatTouchStart = (e, catId) => {
    setDragCatId(catId);
  };

  const handleCatTouchMove = (e) => {
    if (!dragCatId) return;
    e.preventDefault();
    const t = e.touches[0];
    checkAutoScroll(t.clientY);
    const targetCatId = findCatIdFromPoint(t.clientX, t.clientY);
    if (targetCatId != null) setDragOverCatId(targetCatId);
  };

  const handleCatTouchEnd = (e) => {
    if (!dragCatId) return;
    const t = e.changedTouches[0];
    const targetCatId = findCatIdFromPoint(t.clientX, t.clientY);
    if (targetCatId != null) reorderCategories(dragCatId, targetCatId);
    setDragCatId(null);
    setDragOverCatId(null);
    stopAutoScroll();
  };

  // ─── Drag: Items ────────────────────────────────────────────────
  const reorderItems = (fromItem, targetItemId, targetCatId) => {
    if (!fromItem || fromItem.id === targetItemId || fromItem.catId !== targetCatId) return;
    const catIdx = categories.findIndex(c => c.id === targetCatId);
    if (catIdx === -1) return;

    const newCats = [...categories];
    const newItems = [...newCats[catIdx].items];
    const fromIdx = newItems.findIndex(i => i.id === fromItem.id);
    const toIdx = newItems.findIndex(i => i.id === targetItemId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = newItems.splice(fromIdx, 1);
    newItems.splice(toIdx, 0, moved);

    newCats[catIdx] = { ...newCats[catIdx], items: newItems };
    setCategories(newCats);

    axios.put(
      `${BACKEND_URL}/api/admin/menu/reorder`,
      { order: newItems.map((item, i) => ({ id: item.id, order: i + 1 })) },
      { headers: { Authorization: `Bearer ${token}` } }
    ).catch(console.error);
  };

  const handleItemDragStart = (e, itemId, catId) => {
    e.stopPropagation();
    isDraggingItem.current = true;
    setDragItem({ id: itemId, catId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleItemDragEnd = (e) => {
    e.stopPropagation();
    isDraggingItem.current = false;
    setDragItem(null);
    setDragOverItemId(null);
  };

  const handleItemDragOver = (e, itemId) => {
    if (!dragItem) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverItemId(itemId);
  };

  const handleItemDrop = (e, targetItemId, targetCatId) => {
    if (!dragItem) return;
    e.preventDefault();
    e.stopPropagation();
    reorderItems(dragItem, targetItemId, targetCatId);
    isDraggingItem.current = false;
    setDragItem(null);
    setDragOverItemId(null);
  };

  const handleItemTouchStart = (e, itemId, catId) => {
    isDraggingItem.current = true;
    setDragItem({ id: itemId, catId });
  };

  const handleItemTouchMove = (e) => {
    if (!dragItem) return;
    e.preventDefault();
    e.stopPropagation();
    const t = e.touches[0];
    checkAutoScroll(t.clientY);
    const target = findItemFromPoint(t.clientX, t.clientY);
    if (target) setDragOverItemId(target.id);
  };

  const handleItemTouchEnd = (e) => {
    if (!dragItem) return;
    const t = e.changedTouches[0];
    const target = findItemFromPoint(t.clientX, t.clientY);
    if (target) reorderItems(dragItem, target.id, target.catId);
    isDraggingItem.current = false;
    setDragItem(null);
    setDragOverItemId(null);
    stopAutoScroll();
  };

  if (loading) return <div>Yükleniyor...</div>;

  return (
    <div className="menu-admin">
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      <div className="menu-admin-header">
        <h1>Menü Yönetimi</h1>
        <button className="add-cat-btn" onClick={() => setShowAddCat(!showAddCat)}>
          + Kategori Ekle
        </button>
      </div>

      {showAddCat && (
        <div className="add-cat-form">
          <input
            type="text"
            placeholder="Kategori adı"
            value={newCat.name}
            onChange={e => setNewCat({ ...newCat, name: e.target.value })}
          />
          <div className="image-upload">
            {newCat.image_url && (
              <img src={`${BACKEND_URL}${newCat.image_url}`} alt="" className="preview-img" />
            )}
            <label className="upload-label">
              {uploading ? 'Yükleniyor...' : 'Resim Seç (opsiyonel)'}
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={async (e) => {
                  const url = await uploadImage(e.target.files[0]);
                  if (url) setNewCat({ ...newCat, image_url: url });
                }}
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="save-btn" onClick={handleAddCategory}>Ekle</button>
            <button className="cancel-btn" onClick={() => setShowAddCat(false)}>İptal</button>
          </div>
        </div>
      )}

      {categories.map(cat => (
        <div
          key={cat.id}
          data-cat-id={cat.id}
          className={`category-admin ${!cat.is_available ? 'cat-disabled' : ''} ${dragOverCatId === cat.id && dragCatId !== cat.id ? 'drag-over' : ''}`}
          onDragOver={(e) => handleCatDragOver(e, cat.id)}
          onDrop={(e) => handleCatDrop(e, cat.id)}
        >
          <div className="category-header">
            <div className="category-title">
              <span
                className="drag-handle"
                draggable
                onDragStart={(e) => handleCatDragStart(e, cat.id)}
                onDragEnd={handleCatDragEnd}
                onTouchStart={(e) => handleCatTouchStart(e, cat.id)}
                onTouchMove={handleCatTouchMove}
                onTouchEnd={handleCatTouchEnd}
                title="Sürükleyerek sırala"
              >⠿</span>
              {cat.image_url && (
                <img src={`${BACKEND_URL}${cat.image_url}`} alt="" className="cat-img" />
              )}
              <h3>{cat.name}</h3>
            </div>
            <div className="category-actions">
              <button
                className={`toggle-btn ${cat.is_available ? 'active' : 'inactive'}`}
                onClick={() => handleCatToggle(cat)}
              >
                {cat.is_available ? 'Açık' : 'Kapalı'}
              </button>
              <button className="delete-btn" onClick={() => handleCatDelete(cat.id)}>Sil</button>
            </div>
          </div>

          <div className="items-grid">
            {cat.items && cat.items.map(item => (
              <div
                key={item.id}
                data-item-id={item.id}
                className={`item-admin ${!item.is_available ? 'item-disabled' : ''} ${dragOverItemId === item.id && dragItem?.id !== item.id ? 'drag-over' : ''}`}
                onDragOver={(e) => handleItemDragOver(e, item.id)}
                onDrop={(e) => handleItemDrop(e, item.id, cat.id)}
              >
                {editingId === item.id ? (
                  <div className="edit-form">
                    <input type="text" value={editData.name || ''} placeholder="İsim"
                      onChange={e => setEditData({ ...editData, name: e.target.value })} />
                    <input type="text" value={editData.description || ''} placeholder="Açıklama"
                      onChange={e => setEditData({ ...editData, description: e.target.value })} />
                    <input type="number" value={editData.price || ''} placeholder="Fiyat" step="0.01"
                      onChange={e => setEditData({ ...editData, price: parseFloat(e.target.value) })} />
                    <div className="image-upload">
                      {editData.image_url && (
                        <img src={`${BACKEND_URL}${editData.image_url}`} alt="" className="preview-img" />
                      )}
                      <label className="upload-label">
                        {uploading ? 'Yükleniyor...' : 'Resim Değiştir'}
                        <input type="file" accept="image/*" style={{ display: 'none' }}
                          onChange={async (e) => {
                            const url = await uploadImage(e.target.files[0]);
                            if (url) setEditData({ ...editData, image_url: url });
                          }}
                        />
                      </label>
                    </div>
                    <div className="toggle-row">
                      <label>Menüde Göster:</label>
                      <input type="checkbox" checked={!!editData.is_available}
                        onChange={e => setEditData({ ...editData, is_available: e.target.checked })} />
                    </div>
                    <div className="form-actions">
                      <button className="save-btn" onClick={() => handleSaveItem(item.id)}>Kaydet</button>
                      <button className="cancel-btn" onClick={() => setEditingId(null)}>İptal</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span
                      className="drag-handle item-drag-handle"
                      draggable
                      onDragStart={(e) => handleItemDragStart(e, item.id, cat.id)}
                      onDragEnd={handleItemDragEnd}
                      onTouchStart={(e) => handleItemTouchStart(e, item.id, cat.id)}
                      onTouchMove={handleItemTouchMove}
                      onTouchEnd={handleItemTouchEnd}
                      title="Sürükleyerek sırala"
                    >⠿</span>
                    {item.image_url && (
                      <img src={`${BACKEND_URL}${item.image_url}`} alt={item.name} className="item-img" />
                    )}
                    <div className="item-info">
                      <h4>{item.name}</h4>
                      <p>{item.description}</p>
                      <p className="price">{item.price} ₺</p>
                    </div>
                    <div className="actions">
                      <button className={`toggle-btn ${item.is_available ? 'active' : 'inactive'}`}
                        onClick={() => handleItemToggle(item)}>
                        {item.is_available ? 'Açık' : 'Kapalı'}
                      </button>
                      <button className="edit-btn" onClick={() => { setEditingId(item.id); setEditData({ ...item }); }}>Düzenle</button>
                      <button className="delete-btn" onClick={() => handleDeleteItem(item.id)}>Sil</button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {addItemCatId === cat.id ? (
              <div className="item-admin add-item-form">
                <input type="text" value={newItem.name} placeholder="Ürün adı"
                  onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                <input type="text" value={newItem.description} placeholder="Açıklama"
                  onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
                <input type="number" value={newItem.price} placeholder="Fiyat ₺" step="0.01"
                  onChange={e => setNewItem({ ...newItem, price: parseFloat(e.target.value) })} />
                <div className="image-upload">
                  {newItem.image_url && (
                    <img src={`${BACKEND_URL}${newItem.image_url}`} alt="" className="preview-img" />
                  )}
                  <label className="upload-label">
                    {uploading ? 'Yükleniyor...' : 'Resim Seç'}
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={async (e) => {
                        const url = await uploadImage(e.target.files[0]);
                        if (url) setNewItem({ ...newItem, image_url: url });
                      }}
                    />
                  </label>
                </div>
                <div className="form-actions">
                  <button className="save-btn" onClick={() => handleAddItem(cat.id)}>Ekle</button>
                  <button className="cancel-btn" onClick={() => { setAddItemCatId(null); setNewItem(emptyItem); }}>İptal</button>
                </div>
              </div>
            ) : (
              <div className="item-admin add-item-card" onClick={() => setAddItemCatId(cat.id)}>
                <span>+ Ürün Ekle</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Menu;
