// src/components/PointOfSale.jsx
import React, { useState, useEffect } from 'react';
import { getInventory, saveSale } from '../data/repository';
import { supabase } from '../supabaseClient';

const PointOfSale = () => {
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useState([]); // Keeps flat list [A, A, B] for easy math
  const [filter, setFilter] = useState('all');

  // --- TAB STATES ---
  const [customerName, setCustomerName] = useState('');
  const [activeTabId, setActiveTabId] = useState(null);
  const [showTabList, setShowTabList] = useState(false);
  const [openTabs, setOpenTabs] = useState([]);

  // --- CHECKOUT STATES ---
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [changeDue, setChangeDue] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'beer': return '🍺';
      case 'liquor': return '🥃';
      case 'seltzer': return '🌊';
      case 'pop': return '🥤';
      default: return '🍽️';
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const data = await getInventory();
      setInventory(data);
    };
    loadData();
  }, []);

  const addToCart = (product) => setCart([...cart, product]);

  // 👇 UPDATED: Remove 1 instance of a specific item ID
  const removeFromCart = (itemId) => {
    const index = cart.findIndex(i => i.id === itemId);
    if (index > -1) {
      const newCart = [...cart];
      newCart.splice(index, 1); // Remove just one
      setCart(newCart);
    }
  };

  // 👇 NEW: Group items for Display Only (Visuals)
  // Input: [A, A, B] -> Output: [{...A, qty: 2}, {...B, qty: 1}]
  const groupedCart = Object.values(cart.reduce((acc, item) => {
    if (!acc[item.id]) {
      acc[item.id] = { ...item, qty: 1 };
    } else {
      acc[item.id].qty += 1;
    }
    return acc;
  }, {}));

  // MATH
  const calculateTotals = () => {
    const subtotal = cart.reduce((acc, item) => acc + item.price, 0);
    const tax = subtotal * 0.07;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };
  const { subtotal, tax, total } = calculateTotals();
  const grandTotal = total + tipAmount;

  // --- TAB LOGIC ---
  const fetchOpenTabs = async () => {
    const { data, error } = await supabase.from('tabs').select('*').eq('status', 'open').order('created_at', { ascending: false });
    if (!error) setOpenTabs(data);
  };

  const handleOpenTabList = () => {
    fetchOpenTabs();
    setShowTabList(true);
  };

  const loadTab = async (tab) => {
    const { data: items } = await supabase.from('tab_items').select('*').eq('tab_id', tab.id);
    setCart(items || []);
    setCustomerName(tab.customer_name);
    setActiveTabId(tab.id);
    setShowTabList(false);
  };

  const saveToTab = async () => {
    if (cart.length === 0) return alert("Cart is empty");
    const name = customerName || 'Walk-in';
    let tabIdToUse = activeTabId;

    if (!tabIdToUse) {
      const { data: newTab, error } = await supabase.from('tabs').insert([{ customer_name: name, status: 'open' }]).select().single();
      if (error) return alert('Error creating tab');
      tabIdToUse = newTab.id;
    } else {
      await supabase.from('tabs').update({ customer_name: name }).eq('id', tabIdToUse);
    }

    if (activeTabId) await supabase.from('tab_items').delete().eq('tab_id', tabIdToUse);

    // Save flat list (Database handles it fine)
    const itemsToInsert = cart.map(item => ({
      tab_id: tabIdToUse,
      inventory_id: item.inventory_id || item.id,
      name: item.name,
      price: item.price,
      quantity: 1
    }));

    await supabase.from('tab_items').insert(itemsToInsert);
    alert(`Tab saved for ${name}!`);
    setCart([]);
    setCustomerName('');
    setActiveTabId(null);
  };

  const closeTab = async () => {
    if (activeTabId) await supabase.from('tabs').update({ status: 'paid' }).eq('id', activeTabId);
  };

  // --- CHECKOUT LOGIC ---
  const handlePayClick = () => {
    if (cart.length === 0) return alert("Cart is empty");
    setTipAmount(0);
    setIsCheckoutOpen(true);
    setPaymentMethod('');
    setAmountPaid('');
    setChangeDue(null);
  };

  // Helper to compress cart for DB saving
  const groupItemsForSave = (items) => {
    const grouped = items.reduce((acc, item) => {
      const key = item.id;
      if (!acc[key]) acc[key] = { ...item, quantity: 1 };
      else acc[key].quantity += 1;
      return acc;
    }, {});
    return Object.values(grouped);
  };

  const finalizeSale = async () => {
    // Compress for DB
    const compressedCart = groupItemsForSave(cart);

    const orderData = {
      items: compressedCart,
      total: total.toFixed(2),
      tip: tipAmount.toFixed(2),
      method: paymentMethod
    };

    await saveSale(orderData);
    if (activeTabId) await closeTab();

    setCart([]);
    setCustomerName('');
    setActiveTabId(null);
    setIsCheckoutOpen(false);
    alert("Sale Saved!");
  };

  const processCash = () => {
    const paid = parseFloat(amountPaid);
    if (isNaN(paid) || paid < grandTotal) return alert("Not enough cash!");
    setChangeDue(paid - grandTotal);
  };

  const processCard = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      finalizeSale();
    }, 2000);
  };

  // --- RENDER ---
  const displayedItems = filter === 'all' ? inventory : inventory.filter(i => i.category === filter);

  return (
    <div className="pos-container">
      {/* LEFT: TICKET */}
      <div className="ticket-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{activeTabId ? `Tab #${activeTabId}` : 'New Order'}</h2>

          <div style={{ display: 'flex', gap: '5px' }}>
            <button
              onClick={() => { setCart([]); setCustomerName(''); setActiveTabId(null); }}
              style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              New Order ↺
            </button>
            <button
              onClick={handleOpenTabList}
              style={{ background: '#6c757d', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
            >
              Tabs 📂
            </button>
          </div>
        </div>

        {/* 👇 UPDATED: Display Grouped Cart */}
        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
          {groupedCart.map((item) => (
            <div key={item.id} className="cart-item" onClick={() => removeFromCart(item.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span>
                  {item.name}
                  {/* Show Badge if qty > 1 */}
                  {item.qty > 1 && (
                    <span style={{ marginLeft: '8px', background: '#007bff', padding: '2px 6px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      x{item.qty}
                    </span>
                  )}
                </span>
                <span>${(item.price * item.qty).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px', borderTop: '1px solid #444', paddingTop: '10px' }}>
          <p>Subtotal: ${subtotal.toFixed(2)}</p>
          <p>Tax (7%): ${tax.toFixed(2)}</p>
          <h1 style={{ fontSize: '2.5rem', margin: '10px 0' }}>${total.toFixed(2)}</h1>

          <input type="text" placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #555', background: '#333', color: 'white' }} />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={saveToTab} style={{ flex: 1, padding: '15px', fontSize: '1.2rem', fontWeight: 'bold', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>SAVE TAB</button>
            <button className="pay-btn-large" onClick={handlePayClick} style={{ flex: 1 }}>PAY NOW</button>
          </div>
        </div>
      </div>

      {/* RIGHT: MENU (Unchanged) */}
      <div className="menu-panel">
        <div className="tabs">
          {['all', 'beer', 'seltzer', 'liquor'].map(cat => (
            <button key={cat} className={`tab-btn ${filter === cat ? 'active' : ''}`} onClick={() => setFilter(cat)}>{cat.toUpperCase()}</button>
          ))}
        </div>
        <div className="menu-grid">
          {displayedItems.map(item => (
            <div key={item.id} className="product-card" onClick={() => addToCart(item)}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>{getCategoryIcon(item.category)}</div>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>{item.name}</h3>
              <div style={{ fontWeight: 'bold', fontSize: '1.3rem', color: '#007bff' }}>${item.price.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: TAB LIST (Unchanged) */}
      {showTabList && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
            <h2>Open Tabs</h2>
            <div style={{ maxHeight: '400px', overflowY: 'auto', margin: '20px 0' }}>
              {openTabs.length === 0 ? <p>No open tabs.</p> : openTabs.map(tab => (
                <div key={tab.id} onClick={() => loadTab(tab)} style={{ padding: '15px', borderBottom: '1px solid #444', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 'bold' }}>{tab.customer_name}</span><span style={{ color: '#888' }}>#{tab.id}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowTabList(false)} style={{ width: '100%', padding: '10px', background: '#666', border: 'none', color: 'white' }}>Close</button>
          </div>
        </div>
      )}

      {/* MODAL: CHECKOUT WITH TIPS (Unchanged) */}
      {isCheckoutOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '500px' }}>

            <div style={{ marginBottom: '20px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
              <div style={{ fontSize: '1.2rem', color: '#aaa' }}>Bill: ${total.toFixed(2)}</div>
              {tipAmount > 0 && <div style={{ fontSize: '1.2rem', color: '#28a745' }}>+ Tip: ${tipAmount.toFixed(2)}</div>}
              <h1 style={{ fontSize: '3rem', margin: '10px 0' }}>${grandTotal.toFixed(2)}</h1>
            </div>

            {!paymentMethod && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ color: '#aaa', marginBottom: '10px' }}>Add Tip?</h3>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  {[0.15, 0.20, 0.25].map(pct => (
                    <button
                      key={pct}
                      onClick={() => setTipAmount(total * pct)}
                      style={{
                        flex: 1, padding: '15px', borderRadius: '8px', border: '1px solid #555',
                        background: tipAmount === total * pct ? '#28a745' : '#333',
                        color: 'white', fontSize: '1.1rem', cursor: 'pointer'
                      }}
                    >
                      {pct * 100}% <br />
                      <span style={{ fontSize: '0.9rem' }}>${(total * pct).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setTipAmount(0)} style={{ flex: 1, padding: '10px', background: '#444', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>No Tip</button>
                  <input
                    type="number" placeholder="Custom $"
                    onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
                    style={{ flex: 1, padding: '10px', background: '#222', border: '1px solid #555', color: 'white', borderRadius: '5px', textAlign: 'center' }}
                  />
                </div>
              </div>
            )}

            {!paymentMethod && (
              <div>
                <h3 style={{ color: '#aaa', marginBottom: '10px' }}>Payment Method</h3>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <button className="pay-btn-large" style={{ background: '#007bff' }} onClick={() => setPaymentMethod('cash')}>CASH</button>
                  <button className="pay-btn-large" style={{ background: '#6610f2' }} onClick={() => setPaymentMethod('card')}>CARD</button>
                </div>
              </div>
            )}

            {paymentMethod === 'cash' && !changeDue && (
              <div>
                <h3>Amount Received</h3>
                <input type="number" className="input-field" autoFocus value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
                <button className="pay-btn-large" onClick={processCash}>CALCULATE CHANGE</button>
              </div>
            )}

            {changeDue !== null && (
              <div>
                <h3 style={{ color: 'lime', fontSize: '2rem' }}>Change: ${changeDue.toFixed(2)}</h3>
                <button className="pay-btn-large" onClick={finalizeSale}>FINISH SALE</button>
              </div>
            )}

            {paymentMethod === 'card' && (
              <div>
                <h3>{isProcessing ? "Processing..." : `Charge $${grandTotal.toFixed(2)}`}</h3>
                {!isProcessing && <button className="pay-btn-large" onClick={processCard}>Simulate Swipe</button>}
              </div>
            )}

            <button onClick={() => setIsCheckoutOpen(false)} style={{ marginTop: '20px', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', textDecoration: 'underline' }}>
              Cancel Transaction
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PointOfSale;