// src/data/repository.js
import { supabase } from '../supabaseClient';

// --- SECURITY: SHA-256 Hashing Helper ---
export const hashPin = async (pin) => {
  if (!pin) return null;
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// --- INVENTORY ---
export const getInventory = async () => {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .order('name', { ascending: true });

  if (error) console.error('Error fetching inventory:', error);
  return data || [];
};

export const addInventoryItem = async (item) => {
  const { data, error } = await supabase.from('inventory').insert([item]).select();
  if (error) { console.error(error); alert('Error saving to database'); }
  return data;
};

export const deleteInventoryItem = async (id) => {
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) { console.error(error); return false; }
  return true;
};

export const updateInventoryItem = async (id, updates) => {
  const { data, error } = await supabase.from('inventory').update(updates).eq('id', id).select();
  if (error) return null;
  return data;
};

// --- HAPPY HOUR SCHEDULER ---
export const getHappyHours = async () => {
  const { data, error } = await supabase.from('happy_hours').select('*').order('id', { ascending: true });
  if (error) console.error(error);
  return data || [];
};

export const addHappyHour = async (rule) => {
  const { data, error } = await supabase.from('happy_hours').insert([rule]).select();
  if (error) { console.error(error); return null; }
  return data;
};

export const deleteHappyHour = async (id) => {
  const { error } = await supabase.from('happy_hours').delete().eq('id', id);
  if (error) return false;
  return true;
};

// --- SALES ---
export const deductStock = async (items) => {
  for (const item of items) {
    if (!item.id || !item.quantity) continue;

    const { data: currentItem } = await supabase
      .from('inventory')
      .select('stock_count, is_available')
      .eq('id', item.inventory_id || item.id)
      .single();

    if (currentItem && currentItem.stock_count !== null) {
      const newStock = Math.max(0, currentItem.stock_count - item.quantity);
      const shouldBeAvailable = newStock > 0;

      await supabase
        .from('inventory')
        .update({
          stock_count: newStock,
          is_available: shouldBeAvailable
        })
        .eq('id', item.inventory_id || item.id);
    }
  }
};

export const saveSale = async (order) => {
  const { error } = await supabase
    .from('sales')
    .insert([{
      total: order.total,
      tip: order.tip || 0.00,
      discount: order.discount || 0.00,
      items: order.items,
      payment_method: order.method,
      employee_name: order.employee_name || order.employee || 'Unknown',
      date: new Date().toISOString()
    }]);

  if (error) console.error('Error saving sale:', error);

  const itemsToDeduct = order.items.filter(item => !item.alreadyDeducted);
  if (itemsToDeduct.length > 0) {
    await deductStock(itemsToDeduct);
  }
};

export const getSales = async () => {
  const { data, error } = await supabase.from('sales').select('*').order('date', { ascending: false });
  return data || [];
};

export const clearSales = async () => {
  await supabase.from('sales').delete().neq('id', 0);
}

// --- USERS (EMPLOYEES) ---
export const getUsers = async () => {
  const { data, error } = await supabase.from('users').select('*').order('name', { ascending: true });
  if (error) console.error(error);
  return data || [];
};

export const addUser = async (user) => {
  if (user.pin) {
    user.pin = await hashPin(user.pin);
  }
  const { data, error } = await supabase.from('users').insert([user]).select();
  if (error) { console.error(error); return null; }
  return data;
};

export const updateUser = async (id, updates) => {
  if (updates.pin) {
    updates.pin = await hashPin(updates.pin);
  }
  const { data, error } = await supabase.from('users').update(updates).eq('id', id).select();
  if (error) { console.error(error); return null; }
  return data;
};

export const deleteUser = async (id) => {
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) return false;
  return true;
};