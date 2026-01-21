// src/components/PointOfSale.jsx
import React, { useState, useEffect } from 'react';
import { getInventory, saveSale, deductStock, getHappyHours } from '../data/repository'; 
import { supabase } from '../supabaseClient';
import Notification from './Notification';
import VoidModal from './VoidModal';
import { voidItem } from '../services/tabService';
import TopBar from './TopBar';
import { printReceipt } from '../utils/receiptService';
import RecipeModal from './RecipeModal';

const PointOfSale = ({ onLogout, onNavigateToDashboard, user }) => {
  const [inventory, setInventory] = useState([]);
  const [happyHours, setHappyHours] = useState([]); 
  const [cart, setCart] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  // 🆕 NOTE MODAL STATE & HANDLERS
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteItem, setNoteItem] = useState(null);
  const [noteText, setNoteText] = useState('');

  // Open the modal
  const handleOpenNoteModal = (targetItem) => {
    setNoteItem(targetItem);
    setNoteText(targetItem.note || '');
    setIsNoteModalOpen(true);
  };

  // Save the note to the cart
  const handleSaveNote = (e) => {
    e.preventDefault();
    setCart(prev => prev.map(item => {
      if (item === noteItem) {
        return { ...item, note: noteText };
      }
      return item;
    }));
    setIsNoteModalOpen(false);
    setNoteItem(null);
  };

  // 🆕 RECIPE MODAL STATE
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [recipeSearchTerm, setRecipeSearchTerm] = useState('');

  // --- DISCOUNT STATE ---
  const [discount, setDiscount] = useState({ type: null, value: 0 }); // type: 'percent' | 'amount' | null
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);

  // --- TAB STATES ---
  const [customerName, setCustomerName] = useState('');
  const [activeTabId, setActiveTabId] = useState(null);
  const [showTabList, setShowTabList] = useState(false);
  const [openTabs, setOpenTabs] = useState([]);

  // --- CHECKOUT STATES ---
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('payment'); // 'payment' | 'success'
  const [completedOrder, setCompletedOrder] = useState(null);

  // VOID STATES
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [itemToVoid, setItemToVoid] = useState(null);

  // 🆕 CUSTOM ITEM STATE
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');

  // PAYMENT STATES
  const [paymentMethod, setPaymentMethod] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [changeDue, setChangeDue] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);

  const [notification, setNotification] = useState({ message: '', type: '' });
  const notify = (message, type = 'success') => setNotification({ message, type });

  // 👇 PERMISSION CHECK: Admin, Manager, OR 'can_discount' flag
  const canApplyDiscount = user && (user.role === 'admin' || user.role === 'manager' || user.can_discount === true);

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'beer': return '🍺';
      case 'liquor': return '🥃';
      case 'seltzer': return '🌊';
      case 'pop': return '🥤';
      default: return '🍽️';
    }
  };

  // 🆕 HANDLE CUSTOM ITEM SUBMIT
  const handleCustomItemSubmit = (e) => {
    e.preventDefault(); // Prevent form refresh
    const price = parseFloat(customItemPrice);
    if (!customItemName || isNaN(price) || price < 0) {
      return notify("Please enter a valid name and price.", "error");
    }

    const newItem = {
      // Create a pseudo-ID based on name so identical custom items merge in cart
      id: `custom-${customItemName.toLowerCase().replace(/\s+/g, '-')}`,
      name: customItemName,
      price: price,
      category: 'custom',
      stock_count: null, // Custom items don't track stock
      is_available: true
    };

    addToCart(newItem);

    // Reset and Close
    setCustomItemName('');
    setCustomItemPrice('');
    setIsCustomItemModalOpen(false);
  };

  const refreshInventory = async () => {
    const data = await getInventory();
    setInventory(data);
  };

  useEffect(() => {
    const loadData = async () => {
      const inv = await getInventory();
      const hh = await getHappyHours();
      setInventory(inv);
      setHappyHours(hh);
    };
    loadData();
  }, []);

  // 🆕 HANDLER FOR RECIPE CLICK
  const handleRecipeClick = (e, itemName) => {
    e.stopPropagation(); // Prevents adding the item to cart when clicking the info icon
    setRecipeSearchTerm(itemName);
    setIsRecipeModalOpen(true);
  };

  // 👇 HAPPY HOUR CHECKER
  const checkHappyHour = (item) => {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const rule = happyHours.find(r => {
      // Must match day
      if (!r.days.includes(currentDay)) return false;
      // Must match category (or all)
      if (r.category !== 'all' && r.category !== item.category) return false;

      // Check Time Range
      const [startH, startM] = r.start_time.split(':').map(Number);
      const [endH, endM] = r.end_time.split(':').map(Number);
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;

      return currentMinutes >= startTotal && currentMinutes < endTotal;
    });

    return rule;
  };

  // --- CART LOGIC ---

  const handleItemClick = (item) => {
    if (isBusy) return;
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
    // Check for Automatic Discount
    const rule = checkHappyHour(product);
    let finalPrice = product.price;
    let isHappyHour = false;

    if (rule) {
      finalPrice = Math.max(0, product.price - rule.discount_amount);
      isHappyHour = true;
    }

    setCart(prevCart => {
      // Find existing item with SAME price (so regular and happy hour items don't merge)
      const existing = prevCart.find(item => item.id === product.id && !item.tab_id && item.price === finalPrice);

      if (existing) {
        return prevCart.map(item => (item === existing)
          ? { ...item, quantity: (item.quantity || 1) + 1 }
          : item
        );
      } else {
        const newItem = { ...product, price: finalPrice, quantity: 1, isHappyHour };
        if (isHappyHour) notify(`Happy Hour! ${rule.name} applied.`);
        return [...prevCart, newItem];
      }
    });
  };

  const handleRemoveRequest = (item) => {
    if (isBusy) return;
    if (item.tab_id) {
      setItemToVoid(item);
      setIsVoidModalOpen(true);
    } else {
      removeFromCart(item);
    }
  };

  const removeFromCart = (targetItem) => {
    setCart(prev => {
      return prev.map(item => {
        if (item === targetItem) {
          return { ...item, quantity: item.quantity - 1 };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const handleConfirmVoid = async (reason) => {
    if (!itemToVoid || isBusy) return;
    setIsBusy(true);

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
        method: reason,
        employee_name: user ? user.name : 'Unknown' // Pass name to DB
      };
      await saveSale(historyLog);

      setCart(prev => {
        return prev.map(item => {
          if (item === itemToVoid) {
            const newQty = item.quantity - 1;
            if (newQty <= 0) return null;
            return { ...item, quantity: newQty };
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
      setIsBusy(false);
      setIsVoidModalOpen(false);
      setItemToVoid(null);
    }
  };

  // --- MATH & DISCOUNT LOGIC ---
  const calculateTotals = () => {
    const rawSubtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Calculate Discount
    let discountAmount = 0;
    if (discount.type === 'percent') {
      discountAmount = rawSubtotal * (discount.value / 100);
    } else if (discount.type === 'amount') {
      discountAmount = discount.value;
    }

    // Ensure we don't discount below zero
    if (discountAmount > rawSubtotal) discountAmount = rawSubtotal;

    const taxableSubtotal = rawSubtotal - discountAmount;
    const tax = taxableSubtotal * 0.07;
    const total = taxableSubtotal + tax;

    return { rawSubtotal, discountAmount, tax, total };
  };

  const { rawSubtotal, discountAmount, tax, total } = calculateTotals();
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
    if (isBusy) return;
    setIsBusy(true);
    try {
      const { data: items } = await supabase
        .from('tab_items')
        .select('*')
        .eq('tab_id', tab.id)
        .eq('status', 'active');

      const groupedCart = (items || []).reduce((acc, dbItem) => {
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
      setDiscount({ type: null, value: 0 }); // Reset discount when loading a new tab
      setShowTabList(false);
      notify(`Tab loaded: ${tab.customer_name}`);
    } catch (e) {
      console.error(e);
      notify("Failed to load tab", "error");
    } finally {
      setIsBusy(false);
    }
  };

  const saveToTab = async () => {
    if (cart.length === 0) return notify("Cart is empty!", "error");
    if (isBusy) return;
    setIsBusy(true);

    try {
      const name = customerName || 'Walk-in';
      let tabIdToUse = activeTabId;

      if (!tabIdToUse) {
        const { data: newTab, error } = await supabase.from('tabs').insert([{ customer_name: name, status: 'open' }]).select().single();
        if (error) throw error;
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
      setDiscount({ type: null, value: 0 }); // Reset discount
    } catch (err) {
      console.error(err);
      notify("Error saving tab", "error");
    } finally {
      setIsBusy(false);
    }
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
    setCheckoutStep('payment');
    setIsCheckoutOpen(true);
    setPaymentMethod('');
    setAmountPaid('');
    setChangeDue(null);
  };

  // 👇 RESET DISCOUNT ON CANCEL
  const closeCheckout = () => {
    setIsCheckoutOpen(false);
    setCheckoutStep('payment');
    setCompletedOrder(null);
    setDiscount({ type: null, value: 0 }); // 👈 Fix: Clears discount when cancelled
  };

  {/* 🆕 ADD NOTE MODAL */ }
  {
    isNoteModalOpen && (
      <div className="modal-overlay">
        <div className="modal-content" style={{ width: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>📝 Add Note</h3>
            <button onClick={() => setIsNoteModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#aaa', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
          </div>

          <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '10px' }}>
            Adding note for: <strong style={{ color: 'white' }}>{noteItem?.name}</strong>
          </p>

          <form onSubmit={handleSaveNote}>
            <input
              type="text"
              autoFocus
              placeholder="e.g. No Salt, Extra Lime, Allergy..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              style={{
                width: '100%', padding: '12px', borderRadius: '5px',
                border: '1px solid #555', background: '#333', color: 'white',
                boxSizing: 'border-box', marginBottom: '20px', fontSize: '1.1rem'
              }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                style={{ flex: 1, padding: '12px', background: '#444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ flex: 1, padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Save Note
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  const finalizeSale = async () => {
    if (isBusy) return;
    setIsBusy(true);

    try {
      const orderData = {
        items: [...cart],
        total: total.toFixed(2),
        tip: tipAmount.toFixed(2),
        discount: discountAmount.toFixed(2), // 👈 Save Discount Value
        method: paymentMethod,
        employee_name: user ? user.name : 'Unknown', // 👈 Pass Name
        date: new Date().toISOString()
      };

      await saveSale(orderData);
      if (activeTabId) await closeTab();
      await refreshInventory();

      setCompletedOrder(orderData);
      setCart([]);
      setCustomerName('');
      setActiveTabId(null);
      setDiscount({ type: null, value: 0 }); // Reset discount

      setCheckoutStep('success');
      notify("Sale Processed Successfully!");
    } catch (e) {
      notify("Error processing sale", "error");
    } finally {
      setIsBusy(false);
    }
  };

  const processCash = () => {
    const paid = parseFloat(amountPaid);
    if (isNaN(paid) || paid < grandTotal) return notify("Not enough cash!", "error");
    setChangeDue(paid - grandTotal);
  };

  const processCard = () => {
    if (isBusy) return;
    setIsBusy(true);
    setTimeout(() => {
      setIsBusy(false);
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
        body, html { overflow: hidden; height: 100%; margin: 0; padding: 0; }
        .pos-container { display: flex; flex-direction: column; height: 100vh; height: 100dvh; padding: 10px; box-sizing: border-box; background-color: #1a1a1a; }
        .pos-content-wrapper { display: flex; gap: 15px; flex: 1; overflow: hidden; }
        .ticket-panel { width: 35%; display: flex; flex-direction: column; background: #2a2a2a; padding: 15px; border-radius: 8px; height: 100%; overflow: hidden; }
        .menu-panel { width: 65%; display: flex; flex-direction: column; height: 100%; overflow: hidden; }
        .menu-grid { flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 15px; padding-bottom: 20px; align-content: start; }
        .cart-list-container { flex: 1; overflow-y: auto; margin-bottom: 10px; }
        
        /* Disabled Button Style */
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed !important;
          filter: grayscale(0.5);
        }

        /* Dots Animation */
        @keyframes dots {
          0%, 20% { content: "."; }
          40% { content: ".."; }
          60%, 100% { content: "..."; }
        }
        .animated-dots::after {
          content: ".";
          animation: dots 1.5s steps(1, end) infinite;
          display: inline-block;
          width: 0px; 
          text-align: left;
        }
      `}</style>

      <TopBar
        title="Point of Sale"
        onLogout={onLogout}
        user={user}
        customAction={
          onNavigateToDashboard && (
            <button
              className="btn-primary"
              onClick={onNavigateToDashboard}
              disabled={isBusy}
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
              <button
                disabled={isBusy}
                onClick={() => { setCart([]); setCustomerName(''); setActiveTabId(null); setDiscount({ type: null, value: 0 }); }}
                style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                New Order ↺
              </button>
              <button
                disabled={isBusy}
                onClick={handleOpenTabList}
                style={{ background: '#6c757d', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
              >
                Tabs 📂
              </button>
            </div>
          </div>

          <div className="cart-list-container">
            {cart.map((item, index) => (
              <div
                key={`${item.id}-${item.tab_id ? 'saved' : 'new'}-${index}`}
                className="cart-item"
                onClick={() => handleRemoveRequest(item)}
                style={{
                  borderLeft: item.isHappyHour ? '4px solid #e040fb' : 'none', // 👈 VISUAL INDICATOR
                  paddingLeft: item.isHappyHour ? '10px' : '0',
                  pointerEvents: isBusy ? 'none' : 'auto'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>
                    {item.name}
                    {item.isHappyHour && <span style={{ fontSize: '0.7rem', background: '#e040fb', color: 'white', padding: '2px 4px', borderRadius: '4px', marginLeft: '5px' }}>HH</span>}
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
            {/* SUBTOTAL & DISCOUNT ROW */}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ccc', fontSize: '0.9rem', marginBottom: '5px' }}>
              <span>Subtotal:</span>
              <span>${rawSubtotal.toFixed(2)}</span>
            </div>

            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ffc107', fontSize: '0.9rem', marginBottom: '5px' }}>
                <span>Discount {discount.type === 'percent' ? `(${discount.value}%)` : ''}:</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ccc', fontSize: '0.9rem', marginBottom: '5px' }}>
              <span>Tax (7%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1 style={{ fontSize: '2rem', margin: '0', textAlign: 'right' }}>${total.toFixed(2)}</h1>

              {/* 👇 Only show Discount Button if authorized */}
              {canApplyDiscount && (
                <button
                  onClick={() => setIsDiscountModalOpen(true)}
                  style={{
                    background: 'transparent', border: '1px solid #ffc107', color: '#ffc107',
                    borderRadius: '20px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.8rem'
                  }}
                >
                  🏷️ Discount
                </button>
              )}
            </div>

            <input type="text" placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', marginTop: '10px', borderRadius: '5px', border: '1px solid #555', background: '#333', color: 'white', boxSizing: 'border-box' }} />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                disabled={isBusy}
                onClick={saveToTab}
                style={{ flex: 1, padding: '12px', fontSize: '1.1rem', fontWeight: 'bold', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}
              >
                {isBusy ? <span className="animated-dots">SAVING</span> : 'SAVE TAB'}
              </button>
              <button
                disabled={isBusy}
                onClick={handlePayClick}
                style={{ flex: 1, padding: '12px', fontSize: '1.1rem', fontWeight: 'bold', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
              >
                PAY NOW
              </button>
            </div>
          </div>
        </div>

        <div className="menu-panel">
          {/* 🔍 SEARCH BAR & RECIPE BUTTON CONTAINER */}
          <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="🔍 Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1, // Takes up remaining space
                padding: '15px',
                fontSize: '1.2rem',
                borderRadius: '8px',
                border: '1px solid #555',
                background: '#2a2a2a',
                color: 'white'
              }}
            />

            {/* 🆕 NEW RECIPE BUTTON */}
            <button
              onClick={() => { setRecipeSearchTerm(''); setIsRecipeModalOpen(true); }}
              style={{
                padding: '0 20px',
                background: '#6f42c1', // Purple color to distinguish it
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Open Recipe Database"
            >
              📖
            </button>
          </div>
          {!searchTerm && (
            <div className="tabs">
              {['all', 'beer', 'seltzer', 'liquor'].map(cat => (
                <button key={cat} className={`tab-btn ${filter === cat ? 'active' : ''}`} onClick={() => setFilter(cat)}>{cat.toUpperCase()}</button>
              ))}
            </div>
          )}

          <div className="menu-grid">
            {/* 🆕 CUSTOM ITEM BUTTON */}
            <div
              className="product-card"
              onClick={() => setIsCustomItemModalOpen(true)}
              style={{
                border: '2px dashed #777', // Dashed border to make it stand out
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: '#222'
              }}
            >
              <div style={{ textAlign: 'center', opacity: 0.8 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '5px' }}>➕</div>
                <h3 style={{ margin: 0, color: '#ccc' }}>Custom Item</h3>
              </div>
            </div>
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
                    cursor: (isSoldOut || isBusy) ? 'not-allowed' : 'pointer',
                    position: 'relative',
                    border: isSoldOut ? '1px solid #444' : '1px solid #555',
                    overflow: 'hidden',
                    opacity: isBusy ? 0.6 : 1
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
                <div
                  key={tab.id}
                  onClick={() => !isBusy && loadTab(tab)}
                  style={{
                    padding: '15px', borderBottom: '1px solid #444',
                    cursor: isBusy ? 'not-allowed' : 'pointer',
                    display: 'flex', justifyContent: 'space-between',
                    opacity: isBusy ? 0.5 : 1
                  }}
                >
                  <span style={{ fontWeight: 'bold' }}>{tab.customer_name}</span><span style={{ color: '#888' }}>#{tab.id}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowTabList(false)} style={{ width: '100%', padding: '10px', background: '#666', border: 'none', color: 'white' }}>Close</button>
          </div>
        </div>
      )}

      {/* 👇 DISCOUNT MODAL */}
      {isDiscountModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px', textAlign: 'center' }}>
            <h2>Apply Discount</h2>
            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Current Subtotal: ${rawSubtotal.toFixed(2)}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '20px 0' }}>
              <button onClick={() => { setDiscount({ type: 'percent', value: 10 }); setIsDiscountModalOpen(false); }} style={{ padding: '15px', background: '#333', border: '1px solid #555', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem' }}>10% Off</button>
              <button onClick={() => { setDiscount({ type: 'percent', value: 25 }); setIsDiscountModalOpen(false); }} style={{ padding: '15px', background: '#333', border: '1px solid #555', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem' }}>25% Off</button>
              <button onClick={() => { setDiscount({ type: 'percent', value: 50 }); setIsDiscountModalOpen(false); }} style={{ padding: '15px', background: '#333', border: '1px solid #555', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem' }}>50% Off</button>
              <button onClick={() => { setDiscount({ type: 'percent', value: 100 }); setIsDiscountModalOpen(false); }} style={{ padding: '15px', background: '#d9534f', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}>COMP (100%)</button>
            </div>

            <div style={{ borderTop: '1px solid #444', paddingTop: '15px', marginTop: '10px' }}>
              <p style={{ margin: '0 0 10px 0' }}>Custom Amount ($)</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="number"
                  placeholder="0.00"
                  style={{ flex: 1, padding: '10px', background: '#222', border: '1px solid #555', color: 'white', borderRadius: '5px' }}
                  onChange={(e) => setDiscount({ type: 'amount', value: parseFloat(e.target.value) || 0 })}
                />
                <button onClick={() => setIsDiscountModalOpen(false)} style={{ padding: '10px 20px', background: '#28a745', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Apply</button>
              </div>
            </div>

            <button onClick={() => { setDiscount({ type: null, value: 0 }); setIsDiscountModalOpen(false); }} style={{ marginTop: '20px', width: '100%', padding: '10px', background: 'transparent', border: '1px solid #666', color: '#ccc', borderRadius: '5px', cursor: 'pointer' }}>Remove Discount</button>
          </div>
        </div>
      )}

      <VoidModal
        isOpen={isVoidModalOpen}
        onClose={() => !isBusy && setIsVoidModalOpen(false)}
        onConfirm={handleConfirmVoid}
      />

      {/* 🆕 ADD THIS COMPONENT */}
      <RecipeModal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        productName={recipeSearchTerm}
      />

      {/* 🆕 CUSTOM ITEM MODAL */}
      {isCustomItemModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '350px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>➕ Custom Item</h2>
              <button onClick={() => setIsCustomItemModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#aaa', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleCustomItemSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', color: '#aaa', marginBottom: '5px', fontSize: '0.9rem' }}>Item Description</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Corkage Fee, Open Food"
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #555', background: '#333', color: 'white', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', color: '#aaa', marginBottom: '5px', fontSize: '0.9rem' }}>Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={customItemPrice}
                  onChange={(e) => setCustomItemPrice(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #555', background: '#333', color: 'white', fontSize: '1.2rem', fontWeight: 'bold', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                style={{ width: '100%', padding: '15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Add to Order
              </button>
            </form>
          </div>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '500px', textAlign: 'center' }}>

            {checkoutStep === 'payment' && (
              <>
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
                      <button disabled={isBusy} className="pay-btn-large" style={{ background: '#007bff' }} onClick={() => setPaymentMethod('cash')}>CASH</button>
                      <button disabled={isBusy} className="pay-btn-large" style={{ background: '#6610f2' }} onClick={() => setPaymentMethod('card')}>CARD</button>
                    </div>
                  </div>
                )}
                {paymentMethod === 'cash' && !changeDue && (
                  <div>
                    <h3>Amount Received</h3>
                    <input type="number" className="input-field" autoFocus value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
                    <button disabled={isBusy} className="pay-btn-large" onClick={processCash}>CALCULATE CHANGE</button>
                  </div>
                )}
                {changeDue !== null && (
                  <div>
                    <h3 style={{ color: 'lime', fontSize: '2rem' }}>Change: ${changeDue.toFixed(2)}</h3>
                    <button disabled={isBusy} className="pay-btn-large" style={{ display: 'flex', justifyContent: 'center' }} onClick={finalizeSale}>
                      {isBusy ? <span className="animated-dots">PROCESSING</span> : 'FINISH SALE'}
                    </button>
                  </div>
                )}
                {paymentMethod === 'card' && (
                  <div>
                    <h3>{isBusy ? <span className="animated-dots">Processing Payment</span> : `Charge $${grandTotal.toFixed(2)}`}</h3>
                    <button disabled={isBusy} className="pay-btn-large" style={{ display: 'flex', justifyContent: 'center' }} onClick={processCard}>
                      {isBusy ? <span className="animated-dots"></span> : 'Simulate Swipe'}
                    </button>
                  </div>
                )}
                <button disabled={isBusy} onClick={closeCheckout} style={{ marginTop: '20px', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', textDecoration: 'underline' }}>Cancel Transaction</button>
              </>
            )}

            {/* CHECKOUT STEP 2: SUCCESS SCREEN */}
            {checkoutStep === 'success' && (
              <div style={{ padding: '20px' }}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✅</div>
                <h2 style={{ color: '#28a745', fontSize: '2rem', marginTop: 0 }}>Payment Successful!</h2>
                <p style={{ color: '#ccc', fontSize: '1.2rem' }}>Order has been completed.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '30px' }}>
                  <button
                    onClick={() => printReceipt(completedOrder)}
                    style={{
                      padding: '15px', fontSize: '1.2rem', fontWeight: 'bold',
                      background: '#fff', color: '#000', border: 'none', borderRadius: '5px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                    }}
                  >
                    <span>🖨️</span> Print Receipt
                  </button>

                  <button
                    onClick={closeCheckout}
                    style={{
                      padding: '15px', fontSize: '1.2rem', fontWeight: 'bold',
                      background: '#007bff', color: '#white', border: 'none', borderRadius: '5px', cursor: 'pointer'
                    }}
                  >
                    Start New Order
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default PointOfSale;