/**
 * Supabase API Layer - Replaces functions/api/data.js (Cloudflare D1)
 * This runs on Supabase Edge Functions or can be adapted for Vercel/Netlify Functions
 * For static hosting (GitHub Pages, Netlify static), use supabase-client.js directly in browser
 */

import { createClient } from '@supabase/supabase-js';

// Supabase Admin Client (uses service_role key for bypassing RLS)
// Only use in server-side / Edge Functions, NEVER in browser
function getAdminClient() {
    const url = process.env.SUPABASE_URL || Deno.env.get('SUPABASE_URL');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!url || !serviceKey) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    
    return createClient(url, serviceKey, {
        auth: { persistSession: false }
    });
}

// Helper to map DB row to app.js format
function mapRow(row) {
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
 * GET /api/data - Fetch shipments
 * Query params: owner, since (ISO timestamp), count_only
 */
export async function onRequestGet(context) {
    const { request, env } = context;
    
    // Support both Cloudflare Workers env and Node/Edge env
    const url = new URL(request.url);
    const owner = url.searchParams.get('owner');
    const since = url.searchParams.get('since');
    const countOnly = url.searchParams.get('count_only');
    
    try {
        const supabase = getAdminClient();
        
        // Count-only mode
        if (countOnly === 'true') {
            let query = supabase.from('shipments').select('*', { count: 'exact', head: true });
            if (owner) query = query.eq('owner', owner);
            
            const { count, error } = await query;
            if (error) throw error;
            
            return new Response(JSON.stringify({ total: count || 0 }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }
        
        // Build query
        let query = supabase
            .from('shipments')
            .select('*')
            .order('updated_at', { ascending: false });
        
        if (owner) {
            query = query.eq('owner', owner);
        }
        
        if (since) {
            query = query.gt('updated_at', since);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        const mappedData = (data || []).map(mapRow);
        const serverTime = new Date().toISOString();
        
        return new Response(JSON.stringify({ data: mappedData, serverTime }), {
            headers: { 
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-store'
            }
        });
        
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}

/**
 * POST /api/data - Bulk upsert shipments
 * Body: Array of shipment objects in app.js format
 */
export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        const data = await request.json();
        
        if (!Array.isArray(data) || data.length === 0) {
            return new Response(JSON.stringify({ error: 'Invalid data: expected non-empty array' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }
        
        const supabase = getAdminClient();
        
        // Convert to Supabase format
        const rows = data.map(item => ({
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
        })).filter(row => row.track_no);
        
        if (rows.length === 0) {
            return new Response(JSON.stringify({ error: 'No valid rows with track_no' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }
        
        // Chunk upsert (Supabase recommends max 1000 per request)
        const chunkSize = 500;
        let totalInserted = 0;
        
        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            
            const { error } = await supabase
                .from('shipments')
                .upsert(chunk, { 
                    onConflict: 'track_no',
                    ignoreDuplicates: false 
                });
            
            if (error) throw error;
            totalInserted += chunk.length;
        }
        
        return new Response(JSON.stringify({ success: true, inserted: totalInserted }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
        
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}

/**
 * DELETE /api/data - Delete all shipments (admin only)
 */
export async function onRequestDelete(context) {
    const { env } = context;
    
    try {
        const supabase = getAdminClient();
        
        const { error } = await supabase
            .from('shipments')
            .delete()
            .neq('track_no', '');
        
        if (error) throw error;
        
        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
        
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}

/**
 * OPTIONS - CORS preflight
 */
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400'
        }
    });
}