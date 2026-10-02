/**
 * Supabase Client for THP e-Commerce
 * Replaces Cloudflare D1 connection
 * Works in browser (frontend) and Node.js (API routes)
 */

import { createClient } from '@supabase/supabase-js'

// Configuration - will be replaced by Vite/Build tool or set via env
const SUPABASE_URL = typeof import.meta !== 'undefined' 
    ? import.meta.env.VITE_SUPABASE_URL 
    : process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

const SUPABASE_ANON_KEY = typeof import.meta !== 'undefined'
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[Supabase] Missing credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false, // We use custom sessionStorage auth
        autoRefreshToken: false,
        detectSessionInUrl: false
    },
    db: {
        schema: 'public'
    },
    global: {
        headers: {
            'x-client-info': 'thp-ecommerce-web'
        }
    }
});

/**
 * Helper: Convert Supabase row to app.js expected format
 */
export function mapShipmentRow(row) {
    return {
        'วันที่รับฝาก': row.date_received,
        'ชื่อ-นามสกุลผู้ฝากส่ง': row.sender_name,
        'ชื่อ-นามสกุลผู้รับ': row.receiver_name,
        'ที่ทำการปลายทาง': row.destination_office,
        'ยอด COD': row.cod_amount,
        'Track No.': row.track_no,
        'สถานะปัจจุบัน': row.current_status,
        'ที่อยู่ผู้รับ': row.receiver_address,
        'เบอร์โทรศัพท์ผู้รับ': row.receiver_phone,
        'เขตที่ทำการ': row.area,
        '_owner': row.owner
    };
}

/**
 * Fetch shipments with optional filters
 * @param {Object} options
 * @param {string} options.owner - Filter by owner
 * @param {string} options.since - Incremental sync timestamp (ISO string)
 * @param {number} options.limit - Max rows to return
 * @param {number} options.offset - Pagination offset
 * @returns {Promise<{data: Array, serverTime: string}>}
 */
export async function fetchShipments({ owner, since, limit = 10000, offset = 0 } = {}) {
    let query = supabase
        .from('shipments')
        .select('*', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (owner) {
        query = query.eq('owner', owner);
    }

    if (since) {
        query = query.gt('updated_at', since);
    }

    const { data, error, count } = await query;

    if (error) {
        throw new Error(`Supabase query error: ${error.message}`);
    }

    return {
        data: (data || []).map(mapShipmentRow),
        serverTime: new Date().toISOString(),
        totalCount: count
    };
}

/**
 * Get shipment count only (cheap query)
 */
export async function getShipmentCount(owner = null) {
    let query = supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true });

    if (owner) {
        query = query.eq('owner', owner);
    }

    const { count, error } = await query;

    if (error) {
        throw new Error(`Supabase count error: ${error.message}`);
    }

    return count || 0;
}

/**
 * Bulk upsert shipments (for CSV import)
 * @param {Array} shipments - Array of shipment objects in app.js format
 * @param {Object} options
 * @param {number} options.chunkSize - Batch size (default 100)
 * @returns {Promise<{success: boolean, inserted: number, errors: Array}>}
 */
export async function bulkUpsertShipments(shipments, { chunkSize = 100 } = {}) {
    if (!shipments || shipments.length === 0) {
        return { success: true, inserted: 0, errors: [] };
    }

    // Convert app.js format to Supabase format
    const rows = shipments.map(item => ({
        track_no: item['Track No.'],
        date_received: item['วันที่รับฝาก'],
        sender_name: item['ชื่อ-นามสกุลผู้ฝากส่ง'],
        receiver_name: item['ชื่อ-นามสกุลผู้รับ'],
        destination_office: item['ที่ทำการปลายทาง'],
        cod_amount: item['ยอด COD'],
        current_status: item['สถานะปัจจุบัน'],
        receiver_address: item['ที่อยู่ผู้รับ'],
        receiver_phone: item['เบอร์โทรศัพท์ผู้รับ'],
        area: item['เขตที่ทำการ'],
        owner: item['_owner'] || 'unknown'
    })).filter(row => row.track_no); // Skip rows without track_no

    const errors = [];
    let totalInserted = 0;

    // Process in chunks
    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        
        const { error } = await supabase
            .from('shipments')
            .upsert(chunk, { 
                onConflict: 'track_no',
                ignoreDuplicates: false 
            });

        if (error) {
            errors.push({ chunk: i / chunkSize, error: error.message });
        } else {
            totalInserted += chunk.length;
        }
    }

    return {
        success: errors.length === 0,
        inserted: totalInserted,
        errors
    };
}

/**
 * Delete all shipments (for reset/cleanup)
 */
export async function deleteAllShipments() {
    const { error } = await supabase
        .from('shipments')
        .delete()
        .neq('track_no', ''); // Delete all

    if (error) {
        throw new Error(`Delete error: ${error.message}`);
    }
    return { success: true };
}

/**
 * Test connection
 */
export async function testConnection() {
    try {
        const { data, error } = await supabase
            .from('shipments')
            .select('track_no')
            .limit(1);
        
        if (error) throw error;
        return { success: true, message: 'Connected to Supabase' };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

// Export for use in browser (non-module fallback)
if (typeof window !== 'undefined') {
    window.supabase = supabase;
    window.fetchShipments = fetchShipments;
    window.bulkUpsertShipments = bulkUpsertShipments;
    window.getShipmentCount = getShipmentCount;
    window.deleteAllShipments = deleteAllShipments;
    window.testConnection = testConnection;
}

export default supabase;