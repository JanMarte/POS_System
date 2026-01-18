# The Wedding Bar POS 🍹

A full-stack Point of Sale (POS) application built for high-volume bar environments. It features real-time inventory tracking, tab management, automated pricing rules, and a comprehensive admin dashboard.

**Live Demo:** [https://jan-wedding-bar.vercel.app/](https://jan-wedding-bar.vercel.app/)

## 🛠 Tech Stack
* **Frontend:** React.js, Vite
* **Backend:** Supabase (PostgreSQL, Real-time DB)
* **Authentication:** Custom PIN-based Logic (SHA-256 Hashing)
* **Deployment:** Vercel

## ✨ Key Features

### 🛒 Point of Sale (Front of House)
* **Tab Management:** Open, save, and reload tabs for guests using a name-based system.
* **Smart Cart:** Automatic stock validation preventing sales of out-of-stock items.
* **Happy Hour Scheduler:** Automatically applies discounts based on day/time rules defined by the manager.
* **Discount System:** Supports percentage-based (10%, 25%, 50%), custom dollar amounts, and full comps.
* **Receipt Printing:** Generates professional HTML-based receipts for thermal printers.
* **Visual Status Indicators:** "Low Stock" warnings and "Sold Out" overlays on product cards.

### 📊 Admin Dashboard (Back of House)
* **Real-time Analytics:** Track Net Revenue, Total Tips, Cash vs. Card sales live.
* **Inventory Control:**
    * Add, edit, or delete products.
    * Filter views by **Low Stock** (yellow alert) or **Sold Out** (red alert).
    * Search functionality for quick product lookup.
* **Employee Management:**
    * Create user roles (Admin, Manager, Bartender).
    * granular permission toggles (e.g., Allow/Disallow Discounting).
* **Sales History:**
    * Sortable transaction log (Date, Total, Tip).
    * Filter history by Payment Method or Employee.
    * View detailed receipts and re-print past transactions.

### 🔐 Security & UX
* **PIN Authentication:** Secure login with hashed PINs.
* **Role-Based Access:** Bartenders cannot access inventory settings or wipe sales history.
* **Transaction Safety:** "Is Busy" states prevent double-charging or accidental multiple clicks.
* **Responsive Design:** Optimized for touchscreens (iPad/Tablet Kiosk Mode).

## 🚀 How to Run Locally

1. **Clone the repository**
   ```bash
   git clone [https://github.com/yourusername/wedding-bar-pos.git](https://github.com/yourusername/wedding-bar-pos.git)
   cd wedding-bar-pos
