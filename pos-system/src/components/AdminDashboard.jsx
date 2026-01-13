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

const AdminDashboard = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('sales');
  const [sales, setSales] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'beer', tier: '' });

  // Tracks which item we are editing (null = add mode)
  const [editingId, setEditingId] = useState(null);

  // 🔒 FIX 1: New state to lock buttons while saving
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chart & Notifications
  const [showChart, setShowChart] = useState(false);
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
    // 1. Try to delete
    const success = await deleteInventoryItem(id);

    // 2. Only remove from screen if success is TRUE
    if (success) {
      setInventory(inventory.filter(i => i.id !== id));
      notify("Item Deleted", "success");
    } else {
      // 3. If false (409 error), tell the user why
      notify("Cannot delete: Item is currently in an Open Tab!", "error");
    }

    // Close modal
    setConfirmModal({ isOpen: false, message: '', onConfirm: null });
  };

  // EDIT ACTIONS
  const startEditing = (item) => {
    setNewItem({
      name: item.name,
      price: item.price,
      category: item.category,
      tier: item.tier || ''
    });
    setEditingId(item.id); // Switch to Edit Mode
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll up to form
    notify(`Editing ${item.name}`, "info");
  };

  const cancelEditing = () => {
    setNewItem({ name: '', price: '', category: 'beer', tier: '' });
    setEditingId(null);
  };

  // 🔒 FIX 2: Updated Save Function with Anti-Double-Click Logic
  const handleSaveItem = async () => {
    // 1. Validation
    if (!newItem.name || !newItem.price) return notify("Name and Price required", "error");

    // 2. Prevent Double Clicks
    if (isSubmitting) return;
    setIsSubmitting(true); // Lock the interface

    const itemPayload = {
      name: newItem.name,
      price: parseFloat(newItem.price),
      category: newItem.category,
      tier: newItem.tier || null
    };

    try {
      if (editingId) {
        // --- UPDATE MODE ---
        const updated = await updateInventoryItem(editingId, itemPayload);
        if (updated) {
          setInventory(inventory.map(item => item.id === editingId ? updated[0] : item));
          notify("Item Updated Successfully!");
          cancelEditing();
        }
      } else {
        // --- ADD MODE ---
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
      // 3. Always unlock the button when done (even if it failed)
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

      <div className="dashboard-header">
        <h1>Manager Dashboard</h1>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid #666', color: 'white', padding: '10px 20px', cursor: 'pointer' }}>← Back to POS</button>
      </div>

      <div className="tabs">
        <button onClick={() => setActiveTab('sales')} className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`}>Sales History</button>
        <button onClick={() => setActiveTab('inventory')} className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}>Inventory Management</button>
      </div>

      {!loading && activeTab === 'sales' && (
        <div>
          {/* STATS ROW */}
          <div className="stats-card" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #444' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#aaa' }}>Net Revenue</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>${stats.total.toFixed(2)}</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #444' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#aaa' }}>Total Tips</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#17a2b8' }}>${stats.tips.toFixed(2)}</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #444' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#aaa' }}>Cash in Drawer</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffc107' }}>${stats.cash.toFixed(2)}</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#aaa' }}>Card Sales</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>${stats.card.toFixed(2)}</div>
            </div>
            <div style={{ alignSelf: 'center', marginLeft: '20px' }}>
              <button onClick={askDeleteHistory} style={{ backgroundColor: '#d9534f', color: 'white', border: 'none', padding: '15px', borderRadius: '4px', cursor: 'pointer' }}>Reset<br />History</button>
            </div>
          </div>

          {/* CHART TOGGLE */}
          <div className="analytics-toggle" onClick={() => setShowChart(!showChart)}>
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#e0e0e0' }}>📊 Sales Analytics</span>
            <span style={{ fontSize: '1.2rem', color: '#888' }}>{showChart ? '▲' : '▼'}</span>
          </div>

          {showChart && (
            <div className="chart-slide-open" style={{ marginBottom: '20px' }}>
              <SalesChart salesData={sales} />
            </div>
          )}

          {/* SALES TABLE */}
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
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{new Date(sale.date).toLocaleString([], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>${parseFloat(sale.total).toFixed(2)}</td>
                  <td style={{ color: '#17a2b8' }}>${parseFloat(sale.tip || 0).toFixed(2)}</td>
                  <td><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', background: sale.payment_method === 'cash' ? '#218838' : '#6610f2' }}>{sale.payment_method ? sale.payment_method.toUpperCase() : 'UNKNOWN'}</span></td>
                  <td style={{ color: '#aaa', fontSize: '0.9rem' }}>{Array.isArray(sale.items) ? sale.items.map(i => i.quantity && i.quantity > 1 ? `${i.name} x${i.quantity}` : i.name).join(', ') : 'Unknown Items'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sales.length === 0 && <p style={{ marginTop: '20px', color: '#888' }}>No sales yet.</p>}
        </div>
      )}

      {!loading && activeTab === 'inventory' && (
        <div>
          {/* FORM CARD */}
          <div className="form-card">
            <h3>{editingId ? `Edit Product: ${newItem.name}` : 'Add New Product'}</h3>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input className="input-dark" placeholder="Name" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
              <input className="input-dark" placeholder="Price" type="number" style={{ width: '100px' }} value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
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

              {/* 🔒 FIX 3: Buttons disable when isSubmitting is true */}
              {editingId ? (
                <>
                  <button
                    onClick={handleSaveItem}
                    disabled={isSubmitting}
                    style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: isSubmitting ? 0.7 : 1 }}
                  >
                    {isSubmitting ? 'Updating...' : 'Update'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={isSubmitting}
                    style={{ backgroundColor: '#666', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={handleSaveItem}
                  disabled={isSubmitting}
                  style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? 'Adding...' : 'Add'}
                </button>
              )}
            </div>
          </div>

          <div className="inventory-grid">
            {inventory.map(item => (
              <div key={item.id} className="inventory-item">
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.name}</div>
                <div style={{ color: '#28a745', margin: '5px 0' }}>${item.price.toFixed(2)}</div>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>{item.category} {item.tier ? `• ${item.tier}` : ''}</div>

                <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                  <button onClick={() => startEditing(item)} style={{ flex: 1, backgroundColor: '#007bff', border: 'none', color: 'white', padding: '5px', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>

                  <button onClick={() => askDeleteItem(item.id)} style={{ flex: 1, backgroundColor: 'transparent', border: '1px solid #d9534f', color: '#d9534f', padding: '5px', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;