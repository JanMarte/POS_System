// src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  getInventory,
  addInventoryItem,
  deleteInventoryItem,
  updateInventoryItem,
  getSales,
  clearSales
} from '../data/repository';
import Notification from './Notification';
import SalesChart from './SalesChart';
import TopBar from './TopBar';

const AdminDashboard = ({ onBack, onLogout }) => {
  const [activeTab, setActiveTab] = useState('sales');
  const [sales, setSales] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'beer', tier: '', stock_count: '' });

  // Tracks which item we are editing (null = add mode)
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chart & Notifications
  const [showChart, setShowChart] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  const [notification, setNotification] = useState({ message: '', type: '' });
  const notify = (message, type = 'success') => setNotification({ message, type });

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const invData = await getInventory();
      const salesData = await getSales();
      setInventory(invData);
      setSales(salesData);
      setLoading(false);
    };
    loadData();
  }, []);

  // --- ACTIONS ---

  const askDeleteHistory = () => {
    setConfirmModal({
      isOpen: true,
      message: 'Are you sure you want to WIPE ALL sales history?',
      onConfirm: performDeleteHistory
    });
  };

  const performDeleteHistory = async () => {
    await clearSales();
    setSales([]);
    notify("Sales History Reset", "success");
    setConfirmModal({ isOpen: false, message: '', onConfirm: null });
  };

  const askDeleteItem = (id) => {
    const itemToDelete = inventory.find(item => item.id === id);
    const nameToShow = itemToDelete ? itemToDelete.name : 'this item';
    setConfirmModal({
      isOpen: true,
      message: `Delete "${nameToShow}" permanently?`,
      onConfirm: () => performDeleteItem(id)
    });
  };

  const performDeleteItem = async (id) => {
    const success = await deleteInventoryItem(id);
    if (success) {
      setInventory(inventory.filter(i => i.id !== id));
      notify("Item Deleted", "success");
    } else {
      notify("Cannot delete: Item is currently in an Open Tab!", "error");
    }
    setConfirmModal({ isOpen: false, message: '', onConfirm: null });
  };

  // EDIT ACTIONS
  const startEditing = (item) => {
    setNewItem({
      name: item.name,
      price: item.price,
      category: item.category,
      tier: item.tier || '',
      stock_count: item.stock_count || ''
    });
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    notify(`Editing ${item.name}`, "info");
  };

  const cancelEditing = () => {
    setNewItem({ name: '', price: '', category: 'beer', tier: '', stock_count: '' });
    setEditingId(null);
  };

  const handleSaveItem = async () => {
    if (!newItem.name || !newItem.price) return notify("Name and Price required", "error");
    if (isSubmitting) return;
    setIsSubmitting(true);

    const stockNumber = newItem.stock_count === '' ? null : parseInt(newItem.stock_count);
    const shouldBeAvailable = stockNumber === null || stockNumber > 0;

    const itemPayload = {
      name: newItem.name,
      price: parseFloat(newItem.price),
      category: newItem.category,
      tier: newItem.tier || null,
      stock_count: stockNumber,
      is_available: shouldBeAvailable
    };

    try {
      if (editingId) {
        const updated = await updateInventoryItem(editingId, itemPayload);
        if (updated) {
          setInventory(inventory.map(item => item.id === editingId ? updated[0] : item));
          notify("Item Updated Successfully!");
          cancelEditing();
        }
      } else {
        const savedItem = await addInventoryItem(itemPayload);
        if (savedItem && savedItem.length > 0) {
          setInventory([...inventory, savedItem[0]]);
          setNewItem({ name: '', price: '', category: 'beer', tier: '' });
          notify("Item Added Successfully!");
        }
      }
    } catch (error) {
      console.error(error);
      notify("Error saving item", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats Logic
  const stats = sales.reduce((acc, order) => {
    const amount = parseFloat(order.total);
    const tip = parseFloat(order.tip || 0);
    acc.total += amount;
    acc.tips += tip;
    const paymentTotal = amount + tip;
    if (order.payment_method === 'cash') acc.cash += paymentTotal;
    else acc.card += paymentTotal;
    return acc;
  }, { total: 0, tips: 0, cash: 0, card: 0 });

  return (
    <div className="dashboard-container">
      <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />
      <style>{`
        .stats-grid { display: flex; gap: 20px; align-items: flex-start; width: 100%; }
        .stats-mobile-toggle { display: none; }
        @media (max-width: 768px) {
          .stats-card-container { display: ${isStatsOpen ? 'block' : 'none'} !important; margin-top: 10px; }
          .stats-grid { flex-direction: column; gap: 10px; }
          .stats-mobile-toggle { display: flex; justify-content: space-between; align-items: center; background: #333; padding: 15px; border-radius: 8px; border: 1px solid #444; color: white; font-weight: bold; cursor: pointer; margin-bottom: 0px; }
          .stats-box { width: 100%; border-right: none !important; border-bottom: 1px solid #444; padding-bottom: 15px; margin-bottom: 5px; }
          .stats-reset-btn { width: 100%; margin-left: 0 !important; margin-top: 10px; }
          .analytics-toggle { margin-top: 15px; }
        }
      `}</style>

      {confirmModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px', textAlign: 'center', border: '1px solid #444' }}>
            <h2 style={{ color: '#ff4d4f', marginTop: 0 }}>⚠️ Confirm Action</h2>
            <p style={{ fontSize: '1.2rem', margin: '20px 0', fontWeight: 'bold' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setConfirmModal({ isOpen: false, message: '', onConfirm: null })} style={{ padding: '10px 20px', background: '#444', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmModal.onConfirm} style={{ padding: '10px 20px', background: '#d9534f', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Yes, Do It</button>
            </div>
          </div>
        </div>
      )}

      {/* 👇 NEW HEADER IMPLEMENTATION */}
      <TopBar
        title="Manager Dashboard"
        onBack={onBack}
        onLogout={onLogout}
      // Notice: No customAction prop, so no extra buttons appear!
      />

      <div className="tabs">
        <button onClick={() => setActiveTab('sales')} className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`}>Sales History</button>
        <button onClick={() => setActiveTab('inventory')} className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}>Inventory Management</button>
      </div>

      {!loading && activeTab === 'sales' && (
        <div>
          <div className="stats-mobile-toggle" onClick={() => setIsStatsOpen(!isStatsOpen)}>
            <span>💰 Financial Overview</span>
            <span>{isStatsOpen ? '▲' : '▼'}</span>
          </div>

          <div className="stats-card stats-card-container" style={{ marginBottom: '20px' }}>
            <div className="stats-grid">
              <div className="stats-box" style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #444' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#aaa' }}>Net Revenue</h3>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>${stats.total.toFixed(2)}</div>
              </div>
              <div className="stats-box" style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #444' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#aaa' }}>Total Tips</h3>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#17a2b8' }}>${stats.tips.toFixed(2)}</div>
              </div>
              <div className="stats-box" style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #444' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#aaa' }}>Cash in Drawer</h3>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffc107' }}>${stats.cash.toFixed(2)}</div>
              </div>
              <div className="stats-box" style={{ flex: 1, textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#aaa' }}>Card Sales</h3>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>${stats.card.toFixed(2)}</div>
              </div>
              <div className="stats-reset-btn" style={{ alignSelf: 'center', marginLeft: '20px' }}>
                <button onClick={askDeleteHistory} style={{ width: '100%', backgroundColor: '#d9534f', color: 'white', border: 'none', padding: '15px', borderRadius: '4px', cursor: 'pointer' }}>Reset<br />History</button>
              </div>
            </div>
          </div>

          <div className="analytics-toggle" onClick={() => setShowChart(!showChart)}>
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#e0e0e0' }}>📊 Sales Analytics</span>
            <span style={{ fontSize: '1.2rem', color: '#888' }}>{showChart ? '▲' : '▼'}</span>
          </div>

          {showChart && (
            <div className="chart-slide-open" style={{ marginBottom: '20px' }}>
              <SalesChart salesData={sales} />
            </div>
          )}

          <table className="data-table" style={{ marginTop: '40px' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Revenue</th>
                <th>Tip</th>
                <th>Method</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => {
                let badgeColor = '#6610f2';
                let badgeText = sale.payment_method ? sale.payment_method.toUpperCase() : 'UNKNOWN';
                if (sale.payment_method === 'cash') badgeColor = '#218838';
                if (sale.payment_method === 'waste') badgeColor = '#d9534f';
                if (sale.payment_method === 'entry_error') { badgeColor = '#000000'; badgeText = 'VOID'; }
                return (
                  <tr key={sale.id}>
                    <td>{new Date(sale.date).toLocaleString([], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${parseFloat(sale.total).toFixed(2)}</td>
                    <td style={{ color: '#17a2b8' }}>${parseFloat(sale.tip || 0).toFixed(2)}</td>
                    <td><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', background: badgeColor, fontWeight: 'bold' }}>{badgeText}</span></td>
                    <td style={{ color: '#aaa', fontSize: '0.9rem' }}>{Array.isArray(sale.items) ? sale.items.map(i => i.quantity && i.quantity > 1 ? `${i.name} x${i.quantity}` : i.name).join(', ') : 'Unknown Items'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sales.length === 0 && <p style={{ marginTop: '20px', color: '#888' }}>No sales yet.</p>}
        </div>
      )}

      {!loading && activeTab === 'inventory' && (
        <div>
          <div className="form-card">
            <h3>{editingId ? `Edit Product: ${newItem.name}` : 'Add New Product'}</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input className="input-dark" placeholder="Name" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
              <input className="input-dark" placeholder="Price" type="number" style={{ width: '100px' }} value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
              <input className="input-dark" placeholder="Stock (Optional)" type="number" style={{ width: '120px' }} value={newItem.stock_count} onChange={e => setNewItem({ ...newItem, stock_count: e.target.value })} />
              <select className="input-dark" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                <option value="beer">Beer</option>
                <option value="seltzer">Seltzer</option>
                <option value="liquor">Liquor</option>
                <option value="pop">Pop</option>
              </select>
              <select className="input-dark" value={newItem.tier} onChange={e => setNewItem({ ...newItem, tier: e.target.value })}>
                <option value="">No Tier</option>
                <option value="well">Well</option>
                <option value="call">Call</option>
                <option value="premium">Premium</option>
              </select>
              {editingId ? (
                <>
                  <button onClick={handleSaveItem} disabled={isSubmitting} style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: isSubmitting ? 0.7 : 1 }}>{isSubmitting ? 'Updating...' : 'Update'}</button>
                  <button onClick={cancelEditing} disabled={isSubmitting} style={{ backgroundColor: '#666', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                </>
              ) : (
                <button onClick={handleSaveItem} disabled={isSubmitting} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>{isSubmitting ? 'Adding...' : 'Add'}</button>
              )}
            </div>
          </div>
          <div className="inventory-grid">
            {inventory.map(item => {
              const isTracked = item.stock_count !== null;
              const isSoldOut = !item.is_available || (isTracked && item.stock_count <= 0);
              const isLowStock = !isSoldOut && isTracked && item.stock_count < 10;
              return (
                <div key={item.id} className="inventory-item" style={{ position: 'relative', background: '#2a2a2a', padding: '15px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', overflow: 'hidden', border: '1px solid #444', opacity: isSoldOut ? 0.7 : 1 }}>
                  {isSoldOut && <div style={{ position: 'absolute', top: '12px', right: '-35px', transform: 'rotate(45deg)', background: 'linear-gradient(to bottom, #d90429 0%, #8d0801 100%)', color: '#fff', width: '120px', textAlign: 'center', padding: '4px 0', boxShadow: '0 2px 4px rgba(0,0,0,0.5)', fontWeight: 'bold', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', zIndex: 10 }}>Sold Out</div>}
                  {isLowStock && <div style={{ position: 'absolute', top: '12px', right: '-35px', transform: 'rotate(45deg)', background: 'linear-gradient(to bottom, #ffeb3b 0%, #fbc02d 100%)', color: '#000', width: '120px', textAlign: 'center', padding: '4px 0', boxShadow: '0 2px 4px rgba(0,0,0,0.5)', fontWeight: 'bold', fontSize: '0.8rem', zIndex: 10 }}>{item.stock_count} Left</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px', paddingRight: '60px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem' }}>{item.name}</h3>
                      <span style={{ background: '#444', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', textTransform: 'uppercase', color: '#ccc' }}>{item.category} {item.tier ? `• ${item.tier}` : ''}</span>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4caf50' }}>${item.price.toFixed(2)}</div>
                  </div>
                  <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#bbb' }}>Current Stock: <span style={{ fontWeight: 'bold', marginLeft: '5px', color: isSoldOut ? '#ef5350' : (isLowStock ? '#ffca28' : '#fff') }}>{item.stock_count !== null ? item.stock_count : '∞'}</span></div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => startEditing(item)} style={{ flex: 1, padding: '8px', background: '#2196f3', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => askDeleteItem(item.id)} style={{ flex: 1, padding: '8px', background: '#f44336', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;