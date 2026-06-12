import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ConfirmModal from '../components/ConfirmModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const emptyItem = { name: '', description: '', price: '', image_url: '' };

function Menu({ token }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Kategori ekle formu
  const [newCat, setNewCat] = useState({ name: '', image_url: '' });
  const [showAddCat, setShowAddCat] = useState(false);

  // Ürün ekle formu (hangi kategoriye)
  const [addItemCatId, setAddItemCatId] = useState(null);
  const [newItem, setNewItem] = useState(emptyItem);

  // Ürün düzenle
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [confirmModal, setConfirmModal] = useState(null);

  useEffect(() => { fetchMenu(); }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/menu?all=1`);
      // Kategorileri admin endpoint'ten al (is_available dahil)
      const catRes = await axios.get(`${BACKEND_URL}/api/admin/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Her kategorinin ürünlerini menü verisinden eşleştir
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

  // Kategori ekle
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

  // Kategori toggle
  const handleCatToggle = async (cat) => {
    await axios.put(`${BACKEND_URL}/api/admin/categories/${cat.id}`,
      { is_available: !cat.is_available },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    fetchMenu();
  };

  // Kategori sil
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

  // Ürün ekle
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

  // Ürün kaydet
  const handleSaveItem = async (itemId) => {
    try {
      await axios.put(`${BACKEND_URL}/api/admin/menu/${itemId}`, editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingId(null);
      fetchMenu();
    } catch { alert('Güncelleme başarısız'); }
  };

  // Ürün toggle
  const handleItemToggle = async (item) => {
    await axios.put(`${BACKEND_URL}/api/admin/menu/${item.id}`,
      { is_available: !item.is_available },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    fetchMenu();
  };

  // Ürün sil
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

      {/* Kategori Ekle Formu */}
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

      {/* Kategoriler */}
      {categories.map(cat => (
        <div key={cat.id} className={`category-admin ${!cat.is_available ? 'cat-disabled' : ''}`}>

          {/* Kategori Başlık */}
          <div className="category-header">
            <div className="category-title">
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

          {/* Ürünler */}
          <div className="items-grid">
            {cat.items && cat.items.map(item => (
              <div key={item.id} className={`item-admin ${!item.is_available ? 'item-disabled' : ''}`}>
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

            {/* Ürün Ekle Kartı */}
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
