// src/data/repository.js

// 1. The Seeder - Runs once to create dummy data
export const seedDatabase = () => {
  if (!localStorage.getItem('pos_users')) {
    const users = [
      { id: 1, name: 'Jan', role: 'admin', pin: '1111' },
      { id: 2, name: 'Sarah', role: 'manager', pin: '2222' },
      { id: 3, name: 'Mike', role: 'bartender', pin: '3333' }
    ];
    localStorage.setItem('pos_users', JSON.stringify(users));
  }

  if (!localStorage.getItem('pos_inventory')) {
    const inventory = [
      { id: 101, name: 'Bud Light', price: 4.00, category: 'beer', tier: 'domestic' },
      { id: 102, name: 'Busch Light', price: 4.00, category: 'beer', tier: 'domestic' },
      { id: 103, name: 'White Claw', price: 5.00, category: 'seltzer', tier: 'standard' },
      { id: 104, name: 'Titos', price: 6.00, category: 'liquor', tier: 'call' },
      { id: 105, name: 'Grey Goose', price: 9.00, category: 'liquor', tier: 'premium' },
      { id: 106, name: 'Well Vodka', price: 3.50, category: 'liquor', tier: 'well' }
    ];
    localStorage.setItem('pos_inventory', JSON.stringify(inventory));
  }

  if (!localStorage.getItem('pos_sales')) {
    localStorage.setItem('pos_sales', JSON.stringify([]));
  }
};

// 2. Helper Functions to Read/Write
export const getInventory = () => {
    const data = localStorage.getItem('pos_inventory');
    return data ? JSON.parse(data) : [];
};

export const saveSale = (order) => {
  const sales = JSON.parse(localStorage.getItem('pos_sales')) || [];
  sales.push(order);
  localStorage.setItem('pos_sales', JSON.stringify(sales));
};