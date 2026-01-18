// src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  getInventory,
  addInventoryItem,
  deleteInventoryItem,
  updateInventoryItem,
  getSales,
  clearSales,
  getUsers,
  addUser,
  updateUser,
  deleteUser
} from '../data/repository';
import Notification from './Notification';
import SalesChart from './SalesChart';
import TopBar from './TopBar';
import { printReceipt } from '../utils/receiptService';

const AdminDashboard = ({ onBack, onLogout, user }) => {
  const [activeTab, setActiveTab] = useState('sales');
  const [sales, setSales] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // GLOBAL BUSY STATE
  const [isBusy, setIsBusy] = useState(false);

  // SEARCH & FILTER STATE
  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('all');

  // SALES FILTER & SORT STATE
  const [salesFilterMethod, setSalesFilterMethod] = useState('all');
  const [salesFilterEmployee, setSalesFilterEmployee] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [selectedSale, setSelectedSale] = useState(null);

  // --- PERMISSIONS ---
  const isBartender = user && user.role === 'bartender';
  const canManageInventory = !isBartender;
  const canManageEmployees = !isBartender;

  // Form State
  const [modalType, setModalType] = useState('product');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Product Form Data
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'beer', tier: '', stock_count: '' });

  // Employee Form Data
  const [newUser, setNewUser] = useState({ name: '', pin: '', confirmPin: '', role: 'bartender', can_discount: false });

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
      const promises = [getInventory(), getSales()];
      if (canManageEmployees) {
        promises.push(getUsers());
      }

      const results = await Promise.all(promises);
      setInventory(results[0]);
      setSales(results[1]);
      if (canManageEmployees) {
        setUsers(results[2]);
      }
      setLoading(false);
    };
    loadData();
  }, [canManageEmployees]);

  // --- SALES FILTER LOGIC ---
  const getFilteredSales = () => {
    let filtered = sales.filter(sale => {
      if (salesFilterMethod !== 'all' && sale.payment_method !== salesFilterMethod) return false;
      if (salesFilterEmployee !== 'all' && (sale.employee_name || 'Unknown') !== salesFilterEmployee) return false;
      return true;
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (['total', 'tip'].includes(sortConfig.key)) {
          aValue = parseFloat(aValue || 0);
          bValue = parseFloat(bValue || 0);
        }
        if (sortConfig.key === 'date') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const uniqueEmployees = [...new Set(sales.map(s => s.employee_name || 'Unknown'))].filter(Boolean);

  // --- INVENTORY LOGIC ---
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    const isTracked = item.stock_count !== null;
    const isSoldOut = !item.is_available || (isTracked && item.stock_count <= 0);
    const isLowStock = !isSoldOut && isTracked && item.stock_count < 10;
    if (inventoryFilter === 'low') return isLowStock;
    if (inventoryFilter === 'sold_out') return isSoldOut;
    return true;
  });

  // --- ACTIONS ---
  const handleDeleteRequest = (type, id) => {
    if (type === 'history') {
      setConfirmModal({
        isOpen: true,
        message: 'Are you sure you want to WIPE ALL sales history?',
        onConfirm: async () => {
          setIsBusy(true);
          await clearSales();
          setSales([]);
          notify("Sales History Reset", "success");
          setConfirmModal({ isOpen: false, message: '', onConfirm: null });
          setIsBusy(false);
        }
      });
    } else if (type === 'product') {
      const item = inventory.find(i => i.id === id);
      setConfirmModal({
        isOpen: true,
        message: `Delete Product "${item?.name}"?`,
        onConfirm: async () => {
          setIsBusy(true);
          const success = await deleteInventoryItem(id);
          if (success) {
            setInventory(inventory.filter(i => i.id !== id));
            notify("Product Deleted");
          } else {
            notify("Cannot delete: Item in Open Tab!", "error");
          }
          setConfirmModal({ isOpen: false, message: '', onConfirm: null });
          setIsBusy(false);
        }
      });
    } else if (type === 'user') {
      const u = users.find(x => x.id === id);
      setConfirmModal({
        isOpen: true,
        message: `Delete Employee "${u?.name}"?`,
        onConfirm: async () => {
          setIsBusy(true);
          const success = await deleteUser(id);
          if (success) {
            setUsers(users.filter(x => x.id !== id));
            notify("Employee Deleted");
          } else {
            notify("Could not delete employee", "error");
          }
          setConfirmModal({ isOpen: false, message: '', onConfirm: null });
          setIsBusy(false);
        }
      });
    }
  };

  // --- MODALS ---
  const openProductModal = (product = null) => {
    setModalType('product');
    if (product) {
      setEditingId(product.id);
      setNewItem({
        name: product.name,
        price: product.price,
        category: product.category,
        tier: product.tier || '',
        stock_count: product.stock_count || ''
      });
    } else {
      setEditingId(null);
      setNewItem({ name: '', price: '', category: 'beer', tier: '', stock_count: '' });
    }
    setIsFormOpen(true);
  };

  const openUserModal = (userToEdit = null) => {
    setModalType('employee');
    if (userToEdit) {
      setEditingId(userToEdit.id);
      setNewUser({
        name: userToEdit.name,
        pin: '',
        confirmPin: '',
        role: userToEdit.role,
        can_discount: userToEdit.can_discount || false
      });
    } else {
      setEditingId(null);
      setNewUser({ name: '', pin: '', confirmPin: '', role: 'bartender', can_discount: false });
    }
    setIsFormOpen(true);
  };

  const closeModal = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  // --- SAVE HANDLERS ---
  const handleSaveProduct = async () => {
    if (!newItem.name || !newItem.price) return notify("Name and Price required", "error");
    setIsSubmitting(true);

    const stockNumber = newItem.stock_count === '' ? null : parseInt(newItem.stock_count);
    const shouldBeAvailable = stockNumber === null || stockNumber > 0;

    const payload = {
      name: newItem.name,
      price: parseFloat(newItem.price),
      category: newItem.category,
      tier: newItem.tier || null,
      stock_count: stockNumber,
      is_available: shouldBeAvailable
    };

    if (editingId) {
      const updated = await updateInventoryItem(editingId, payload);
      if (updated) {
        setInventory(inventory.map(i => i.id === editingId ? updated[0] : i));
        notify("Product Updated");
        closeModal();
      }
    } else {
      const added = await addInventoryItem(payload);
      if (added) {
        setInventory([...inventory, added[0]]);
        notify("Product Added");
        closeModal();
      }
    }
    setIsSubmitting(false);
  };

  const handleSaveUser = async () => {
    if (!newUser.name) return notify("Name required", "error");
    if (newUser.pin !== newUser.confirmPin) return notify("PINs do not match!", "error");
    if (!editingId && !newUser.pin) return notify("PIN is required for new users", "error");
    if (newUser.pin && newUser.pin.length !== 4) return notify("PIN must be 4 digits", "error");

    setIsSubmitting(true);

    const payload = {
      name: newUser.name,
      role: newUser.role,
      can_discount: newUser.can_discount
    };

    if (newUser.pin) payload.pin = newUser.pin;

    if (editingId) {
      const updated = await updateUser(editingId, payload);
      if (updated) {
        setUsers(users.map(u => u.id === editingId ? updated[0] : u));
        notify("Employee Updated");
        closeModal();
      }
    } else {
      const added = await addUser(payload);
      if (added) {
        setUsers([...users, added[0]]);
        notify("Employee Added");
        closeModal();
      }
    }
    setIsSubmitting(false);
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
        .inventory-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; align-items: stretch; }
        .stats-grid { display: flex; gap: 20px; align-items: flex-start; width: 100%; }
        .stats-mobile-toggle { display: none; }
        .user-card { background: #333; padding: 15px; border-radius: 8px; border: 1px solid #444; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; text-transform: uppercase; }
        .badge-admin { background: #d9534f; color: white; }
        .badge-manager { background: #f0ad4e; color: black; }
        .badge-bartender { background: #0275d8; color: white; }
        .sortable-th { cursor: pointer; user-select: none; transition: background 0.2s; }
        .sortable-th:hover { background: #444; }
        .sort-icon { font-size: 0.8rem; margin-left: 5px; color: #888; }
        .clickable-row { cursor: pointer; transition: background 0.1s; }
        .clickable-row:hover { background: #3a3a3a; }
        button:disabled { opacity: 0.6; cursor: not-allowed !important; filter: grayscale(0.5); }
        .animated-dots::after { content: "."; animation: dots 1.5s steps(1, end) infinite; display: inline-block; width: 0px; text-align: left; }
        @keyframes dots { 0%, 20% { content: "."; } 40% { content: ".."; } 60%, 100% { content: "..."; } }
        @media (max-width: 768px) {
          .stats-card-container { display: ${isStatsOpen ? 'block' : 'none'} !important; margin-top: 10px; }
          .stats-grid { flex-direction: column; gap: 10px; }
          .stats-mobile-toggle { display: flex; justify-content: space-between; align-items: center; background: #333; padding: 15px; border-radius: 8px; border: 1px solid #444; color: white; font-weight: bold; cursor: pointer; margin-bottom: 0px; }
          .stats-box { width: 100%; border-right: none !important; border-bottom: 1px solid #444; padding-bottom: 15px; margin-bottom: 5px; }
          .stats-reset-btn { width: 100%; margin-left: 0 !important; margin-top: 10px; }
          .analytics-toggle { margin-top: 15px; }
        }
      `}</style>

      {selectedSale && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px', border: '1px solid #666', background: '#222' }}>
            <h2 style={{ borderBottom: '1px solid #444', paddingBottom: '10px', marginTop: 0 }}>🧾 Transaction Details</h2>

            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ color: '#aaa' }}>Date:</span>
                <span>{new Date(selectedSale.date).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ color: '#aaa' }}>Employee:</span>
                <span style={{ fontWeight: 'bold' }}>{selectedSale.employee_name || 'Unknown'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ color: '#aaa' }}>Method:</span>
                <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{selectedSale.payment_method}</span>
              </div>
            </div>

            <div style={{ maxHeight: '200px', overflowY: 'auto', borderTop: '1px dashed #444', borderBottom: '1px dashed #444', padding: '10px 0' }}>
              {selectedSale.items && selectedSale.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span>{item.quantity > 1 ? `${item.quantity}x ` : ''}{item.name}</span>
                  <span>${(item.price * (item.quantity || 1)).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Subtotal (approx):</span>
                <span>${parseFloat(selectedSale.total).toFixed(2)}</span>
              </div>
              {selectedSale.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#ffc107' }}>
                  <span>Discount:</span>
                  <span>-${parseFloat(selectedSale.discount).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#17a2b8' }}>
                <span>Tip:</span>
                <span>+${parseFloat(selectedSale.tip || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', borderTop: '1px solid #444', paddingTop: '10px' }}>
                <span>Total:</span>
                <span style={{ color: '#28a745' }}>${(parseFloat(selectedSale.total) + parseFloat(selectedSale.tip || 0)).toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => printReceipt(selectedSale)}
                style={{ flex: 1, padding: '12px', background: '#fff', color: '#000', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                🖨️ Print
              </button>
              <button
                onClick={() => setSelectedSale(null)}
                style={{ flex: 1, padding: '12px', background: '#444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ... (Confirm Delete Modal, Dynamic Edit Modal, TopBar, Tabs, Sales View, Inventory View, Employees View) ... */}
      {/* ... [Rest of file content kept intact as previously provided] ... */}

      {/* (Confirm Modal) */}
      {confirmModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px', textAlign: 'center', border: '1px solid #444' }}>
            <h2 style={{ color: '#ff4d4f', marginTop: 0 }}>⚠️ Confirm Action</h2>
            <p style={{ fontSize: '1.2rem', margin: '20px 0', fontWeight: 'bold' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button disabled={isBusy} onClick={() => setConfirmModal({ isOpen: false, message: '', onConfirm: null })} style={{ padding: '10px 20px', background: '#444', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Cancel</button>
              <button disabled={isBusy} onClick={confirmModal.onConfirm} style={{ padding: '10px 20px', background: '#d9534f', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                {isBusy ? <span className="animated-dots"></span> : 'Yes, Do It'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* (Dynamic Add/Edit Modal) */}
      {isFormOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '500px', border: '1px solid #555' }}>
            <h2 style={{ marginTop: 0 }}>
              {editingId ? 'Edit' : 'Add'} {modalType === 'product' ? 'Product' : 'Employee'}
            </h2>

            {/* Product Form */}
            {modalType === 'product' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input className="input-dark" placeholder="Name" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} style={{ margin: 0 }} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input className="input-dark" placeholder="Price" type="number" style={{ flex: 1, margin: 0 }} value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
                  <input className="input-dark" placeholder="Stock (Optional)" type="number" style={{ flex: 1, margin: 0 }} value={newItem.stock_count} onChange={e => setNewItem({ ...newItem, stock_count: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select className="input-dark" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} style={{ flex: 1, margin: 0 }}>
                    <option value="beer">Beer</option>
                    <option value="seltzer">Seltzer</option>
                    <option value="liquor">Liquor</option>
                    <option value="pop">Pop</option>
                  </select>
                  <select className="input-dark" value={newItem.tier} onChange={e => setNewItem({ ...newItem, tier: e.target.value })} style={{ flex: 1, margin: 0 }}>
                    <option value="">No Tier</option>
                    <option value="well">Well</option>
                    <option value="call">Call</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    onClick={handleSaveProduct}
                    disabled={isSubmitting}
                    className="btn-primary"
                    style={{ flex: 1, padding: '12px', fontSize: '1.1rem', display: 'flex', justifyContent: 'center' }}
                  >
                    {isSubmitting ? <span className="animated-dots">Saving</span> : 'Save Product'}
                  </button>
                  <button onClick={closeModal} disabled={isSubmitting} className="btn-secondary" style={{ flex: 1, padding: '12px', background: '#444', fontSize: '1.1rem' }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Employee Form */}
            {modalType === 'employee' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input className="input-dark" placeholder="Employee Name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                <select className="input-dark" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="bartender">Bartender</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>

                {/* Checkbox for Discount Permission */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#333', padding: '10px', borderRadius: '5px', border: '1px solid #444' }}>
                  <input
                    type="checkbox"
                    id="discount_check"
                    checked={newUser.can_discount}
                    onChange={e => setNewUser({ ...newUser, can_discount: e.target.checked })}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <label htmlFor="discount_check" style={{ color: '#fff', cursor: 'pointer' }}>Allow Giving Discounts?</label>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input className="input-dark" placeholder="New PIN" maxLength="4" type="password" value={newUser.pin} onChange={e => setNewUser({ ...newUser, pin: e.target.value })} style={{ flex: 1 }} />
                  <input className="input-dark" placeholder="Confirm PIN" maxLength="4" type="password" value={newUser.confirmPin} onChange={e => setNewUser({ ...newUser, confirmPin: e.target.value })} style={{ flex: 1 }} />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    onClick={handleSaveUser}
                    disabled={isSubmitting}
                    className="btn-primary"
                    style={{ flex: 1, padding: '12px', display: 'flex', justifyContent: 'center' }}
                  >
                    {isSubmitting ? <span className="animated-dots">Saving</span> : 'Save Employee'}
                  </button>
                  <button onClick={closeModal} disabled={isSubmitting} className="btn-secondary" style={{ flex: 1, padding: '12px', background: '#444' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Bar */}
      <TopBar
        title="Employee Dashboard"
        onBack={onBack}
        onLogout={onLogout}
        user={user}
        customAction={
          <div style={{ display: 'flex', gap: '10px' }}>
            {activeTab === 'inventory' && canManageInventory && (
              <button onClick={() => openProductModal()} style={{ padding: '8px 15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' }}>
                + Add Product
              </button>
            )}
            {activeTab === 'employees' && canManageEmployees && (
              <button onClick={() => openUserModal()} style={{ padding: '8px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' }}>
                + Add Employee
              </button>
            )}
          </div>
        }
      />

      <div className="tabs">
        <button onClick={() => setActiveTab('sales')} className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`}>Sales History</button>
        {canManageInventory && (
          <button onClick={() => setActiveTab('inventory')} className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}>Inventory Management</button>
        )}
        {canManageEmployees && (
          <button onClick={() => setActiveTab('employees')} className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`}>Employees</button>
        )}
      </div>

      {/* Sales View */}
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
              {!isBartender && (
                <div className="stats-reset-btn" style={{ alignSelf: 'center', marginLeft: '20px' }}>
                  <button onClick={() => handleDeleteRequest('history')} style={{ width: '100%', backgroundColor: '#d9534f', color: 'white', border: 'none', padding: '15px', borderRadius: '4px', cursor: 'pointer' }}>Reset<br />History</button>
                </div>
              )}
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

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', marginBottom: '10px', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', color: '#aaa' }}>Filter:</span>
            <select className="input-dark" style={{ width: 'auto', padding: '8px' }} value={salesFilterMethod} onChange={(e) => setSalesFilterMethod(e.target.value)}>
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="waste">Waste</option>
              <option value="entry_error">Void</option>
            </select>

            <select className="input-dark" style={{ width: 'auto', padding: '8px' }} value={salesFilterEmployee} onChange={(e) => setSalesFilterEmployee(e.target.value)}>
              <option value="all">All Employees</option>
              {uniqueEmployees.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th className="sortable-th" onClick={() => handleSort('date')}>Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                <th className="sortable-th" onClick={() => handleSort('total')}>Revenue {sortConfig.key === 'total' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                <th className="sortable-th" onClick={() => handleSort('tip')}>Tip {sortConfig.key === 'tip' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                <th>Method</th>
                <th>Employee</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredSales().map((sale) => {
                let badgeColor = '#6610f2';
                let badgeText = sale.payment_method ? sale.payment_method.toUpperCase() : 'UNKNOWN';
                if (sale.payment_method === 'cash') badgeColor = '#218838';
                if (sale.payment_method === 'waste') badgeColor = '#d9534f';
                if (sale.payment_method === 'entry_error') { badgeColor = '#000000'; badgeText = 'VOID'; }
                return (
                  <tr key={sale.id} className="clickable-row" onClick={() => setSelectedSale(sale)}>
                    <td>{new Date(sale.date).toLocaleString([], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${parseFloat(sale.total).toFixed(2)}</td>
                    <td style={{ color: '#17a2b8' }}>${parseFloat(sale.tip || 0).toFixed(2)}</td>
                    <td><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', background: badgeColor, fontWeight: 'bold' }}>{badgeText}</span></td>
                    <td style={{ color: '#ccc' }}>{sale.employee_name || 'Unknown'}</td>
                    <td style={{ color: '#aaa', fontSize: '0.9rem' }}>{Array.isArray(sale.items) ? sale.items.map(i => i.quantity && i.quantity > 1 ? `${i.name} x${i.quantity}` : i.name).join(', ') : 'Unknown Items'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {getFilteredSales().length === 0 && <p style={{ marginTop: '20px', color: '#888' }}>No sales found matching criteria.</p>}
        </div>
      )}

      {/* Inventory View */}
      {!loading && activeTab === 'inventory' && canManageInventory && (
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="🔍 Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, padding: '12px', fontSize: '1rem', borderRadius: '8px', border: '1px solid #555', background: '#2a2a2a', color: 'white', minWidth: '200px' }}
            />
            <div style={{ display: 'flex', gap: '5px' }}>
              <button onClick={() => setInventoryFilter('all')} style={{ padding: '12px 15px', borderRadius: '8px', border: '1px solid #555', cursor: 'pointer', fontWeight: 'bold', background: inventoryFilter === 'all' ? '#007bff' : '#333', color: 'white' }}>All</button>
              <button onClick={() => setInventoryFilter('low')} style={{ padding: '12px 15px', borderRadius: '8px', border: '1px solid #555', cursor: 'pointer', fontWeight: 'bold', background: inventoryFilter === 'low' ? '#ffc107' : '#333', color: inventoryFilter === 'low' ? 'black' : 'white' }}>⚠️ Low Stock</button>
              <button onClick={() => setInventoryFilter('sold_out')} style={{ padding: '12px 15px', borderRadius: '8px', border: '1px solid #555', cursor: 'pointer', fontWeight: 'bold', background: inventoryFilter === 'sold_out' ? '#d90429' : '#333', color: 'white' }}>❌ Sold Out</button>
            </div>
          </div>

          <div className="inventory-grid">
            {filteredInventory.length === 0 && <p style={{ color: '#888' }}>No matching products found.</p>}
            {filteredInventory.map(item => {
              const isTracked = item.stock_count !== null;
              const isSoldOut = !item.is_available || (isTracked && item.stock_count <= 0);
              const isLowStock = !isSoldOut && isTracked && item.stock_count < 10;
              return (
                <div key={item.id} className="inventory-item" style={{
                  position: 'relative', background: '#2a2a2a', padding: '15px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', overflow: 'hidden', border: '1px solid #444', opacity: isSoldOut ? 0.7 : 1,
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', boxSizing: 'border-box'
                }}>
                  {isSoldOut && <div style={{ position: 'absolute', top: '12px', right: '-35px', transform: 'rotate(45deg)', background: 'linear-gradient(to bottom, #d90429 0%, #8d0801 100%)', color: '#fff', width: '120px', textAlign: 'center', padding: '4px 0', boxShadow: '0 2px 4px rgba(0,0,0,0.5)', fontWeight: 'bold', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', zIndex: 10 }}>Sold Out</div>}
                  {isLowStock && <div style={{ position: 'absolute', top: '12px', right: '-35px', transform: 'rotate(45deg)', background: 'linear-gradient(to bottom, #ffeb3b 0%, #fbc02d 100%)', color: '#000', width: '120px', textAlign: 'center', padding: '4px 0', boxShadow: '0 2px 4px rgba(0,0,0,0.5)', fontWeight: 'bold', fontSize: '0.8rem', zIndex: 10 }}>{item.stock_count} Left</div>}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px', paddingRight: '60px' }}>
                      <div>
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem' }}>{item.name}</h3>
                        <span style={{ background: '#444', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', textTransform: 'uppercase', color: '#ccc' }}>{item.category} {item.tier ? `• ${item.tier}` : ''}</span>
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4caf50' }}>${item.price.toFixed(2)}</div>
                    </div>
                    <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#bbb' }}>Current Stock: <span style={{ fontWeight: 'bold', marginLeft: '5px', color: isSoldOut ? '#ef5350' : (isLowStock ? '#ffca28' : '#fff') }}>{item.stock_count !== null ? item.stock_count : '∞'}</span></div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                    <button onClick={() => openProductModal(item)} style={{ flex: 1, padding: '8px', background: '#2196f3', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDeleteRequest('product', item.id)} style={{ flex: 1, padding: '8px', background: '#f44336', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Employees View */}
      {!loading && activeTab === 'employees' && canManageEmployees && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
            {users.map(u => (
              <div key={u.id} className="user-card">
                <div>
                  <h3 style={{ margin: '0 0 5px 0' }}>{u.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`badge badge-${u.role}`}>{u.role}</span>
                    <span style={{ color: '#888', fontSize: '0.9rem' }}>PIN: ••••</span>
                    {/* Visual Indicator for Discount Permission */}
                    {u.can_discount && <span style={{ fontSize: '0.8rem', background: '#ffc107', color: 'black', padding: '2px 6px', borderRadius: '4px' }} title="Allowed to Discount">%</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => openUserModal(u)} style={{ background: '#444', border: 'none', color: '#ccc', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => handleDeleteRequest('user', u.id)} style={{ background: '#d9534f', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
          {users.length === 0 && <p>No employees found.</p>}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;