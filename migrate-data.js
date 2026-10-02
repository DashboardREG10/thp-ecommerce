/**
 * Data Migration Script: Cloudflare D1 → Supabase
 * 
 * Usage:
 * 1. Export data from D1: wrangler d1 execute ecommerce-db --command="SELECT * FROM shipments" --remote --json > d1-export.json
 * 2. Set env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * 3. Run: node migrate-data.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing environment variables:');
    console.error('   SUPABASE_URL=', SUPABASE_URL ? '✓' : '✗');
    console.error('   SUPABASE_SERVICE_ROLE_KEY=', SUPABASE_SERVICE_KEY ? '✓' : '✗');
    console.error('\nSet them in your shell or .env file');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
});

// Map D1 row to Supabase format
function mapD1Row(row) {
    return {
        track_no: row.track_no,
        date_received: row.date_received,
        sender_name: row.sender_name,
        receiver_name: row.receiver_name,
        destination_office: row.destination_office,
        cod_amount: row.cod_amount,
        current_status: row.current_status,
        receiver_address: row.receiver_address,
        receiver_phone: row.receiver_phone,
        area: row.area,
        owner: row.owner || 'unknown',
        // Let Supabase handle timestamps
        updated_at: row.updated_at,
        created_at: row.created_at
    };
}

async function migrate() {
    console.log('🚀 Starting D1 → Supabase migration...\n');
    
    // Find export file
    const exportPaths = [
        'd1-export.json',
        '../d1-export.json',
        './data/d1-export.json'
    ];
    
    let exportFile = null;
    for (const p of exportPaths) {
        if (fs.existsSync(p)) {
            exportFile = p;
            break;
        }
    }
    
    if (!exportFile) {
        console.error('❌ Export file not found. Expected: d1-export.json');
        console.error('Run: wrangler d1 execute ecommerce-db --command="SELECT * FROM shipments" --remote --json > d1-export.json');
        process.exit(1);
    }
    
    console.log(`📁 Reading export from: ${exportFile}`);
    const raw = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
    
    // Handle different D1 export formats
    let rows = [];
    if (raw.results) {
        rows = raw.results;
    } else if (Array.isArray(raw)) {
        rows = raw;
    } else if (raw.data) {
        rows = raw.data;
    }
    
    if (!rows.length) {
        console.log('⚠️ No data to migrate');
        return;
    }
    
    console.log(`📊 Found ${rows.length} records to migrate\n`);
    
    // Convert rows
    const shipments = rows.map(mapD1Row).filter(r => r.track_no);
    console.log(`✅ Valid records after filtering: ${shipments.length}\n`);
    
    // Batch upsert
    const chunkSize = 500;
    let success = 0;
    let failed = 0;
    const errors = [];
    
    for (let i = 0; i < shipments.length; i += chunkSize) {
        const chunk = shipments.slice(i, i + chunkSize);
        const chunkNum = Math.floor(i / chunkSize) + 1;
        const totalChunks = Math.ceil(shipments.length / chunkSize);
        
        try {
            const { error } = await supabase
                .from('shipments')
                .upsert(chunk, { 
                    onConflict: 'track_no',
                    ignoreDuplicates: false 
                });
            
            if (error) {
                throw error;
            }
            
            success += chunk.length;
            process.stdout.write(`\r⏳ Progress: ${success}/${shipments.length} (${((success/shipments.length)*100).toFixed(1)}%)`);
            
        } catch (e) {
            failed += chunk.length;
            errors.push({ chunk: chunkNum, error: e.message });
            console.error(`\n❌ Chunk ${chunkNum} failed:`, e.message);
        }
        
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 100));
    }
    
    console.log('\n\n📋 Migration Summary:');
    console.log(`   ✅ Successful: ${success}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📦 Total: ${shipments.length}`);
    
    if (errors.length > 0) {
        console.log('\n⚠️ Errors:');
        errors.forEach(e => console.log(`   Chunk ${e.chunk}: ${e.error}`));
        
        // Save errors to file
        fs.writeFileSync('migration-errors.json', JSON.stringify(errors, null, 2));
        console.log('\n💾 Errors saved to migration-errors.json');
    }
    
    // Verify
    console.log('\n🔍 Verifying migration...');
    const { count, error: countError } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true });
    
    if (countError) {
        console.error('❌ Verification failed:', countError.message);
    } else {
        console.log(`✅ Supabase now has ${count} records`);
    }
    
    console.log('\n🎉 Migration complete!');
}

// Run
migrate().catch(e => {
    console.error('💥 Fatal error:', e);
    process.exit(1);
});