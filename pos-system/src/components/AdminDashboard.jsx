// src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  getInventory, addInventoryItem, deleteInventoryItem, updateInventoryItem,
  getSales, clearSales, getUsers, addUser, updateUser, deleteUser,
  getHappyHours, addHappyHour, deleteHappyHour
} from '../data/repository';
import Notification from './Notification';
import SalesChart from './SalesChart';
import TopBar from './TopBar';
import { printReceipt } from '../utils/receiptService';

/**
 * AdminDashboard Component
 * The central management hub for the POS system.
 */
const AdminDashboard = ({ onBack, onLogout, user }) => {
  // =========================================
  // 1. DATA STATE
  // =========================================
  const [activeTab, setActiveTab] = useState('sales');
  const [sales, setSales] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [users, setUsers] = useState([]);
  const [happyHours, setHappyHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  // =========================================
  // 2. FILTER & SORT STATE
  // =========================================
  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [salesFilterMethod, setSalesFilterMethod] = useState('all');
  const [salesFilterEmployee, setSalesFilterEmployee] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // UI Toggles
  const [selectedSale, setSelectedSale] = useState(null);
  const [showChart, setShowChart] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // 📦 NEW: Transaction expansion state

  // =========================================
  // 3. PERMISSIONS
  // =========================================
  const isBartender = user && user.role === 'bartender';
  const canManageInventory = !isBartender;
  const canManageEmployees = !isBartender;

  // =========================================
  // 4. FORM & MODAL STATE
  // =========================================
  const [modalType, setModalType] = useState('product');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const [notification, setNotification] = useState({ message: '', type: '' });
  const notify = (message, type = 'success') => setNotification({ message, type });

  // Data Templates
  const emptyItem = { name: '', price: '', category: 'beer', tier: '', stock_count: '' };
  const emptyUser = { name: '', pin: '', confirmPin: '', role: 'bartender', can_discount: false };
  const emptyRule = { name: '', start_time: '16:00', end_time: '19:00', discount_amount: '', category: 'beer', days: [] };

  const [newItem, setNewItem] = useState(emptyItem);
  const [newUser, setNewUser] = useState(emptyUser);
  const [newRule, setNewRule] = useState(emptyRule);

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // =========================================
  // 5. INITIALIZATION
  // =========================================
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const promises = [getInventory(), getSales(), getHappyHours()];
      if (canManageEmployees) promises.push(getUsers());

      const results = await Promise.all(promises);
      setInventory(results[0]);
      setSales(results[1]);
      setHappyHours(results[2]);
      if (canManageEmployees) setUsers(results[3]);

      setLoading(false);
    };
    loadData();
  }, [canManageEmployees]);

  // =========================================
  // 6. LOGIC: FILTERING & SORTING
  // =========================================

  const getFilteredSales = () => {
    let filtered = sales.filter(sale => {
      if (salesFilterMethod !== 'all' && sale.payment_method !== salesFilterMethod) return false;
      if (salesFilterEmployee !== 'all' && (sale.employee_name || 'Unknown') !== salesFilterEmployee) return false;
      return true;
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (['total', 'tip'].includes(sortConfig.key)) {
          aVal = parseFloat(aVal || 0);
          bVal = parseFloat(bVal || 0);
        }
        if (sortConfig.key === 'date') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  };

  // 📦 Logic: Determine display set based on "View More" toggle
  const allFilteredSales = getFilteredSales();
  const displayedSales = isExpanded ? allFilteredSales : allFilteredSales.slice(0, 20);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const uniqueEmployees = [...new Set(sales.map(s => s.employee_name || 'Unknown'))].filter(Boolean);

  const filteredInventory = inventory.filter(item => {
    if (!item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    const isTracked = item.stock_count !== null;
    const isSoldOut = !item.is_available || (isTracked && item.stock_count <= 0);
    const isLowStock = !isSoldOut && isTracked && item.stock_count < 10;

    if (inventoryFilter === 'low') return isLowStock;
    if (inventoryFilter === 'sold_out') return isSoldOut;
    return true;
  });

  // =========================================
  // 7. ACTIONS: CRUD & CONFIRMATION
  // =========================================

  const handleDeleteRequest = (type, id) => {
    const confirmAction = async (action) => {
      setIsBusy(true);
      const success = await action();
      setIsBusy(false);
      setConfirmModal({ isOpen: false, message: '', onConfirm: null });
      if (success) notify(`${type} deleted`);
      else notify("Error deleting", "error");
    };

    let message = "Are you sure?";
    let action = null;

    if (type === 'happyHour') {
      const rule = happyHours.find(r => r.id === id);
      message = `Delete Rule "${rule?.name}"?`;
      action = async () => { const ok = await deleteHappyHour(id); if (ok) setHappyHours(prev => prev.filter(h => h.id !== id)); return ok; };
    } else if (type === 'history') {
      message = 'Are you sure you want to WIPE ALL sales history?';
      action = async () => { await clearSales(); setSales([]); return true; };
    } else if (type === 'product') {
      const item = inventory.find(i => i.id === id);
      message = `Delete Product "${item?.name}"?`;
      action = async () => { const success = await deleteInventoryItem(id); if (success) setInventory(prev => prev.filter(i => i.id !== id)); return success; };
    } else if (type === 'user') {
      const u = users.find(x => x.id === id);
      message = `Delete Employee "${u?.name}"?`;
      action = async () => { const success = await deleteUser(id); if (success) setUsers(prev => prev.filter(x => x.id !== id)); return success; };
    }

    setConfirmModal({ isOpen: true, message, onConfirm: () => confirmAction(action) });
  };


  const openModal = (type, data = null) => {
    setModalType(type);
    setEditingId(data?.id || null);
    setIsFormOpen(true);
    if (type === 'product') setNewItem(data ? { ...data, tier: data.tier || '', stock_count: data.stock_count || '' } : emptyItem);
    if (type === 'employee') setNewUser(data ? { ...data, pin: '', confirmPin: '' } : emptyUser);
    if (type === 'happyHour') setNewRule(emptyRule);
  };

  // Helper wrappers for TopBar buttons
  const openProductModal = (data = null) => openModal('product', data);
  const openUserModal = (data = null) => openModal('employee', data);

  const closeModal = () => { setIsFormOpen(false); setEditingId(null); };

  const toggleDay = (day) => {
    setNewRule(prev => {
      if (prev.days.includes(day)) return { ...prev, days: prev.days.filter(d => d !== day) };
      return { ...prev, days: [...prev.days, day] };
    });
  };

  const handleSaveProduct = async () => {
    if (!newItem.name || !newItem.price) return notify("Name and Price required", "error");
    setIsSubmitting(true);
    const stockNumber = newItem.stock_count === '' ? null : parseInt(newItem.stock_count);
    const payload = { name: newItem.name, price: parseFloat(newItem.price), category: newItem.category, tier: newItem.tier || null, stock_count: stockNumber, is_available: stockNumber === null || stockNumber > 0 };

    if (editingId) {
      const updated = await updateInventoryItem(editingId, payload);
      if (updated) { setInventory(prev => prev.map(i => i.id === editingId ? updated[0] : i)); notify("Product Updated"); closeModal(); }
    } else {
      const added = await addInventoryItem(payload);
      if (added) { setInventory(prev => [...prev, added[0]]); notify("Product Added"); closeModal(); }
    }
    setIsSubmitting(false);
  };

  const handleSaveUser = async () => {
    if (!newUser.name) return notify("Name required", "error");
    if (newUser.pin !== newUser.confirmPin) return notify("PINs do not match!", "error");
    if (!editingId && !newUser.pin) return notify("PIN is required for new users", "error");
    if (newUser.pin && newUser.pin.length !== 4) return notify("PIN must be 4 digits", "error");

    setIsSubmitting(true);
    const payload = { name: newUser.name, role: newUser.role, can_discount: newUser.can_discount };
    if (newUser.pin) payload.pin = newUser.pin;

    if (editingId) {
      const updated = await updateUser(editingId, payload);
      if (updated) { setUsers(prev => prev.map(u => u.id === editingId ? updated[0] : u)); notify("Employee Updated"); closeModal(); }
    } else {
      const added = await addUser(payload);
      if (added) { setUsers(prev => [...prev, added[0]]); notify("Employee Added"); closeModal(); }
    }
    setIsSubmitting(false);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleSaveHappyHour = async () => {
    if (!newRule.name || !newRule.discount_amount || newRule.days.length === 0) return notify("Missing fields", "error");
    setIsSubmitting(true);
    const added = await addHappyHour(newRule);
    if (added) { setHappyHours(prev => [...prev, added[0]]); notify("Happy Hour Added!"); closeModal(); }
    setIsSubmitting(false);
  };

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
    <div className="pos-container">

      <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />

      {/* --- MODALS SECTION --- */}

      {/* 1. Transaction Receipt Modal */}
      {selectedSale && (
        <div className="modal-overlay">
          <div className="modal-content modal-width-sm">
            <h2 className="modal-title-nospace">🧾 Transaction Details</h2>
            <div className="mb-15">
              <div className="totals-row"><span>Date:</span><span>{new Date(selectedSale.date).toLocaleString()}</span></div>
              <div className="totals-row"><span>Employee:</span><span className="font-bold">{selectedSale.employee_name || 'Unknown'}</span></div>
              <div className="totals-row"><span>Method:</span><span className="badge badge-method">{selectedSale.payment_method}</span></div>
            </div>

            <div className="receipt-items-container cart-list-container">
              {selectedSale.items && selectedSale.items.map((item, i) => (
                <div key={i} className="totals-row mb-5">
                  <span>{item.quantity > 1 ? `${item.quantity}x ` : ''}{item.name}</span>
                  <span>${(item.price * (item.quantity || 1)).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <div className="totals-row"><span>Subtotal:</span><span>${parseFloat(selectedSale.total).toFixed(2)}</span></div>
              {selectedSale.discount > 0 && <div className="totals-row text-gold"><span>Discount:</span><span>-${parseFloat(selectedSale.discount).toFixed(2)}</span></div>}
              <div className="totals-row text-blue"><span>Tip:</span><span>+${parseFloat(selectedSale.tip || 0).toFixed(2)}</span></div>
              <div className="totals-row mt-10 font-bold text-lg">
                <span>Total:</span><span className="text-green">${(parseFloat(selectedSale.total) + parseFloat(selectedSale.tip || 0)).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-10 mt-20">
              <button onClick={() => printReceipt(selectedSale)} className="btn-glass btn-receipt-print">🖨️ Print</button>
              <button onClick={() => setSelectedSale(null)} className="btn-glass btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content modal-width-sm text-center">
            <h2 className="text-danger mt-auto">⚠️ Confirm Action</h2>
            <p className="mb-20 font-bold text-lg">{confirmModal.message}</p>
            <div className="flex gap-10 justify-center">
              <button disabled={isBusy} onClick={() => setConfirmModal({ isOpen: false, message: '', onConfirm: null })} className="btn-glass btn-secondary">Cancel</button>
              <button disabled={isBusy} onClick={confirmModal.onConfirm} className="btn-glass btn-danger">
                {isBusy ? <span className="animated-dots"></span> : 'Yes, Do It'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Add/Edit Form Modal (Unified) */}
      {isFormOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '550px' }}>

            {/* Header */}
            <div className="modal-header">
              <h2 className="no-margin">
                {editingId ? '✏️ Edit' : '➕ Add'} {modalType === 'happyHour' ? 'Rule' : modalType.charAt(0).toUpperCase() + modalType.slice(1)}
              </h2>
              <button onClick={closeModal} className="modal-close-btn">&times;</button>
            </div>

            {/* PRODUCT FORM */}
            {modalType === 'product' && (
              <div className="modal-form-grid">
                <div className="form-group full-width">
                  <label className="modal-label">Product Name</label>
                  <input className="input-glass w-100" placeholder="e.g. Bud Light" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="modal-label">Price ($)</label>
                  <input className="input-glass w-100" placeholder="0.00" type="number" step="0.01" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="modal-label">Stock (Optional)</label>
                  <input className="input-glass w-100" placeholder="∞" type="number" value={newItem.stock_count} onChange={e => setNewItem({ ...newItem, stock_count: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="modal-label">Category</label>
                  <select className="input-glass w-100" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                    <option value="beer">Beer</option>
                    <option value="seltzer">Seltzer</option>
                    <option value="liquor">Liquor</option>
                    <option value="pop">Pop</option>
                    <option value="food">Food</option>
                    <option value="merch">Merch</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="modal-label">Tier</label>
                  <select className="input-glass w-100" value={newItem.tier} onChange={e => setNewItem({ ...newItem, tier: e.target.value })}>
                    <option value="">No Tier</option>
                    <option value="well">Well</option>
                    <option value="call">Call</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>

                {/* Footer Actions */}
                <div className="modal-actions full-width">
                  <button onClick={closeModal} disabled={isSubmitting} className="btn-glass btn-secondary">Cancel</button>
                  <button onClick={handleSaveProduct} disabled={isSubmitting} className="btn-glass btn-save" style={{ flex: 2, marginLeft: '10px' }}>
                    {isSubmitting ? <span className="animated-dots">Saving</span> : 'Save Product'}
                  </button>
                </div>
              </div>
            )}

            {/* EMPLOYEE FORM */}
            {modalType === 'employee' && (
              <form
                className="modal-form-grid"
                onSubmit={(e) => e.preventDefault()} /* Prevents page reload on Enter */
                autoComplete="off"
              >
                <div className="form-group full-width">
                  <label className="modal-label">Employee Name</label>
                  <input
                    className="input-glass w-100"
                    placeholder="e.g. John Doe"
                    value={newUser.name}
                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                    autoComplete="new-password" /* Trick to stop auto-filling */
                  />
                </div>

                <div className="form-group">
                  <label className="modal-label">Role</label>
                  <select className="input-glass w-100" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                    <option value="bartender">Bartender</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="modal-label">Permissions</label>
                  <div
                    className={`toggle-row ${newUser.can_discount ? 'toggle-active' : ''}`}
                    onClick={() => setNewUser({ ...newUser, can_discount: !newUser.can_discount })}
                    style={{ height: '46px' }}
                  >
                    <span>{newUser.can_discount ? '✅' : '⛔'}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Can Discount?</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="modal-label">New PIN</label>
                  <input
                    className="input-glass w-100"
                    placeholder="****"
                    maxLength="4"
                    type="password"
                    value={newUser.pin}
                    onChange={e => setNewUser({ ...newUser, pin: e.target.value })}
                    autoComplete="new-password"
                  />
                </div>

                <div className="form-group">
                  <label className="modal-label">Confirm PIN</label>
                  <input
                    className="input-glass w-100"
                    placeholder="****"
                    maxLength="4"
                    type="password"
                    value={newUser.confirmPin}
                    onChange={e => setNewUser({ ...newUser, confirmPin: e.target.value })}
                    autoComplete="new-password"
                  />
                </div>

                <div className="modal-actions full-width">
                  <button type="button" onClick={closeModal} disabled={isSubmitting} className="btn-glass btn-secondary">Cancel</button>
                  <button type="button" onClick={handleSaveUser} disabled={isSubmitting} className="btn-glass btn-save" style={{ flex: 2, marginLeft: '10px' }}>
                    {isSubmitting ? <span className="animated-dots">Saving</span> : 'Save Employee'}
                  </button>
                </div>
              </form>
            )}

            {/* HAPPY HOUR FORM */}
            {modalType === 'happyHour' && (
              <div className="modal-form-grid">
                <div className="form-group full-width">
                  <label className="modal-label">Rule Name</label>
                  <input className="input-glass w-100" placeholder="e.g. Taco Tuesday" value={newRule.name} onChange={e => setNewRule({ ...newRule, name: e.target.value })} />
                </div>

                <div className="form-group full-width">
                  <label className="modal-label">Active Days</label>
                  <div className="flex gap-5" style={{ flexWrap: 'wrap' }}>
                    {weekDays.map(day => (
                      <div key={day} onClick={() => toggleDay(day)} className={`day-bubble ${newRule.days.includes(day) ? 'selected' : ''}`}>
                        {day.substring(0, 3)}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="modal-label">Start Time</label>
                  <input type="time" className="input-glass w-100" value={newRule.start_time} onChange={e => setNewRule({ ...newRule, start_time: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="modal-label">End Time</label>
                  <input type="time" className="input-glass w-100" value={newRule.end_time} onChange={e => setNewRule({ ...newRule, end_time: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="modal-label">Target Category</label>
                  <select className="input-glass w-100" value={newRule.category} onChange={e => setNewRule({ ...newRule, category: e.target.value })}>
                    <option value="all">All Items</option>
                    <option value="beer">Beer</option>
                    <option value="liquor">Liquor</option>
                    <option value="seltzer">Seltzer</option>
                    <option value="pop">Pop</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="modal-label">Discount ($)</label>
                  <input type="number" placeholder="1.00" className="input-glass w-100" value={newRule.discount_amount} onChange={e => setNewRule({ ...newRule, discount_amount: e.target.value })} />
                </div>

                <div className="modal-actions full-width">
                  <button onClick={closeModal} disabled={isSubmitting} className="btn-glass btn-secondary">Cancel</button>
                  <button onClick={handleSaveHappyHour} disabled={isSubmitting} className="btn-glass btn-save" style={{ flex: 2, marginLeft: '10px' }}>
                    {isSubmitting ? <span className="animated-dots">Saving</span> : 'Save Rule'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TOP BAR --- */}
      <TopBar
        title="Admin Dashboard"
        onBack={onBack}
        onLogout={onLogout}
        user={user}
        customAction={
          <div className="flex gap-10">
            {activeTab === 'inventory' && canManageInventory && (
              <button onClick={() => openProductModal()} className="btn-glass btn-pay btn-action-sm">+ Add Product</button>
            )}
            {activeTab === 'employees' && canManageEmployees && (
              <button onClick={() => openUserModal()} className="btn-glass btn-pay-cash btn-action-sm">+ Add Employee</button>
            )}
            {activeTab === 'happyHour' && canManageInventory && (
              <button onClick={() => openModal('happyHour')} className="btn-glass btn-pay-card btn-action-sm">+ Add Rule</button>
            )}
          </div>
        }
      />

      {/* --- MAIN GLASS PANEL --- */}
      <div className="glass-panel admin-panel">

        {/* Navigation Tabs */}
        <div className="category-tabs">
          <button onClick={() => setActiveTab('sales')} className={`btn-category ${activeTab === 'sales' ? 'active' : ''}`}>Sales History</button>
          {canManageInventory && <button onClick={() => setActiveTab('inventory')} className={`btn-category ${activeTab === 'inventory' ? 'active' : ''}`}>Inventory</button>}
          {canManageEmployees && <button onClick={() => setActiveTab('employees')} className={`btn-category ${activeTab === 'employees' ? 'active' : ''}`}>Employees</button>}
          {canManageInventory && <button onClick={() => setActiveTab('happyHour')} className={`btn-category ${activeTab === 'happyHour' ? 'active' : ''}`}>Happy Hour</button>}
        </div>

        {/* Scrollable Content Area */}
        <div className="admin-scroll-area">

          {/* 1. SALES VIEW */}
          {!loading && activeTab === 'sales' && (
            <>
              {/* --- STATS ROW --- */}
              <div className="stats-container">
                <div className="stats-box"><div className="stats-title">Net Revenue</div><div className="stats-value text-green">${stats.total.toFixed(2)}</div></div>
                <div className="stats-box"><div className="stats-title">Total Tips</div><div className="stats-value text-blue">${stats.tips.toFixed(2)}</div></div>
                <div className="stats-box"><div className="stats-title">Cash Drawer</div><div className="stats-value text-gold">${stats.cash.toFixed(2)}</div></div>
                <div className="stats-box"><div className="stats-title">Card Sales</div><div className="stats-value text-purple">${stats.card.toFixed(2)}</div></div>

                {!isBartender && (
                  <button
                    onClick={() => handleDeleteRequest('history')}
                    className="btn-glass btn-danger btn-reset-history"
                  >
                    Reset<br />History
                  </button>
                )}
              </div>

              {/* --- ANALYTICS TOGGLE --- */}
              <div className="analytics-toggle" onClick={() => setShowChart(!showChart)}>
                <span className="font-bold text-lg">📊 Sales Analytics</span>
                <span>{showChart ? '▲' : '▼'}</span>
              </div>
              {showChart && <div className="chart-slide-open mb-20"><SalesChart salesData={sales} /></div>}

              {/* 📦 BOXED TRANSACTIONS CONTAINER */}
              <div className={`glass-panel transaction-container-box ${isExpanded ? 'is-expanded' : ''}`}>
                <div className="p-20">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="card-title no-margin">Recent Transactions</h3>
                      <p className="card-subtitle no-margin">
                        Displaying {displayedSales.length} of {allFilteredSales.length} records
                      </p>
                    </div>

                    {/* 🛠️ Header Actions: Print & Filters */}
                    <div className="admin-toolbar no-margin">
                      {/* 🖨️ Print Button */}
                      <button onClick={handlePrintReport} className="btn-print-pill">
                        Print Report 🖨️
                      </button>

                      <select
                        className="input-glass input-filter"
                        value={salesFilterMethod}
                        onChange={(e) => setSalesFilterMethod(e.target.value)}
                      >
                        <option value="all">All Methods</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="waste">Waste</option>
                        <option value="entry_error">Void</option>
                      </select>

                      <select
                        className="input-glass input-filter"
                        value={salesFilterEmployee}
                        onChange={(e) => setSalesFilterEmployee(e.target.value)}
                      >
                        <option value="all">All Employees</option>
                        {uniqueEmployees.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 📜 Scrollable Internal Table (Screen View) */}
                <div className="transaction-scroll-area">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="sortable-th" onClick={() => handleSort('date')}>Date</th>
                        <th className="sortable-th" onClick={() => handleSort('total')}>Revenue</th>
                        <th className="sortable-th" onClick={() => handleSort('tip')}>Tip</th>
                        <th>Method</th>
                        <th>Employee</th>
                        <th>Items</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedSales.map((sale) => {
                        let badgeClass = 'badge-method';
                        if (sale.payment_method === 'cash') badgeClass = 'badge-pay';
                        if (sale.payment_method === 'waste') badgeClass = 'badge-admin';
                        return (
                          <tr key={sale.id} className="clickable-row" onClick={() => setSelectedSale(sale)}>
                            <td>{new Date(sale.date).toLocaleString([], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                            <td>${parseFloat(sale.total).toFixed(2)}</td>
                            <td className="text-blue">${parseFloat(sale.tip || 0).toFixed(2)}</td>
                            <td><span className={`badge ${badgeClass}`}>{sale.payment_method.toUpperCase()}</span></td>
                            <td className="text-muted">{sale.employee_name || 'Unknown'}</td>
                            <td className="text-muted text-sm">
                              {Array.isArray(sale.items)
                                ? sale.items.map(i => i.quantity && i.quantity > 1 ? `${i.name} x${i.quantity}` : i.name).join(', ')
                                : 'Unknown Items'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {allFilteredSales.length === 0 && (
                    <p className="text-center-muted p-20">No sales found matching criteria.</p>
                  )}
                </div>

                {/* 🔍 Toggle Expansion Footer */}
                {allFilteredSales.length > 20 && (
                  <div className="transaction-footer-bar">
                    <button className="btn-view-toggle" onClick={() => setIsExpanded(!isExpanded)}>
                      {isExpanded ? '▲ Show Less' : `▼ View All (${allFilteredSales.length})`}
                    </button>
                  </div>
                )}
              </div>

              {/* 🖨️ HIDDEN PRINT-ONLY REPORT */}
              <div className="print-only-report">
                <div className="print-header">
                  {/* Left Side: Title & Date */}
                  <div className="print-header-left">
                    <h1>Sales History Report</h1>
                    <p>Generated on: {new Date().toLocaleString()}</p>
                    <p>Filter: {salesFilterMethod.toUpperCase()} | {salesFilterEmployee.toUpperCase()}</p>
                  </div>

                  {/* Right Side: Totals Box */}
                  <div className="print-header-right">
                    <div className="print-total-box">
                      <span className="print-total-row">Records Found: <strong>{allFilteredSales.length}</strong></span>
                      <span className="print-total-row">Total Tips: <strong>${stats.tips.toFixed(2)}</strong></span>
                      <span className="print-big-total">Total Revenue: ${stats.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Employee</th>
                      <th>Method</th>
                      <th>Items</th>
                      <th>Tip</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allFilteredSales.map((sale) => (
                      <tr key={sale.id}>
                        <td>{new Date(sale.date).toLocaleDateString()} {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{sale.employee_name || 'System'}</td>
                        <td>{sale.payment_method.toUpperCase()}</td>
                        <td>
                          {Array.isArray(sale.items)
                            ? sale.items.map(i => i.quantity && i.quantity > 1 ? `${i.name} x${i.quantity}` : i.name).join(', ')
                            : ''}
                        </td>
                        <td>${parseFloat(sale.tip || 0).toFixed(2)}</td>
                        <td className="font-bold">${parseFloat(sale.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* 2. HAPPY HOUR VIEW */}
          {!loading && activeTab === 'happyHour' && canManageInventory && (
            <div className="admin-grid">
              {happyHours.map(hh => (
                <div key={hh.id} className="admin-card">
                  <div>
                    <h3 className="card-title text-purple mb-5">{hh.name}</h3>
                    <div className="font-bold text-green mb-5">-${hh.discount_amount} Off ({hh.category})</div>
                    <div className="text-muted">{hh.start_time.slice(0, 5)} - {hh.end_time.slice(0, 5)}</div>
                    <div className="text-muted text-sm">{hh.days.join(', ')}</div>
                  </div>
                  <button onClick={() => handleDeleteRequest('happyHour', hh.id)} className="btn-glass btn-danger mt-10 p-8">Delete</button>
                </div>
              ))}
              {happyHours.length === 0 && <p className="text-center-muted w-100">No Active Happy Hour Rules.</p>}
            </div>
          )}

          {/* 3. INVENTORY VIEW */}
          {!loading && activeTab === 'inventory' && canManageInventory && (
            <>
              <div className="admin-toolbar">
                <input
                  type="text"
                  placeholder="🔍 Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-glass input-search-bar"
                />
                <div className="flex gap-5">
                  <button onClick={() => setInventoryFilter('all')} className={`glass-item ${inventoryFilter === 'all' ? 'btn-pay-cash' : ''} px-15`}>All</button>
                  <button onClick={() => setInventoryFilter('low')} className={`glass-item ${inventoryFilter === 'low' ? 'text-gold' : ''} px-15`}>⚠️ Low</button>
                  <button onClick={() => setInventoryFilter('sold_out')} className={`glass-item ${inventoryFilter === 'sold_out' ? 'text-purple' : ''} px-15`}>❌ Sold Out</button>
                </div>
              </div>

              <div className="admin-grid">
                {filteredInventory.length === 0 && <p className="text-center-muted">No matching products found.</p>}
                {filteredInventory.map(item => {
                  const isTracked = item.stock_count !== null;
                  const isSoldOut = !item.is_available || (isTracked && item.stock_count <= 0);
                  const isLowStock = !isSoldOut && isTracked && item.stock_count < 10;

                  return (
                    <div key={item.id} className={`admin-card product-card-container ${isSoldOut ? 'sold-out-bg' : ''}`}>
                      {isSoldOut && <div className="ribbon sold-out">Sold Out</div>}
                      {isLowStock && <div className="ribbon stock-left">{item.stock_count} Left</div>}

                      <div>
                        <div className="card-header">
                          <div>
                            <h3 className="card-title">{item.name}</h3>
                            <span className="badge" style={{ background: 'var(--glass-border)', color: 'var(--text-muted)' }}>{item.category} {item.tier ? `• ${item.tier}` : ''}</span>
                          </div>
                          <div className="text-green font-bold text-lg">${item.price.toFixed(2)}</div>
                        </div>
                        <div className="mb-15 text-muted">
                          Current Stock:
                          <span className={`font-bold ml-5 ${isSoldOut ? 'text-danger' : isLowStock ? 'text-gold' : 'text-normal'}`}>
                            {item.stock_count !== null ? item.stock_count : '∞'}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-10 mt-auto">
                        <button onClick={() => openProductModal(item)} className="btn-glass btn-pay-cash p-8">Edit</button>
                        <button onClick={() => handleDeleteRequest('product', item.id)} className="btn-glass btn-danger p-8">Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* 4. EMPLOYEES VIEW */}
          {!loading && activeTab === 'employees' && canManageEmployees && (
            <div className="admin-grid">
              {users.map(u => (
                <div key={u.id} className="admin-card">
                  <div>
                    <h3 className="card-title mb-5">{u.name}</h3>
                    <div className="flex items-center gap-10">
                      <span className={`badge badge-${u.role}`}>{u.role}</span>
                      <span className="text-muted text-sm">PIN: ••••</span>
                      {u.can_discount && <span className="badge badge-manager" title="Allowed to Discount">%</span>}
                    </div>
                  </div>
                  <div className="flex gap-10 mt-20">
                    <button
                      onClick={() => openUserModal(u)}
                      className="btn-glass btn-pay-cash p-8"
                    >
                      Edit
                    </button>

                    {/* 🗑️ DELETE BUTTON: Changed '✕' to 'Delete' */}
                    <button
                      onClick={() => handleDeleteRequest('user', u.id)}
                      className="btn-glass btn-danger p-8"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {users.length === 0 && <p className="text-center-muted w-100">No employees found.</p>}
            </div>
          )}
        </div>
      </div>
    </div >
  );
};

export default AdminDashboard;