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
  const { data, error } = await supabase
    .from('inventory')
    .insert([ item ])
    .select();
    
  if (error) {
      console.error('Error adding item:', error);
      alert('Error saving to database');
  }
  return data;
};

export const deleteInventoryItem = async (id) => {
    const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);
    if(error) console.error("Error deleting:", error);
};

// --- SALES ---
export const saveSale = async (order) => {
  // We only need to send the data Supabase expects
  // (We don't send 'id' because Supabase generates it automatically)
  const { error } = await supabase
    .from('sales')
    .insert([
      { 
        total: order.total, 
        items: order.items, 
        payment_method: order.method,
        date: new Date().toISOString() 
      }
    ]);

  if (error) console.error('Error saving sale:', error);
};

export const getSales = async () => {
    const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('date', { ascending: false });
        
    if (error) console.error(error);
    return data || [];
};

export const clearSales = async () => {
    // Be careful with this in production!
    const { error } = await supabase
        .from('sales')
        .delete()
        .neq('id', 0); // Deletes everything where ID is not 0 (all rows)
    
    if(error) console.error(error);
}

// --- USERS ---
export const getUsers = async () => {
    const { data, error } = await supabase
        .from('users')
        .select('*');
    if(error) console.error(error);
    return data || [];
};