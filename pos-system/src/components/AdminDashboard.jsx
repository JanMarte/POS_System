// src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  getInventory,
  addInventoryItem,
  deleteInventoryItem,
  getSales,
  clearSales
} from '../data/repository';

const AdminDashboard = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('sales');
  const [sales, setSales] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'beer', tier: '' });

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

  const handleDeleteSale = async () => {
    if (confirm('Clear all sales history? This cannot be undone.')) {
      await clearSales();
      setSales([]);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.price) return alert("Name and Price required");
    const itemPayload = {
      name: newItem.name,
      price: parseFloat(newItem.price),
      category: newItem.category,
      tier: newItem.tier || null
    };
    const savedItem = await addInventoryItem(itemPayload);
    if (savedItem && savedItem.length > 0) {
      setInventory([...inventory, savedItem[0]]);
      setNewItem({ name: '', price: '', category: 'beer', tier: '' });
      alert("Item Added!");
    }
  };

  const handleDeleteItem = async (id) => {
    if (confirm('Delete this item?')) {
      await deleteInventoryItem(id);
      setInventory(inventory.filter(i => i.id !== id));
    }
  };

  // 👇 UPDATED: Now calculates Tips! 👇
  const stats = sales.reduce((acc, order) => {
    const amount = parseFloat(order.total); // Revenue
    const tip = parseFloat(order.tip || 0); // Tip

    acc.total += amount;
    acc.tips += tip;

    const paymentTotal = amount + tip; // What customer actually paid

    if (order.payment_method === 'cash') acc.cash += paymentTotal;
    else acc.card += paymentTotal;

    return acc;
  }, { total: 0, tips: 0, cash: 0, card: 0 });

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Manager Dashboard</h1>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid #666', color: 'white', padding: '10px 20px', cursor: 'pointer' }}>
          ← Back to POS
        </button>
      </div>

      <div className="tabs">
        <button onClick={() => setActiveTab('sales')} className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`}>Sales History</button>
        <button onClick={() => setActiveTab('inventory')} className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}>Inventory Management</button>
      </div>

      {loading && <p>Loading data from cloud...</p>}

      {!loading && activeTab === 'sales' && (
        <div>
          {/* 👇 UPDATED: Shows 4 Boxes (Revenue, Tips, Cash, Card) 👇 */}
          <div className="stats-card" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
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
              <button onClick={handleDeleteSale} style={{ backgroundColor: '#d9534f', color: 'white', border: 'none', padding: '15px', borderRadius: '4px', cursor: 'pointer' }}>Reset<br />History</button>
            </div>
          </div>

          <table className="data-table">
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
                  <td>{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>${parseFloat(sale.total).toFixed(2)}</td>
                  {/* 👇 NEW: Tip Column 👇 */}
                  <td style={{ color: '#17a2b8' }}>${parseFloat(sale.tip || 0).toFixed(2)}</td>
                  <td>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', background: sale.payment_method === 'cash' ? '#218838' : '#6610f2' }}>
                      {sale.payment_method ? sale.payment_method.toUpperCase() : 'UNKNOWN'}
                    </span>
                  </td>
                  <td style={{ color: '#aaa', fontSize: '0.9rem' }}>
                    {Array.isArray(sale.items)
                      ? sale.items.map(i => {
                        // Check if it has a quantity (New format) or not (Old format)
                        return i.quantity && i.quantity > 1
                          ? `${i.name} x${i.quantity}`
                          : i.name;
                      }).join(', ')
                      : 'Unknown Items'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sales.length === 0 && <p style={{ marginTop: '20px', color: '#888' }}>No sales yet.</p>}
        </div>
      )}

      {!loading && activeTab === 'inventory' && (
        <div>
          <div className="form-card">
            <h3>Add New Product</h3>
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
              <button onClick={handleAddItem} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}>Add</button>
            </div>
          </div>
          <div className="inventory-grid">
            {inventory.map(item => (
              <div key={item.id} className="inventory-item">
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.name}</div>
                <div style={{ color: '#28a745', margin: '5px 0' }}>${item.price.toFixed(2)}</div>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>{item.category} {item.tier ? `• ${item.tier}` : ''}</div>
                <button onClick={() => handleDeleteItem(item.id)} style={{ marginTop: '10px', backgroundColor: 'transparent', border: '1px solid #d9534f', color: '#d9534f', padding: '5px', width: '100%', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;