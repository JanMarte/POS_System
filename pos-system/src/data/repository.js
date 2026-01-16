// src/data/repository.js
import { supabase } from '../supabaseClient';

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

// 👇 NEW: Deducts stock immediately (used for Tabs)
export const deductStock = async (items) => {
  for (const item of items) {
    if (!item.id || !item.quantity) continue;

    const { data: currentItem } = await supabase
      .from('inventory')
      .select('stock_count, is_available')
      .eq('id', item.inventory_id || item.id)
      .single();

    if (currentItem && currentItem.stock_count !== null) {
      const newStock = currentItem.stock_count - item.quantity;
      const shouldBeAvailable = newStock > 0;

      await supabase
        .from('inventory')
        .update({
          stock_count: Math.max(0, newStock),
          is_available: shouldBeAvailable
        })
        .eq('id', item.inventory_id || item.id);
    }
  }
};

// --- SALES ---
export const saveSale = async (order) => {
  // 1. Save Money Record
  const { error } = await supabase
    .from('sales')
    .insert([{
      total: order.total,
      tip: order.tip || 0.00,
      items: order.items,
      payment_method: order.method,
      date: new Date().toISOString()
    }]);

  if (error) console.error('Error saving sale:', error);

  // 2. Inventory Logic
  // Only deduct stock if it wasn't already taken out (via Tab)
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

// --- USERS ---
export const getUsers = async () => {
  const { data } = await supabase.from('users').select('*');
  return data || [];
};