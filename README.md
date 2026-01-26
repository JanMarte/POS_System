# The Wedding Bar POS 🍹

A full-stack Point of Sale (POS) application built for high-volume bar environments. It features real-time inventory tracking, tab management, automated pricing rules, and a comprehensive admin dashboard with print-ready reporting.

**Live Demo:** [https://jan-wedding-bar.vercel.app/](https://jan-wedding-bar.vercel.app/)

## 🛠 Tech Stack
* **Frontend:** React.js, Vite, Custom CSS (Glassmorphism UI)
* **Backend:** Supabase (PostgreSQL, Real-time DB)
* **Authentication:** Custom PIN-based Logic (SHA-256 Hashing)
* **Deployment:** Vercel

## ✨ Key Features

### 🛒 Point of Sale (Front of House)
* **Tab Management:** Open, save, and reload tabs for guests using a name-based system.
* **Smart Cart:**
    * Automatic stock validation preventing sales of out-of-stock items.
    * **Custom Item Support:** Add off-menu items (e.g., "Open Food") with custom prices without database conflicts.
    * Visual indicators for Happy Hour discounts & Quantity multipliers (x2, x3).
* **Happy Hour Scheduler:** Automatically applies discounts based on day/time rules defined by the manager.
* **Discount System:** Supports percentage-based (10%, 25%, 50%), custom dollar amounts, and full comps.
* **Receipt Printing:** Generates professional HTML-based receipts for thermal printers.

### 📊 Admin Dashboard (Back of House)
* **Real-time Analytics:** Track Net Revenue, Total Tips, Cash vs. Card sales live.
* **Inventory Control:**
    * **Modern UI:** Add/Edit products using a clean **Grid-Layout Modal** with toggle switches and safety guards.
    * Filter views by **Low Stock** (yellow alert) or **Sold Out** (red alert).
    * Search functionality for quick product lookup.
* **Employee Management:**
    * Create user roles (Admin, Manager, Bartender) with specific permission toggles.
    * **Secure Forms:** Password-manager compatible input fields for PIN creation.
    * Visual cards with color-coded badges for easy staff oversight.
* **Sales History & Reporting:**
    * Sortable transaction log (Date, Total, Tip).
    * **🖨️ Advanced Print Reporting:** Generates a clean, multi-page white-paper report for accounting.
        * Features a split-header layout (Summary vs. Totals).
        * Uses absolute positioning overlays to bypass screen layout constraints.

### 🔐 Security & UX
* **PIN Authentication:** Secure login with SHA-256 hashed PINs.
* **Role-Based Access:** Bartenders cannot access inventory settings or wipe sales history.
* **Transaction Safety:** "Is Busy" states prevent double-charging or accidental multiple clicks.
* **Responsive Design:** Optimized for touchscreens (iPad/Tablet Kiosk Mode) with large touch targets.

## 🚀 How to Run Locally

1. **Clone the repository**
   ```bash
   git clone [https://github.com/yourusername/wedding-bar-pos.git](https://github.com/yourusername/wedding-bar-pos.git)
   cd wedding-bar-pos
