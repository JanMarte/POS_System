// src/utils/receiptService.js

export const printReceipt = (transaction) => {
  if (!transaction) return;

  // Calculate values if they aren't explicitly provided
  const items = transaction.items || [];
  const total = parseFloat(transaction.total || 0);
  const tip = parseFloat(transaction.tip || 0);
  const discount = parseFloat(transaction.discount || 0);

  // Format Date
  const dateStr = new Date(transaction.date || new Date()).toLocaleString();

  // Generate HTML
  const receiptHTML = `
    <html>
      <head>
        <title>Receipt</title>
        <style>
          body { font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; padding: 10px; color: #000; }
          .header { text-align: center; margin-bottom: 20px; }
          .store-name { font-size: 1.5rem; font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .item-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.9rem; }
          .totals-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; font-size: 0.8rem; }
          .details { font-size: 0.8rem; margin-bottom: 10px; }
          .discount-row { color: #000; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">THE WEDDING BAR</div>
          <div>Celebration Drinks</div>
        </div>

        <div class="details">
          <div>Date: ${dateStr}</div>
          <div>Server: ${transaction.employee_name || 'Staff'}</div>
          <div>Method: ${transaction.method ? transaction.method.toUpperCase() : 'CASH'}</div>
        </div>

        <div class="divider"></div>

        ${items.map(item => `
          <div class="item-row">
            <span>${item.quantity || 1}x ${item.name}</span>
            <span>$${((item.price * (item.quantity || 1))).toFixed(2)}</span>
          </div>
          ${item.note ? `<div style="font-size: 0.75rem; font-style: italic; color: #555; margin-left: 15px; margin-bottom: 5px;">-- ${item.note}</div>` : ''}
        `).join('')}

        <div class="divider"></div>

        ${discount > 0 ? `
        <div class="totals-row discount-row">
          <span>Discount</span>
          <span>-$${discount.toFixed(2)}</span>
        </div>
        ` : ''}

        <div class="totals-row">
          <span>Subtotal</span>
          <span>$${(total - (total * 0.07)).toFixed(2)}</span>
        </div>
        
        <div class="totals-row">
          <span>Tax (7%)</span>
          <span>$${(total * 0.07).toFixed(2)}</span>
        </div>

        ${tip > 0 ? `
        <div class="totals-row">
          <span>Tip</span>
          <span>$${tip.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="totals-row" style="font-size: 1.2rem; margin-top: 10px; border-top: 2px solid #000; padding-top: 5px;">
          <span>TOTAL</span>
          <span>$${(total + tip).toFixed(2)}</span>
        </div>

        <div class="footer">
          Thank you for celebrating with us!
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `;

  // Open Window and Print
  const popup = window.open('', '_blank', 'width=400,height=600');
  if (popup) {
    popup.document.open();
    popup.document.write(receiptHTML);
    popup.document.close();
  } else {
    alert('Pop-up blocked! Please allow pop-ups to print receipts.');
  }
};