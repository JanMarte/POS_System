// src/components/PointOfSale.jsx
import React, { useState, useEffect } from 'react';
import { getInventory, saveSale, deductStock, getHappyHours, getUsers } from '../data/repository';
import { supabase } from '../supabaseClient';
import Notification from './Notification';
import VoidModal from './VoidModal';
import { voidItem } from '../services/tabService';
import TopBar from './TopBar';
import { printReceipt } from '../utils/receiptService';
import RecipeModal from './RecipeModal';

const PointOfSale = ({ onLogout, onNavigateToDashboard, user }) => {

  // =========================================
  // 1. DATA & INVENTORY STATE
  // =========================================
  const [inventory, setInventory] = useState([]);
  const [happyHours, setHappyHours] = useState([]);
  const [cart, setCart] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  // =========================================
  // 2. MODAL & UI STATE
  // =========================================
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteItem, setNoteItem] = useState(null);
  const [noteText, setNoteText] = useState('');

  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [recipeSearchTerm, setRecipeSearchTerm] = useState('');

  const [discount, setDiscount] = useState({ type: null, value: 0 });
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);

  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');

  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [itemToVoid, setItemToVoid] = useState(null);

  const [notification, setNotification] = useState({ message: '', type: '' });
  const notify = (message, type = 'success') => setNotification({ message, type });

  // =========================================
  // 3. TAB & CHECKOUT STATE
  // =========================================
  const [customerName, setCustomerName] = useState('');
  const [activeTabId, setActiveTabId] = useState(null);
  const [showTabList, setShowTabList] = useState(false);
  const [openTabs, setOpenTabs] = useState([]);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('payment');
  const [completedOrder, setCompletedOrder] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [changeDue, setChangeDue] = useState(null);
  const [tipAmount, setTipAmount] = useState(0);

  const canApplyDiscount = user && (user.role === 'admin' || user.role === 'manager' || user.can_discount === true);

  // =========================================
  // 4. INITIALIZATION & HELPERS
  // =========================================

  // Helper: Generates a unique ID for every item instance
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  useEffect(() => {
    const loadData = async () => {
      setInventory(await getInventory());
      setHappyHours(await getHappyHours());
    };
    loadData();
  }, []);

  const refreshInventory = async () => {
    setInventory(await getInventory());
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'beer': return '🍺';
      case 'liquor': return '🥃';
      case 'seltzer': return '🌊';
      case 'pop': return '🥤';
      default: return '🍽️';
    }
  };

  // =========================================
  // 📍 PIN VALIDATION LOGIC (FIXED)
  // =========================================

  /**
   * Helper to hash the input PIN using SHA-256 to match the database.
   */
  const hashPin = async (pin) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleValidateManager = async (inputPin) => {
    try {
      const users = await getUsers();

      // 1. Generate the hash of what the user just typed
      const hashedInput = await hashPin(inputPin);

      // 2. Find if this PIN belongs to an Admin or Manager
      const validManager = users.find(u => {
        // Check if stored PIN matches the Hashed Input OR (fallback) Plain Text
        const isMatch = (u.pin === hashedInput) || (String(u.pin) === String(inputPin));
        const isRoleValid = (u.role === 'admin' || u.role === 'manager');

        return isMatch && isRoleValid;
      });

      return !!validManager;
    } catch (error) {
      console.error("PIN Check Error:", error);
      return false;
    }
  };

  // =========================================
  // 5. CORE BUSINESS LOGIC
  // =========================================

  const checkHappyHour = (item) => {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return happyHours.find(r => {
      if (!r.days.includes(currentDay)) return false;
      if (r.category !== 'all' && r.category !== item.category) return false;
      const [startH, startM] = r.start_time.split(':').map(Number);
      const [endH, endM] = r.end_time.split(':').map(Number);
      return currentMinutes >= (startH * 60 + startM) && currentMinutes < (endH * 60 + endM);
    });
  };

  const addToCart = (product) => {
    const rule = checkHappyHour(product);
    let finalPrice = product.price;
    let isHappyHour = false;

    if (rule) {
      finalPrice = Math.max(0, product.price - rule.discount_amount);
      isHappyHour = true;
    }

    setCart(prevCart => {
      const existing = prevCart.find(item =>
        item.id === product.id &&
        !item.tab_id &&
        item.price === finalPrice &&
        !item.note
      );

      if (existing) {
        return prevCart.map(item => (item === existing)
          ? { ...item, quantity: (item.quantity || 1) + 1 }
          : item
        );
      } else {
        const newItem = {
          ...product,
          uniqueId: generateId(),
          price: finalPrice,
          quantity: 1,
          isHappyHour,
          note: ''
        };
        if (isHappyHour) notify(`Happy Hour! ${rule.name} applied.`);
        return [...prevCart, newItem];
      }
    });
  };

  const handleItemClick = (item) => {
    if (isBusy) return;
    const cartItem = cart.find(c => c.id === item.id && !c.tab_id);
    const quantityInCart = cartItem ? cartItem.quantity : 0;
    const isTracked = item.stock_count !== null;
    const effectiveStock = isTracked ? (item.stock_count - quantityInCart) : 9999;

    if (!item.is_available || (isTracked && effectiveStock <= 0)) {
      notify("No more stock available!", "error");
    } else {
      addToCart(item);
    }
  };

  const handleCustomItemSubmit = (e) => {
    e.preventDefault();
    const price = parseFloat(customItemPrice);
    if (!customItemName || isNaN(price) || price < 0) return notify("Invalid entry", "error");

    addToCart({
      id: `custom-${generateId()}`,
      name: customItemName,
      price: price,
      category: 'custom',
      stock_count: null,
      is_available: true
    });
    setCustomItemName('');
    setCustomItemPrice('');
    setIsCustomItemModalOpen(false);
  };

  // =========================================
  // 6. CART MANAGEMENT (Notes & Removal)
  // =========================================

  const handleOpenNoteModal = (targetItem) => {
    setNoteItem(targetItem);
    setNoteText(targetItem.note || '');
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = (e) => {
    e.preventDefault();
    setCart(prev => prev.map(item => item === noteItem ? { ...item, note: noteText } : item));
    setIsNoteModalOpen(false);
    setNoteItem(null);
  };

  const handleRemoveRequest = (item) => {
    if (isBusy) return;

    if (item.tab_id) {
      setItemToVoid(item);
      setIsVoidModalOpen(true);
    } else {
      setCart(prev => {
        if (item.quantity > 1) {
          return prev.map(i => i.uniqueId === item.uniqueId ? { ...i, quantity: i.quantity - 1 } : i);
        }
        return prev.filter(i => i.uniqueId !== item.uniqueId);
      });
    }
  };

  const handleConfirmVoid = async (voidId, reason) => {
    if (!itemToVoid || isBusy) return;
    setIsBusy(true);

    try {
      const targetRowId = itemToVoid.db_ids && itemToVoid.db_ids.length > 0
        ? itemToVoid.db_ids[itemToVoid.db_ids.length - 1]
        : itemToVoid.id;

      await voidItem(targetRowId, reason);

      await saveSale({
        items: [{ ...itemToVoid, quantity: 1 }],
        total: 0.00, tip: 0.00, method: reason,
        employee_name: user ? user.name : 'Unknown'
      });

      setCart(prev => {
        const currentItem = prev.find(i => i.uniqueId === itemToVoid.uniqueId);

        if (currentItem && currentItem.quantity > 1) {
          const newDbIds = [...currentItem.db_ids];
          newDbIds.pop();
          return prev.map(i => i.uniqueId === itemToVoid.uniqueId ? { ...i, quantity: i.quantity - 1, db_ids: newDbIds } : i);
        } else {
          return prev.filter(i => i.uniqueId !== itemToVoid.uniqueId);
        }
      });

      notify(`Item voided (${reason})`, "info");
      if (reason === 'entry_error') refreshInventory();

    } catch (error) {
      console.error(error);
      notify("Failed to void item", "error");
    } finally {
      setIsBusy(false);
      setIsVoidModalOpen(false);
      setItemToVoid(null);
    }
  };

  // =========================================
  // 7. FINANCIAL CALCULATIONS
  // =========================================
  const calculateTotals = () => {
    const rawSubtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    let discountAmount = 0;
    if (discount.type === 'percent') discountAmount = rawSubtotal * (discount.value / 100);
    else if (discount.type === 'amount') discountAmount = discount.value;
    if (discountAmount > rawSubtotal) discountAmount = rawSubtotal;
    const taxableSubtotal = rawSubtotal - discountAmount;
    const tax = taxableSubtotal * 0.07;
    const total = taxableSubtotal + tax;
    return { rawSubtotal, discountAmount, tax, total };
  };

  const { rawSubtotal, discountAmount, tax, total } = calculateTotals();
  const grandTotal = total + tipAmount;

  // =========================================
  // 8. TAB SYSTEM (Save/Load)
  // =========================================

  const fetchOpenTabs = async () => {
    const { data, error } = await supabase.from('tabs').select('*').eq('status', 'open').order('created_at', { ascending: false });
    if (!error) setOpenTabs(data);
  };

  const handleOpenTabList = () => { fetchOpenTabs(); setShowTabList(true); };

  const loadTab = async (tab) => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const { data: items } = await supabase.from('tab_items').select('*').eq('tab_id', tab.id).eq('status', 'active');

      const groupedCart = (items || []).reduce((acc, dbItem) => {
        const existingItem = acc.find(i =>
          i.inventory_id === dbItem.inventory_id &&
          i.price === dbItem.price &&
          (i.note || '') === (dbItem.note || '')
        );

        if (existingItem) {
          existingItem.quantity += dbItem.quantity;
          existingItem.db_ids.push(dbItem.id);
        } else {
          acc.push({
            ...dbItem,
            id: dbItem.inventory_id,
            uniqueId: generateId(),
            quantity: dbItem.quantity,
            alreadyDeducted: true,
            db_ids: [dbItem.id],
            note: dbItem.note || ''
          });
        }
        return acc;
      }, []);

      setCart(groupedCart);
      setCustomerName(tab.customer_name);
      setActiveTabId(tab.id);
      setDiscount({ type: null, value: 0 });
      setShowTabList(false);
      notify(`Tab loaded: ${tab.customer_name}`);
    } catch (e) { notify("Failed to load tab", "error"); } finally { setIsBusy(false); }
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
      const existingItems = cart.filter(item => item.alreadyDeducted && item.db_ids && item.db_ids.length > 0);

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
              status: 'active',
              note: item.note || null
            });
          }
        });
        await supabase.from('tab_items').insert(itemsToInsert);
      }

      for (const item of existingItems) {
        await supabase.from('tab_items').update({ note: item.note || null }).in('id', item.db_ids);
      }

      await refreshInventory();
      notify(`Tab saved for ${name}!`);
      setCart([]); setCustomerName(''); setActiveTabId(null); setDiscount({ type: null, value: 0 });
    } catch (err) { notify("Error saving tab", "error"); } finally { setIsBusy(false); }
  };

  const closeTab = async () => {
    if (activeTabId) await supabase.from('tabs').update({ status: 'paid' }).eq('id', activeTabId);
  };

  // =========================================
  // 9. CHECKOUT & PAYMENT
  // =========================================

  const handlePayClick = () => {
    if (cart.length === 0) return notify("Cart is empty!", "error");
    setTipAmount(0);
    setCheckoutStep('payment');
    setIsCheckoutOpen(true);
    setPaymentMethod('');
    setAmountPaid('');
    setChangeDue(null);
  };

  const closeCheckout = () => {
    setIsCheckoutOpen(false);
    setCheckoutStep('payment');
    setCompletedOrder(null);
    setDiscount({ type: null, value: 0 });
  };

  const processCash = () => {
    const paid = parseFloat(amountPaid);
    if (isNaN(paid) || paid < grandTotal) return notify("Not enough cash!", "error");
    setChangeDue(paid - grandTotal);
  };

  const processCard = () => {
    if (isBusy) return;
    setIsBusy(true);
    setTimeout(() => { setIsBusy(false); finalizeSale(); }, 2000);
  };

  const finalizeSale = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const orderData = {
        items: [...cart],
        total: total.toFixed(2),
        tip: tipAmount.toFixed(2),
        discount: discountAmount.toFixed(2),
        method: paymentMethod,
        employee_name: user ? user.name : 'Unknown',
        date: new Date().toISOString()
      };

      await saveSale(orderData);
      if (activeTabId) await closeTab();
      await refreshInventory();

      setCompletedOrder(orderData);
      setCart([]); setCustomerName(''); setActiveTabId(null); setDiscount({ type: null, value: 0 });
      setCheckoutStep('success');
      notify("Sale Processed Successfully!");
    } catch (e) { notify("Error processing sale", "error"); } finally { setIsBusy(false); }
  };

  const displayedItems = searchTerm
    ? inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : (filter === 'all' ? inventory : inventory.filter(i => i.category === filter));

  return (
    <div className="pos-container">
      <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />

      <TopBar
        title="Point of Sale"
        onLogout={onLogout}
        user={user}
        customAction={
          onNavigateToDashboard && (
            <button className="btn-dashboard" onClick={onNavigateToDashboard} disabled={isBusy}>
              DASHBOARD ❯
            </button>
          )
        }
      />

      <div className="pos-content-wrapper">
        {/* LEFT PANEL: TICKET */}
        <div className="ticket-panel glass-panel">
          <div className="ticket-header">
            <h2 className="ticket-title">{activeTabId ? `Tab #${activeTabId}` : 'New Order'}</h2>
            <div className="ticket-toolbar">
              <button className="btn-glass btn-danger btn-toolbar-sm" disabled={isBusy} onClick={() => { setCart([]); setCustomerName(''); setActiveTabId(null); setDiscount({ type: null, value: 0 }); }}>
                New Order ↺
              </button>
              <button className="btn-glass btn-secondary btn-toolbar-sm" disabled={isBusy} onClick={handleOpenTabList}>
                Tabs 📂
              </button>
            </div>
          </div>

          <div className="cart-list-container">
            {cart.map((item, index) => (
              <div key={`${item.uniqueId}-${index}`} className={`cart-item glass-item cart-item-container ${item.isHappyHour ? 'happy-hour' : ''}`}>
                <div className="cart-item-top">
                  <div className="cart-item-left">
                    <button onClick={(e) => { e.stopPropagation(); handleOpenNoteModal(item); }} className="glass-item btn-icon-sm">✏️</button>
                    <span className="font-bold">
                      {item.name}
                      {item.isHappyHour && <span className="tag-hh">HH</span>}
                      {item.tab_id && <span className="tag-saved">SAVED</span>}
                      {item.quantity > 1 && <span className="tag-qty">x{item.quantity}</span>}
                    </span>
                  </div>
                  <div className="cart-item-right">
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                    <span onClick={() => handleRemoveRequest(item)} className="btn-remove-item">✕</span>
                  </div>
                </div>
                {item.note && <div className="item-note-text">Note: {item.note}</div>}
              </div>
            ))}
          </div>

          <div className="ticket-totals">
            <div className="totals-row"><span>Subtotal:</span><span>${rawSubtotal.toFixed(2)}</span></div>
            {discountAmount > 0 && <div className="totals-row discount"><span>Discount {discount.type === 'percent' ? `(${discount.value}%)` : ''}:</span><span>-${discountAmount.toFixed(2)}</span></div>}
            <div className="totals-row"><span>Tax (7%):</span><span>${tax.toFixed(2)}</span></div>
            <div className="grand-total-row">
              <h1 className="grand-total-price">${total.toFixed(2)}</h1>
              {canApplyDiscount && <button onClick={() => setIsDiscountModalOpen(true)} className="glass-item btn-pill-gold">🏷️ Discount</button>}
            </div>

            <input type="text" placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="input-glass input-customer" />

            <div className="ticket-actions">
              <button className="btn-glass btn-save" disabled={isBusy} onClick={saveToTab}>{isBusy ? <span className="animated-dots">SAVING</span> : 'SAVE TAB'}</button>
              <button className="btn-glass btn-pay" disabled={isBusy} onClick={handlePayClick}>PAY NOW</button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: MENU */}
        <div className="menu-panel glass-panel">
          <div className="menu-search-container">
            <input type="text" placeholder="🔍 Search items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-glass input-search" />
            <button onClick={() => { setRecipeSearchTerm(''); setIsRecipeModalOpen(true); }} className="glass-item btn-recipe">📖</button>
          </div>

          {!searchTerm && (
            <div className="category-tabs">
              {['all', 'beer', 'seltzer', 'liquor', 'pop'].map(cat => (
                <button key={cat} onClick={() => setFilter(cat)} className={`btn-category ${filter === cat ? 'active' : ''}`}>{cat.toUpperCase()}</button>
              ))}
            </div>
          )}

          <div className="menu-grid">
            <div className="product-card glass-item card-custom-add" onClick={() => setIsCustomItemModalOpen(true)}>
              <div className="custom-add-content"><div className="custom-icon-lg">➕</div><h3 className="custom-text-muted">Custom</h3></div>
            </div>

            {displayedItems.map(item => {
              const cartItem = cart.find(c => c.id === item.id && !c.tab_id);
              const quantityInCart = cartItem ? cartItem.quantity : 0;
              const isTracked = item.stock_count !== null;
              const effectiveStock = isTracked ? (item.stock_count - quantityInCart) : null;
              const isSoldOut = !item.is_available || (isTracked && effectiveStock <= 0);

              return (
                <div key={item.id} className={`product-card glass-item product-card-container ${isSoldOut ? 'disabled sold-out-bg' : ''} ${isBusy ? 'opacity-50' : ''}`} onClick={() => handleItemClick(item)}>
                  {isSoldOut && <div className="ribbon sold-out">SOLD OUT</div>}
                  {!isSoldOut && isTracked && effectiveStock < 10 && <div className="ribbon stock-left">{effectiveStock} LEFT</div>}
                  <div className={`product-content ${isSoldOut ? 'dimmed' : ''}`}>
                    <div className="product-icon">{getCategoryIcon(item.category)}</div>
                    <h3 className="product-name">{item.name}</h3>
                    <div className={`product-price ${isSoldOut ? 'muted' : ''}`}>${item.price.toFixed(2)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ======================= MODALS ======================= */}

      {/* Tabs List */}
      {showTabList && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
            <h2 className="modal-title-nospace">Open Tabs</h2>
            <div className="tab-list-container">
              {openTabs.length === 0 ? <p className="text-center-muted">No open tabs.</p> : openTabs.map(tab => (
                <div key={tab.id} onClick={() => !isBusy && loadTab(tab)} className={`glass-item tab-list-item ${isBusy ? 'busy' : ''}`}>
                  <span className="font-bold">{tab.customer_name}</span><span style={{ color: 'var(--text-muted)' }}>#{tab.id}</span>
                </div>
              ))}
            </div>
            <button className="btn-glass btn-secondary w-100" onClick={() => setShowTabList(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {isDiscountModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content modal-width-sm">
            <div className="modal-header">
              <h2 className="no-margin">🏷️ Apply Discount</h2>
              <button onClick={() => setIsDiscountModalOpen(false)} className="modal-close-btn">&times;</button>
            </div>
            <p className="discount-subtitle">Current Subtotal: <strong style={{ color: 'var(--text-color)' }}>${rawSubtotal.toFixed(2)}</strong></p>
            <div className="discount-grid">
              <button onClick={() => { setDiscount({ type: 'percent', value: 10 }); setIsDiscountModalOpen(false); }} className="glass-item btn-discount-option">10% Off</button>
              <button onClick={() => { setDiscount({ type: 'percent', value: 25 }); setIsDiscountModalOpen(false); }} className="glass-item btn-discount-option">25% Off</button>
              <button onClick={() => { setDiscount({ type: 'percent', value: 50 }); setIsDiscountModalOpen(false); }} className="glass-item btn-discount-option">50% Off</button>
              <button onClick={() => { setDiscount({ type: 'percent', value: 100 }); setIsDiscountModalOpen(false); }} className="glass-item btn-discount-option btn-comp">COMP (100%)</button>
            </div>
            <div className="discount-custom-section">
              <label>Custom Amount ($)</label>
              <div className="discount-input-row">
                <input type="number" placeholder="0.00" className="input-glass flex-1" onChange={(e) => setDiscount({ type: 'amount', value: parseFloat(e.target.value) || 0 })} />
                <button onClick={() => setIsDiscountModalOpen(false)} className="btn-glass btn-pay flex-half">Apply</button>
              </div>
            </div>
            <button onClick={() => { setDiscount({ type: null, value: 0 }); setIsDiscountModalOpen(false); }} className="btn-glass btn-secondary btn-remove-discount">Remove Discount</button>
          </div>
        </div>
      )}

      {/* Void Modal */}
      <VoidModal
        isOpen={isVoidModalOpen}
        onClose={() => !isBusy && setIsVoidModalOpen(false)}
        onConfirm={handleConfirmVoid}
        onValidatePin={handleValidateManager} // 👈 Added this for PIN validation
        item={itemToVoid}
      />

      <RecipeModal isOpen={isRecipeModalOpen} onClose={() => setIsRecipeModalOpen(false)} initialSearch={recipeSearchTerm} />

      {/* Custom Item Modal */}
      {isCustomItemModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
            <div className="modal-header"><h2 className="no-margin">➕ Custom Item</h2><button onClick={() => setIsCustomItemModalOpen(false)} className="modal-close-btn">&times;</button></div>
            <form onSubmit={handleCustomItemSubmit}>
              <div className="mb-15"><label>Item Description</label><input type="text" autoFocus value={customItemName} onChange={(e) => setCustomItemName(e.target.value)} className="input-glass w-100" /></div>
              <div className="mb-20"><label>Price ($)</label><input type="number" step="0.01" value={customItemPrice} onChange={(e) => setCustomItemPrice(e.target.value)} className="input-glass w-100" /></div>
              <button type="submit" className="btn-glass btn-pay w-100">Add to Order</button>
            </form>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {isNoteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
            <div className="modal-header"><h3 className="no-margin">📝 Add Note</h3><button onClick={() => setIsNoteModalOpen(false)} className="modal-close-btn">&times;</button></div>
            <p className="mb-10 text-muted-center">Adding note for: <strong>{noteItem?.name}</strong></p>
            <form onSubmit={handleSaveNote}>
              <input type="text" autoFocus value={noteText} onChange={(e) => setNoteText(e.target.value)} className="input-glass w-100 mb-20" />
              <div className="flex gap-10">
                <button type="button" onClick={() => setIsNoteModalOpen(false)} className="btn-glass btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-glass flex-1" style={{ background: 'var(--accent-blue)' }}>Save Note</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '500px', textAlign: 'center' }}>
            {checkoutStep === 'payment' && (
              <>
                <div className="checkout-summary">
                  <div className="checkout-bill-row">Bill: ${total.toFixed(2)}</div>
                  {tipAmount > 0 && <div className="checkout-tip-row">+ Tip: ${tipAmount.toFixed(2)}</div>}
                  <h1 className="checkout-total">${grandTotal.toFixed(2)}</h1>
                </div>

                {!paymentMethod && (
                  <div className="mb-20">
                    <h3 className="text-muted text-center mb-10">Add Tip?</h3>
                    <div className="tip-grid">
                      {[0.15, 0.20, 0.25].map(pct => (
                        <button key={pct} onClick={() => setTipAmount(total * pct)} className={`option-btn-large ${tipAmount === total * pct ? 'active' : ''}`}>
                          {pct * 100}% <span className="text-sm text-muted" style={{ color: 'inherit' }}>${(total * pct).toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-10">
                      <button onClick={() => setTipAmount(0)} className="btn-glass btn-secondary flex-1">No Tip</button>
                      <input type="number" placeholder="Custom $" onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)} className="input-glass flex-1 text-center" />
                    </div>
                  </div>
                )}

                {!paymentMethod && (
                  <div>
                    <h3 className="text-muted text-center mb-10">Payment Method</h3>
                    <div className="flex gap-20">
                      <button disabled={isBusy} className="btn-glass btn-pay-cash" onClick={() => setPaymentMethod('cash')}>CASH</button>
                      <button disabled={isBusy} className="btn-glass btn-pay-card" onClick={() => setPaymentMethod('card')}>CARD</button>
                    </div>
                  </div>
                )}

                {paymentMethod === 'cash' && changeDue === null && (
                  <div>
                    <h3>Amount Received</h3>
                    <div className="cash-grid">
                      <button onClick={() => { setAmountPaid(grandTotal.toFixed(2)); setChangeDue(0); }} disabled={isBusy} className="option-btn-large btn-pay-exact">Exact</button>
                      {Array.from(new Set([...[5, 10, 20, 50, 100], Math.ceil(grandTotal / 10) * 10, Math.ceil(grandTotal / 20) * 20, Math.ceil(grandTotal / 50) * 50]))
                        .filter(amt => amt > grandTotal)
                        .sort((a, b) => a - b)
                        .slice(0, 5)
                        .map(amt => (
                          <button key={amt} onClick={() => { setAmountPaid(amt.toFixed(2)); setChangeDue(amt - grandTotal); }} disabled={isBusy} className="option-btn-large">${amt}</button>
                        ))}
                    </div>
                    <input type="number" className="input-glass w-100 mb-10 text-center" autoFocus value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="Enter custom amount..." onKeyDown={(e) => { if (e.key === 'Enter') processCash(); }} />
                    <button disabled={isBusy} className="btn-glass btn-pay btn-action-center" onClick={processCash}>CALCULATE CHANGE</button>
                  </div>
                )}

                {changeDue !== null && (
                  <div>
                    <h3 className="text-green" style={{ fontSize: '2.5rem' }}>Change: ${changeDue.toFixed(2)}</h3>
                    <button disabled={isBusy} className="btn-glass btn-pay btn-action-center" onClick={finalizeSale}>{isBusy ? <span className="animated-dots">PROCESSING</span> : 'FINISH SALE'}</button>
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div>
                    <h3>{isBusy ? <span className="animated-dots">Processing Payment</span> : `Charge $${grandTotal.toFixed(2)}`}</h3>
                    <button disabled={isBusy} className="btn-glass btn-pay btn-action-center" onClick={processCard}>{isBusy ? <span className="animated-dots"></span> : 'Simulate Swipe'}</button>
                  </div>
                )}

                <button disabled={isBusy} onClick={closeCheckout} className="btn-cancel-transaction">Cancel Transaction</button>
              </>
            )}

            {checkoutStep === 'success' && (
              <div className="success-container">
                <div className="success-icon">✅</div>
                <h2 className="success-title">Payment Successful!</h2>
                <p className="success-message">Order has been completed.</p>
                <div className="success-actions">
                  <button onClick={() => printReceipt(completedOrder)} className="btn-glass btn-receipt-print btn-success-action"><span>🖨️</span> Print Receipt</button>
                  <button onClick={closeCheckout} className="btn-glass btn-receipt-new btn-success-action">Start New Order ➔</button>
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