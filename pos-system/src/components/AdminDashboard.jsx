// src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { getInventory } from '../data/repository';

const AdminDashboard = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('sales'); 
  const [sales, setSales] = useState([]);
  const [inventory, setInventory] = useState([]);
  
  // Form State
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'beer', tier: '' });

  useEffect(() => {
    // Load Sales
    const loadedSales = JSON.parse(localStorage.getItem('pos_sales')) || [];
    setSales(loadedSales);
    setInventory(getInventory());
  }, []);

  // --- ACTIONS ---
  const handleDeleteSale = () => {
    if(confirm('Clear all sales history?')) {
        localStorage.setItem('pos_sales', JSON.stringify([]));
        setSales([]);
    }
  };

  const handleAddItem = () => {
    if(!newItem.name || !newItem.price) return alert("Name and Price required");
    
    const updatedInventory = [...inventory, {
        id: Date.now(),
        name: newItem.name,
        price: parseFloat(newItem.price),
        category: newItem.category,
        tier: newItem.tier
    }];

    setInventory(updatedInventory);
    localStorage.setItem('pos_inventory', JSON.stringify(updatedInventory));
    setNewItem({ name: '', price: '', category: 'beer', tier: '' }); 
    alert("Item Added!");
  };

  const handleDeleteItem = (id) => {
    if(confirm('Delete this item?')) {
        const updated = inventory.filter(i => i.id !== id);
        setInventory(updated);
        localStorage.setItem('pos_inventory', JSON.stringify(updated));
    }
  };

  // --- HELPERS ---
  const totalRevenue = sales.reduce((acc, order) => acc + parseFloat(order.total), 0).toFixed(2);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Manager Dashboard</h1>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid #666', color: 'white', padding: '10px 20px' }}>
          ← Back to POS
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button onClick={() => setActiveTab('sales')} className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`}>
            Sales History
        </button>
        <button onClick={() => setActiveTab('inventory')} className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}>
            Inventory Management
        </button>
      </div>

      {/* VIEW 1: SALES REPORT */}
      {activeTab === 'sales' && (
        <div>
          <div className="stats-card">
            <h3>Total Revenue: <span style={{color: '#28a745'}}>${totalRevenue}</span></h3>
            <button onClick={handleDeleteSale} style={{ backgroundColor: '#d9534f', color: 'white', border: 'none', padding: '10px', borderRadius: '4px' }}>
                Reset History
            </button>
          </div>
          
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Total</th>
                <th>Items Sold</th>
              </tr>
            </thead>
            <tbody>
              {sales.slice().reverse().map((sale) => (
                <tr key={sale.id}>
                  <td>{new Date(sale.date).toLocaleString()}</td>
                  <td>${parseFloat(sale.total).toFixed(2)}</td>
                  <td>{sale.items.map(i => i.name).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sales.length === 0 && <p style={{marginTop: '20px', color: '#888'}}>No sales yet.</p>}
        </div>
      )}

      {/* VIEW 2: INVENTORY MANAGER */}
      {activeTab === 'inventory' && (
        <div>
           {/* Add Item Form */}
           <div className="form-card">
             <h3>Add New Product</h3>
             <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input 
                    className="input-dark" 
                    placeholder="Name (e.g. Corona)" 
                    value={newItem.name} 
                    onChange={e => setNewItem({...newItem, name: e.target.value})} 
                />
                <input 
                    className="input-dark" 
                    placeholder="Price" 
                    type="number" 
                    style={{width: '100px'}}
                    value={newItem.price} 
                    onChange={e => setNewItem({...newItem, price: e.target.value})} 
                />
                <select className="input-dark" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                    <option value="beer">Beer</option>
                    <option value="seltzer">Seltzer</option>
                    <option value="liquor">Liquor</option>
                    <option value="pop">Pop</option>
                </select>
                <select className="input-dark" value={newItem.tier} onChange={e => setNewItem({...newItem, tier: e.target.value})}>
                    <option value="">No Tier</option>
                    <option value="well">Well</option>
                    <option value="call">Call</option>
                    <option value="premium">Premium</option>
                </select>
                <button onClick={handleAddItem} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px' }}>
                    Add
                </button>
             </div>
           </div>

           {/* Inventory List */}
           <div className="inventory-grid">
             {inventory.map(item => (
                <div key={item.id} className="inventory-item">
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.name}</div>
                    <div style={{ color: '#28a745', margin: '5px 0' }}>${item.price.toFixed(2)}</div>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>{item.category} {item.tier ? `• ${item.tier}` : ''}</div>
                    <button onClick={() => handleDeleteItem(item.id)} style={{ marginTop: '10px', backgroundColor: 'transparent', border: '1px solid #d9534f', color: '#d9534f', padding: '5px', width: '100%', borderRadius: '4px' }}>
                        Delete
                    </button>
                </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;