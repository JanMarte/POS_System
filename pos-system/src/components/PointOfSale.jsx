// src/components/PointOfSale.jsx
import React, { useState, useEffect } from 'react';
import { getInventory, saveSale } from '../data/repository';

const PointOfSale = () => {
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useState([]);
  const [filter, setFilter] = useState('all');

  // Helper to get icon based on category
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'beer': return '🍺';
      case 'liquor': return '🥃';
      case 'seltzer': return '🌊';
      case 'pop': return '🥤';
      default: return '🍽️';
    }
  };

  // CHECKOUT STATES
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(''); // 'cash' or 'card'
  const [amountPaid, setAmountPaid] = useState('');
  const [changeDue, setChangeDue] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Update useEffect
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

  // --- CHECKOUT LOGIC ---
  const handlePayClick = () => {
    if (cart.length === 0) return alert("Cart is empty");
    setIsCheckoutOpen(true);
    setPaymentMethod(''); // Reset
    setAmountPaid('');
    setChangeDue(null);
  };

  // 2. Update finalizeSale
  const finalizeSale = async () => { // Make this async
    const orderData = {
      items: cart,
      total: total.toFixed(2),
      method: paymentMethod
    };

    await saveSale(orderData); // Wait for database save

    // --- RECEIPT PRINTING LOGIC ---
    const receiptContent = `
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body { font-family: 'Courier New', monospace; width: 300px; font-size: 14px; }
            .center { text-align: center; }
            .line { border-bottom: 1px dashed #000; margin: 10px 0; }
            .item { display: flex; justify-content: space-between; }
            .total { font-weight: bold; font-size: 16px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="center">
            <h3>THE WEDDING BAR</h3>
            <p>Kirkwood Blvd, Cedar Rapids, IA</p>
            <p>${new Date().toLocaleString()}</p>
          </div>
          <div class="line"></div>
          
          ${cart.map(item => `
            <div class="item">
              <span>${item.name}</span>
              <span>$${item.price.toFixed(2)}</span>
            </div>
          `).join('')}
          
          <div class="line"></div>
          <div class="item"><span>Subtotal:</span> <span>$${subtotal.toFixed(2)}</span></div>
          <div class="item"><span>IA Tax (7%):</span> <span>$${tax.toFixed(2)}</span></div>
          <div class="item total"><span>TOTAL:</span> <span>$${total.toFixed(2)}</span></div>
          
          <div class="line"></div>
          <div class="item"><span>Method:</span> <span>${paymentMethod.toUpperCase()}</span></div>
          ${paymentMethod === 'cash' && changeDue ? `
            <div class="item"><span>Cash Given:</span> <span>$${parseFloat(amountPaid).toFixed(2)}</span></div>
            <div class="item"><span>Change:</span> <span>$${changeDue.toFixed(2)}</span></div>
          ` : ''}
          
          <div class="center" style="margin-top: 20px;">
            <p>Thank You!</p>
          </div>
        </body>
      </html>
    `;

    // Open window, write content, print, and close
    const printWindow = window.open('', '', 'width=300,height=600');
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
    // -----------------------------

    // Reset
    setCart([]);
    setIsCheckoutOpen(false);
    alert("Sale Saved to Database!");
  };

  const processCash = () => {
    const paid = parseFloat(amountPaid);
    if (isNaN(paid) || paid < total) return alert("Not enough cash!");
    setChangeDue(paid - total);
  };

  const processCard = () => {
    setIsProcessing(true);
    // Simulate a 2-second delay for "Reading Card..."
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
        <h2>Current Tab</h2>
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
          <button className="pay-btn-large" onClick={handlePayClick}>PAY</button>
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

              {/* NEW: The Big Icon */}
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>
                {getCategoryIcon(item.category)}
              </div>

              <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>{item.name}</h3>
              <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '5px' }}>
                {item.tier ? item.tier.toUpperCase() : item.category.toUpperCase()}
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '1.3rem', color: '#007bff' }}>
                ${item.price.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- PAYMENT MODAL --- */}
      {isCheckoutOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Amount Due: ${total.toFixed(2)}</h2>

            {/* STEP 1: Select Method */}
            {!paymentMethod && (
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                <button className="pay-btn-large" style={{ background: '#007bff' }} onClick={() => setPaymentMethod('cash')}>CASH</button>
                <button className="pay-btn-large" style={{ background: '#6610f2' }} onClick={() => setPaymentMethod('card')}>CARD</button>
              </div>
            )}

            {/* STEP 2: Cash Logic */}
            {paymentMethod === 'cash' && !changeDue && (
              <div>
                <h3>Enter Cash Amount</h3>
                <input
                  type="number"
                  className="input-field"
                  autoFocus
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
                <button className="pay-btn-large" onClick={processCash}>CALCULATE CHANGE</button>
              </div>
            )}

            {/* STEP 3: Change Display */}
            {changeDue !== null && (
              <div>
                <h3 style={{ color: 'lime' }}>Change Due: ${changeDue.toFixed(2)}</h3>
                <button className="pay-btn-large" onClick={finalizeSale}>FINISH SALE</button>
              </div>
            )}

            {/* STEP 4: Card Logic */}
            {paymentMethod === 'card' && (
              <div>
                <h3>{isProcessing ? "Processing..." : "Ready to Swipe"}</h3>
                {!isProcessing && (
                  <button className="pay-btn-large" onClick={processCard}>Simulate Swipe</button>
                )}
              </div>
            )}

            <button
              onClick={() => setIsCheckoutOpen(false)}
              style={{ marginTop: '20px', background: 'transparent', border: '1px solid #666', color: '#888', padding: '10px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default PointOfSale;