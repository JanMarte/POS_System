// src/components/PointOfSale.jsx
import React, { useState, useEffect } from 'react';
import { getInventory, saveSale, deductStock } from '../data/repository';
import { supabase } from '../supabaseClient';
import Notification from './Notification';
import VoidModal from './VoidModal';
import { voidItem } from '../services/tabService';
import TopBar from './TopBar';

const PointOfSale = ({ onLogout, onNavigateToDashboard, user }) => {
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // --- TAB STATES ---
  const [customerName, setCustomerName] = useState('');
  const [activeTabId, setActiveTabId] = useState(null);
  const [showTabList, setShowTabList] = useState(false);
  const [openTabs, setOpenTabs] = useState([]);

  // --- CHECKOUT STATES ---
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // VOID STATES
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [itemToVoid, setItemToVoid] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [changeDue, setChangeDue] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);

  const [notification, setNotification] = useState({ message: '', type: '' });
  const notify = (message, type = 'success') => setNotification({ message, type });

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'beer': return '🍺';
      case 'liquor': return '🥃';
      case 'seltzer': return '🌊';
      case 'pop': return '🥤';
      default: return '🍽️';
    }
  };

  const refreshInventory = async () => {
    const data = await getInventory();
    setInventory(data);
  };

  useEffect(() => {
    refreshInventory();
  }, []);

  // --- CART LOGIC ---

  const handleItemClick = (item) => {
    const cartItem = cart.find(c => c.id === item.id && !c.tab_id);
    const quantityInCart = cartItem ? cartItem.quantity : 0;
    const isTracked = item.stock_count !== null;
    const effectiveStock = isTracked ? (item.stock_count - quantityInCart) : 9999;

    const isSoldOut = !item.is_available || (isTracked && effectiveStock <= 0);

    if (isSoldOut) {
      notify("No more stock available!", "error");
    } else {
      addToCart(item);
    }
  };

  const addToCart = (product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id && !item.tab_id);

      if (existing) {
        return prevCart.map(item => (item.id === product.id && !item.tab_id)
          ? { ...item, quantity: (item.quantity || 1) + 1 }
          : item
        );
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  const handleRemoveRequest = (item) => {
    if (item.tab_id) {
      setItemToVoid(item);
      setIsVoidModalOpen(true);
    } else {
      removeFromCart(item.id);
    }
  };

  const removeFromCart = (itemId) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === itemId && !item.tab_id) {
          return { ...item, quantity: item.quantity - 1 };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const handleConfirmVoid = async (reason) => {
    if (!itemToVoid) return;

    const targetRowId = itemToVoid.db_ids && itemToVoid.db_ids.length > 0
      ? itemToVoid.db_ids[itemToVoid.db_ids.length - 1]
      : itemToVoid.id;

    try {
      await voidItem(targetRowId, reason);

      const historyItem = { ...itemToVoid, quantity: 1 };
      const historyLog = {
        items: [historyItem],
        total: 0.00,
        tip: 0.00,
        method: reason
      };
      await saveSale(historyLog);

      setCart(prev => {
        return prev.map(item => {
          if (item.id === itemToVoid.id && item.tab_id === itemToVoid.tab_id) {
            const newQty = item.quantity - 1;
            if (newQty <= 0) return null;
            const newDbIds = item.db_ids ? item.db_ids.slice(0, -1) : [];
            return { ...item, quantity: newQty, db_ids: newDbIds };
          }
          return item;
        }).filter(Boolean);
      });

      notify(`Item voided (${reason})`, "info");
      if (reason === 'entry_error') refreshInventory();

    } catch (error) {
      console.error("Void error:", error);
      notify("Failed to void item", "error");
    } finally {
      setIsVoidModalOpen(false);
      setItemToVoid(null);
    }
  };

  // MATH
  const calculateTotals = () => {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
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
    const { data: items } = await supabase
      .from('tab_items')
      .select('*')
      .eq('tab_id', tab.id)
      .eq('status', 'active');

    const groupedCart = (items || []).reduce((acc, dbItem) => {
      const productId = dbItem.inventory_id || dbItem.name;

      const existingItem = acc.find(i =>
        i.inventory_id === dbItem.inventory_id &&
        i.price === dbItem.price
      );

      if (existingItem) {
        existingItem.quantity += dbItem.quantity;
        existingItem.db_ids.push(dbItem.id);
      } else {
        acc.push({
          ...dbItem,
          id: dbItem.inventory_id,
          quantity: dbItem.quantity,
          alreadyDeducted: true,
          db_ids: [dbItem.id]
        });
      }
      return acc;
    }, []);

    setCart(groupedCart);
    setCustomerName(tab.customer_name);
    setActiveTabId(tab.id);
    setShowTabList(false);
    notify(`Tab loaded: ${tab.customer_name}`);
  };

  const saveToTab = async () => {
    if (cart.length === 0) return notify("Cart is empty!", "error");
    const name = customerName || 'Walk-in';
    let tabIdToUse = activeTabId;

    if (!tabIdToUse) {
      const { data: newTab, error } = await supabase.from('tabs').insert([{ customer_name: name, status: 'open' }]).select().single();
      if (error) return notify('Error creating tab', "error");
      tabIdToUse = newTab.id;
    } else {
      await supabase.from('tabs').update({ customer_name: name }).eq('id', tabIdToUse);
    }

    const newItems = cart.filter(item => !item.alreadyDeducted);

    if (newItems.length > 0) {
      await deductStock(newItems);

      const itemsToInsert = [];
      newItems.forEach(item => {
        for (let i = 0; i < item.quantity; i++) {
          itemsToInsert.push({
            tab_id: tabIdToUse,
            inventory_id: item.inventory_id || item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            status: 'active'
          });
        }
      });

      await supabase.from('tab_items').insert(itemsToInsert);
    }

    await refreshInventory();
    notify(`Tab saved for ${name}!`);
    setCart([]);
    setCustomerName('');
    setActiveTabId(null);
  };

  const closeTab = async () => {
    if (activeTabId) {
      await supabase.from('tabs').update({ status: 'paid' }).eq('id', activeTabId);
    }
  };

  // --- CHECKOUT LOGIC ---
  const handlePayClick = () => {
    if (cart.length === 0) return notify("Cart is empty!", "error");
    setTipAmount(0);
    setIsCheckoutOpen(true);
    setPaymentMethod('');
    setAmountPaid('');
    setChangeDue(null);
  };

  const finalizeSale = async () => {
    const orderData = { items: cart, total: total.toFixed(2), tip: tipAmount.toFixed(2), method: paymentMethod };
    await saveSale(orderData);
    if (activeTabId) await closeTab();
    await refreshInventory();

    setCart([]);
    setCustomerName('');
    setActiveTabId(null);
    setIsCheckoutOpen(false);
    notify("Sale Processed Successfully!");
  };

  const processCash = () => {
    const paid = parseFloat(amountPaid);
    if (isNaN(paid) || paid < grandTotal) return notify("Not enough cash!", "error");
    setChangeDue(paid - grandTotal);
  };

  const processCard = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      finalizeSale();
    }, 2000);
  };

  const displayedItems = searchTerm
    ? inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : (filter === 'all' ? inventory : inventory.filter(i => i.category === filter));

  return (
    <div className="pos-container">
      <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />

      <style>{`
        /* Reset Body Scroll */
        body, html {
            overflow: hidden;
            height: 100%;
            margin: 0;
            padding: 0;
        }

        .pos-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            height: 100dvh;
            padding: 10px;
            box-sizing: border-box;
            background-color: #1a1a1a;
        }

        /* Wrapper for the 2 columns */
        .pos-content-wrapper {
            display: flex;
            gap: 15px;
            flex: 1; /* Take remaining height */
            overflow: hidden; /* Prevent body scroll */
        }

        .ticket-panel {
            width: 35%;
            display: flex;
            flex-direction: column;
            background: #2a2a2a;
            padding: 15px;
            border-radius: 8px;
            height: 100%;
            overflow: hidden;
        }

        .menu-panel {
            width: 65%;
            display: flex;
            flex-direction: column;
            height: 100%;
            overflow: hidden;
        }

        .menu-grid {
            flex: 1;
            overflow-y: auto;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 15px;
            padding-bottom: 20px;
            align-content: start;
        }

        .cart-list-container {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 10px;
        }
      `}</style>

      {/* 👇 PASS USER AND UPDATE BUTTON TEXT */}
      <TopBar
        title="Point of Sale"
        onLogout={onLogout}
        user={user}
        customAction={
          onNavigateToDashboard && (
            <button
              className="btn-primary"
              onClick={onNavigateToDashboard}
              style={{
                marginRight: '15px',
                padding: '8px 15px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              DASHBOARD
            </button>
          )
        }
      />

      <div className="pos-content-wrapper">

        <div className="ticket-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{activeTabId ? `Tab #${activeTabId}` : 'New Order'}</h2>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button onClick={() => { setCart([]); setCustomerName(''); setActiveTabId(null); }} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>New Order ↺</button>
              <button onClick={handleOpenTabList} style={{ background: '#6c757d', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Tabs 📂</button>
            </div>
          </div>

          <div className="cart-list-container">
            {cart.map((item, index) => (
              <div
                key={`${item.id}-${item.tab_id ? 'saved' : 'new'}-${index}`}
                className="cart-item"
                onClick={() => handleRemoveRequest(item)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>
                    {item.name}
                    {item.tab_id && <span style={{ fontSize: '0.7rem', background: '#17a2b8', color: 'white', padding: '2px 4px', borderRadius: '4px', marginLeft: '5px' }}>SAVED</span>}
                    {item.quantity > 1 && <span style={{ marginLeft: '8px', background: '#007bff', padding: '2px 6px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 'bold' }}>x{item.quantity}</span>}
                  </span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <span style={{ color: 'red', fontWeight: 'bold', marginLeft: '10px' }}>X</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid #444', paddingTop: '10px', marginTop: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ccc', fontSize: '0.9rem', marginBottom: '5px' }}>
              <span>Subtotal: ${subtotal.toFixed(2)}</span>
              <span>Tax (7%): ${tax.toFixed(2)}</span>
            </div>

            <h1 style={{ fontSize: '2rem', margin: '0 0 10px 0', textAlign: 'right' }}>${total.toFixed(2)}</h1>

            <input type="text" placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #555', background: '#333', color: 'white', boxSizing: 'border-box' }} />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={saveToTab} style={{ flex: 1, padding: '12px', fontSize: '1.1rem', fontWeight: 'bold', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>SAVE TAB</button>
              <button onClick={handlePayClick} style={{ flex: 1, padding: '12px', fontSize: '1.1rem', fontWeight: 'bold', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>PAY NOW</button>
            </div>
          </div>
        </div>

        <div className="menu-panel">
          <div style={{ marginBottom: '10px' }}>
            <input type="text" placeholder="🔍 Search items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '15px', fontSize: '1.2rem', borderRadius: '8px', border: '1px solid #555', background: '#2a2a2a', color: 'white' }} />
          </div>
          {!searchTerm && (
            <div className="tabs">
              {['all', 'beer', 'seltzer', 'liquor'].map(cat => (
                <button key={cat} className={`tab-btn ${filter === cat ? 'active' : ''}`} onClick={() => setFilter(cat)}>{cat.toUpperCase()}</button>
              ))}
            </div>
          )}

          <div className="menu-grid">
            {displayedItems.map(item => {
              const cartItem = cart.find(c => c.id === item.id && !c.tab_id);
              const quantityInCart = cartItem ? cartItem.quantity : 0;
              const isTracked = item.stock_count !== null;
              const effectiveStock = isTracked ? (item.stock_count - quantityInCart) : null;
              const isSoldOut = !item.is_available || (isTracked && effectiveStock <= 0);

              return (
                <div
                  key={item.id}
                  className="product-card"
                  onClick={() => handleItemClick(item)}
                  style={{
                    cursor: isSoldOut ? 'not-allowed' : 'pointer',
                    position: 'relative',
                    border: isSoldOut ? '1px solid #444' : '1px solid #555',
                    overflow: 'hidden'
                  }}
                >

                  {isSoldOut && (
                    <div style={{
                      position: 'absolute', top: '15px', right: '-32px', transform: 'rotate(45deg)',
                      background: 'linear-gradient(to bottom, #d90429 0%, #8d0801 100%)', color: '#fff',
                      width: '120px', textAlign: 'center', padding: '5px 0',
                      boxShadow: '0 5px 10px rgba(0,0,0,0.5)', borderTop: '1px dashed rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(0,0,0,0.2)',
                      fontWeight: 'bold', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', textShadow: '0px 1px 2px rgba(0,0,0,0.5)',
                      zIndex: 10, pointerEvents: 'none'
                    }}>
                      Sold Out
                    </div>
                  )}

                  {!isSoldOut && isTracked && effectiveStock < 10 && (
                    <div style={{
                      position: 'absolute', top: '15px', right: '-32px', transform: 'rotate(45deg)',
                      background: 'linear-gradient(to bottom, #ffeb3b 0%, #fbc02d 100%)',
                      color: '#000',
                      width: '120px', textAlign: 'center', padding: '5px 0',
                      boxShadow: '0 5px 10px rgba(0,0,0,0.5)',
                      fontWeight: 'bold', fontSize: '0.9rem',
                      zIndex: 10, pointerEvents: 'none'
                    }}>
                      {effectiveStock} Left
                    </div>
                  )}

                  <div style={{ opacity: isSoldOut ? 0.5 : 1, filter: isSoldOut ? 'grayscale(100%)' : 'none', transition: 'all 0.3s ease' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '5px' }}>{getCategoryIcon(item.category)}</div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1rem', lineHeight: '1.2' }}>{item.name}</h3>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: isSoldOut ? '#888' : '#007bff' }}>
                      ${item.price.toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

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

      <VoidModal
        isOpen={isVoidModalOpen}
        onClose={() => setIsVoidModalOpen(false)}
        onConfirm={handleConfirmVoid}
      />

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
                    <button key={pct} onClick={() => setTipAmount(total * pct)} style={{ flex: 1, padding: '15px', borderRadius: '8px', border: '1px solid #555', background: tipAmount === total * pct ? '#28a745' : '#333', color: 'white', fontSize: '1.1rem', cursor: 'pointer' }}>{pct * 100}% <br /><span style={{ fontSize: '0.9rem' }}>${(total * pct).toFixed(2)}</span></button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setTipAmount(0)} style={{ flex: 1, padding: '10px', background: '#444', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>No Tip</button>
                  <input type="number" placeholder="Custom $" onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)} style={{ flex: 1, padding: '10px', background: '#222', border: '1px solid #555', color: 'white', borderRadius: '5px', textAlign: 'center' }} />
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
            <button onClick={() => setIsCheckoutOpen(false)} style={{ marginTop: '20px', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', textDecoration: 'underline' }}>Cancel Transaction</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PointOfSale;