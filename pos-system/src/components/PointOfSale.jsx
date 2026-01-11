// src/components/PointOfSale.jsx
import React, { useState, useEffect } from 'react';
import { getInventory, saveSale } from '../data/repository';
import { supabase } from '../supabaseClient';

const PointOfSale = () => {
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useState([]);
  const [filter, setFilter] = useState('all');

  // --- TAB MANAGEMENT STATES ---
  const [customerName, setCustomerName] = useState('');
  const [activeTabId, setActiveTabId] = useState(null); // Keeps track if we are editing an existing tab
  const [showTabList, setShowTabList] = useState(false); // Controls the "View Tabs" modal
  const [openTabs, setOpenTabs] = useState([]); // Stores the list of tabs from DB

  // --- CHECKOUT STATES ---
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [changeDue, setChangeDue] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper to get icon
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'beer': return '🍺';
      case 'liquor': return '🥃';
      case 'seltzer': return '🌊';
      case 'pop': return '🥤';
      default: return '🍽️';
    }
  };

  // 1. Load Inventory on Mount
  useEffect(() => {
    const loadData = async () => {
      const data = await getInventory();
      setInventory(data);
    };
    loadData();
  }, []);

  const addToCart = (product) => setCart([...cart, product]);
  const removeFromCart = (idx) => setCart(cart.filter((_, i) => i !== idx));

  // MATH
  const calculateTotals = () => {
    const subtotal = cart.reduce((acc, item) => acc + item.price, 0);
    const tax = subtotal * 0.07;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };
  const { subtotal, tax, total } = calculateTotals();

  // ==========================================
  // 👇 NEW: TAB MANAGER LOGIC 👇
  // ==========================================

  // A. Fetch all open tabs to display in the list
  const fetchOpenTabs = async () => {
    const { data, error } = await supabase
      .from('tabs')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching tabs:', error);
    else setOpenTabs(data);
  };

  // B. Open the Tab List Modal
  const handleOpenTabList = () => {
    fetchOpenTabs();
    setShowTabList(true);
  };

  // C. Load a specific tab onto the screen
  const loadTab = async (tab) => {
    // 1. Get the items for this tab
    const { data: items, error } = await supabase
      .from('tab_items')
      .select('*')
      .eq('tab_id', tab.id);

    if (error) {
      alert("Error loading tab items");
      return;
    }

    // 2. Populate the screen
    setCart(items); // Put drinks in cart
    setCustomerName(tab.customer_name); // Set name input
    setActiveTabId(tab.id); // Remember which ID we are editing
    setShowTabList(false); // Close modal
  };

  // D. Save (or Update) the Tab
  const saveToTab = async () => {
    if (cart.length === 0) return alert("Cart is empty");
    const name = customerName || 'Walk-in';
    let tabIdToUse = activeTabId;

    // IF creating a NEW tab
    if (!tabIdToUse) {
      const { data: newTab, error } = await supabase
        .from('tabs')
        .insert([{ customer_name: name, status: 'open' }])
        .select()
        .single();

      if (error) return alert('Error creating tab');
      tabIdToUse = newTab.id;
    }
    // IF updating EXISTING tab
    else {
      await supabase
        .from('tabs')
        .update({ customer_name: name })
        .eq('id', tabIdToUse);
    }

    // DELETE old items (to avoid duplicates)
    if (activeTabId) {
      await supabase.from('tab_items').delete().eq('tab_id', tabIdToUse);
    }

    // INSERT current cart items
    const itemsToInsert = cart.map(item => ({
      tab_id: tabIdToUse,
      inventory_id: item.inventory_id || item.id,
      name: item.name,
      price: item.price,
      quantity: 1
    }));

    const { error: itemsError } = await supabase
      .from('tab_items')
      .insert(itemsToInsert);

    if (itemsError) {
      alert("Error saving items");
    } else {
      alert(`Tab saved for ${name}!`);

      // 👇 NEW: RESET SCREEN AFTER SAVE 👇
      setCart([]);             // Clear the drinks
      setCustomerName('');     // Clear the name input
      setActiveTabId(null);    // Forget the current tab ID
    }
  };

  // E. Close out a tab (Paid)
  const closeTab = async () => {
    if (activeTabId) {
      await supabase.from('tabs').update({ status: 'paid' }).eq('id', activeTabId);
    }
  };

  // ==========================================
  // 👆 END TAB LOGIC 👆
  // ==========================================

  // --- CHECKOUT LOGIC (Updated to close tab on pay) ---
  const handlePayClick = () => {
    if (cart.length === 0) return alert("Cart is empty");
    setIsCheckoutOpen(true);
    setPaymentMethod('');
    setAmountPaid('');
    setChangeDue(null);
  };

  const finalizeSale = async () => {
    const orderData = {
      items: cart,
      total: total.toFixed(2),
      method: paymentMethod
    };

    await saveSale(orderData);

    // If this was a saved tab, mark it as closed!
    if (activeTabId) {
      await closeTab();
    }

    // Reset everything
    setCart([]);
    setCustomerName('');
    setActiveTabId(null);
    setIsCheckoutOpen(false);
    alert("Sale Saved & Tab Closed!");
  };

  const processCash = () => {
    const paid = parseFloat(amountPaid);
    if (isNaN(paid) || paid < total) return alert("Not enough cash!");
    setChangeDue(paid - total);
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

      {/* LEFT: TICKET PANEL */}
      <div className="ticket-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{activeTabId ? `Tab #${activeTabId}` : 'New Order'}</h2>

          {/* VIEW TABS BUTTON */}
          <button
            onClick={handleOpenTabList}
            style={{ background: '#6c757d', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
          >
            View Tabs 📂
          </button>
        </div>

        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
          {cart.map((item, idx) => (
            <div key={idx} className="cart-item" onClick={() => removeFromCart(idx)}>
              <span>{item.name}</span>
              <span>${item.price.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px', borderTop: '1px solid #444', paddingTop: '10px' }}>
          <p>Subtotal: ${subtotal.toFixed(2)}</p>
          <p>Tax (7%): ${tax.toFixed(2)}</p>
          <h1 style={{ fontSize: '2.5rem', margin: '10px 0' }}>${total.toFixed(2)}</h1>

          <input
            type="text"
            placeholder="Customer Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #555', background: '#333', color: 'white' }}
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={saveToTab}
              style={{ flex: 1, padding: '15px', fontSize: '1.2rem', fontWeight: 'bold', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
              SAVE TAB
            </button>
            <button
              className="pay-btn-large"
              onClick={handlePayClick}
              style={{ flex: 1 }}
            >
              PAY NOW
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: MENU */}
      <div className="menu-panel">
        <div className="tabs">
          {['all', 'beer', 'seltzer', 'liquor'].map(cat => (
            <button
              key={cat}
              className={`tab-btn ${filter === cat ? 'active' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="menu-grid">
          {displayedItems.map(item => (
            <div key={item.id} className="product-card" onClick={() => addToCart(item)}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>
                {getCategoryIcon(item.category)}
              </div>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>{item.name}</h3>
              <div style={{ fontWeight: 'bold', fontSize: '1.3rem', color: '#007bff' }}>
                ${item.price.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- MODAL: OPEN TABS LIST --- */}
      {showTabList && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
            <h2>Open Tabs</h2>
            <div style={{ maxHeight: '400px', overflowY: 'auto', margin: '20px 0' }}>
              {openTabs.length === 0 ? <p>No open tabs.</p> : openTabs.map(tab => (
                <div
                  key={tab.id}
                  onClick={() => loadTab(tab)}
                  style={{
                    padding: '15px', borderBottom: '1px solid #444', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                  className="tab-row" // You can add hover effects in CSS
                >
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{tab.customer_name}</span>
                  <span style={{ color: '#888' }}>#{tab.id}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowTabList(false)} style={{ width: '100%', padding: '10px', background: '#666', border: 'none', color: 'white', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL: CHECKOUT --- */}
      {isCheckoutOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Total: ${total.toFixed(2)}</h2>
            {!paymentMethod && (
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                <button className="pay-btn-large" style={{ background: '#007bff' }} onClick={() => setPaymentMethod('cash')}>CASH</button>
                <button className="pay-btn-large" style={{ background: '#6610f2' }} onClick={() => setPaymentMethod('card')}>CARD</button>
              </div>
            )}
            {paymentMethod === 'cash' && !changeDue && (
              <div>
                <input type="number" className="input-field" autoFocus value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
                <button className="pay-btn-large" onClick={processCash}>CALCULATE CHANGE</button>
              </div>
            )}
            {changeDue !== null && (
              <div>
                <h3 style={{ color: 'lime' }}>Change: ${changeDue.toFixed(2)}</h3>
                <button className="pay-btn-large" onClick={finalizeSale}>FINISH SALE</button>
              </div>
            )}
            {paymentMethod === 'card' && (
              <div>
                <h3>{isProcessing ? "Processing..." : "Ready to Swipe"}</h3>
                {!isProcessing && <button className="pay-btn-large" onClick={processCard}>Simulate Swipe</button>}
              </div>
            )}
            <button onClick={() => setIsCheckoutOpen(false)} style={{ marginTop: '20px', background: 'transparent', border: '1px solid #666', color: '#888', padding: '10px' }}>Cancel</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default PointOfSale;