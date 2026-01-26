# 🍸 Modern React POS System

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

A high-performance, visually stunning Point of Sale (POS) system designed for bars and restaurants. Built with **React + Vite** and powered by **Supabase**, featuring a modern "Glassmorphism" UI, real-time inventory tracking, and comprehensive admin tools.

---

## ✨ Key Features

### 🖥️ Point of Sale Terminal
* **Fast Checkout Flow:** Quick-tap interface optimized for touchscreens.
* **Dynamic Search & Filtering:** Instantly filter by category (Beer, Liquor, Seltzer, Food) or search by name.
* **Custom Items:** Add off-menu items (e.g., "Open Food") with custom prices on the fly.
* **Smart Cart:** * Add notes to specific items (e.g., "No ice").
    * Visual indicators for Happy Hour discounts.
    * Quantity multipliers (x2, x3).
* **Tab Management:** Create, save, and reload customer tabs. Perfect for bar environments.

### 💳 Payment & Transactions
* **Flexible Payments:** Cash calculator with "Quick Exact" buttons and Card simulation.
* **Tip Logic:** Auto-calculate tips (15%, 20%, 25%) or custom amounts.
* **Discount System:** Apply percentage-based or flat-amount discounts (Manager PIN required).
* **Void System:** Secure item voiding with required Manager PIN and reason tracking (Waste, Error, Comp).

### 🛠️ Admin Dashboard
* **Inventory Management:** * Add/Edit/Delete products with a modern modal interface.
    * Real-time stock tracking with "Low Stock" and "Sold Out" ribbons.
    * Toggle product availability instantly.
* **Employee Management:** * Role-based access control (Admin, Manager, Bartender).
    * Secure PIN authentication (SHA-256 hashed).
    * Granular permissions (e.g., allowing specific staff to give discounts).
* **Sales History & Reporting:** * View all past transactions with detailed breakdowns.
    * **🖨️ Print-Ready Reports:** Auto-formatting sales reports that handle multi-page layouts perfectly.
    * Filter sales by date, employee, or payment method.

---

## 📸 Screenshots

> *Add screenshots here of your Login Screen, POS Interface, and Admin Dashboard*



[Image of Admin Dashboard]


---

## 🚀 Getting Started

### Prerequisites
* Node.js (v16+)
* npm or yarn
* A free [Supabase](https://supabase.com/) account.

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/yourusername/modern-pos.git](https://github.com/yourusername/modern-pos.git)
    cd modern-pos
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory:
    ```env
    VITE_SUPABASE_URL=your_supabase_url_here
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
    ```

4.  **Run the App**
    ```bash
    npm run dev
    ```

---

## 🗄️ Database Schema (Supabase)

This project requires the following tables in your Supabase SQL Editor:

### 1. `inventory`
Stores product details and stock levels.
* `id` (int8, primary key)
* `name` (text)
* `price` (float8)
* `category` (text)
* `stock_count` (int8, nullable)
* `is_available` (bool)

### 2. `users`
Stores employee credentials.
* `id` (int8, primary key)
* `name` (text)
* `pin` (text) *[SHA-256 Hashed]*
* `role` (text) *['admin', 'manager', 'bartender']*
* `can_discount` (bool)

### 3. `sales`
Stores completed transaction history.
* `id` (int8, primary key)
* `items` (jsonb) *[Stores snapshot of items sold]*
* `total` (float8)
* `payment_method` (text)
* `date` (timestamptz)

### 4. `tabs` & `tab_items`
Manages open customer orders.
* `tabs`: `id`, `customer_name`, `status` ('open', 'paid')
* `tab_items`: `tab_id`, `inventory_id`, `name`, `price`, `quantity`

---

## 🎨 UI & UX Design

The application utilizes a custom CSS architecture based on **Glassmorphism**:
* **Translucent Panels:** `backdrop-filter: blur(20px)` for a modern, depth-based look.
* **Dynamic Backgrounds:** Animated gradients that shift subtly.
* **Responsive Modals:** CSS Grid-based forms for adding/editing data.
* **Print Optimization:** Custom `@media print` styles that strip away the UI and generate a clean, white-paper accounting report.

---

## 🛡️ Security Features

* **PIN Protection:** Manager actions (Voids, Discounts) require a valid PIN.
* **Inventory Locking:** Out-of-stock items are automatically disabled in the UI.
* **Sanitized Inputs:** Prevents basic injection attacks.

---

## 🔮 Future Roadmap

* [ ] Kitchen Display System (KDS) view.
* [ ] Analytics Charts for visual revenue tracking.
* [ ] Split-check functionality.

---

Made with ❤️ using React & Supabase.