import { supabase } from '../supabaseClient';
// ^ Make sure this path points to where you initialized Supabase!
// It might be '../lib/supabaseClient' or just '../supabase' depending on your project.

export const voidItem = async (itemId, reason) => {
    const { data, error } = await supabase
        .rpc('void_tab_item', {
            target_item_id: itemId,
            reason_text: reason
        });

    if (error) {
        console.error('Error in voidItem:', error);
        throw error;
    }
    return data;
};