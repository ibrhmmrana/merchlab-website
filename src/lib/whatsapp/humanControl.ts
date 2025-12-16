import { getSupabaseAdmin } from '../supabaseAdmin';

/**
 * Check if human is in control for a given session
 * Returns TRUE if human is in control (AI should NOT respond)
 * Returns FALSE if AI is in control (AI should respond normally)
 */
export async function isHumanInControl(sessionId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  
  try {
    console.log(`[HumanControl] ==========================================`);
    console.log(`[HumanControl] Checking control state for session: "${sessionId}"`);
    console.log(`[HumanControl] SessionId type: ${typeof sessionId}, length: ${sessionId.length}`);
    
    // First, let's see ALL records in the table to debug
    const { data: allRecords, error: allError } = await supabase
      .from('whatsapp_human_control')
      .select('session_id, is_human_controlled')
      .limit(20);
    
    if (!allError && allRecords) {
      console.log(`[HumanControl] All records in table (${allRecords.length}):`);
      allRecords.forEach((record, idx) => {
        const match = record.session_id === sessionId ? ' ⭐ MATCH' : '';
        console.log(`[HumanControl]   [${idx}] session_id: "${record.session_id}" (length: ${record.session_id.length}), is_human_controlled: ${record.is_human_controlled}${match}`);
      });
    }
    
    // Query the whatsapp_human_control table for this specific session_id
    console.log(`[HumanControl] Querying for exact match: session_id = "${sessionId}"`);
    const { data, error } = await supabase
      .from('whatsapp_human_control')
      .select('is_human_controlled')
      .eq('session_id', sessionId)
      .maybeSingle();
    
    if (error) {
      console.error('[HumanControl] ❌ Error querying database:', error);
      console.error('[HumanControl] Error code:', error.code);
      console.error('[HumanControl] Error message:', error.message);
      console.error('[HumanControl] Error details:', JSON.stringify(error, null, 2));
      // If there's an error, default to AI control (allow AI to respond)
      return false;
    }
    
    // If no record found, default to AI control (allow AI to respond)
    if (!data) {
      console.log(`[HumanControl] ℹ️ No record found for "${sessionId}" - defaulting to AI control (FALSE)`);
      console.log(`[HumanControl] ==========================================`);
      return false;
    }
    
    // Check the is_human_controlled field
    const result = data.is_human_controlled === true;
    console.log(`[HumanControl] ✅ Found record! is_human_controlled = ${data.is_human_controlled} → returning ${result}`);
    console.log(`[HumanControl] ==========================================`);
    
    return result;
  } catch (error) {
    console.error('[HumanControl] ❌ Exception checking human control state:', error);
    console.error('[HumanControl] Exception stack:', error instanceof Error ? error.stack : String(error));
    // If there's an exception, default to AI control (allow AI to respond)
    return false;
  }
}

/**
 * Set human control state for a session
 */
export async function setHumanControl(sessionId: string, isHumanControlled: boolean): Promise<void> {
  const supabase = getSupabaseAdmin();
  
  try {
    // Use upsert to insert or update
    const { error } = await supabase
      .from('whatsapp_human_control')
      .upsert({
        session_id: sessionId,
        is_human_controlled: isHumanControlled,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'session_id',
      });
    
    if (error) {
      console.error('Error setting human control state:', error);
      throw new Error(`Failed to set human control state: ${error.message}`);
    }
  } catch (error) {
    console.error('Error setting human control state:', error);
    throw error;
  }
}

