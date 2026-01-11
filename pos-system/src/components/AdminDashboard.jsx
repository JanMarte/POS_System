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
  
  // Form State
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'beer', tier: '' });

  // 1. Load Data from Supabase on start
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

  const handleDeleteSale = async () => {
    if(confirm('Clear all sales history? This cannot be undone.')) {
        await clearSales();
        setSales([]); // Clear local view
    }
  };

  const handleAddItem = async () => {
    if(!newItem.name || !newItem.price) return alert("Name and Price required");
    
    const itemPayload = {
        name: newItem.name,
        price: parseFloat(newItem.price),
        category: newItem.category,
        tier: newItem.tier || null
    };

    // Save to Database
    const savedItem = await addInventoryItem(itemPayload);
    
    // Update Local View (Add the new item returned from DB)
    if (savedItem && savedItem.length > 0) {
        setInventory([...inventory, savedItem[0]]);
        setNewItem({ name: '', price: '', category: 'beer', tier: '' }); 
        alert("Item Added!");
    }
  };

  const handleDeleteItem = async (id) => {
    if(confirm('Delete this item?')) {
        await deleteInventoryItem(id);
        // Remove from local screen
        setInventory(inventory.filter(i => i.id !== id));
    }
  };

  // --- HELPERS ---
  const totalRevenue = sales.reduce((acc, order) => acc + parseFloat(order.total), 0).toFixed(2);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Manager Dashboard</h1>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid #666', color: 'white', padding: '10px 20px', cursor: 'pointer' }}>
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

      {loading && <p>Loading data from cloud...</p>}

      {/* VIEW 1: SALES REPORT */}
      {!loading && activeTab === 'sales' && (
        <div>
          <div className="stats-card">
            <h3>Total Revenue: <span style={{color: '#28a745'}}>${totalRevenue}</span></h3>
            <button onClick={handleDeleteSale} style={{ backgroundColor: '#d9534f', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer' }}>
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
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{new Date(sale.date).toLocaleString()}</td>
                  <td>${parseFloat(sale.total).toFixed(2)}</td>
                  <td>
                    {/* Handle legacy data vs database data */}
                    {Array.isArray(sale.items) ? sale.items.map(i => i.name).join(', ') : 'Unknown Items'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sales.length === 0 && <p style={{marginTop: '20px', color: '#888'}}>No sales yet.</p>}
        </div>
      )}

      {/* VIEW 2: INVENTORY MANAGER */}
      {!loading && activeTab === 'inventory' && (
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
                <button onClick={handleAddItem} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}>
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
                    <button onClick={() => handleDeleteItem(item.id)} style={{ marginTop: '10px', backgroundColor: 'transparent', border: '1px solid #d9534f', color: '#d9534f', padding: '5px', width: '100%', borderRadius: '4px', cursor: 'pointer' }}>
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