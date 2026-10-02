/**
 * Supabase Integration Patch for app.js
 * 
 * INSTRUCTIONS:
 * 1. Add this file to your project
 * 2. Include in index.html BEFORE app.js:
 *    <script type="module" src="./supabase-client.js"></script>
 *    <script src="./app-supabase-patch.js"></script>
 * 3. Or copy the relevant functions into your app.js
 * 
 * This replaces the Cloudflare D1 + IndexedDB logic with direct Supabase calls
 */

// ============================================
// CONFIGURATION
// ============================================
// These should be set via Vite env vars or replace with your values
const SUPABASE_CONFIG = {
    // Will be auto-filled from import.meta.env if using Vite
    url: typeof import.meta !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL : '',
    anonKey: typeof import.meta !== 'undefined' ? import.meta.env.VITE_SUPABASE_ANON_KEY : ''
};

// ============================================
// SUPABASE CLIENT (using global from supabase-client.js)
// ============================================
let supabaseClient = null;
let supabaseHelpers = {};

async function initSupabase() {
    if (typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase;
        supabaseHelpers = {
            fetchShipments: window.fetchShipments,
            bulkUpsertShipments: window.bulkUpsertShipments,
            getShipmentCount: window.getShipmentCount,
            testConnection: window.testConnection
        };
        console.log('[Supabase] Client initialized');
        return true;
    }
    
    // Fallback: dynamic import if using modules
    try {
        const mod = await import('./supabase-client.js');
        supabaseClient = mod.supabase;
        supabaseHelpers = {
            fetchShipments: mod.fetchShipments,
            bulkUpsertShipments: mod.bulkUpsertShipments,
            getShipmentCount: mod.getShipmentCount,
            testConnection: mod.testConnection
        };
        return true;
    } catch (e) {
        console.error('[Supabase] Failed to initialize:', e);
        return false;
    }
}

// ============================================
// REPLACEMENT: loadLargeData() 
// Replaces the Cloudflare D1 + IndexedDB version
// ============================================
async function loadLargeDataSupabase(key) {
    const currentUser = sessionStorage.getItem('currentUser') || 'unknown';
    const isAdmin = currentUser === 'reg10';
    
    const addLog = (msg) => {
        const logEl = document.getElementById('loading-logs');
        if (!logEl) return;
        const d = new Date();
        const time = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
        const div = document.createElement('div');
        div.textContent = `[${time}] ${msg}`;
        logEl.appendChild(div);
        logEl.scrollTop = logEl.scrollHeight;
    };

    const progressEl = document.getElementById('loading-progress-bar');

    try {
        addLog('กำลังเชื่อมต่อ Supabase...');
        
        // Test connection first
        const connTest = await supabaseHelpers.testConnection();
        if (!connTest.success) {
            throw new Error(connTest.message);
        }
        addLog('เชื่อมต่อ Supabase สำเร็จ ✓');

        // Check cached data in IndexedDB for offline support
        let cachedData = null;
        let lastSyncTime = null;
        try {
            const { initDB } = await import('./app.js'); // Get initDB from app.js
            const db = await initDB();
            cachedData = await new Promise((resolve, reject) => {
                const tx = db.transaction('csvDataStore', 'readonly');
                const req = tx.objectStore('csvDataStore').get('thp_ecommerce_data');
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => reject(req.error);
            });
            lastSyncTime = await new Promise((resolve, reject) => {
                const tx = db.transaction('csvDataStore', 'readonly');
                const req = tx.objectStore('csvDataStore').get('thp_last_sync_time');
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => reject(req.error);
            });
        } catch(e) {
            console.warn('[Supabase] IndexedDB read error:', e);
        }

        addLog('กำลังดึงข้อมูลจาก Supabase...');
        if (progressEl) progressEl.style.width = '10%';

        // Determine owner filter
        const ownerFilter = isAdmin ? null : currentUser;
        
        // Fetch from Supabase (with incremental sync support)
        const { data: freshData, serverTime, totalCount } = await supabaseHelpers.fetchShipments({
            owner: ownerFilter,
            since: lastSyncTime, // Incremental sync
            limit: 50000 // Adjust based on your data size
        });

        if (progressEl) progressEl.style.width = '50%';
        addLog(`ดึงข้อมูลได้ ${freshData.length.toLocaleString()} รายการ (ทั้งหมด ${totalCount?.toLocaleString() || '?'})`);

        let finalData;
        
        // Merge with cache if incremental sync
        if (cachedData && cachedData.length > 0 && lastSyncTime && freshData.length < (cachedData.length || 0)) {
            addLog('ทำการรวมข้อมูลเพิ่มเติม (Incremental Sync)...');
            
            const trackMap = new Map();
            cachedData.forEach((item, idx) => {
                const tNo = String(item['Track No.'] || '').trim();
                if (tNo) trackMap.set(tNo, idx);
            });
            
            let updatedCount = 0, newCount = 0;
            freshData.forEach(item => {
                const tNo = String(item['Track No.'] || '').trim();
                if (!tNo) return;
                if (trackMap.has(tNo)) {
                    cachedData[trackMap.get(tNo)] = item;
                    updatedCount++;
                } else {
                    cachedData.push(item);
                    newCount++;
                }
            });
            
            addLog(`รวมเสร็จ: อัปเดต ${updatedCount} ใหม่ ${newCount} ทั้งหมด ${cachedData.length}`);
            finalData = cachedData;
        } else {
            // Full sync
            addLog('โหลดข้อมูลเต็มรูปแบบ (Full Sync)');
            finalData = freshData;
        }

        if (progressEl) progressEl.style.width = '80%';

        // Save merged data + sync timestamp to IndexedDB (for offline)
        try {
            const { initDB } = await import('./app.js');
            const db = await initDB();
            const tx = db.transaction('csvDataStore', 'readwrite');
            tx.objectStore('csvDataStore').put(finalData, 'thp_ecommerce_data');
            tx.objectStore('csvDataStore').put(serverTime, 'thp_last_sync_time');
        } catch(e) {
            console.warn('[Supabase] IndexedDB write error:', e);
        }

        if (progressEl) progressEl.style.width = '100%';
        addLog('ซิงค์ข้อมูลเสร็จสมบูรณ์ (Supabase) ✓');

        return finalData;

    } catch (e) {
        console.warn('[Supabase] Load Error (Fallback to Local):', e);
        addLog(`⚠️ ข้อผิดพลาด: ${e.message} - ใช้ข้อมูลออฟไลน์`);
        
        // Fallback to IndexedDB cached data
        if (cachedData && cachedData.length > 0) {
            addLog(`[Offline] ใช้ข้อมูลแคช: ${cachedData.length.toLocaleString()} รายการ`);
            return cachedData;
        }
        
        // Last resort: direct IndexedDB read
        try {
            const { initDB } = await import('./app.js');
            const db = await initDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('csvDataStore', 'readonly');
                const req = tx.objectStore('csvDataStore').get('thp_ecommerce_data');
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => reject(req.error);
            });
        } catch (dbErr) {
            console.error('[Supabase] Local IndexedDB Load Error:', dbErr);
            return null;
        }
    }
}

// ============================================
// REPLACEMENT: saveLargeData()
// For CSV Import -> Supabase
// ============================================
async function saveLargeDataSupabase(key, data, progressCallback = null) {
    const addLog = (msg) => {
        const logEl = document.getElementById('loading-logs');
        if (!logEl) return;
        const d = new Date();
        const time = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
        const div = document.createElement('div');
        div.textContent = `[${time}] ${msg}`;
        logEl.appendChild(div);
        logEl.scrollTop = logEl.scrollHeight;
    };

    let savedToCloud = false;
    
    try {
        addLog('กำลังบันทึกข้อมูลไปยัง Supabase...');
        
        const chunkSize = 500;
        const totalChunks = Math.ceil(data.length / chunkSize);
        
        for (let i = 0; i < totalChunks; i++) {
            const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize);
            
            const result = await supabaseHelpers.bulkUpsertShipments(chunk, { chunkSize: 500 });
            
            if (!result.success) {
                throw new Error(result.errors.map(e => e.error).join(', '));
            }
            
            if (progressCallback) {
                progressCallback(Math.round(((i + 1) / totalChunks) * 100));
            }
            
            addLog(`อัปโหลดชุดที่ ${i + 1}/${totalChunks} (${result.inserted} รายการ)`);
        }
        
        savedToCloud = true;
        addLog('บันทึกลง Supabase สำเร็จ ✓');
        
    } catch (e) {
        console.warn('[Supabase] Save Error:', e);
        if (e.message.includes('limit') || e.message.includes('quota')) {
            alert('โควต้าฐานข้อมูล Supabase ใกล้เต็ม กรุณาตรวจสอบ Dashboard');
        } else {
            alert('เกิดข้อผิดพลาดในการบันทึก: ' + e.message);
        }
    }
    
    // Always save to IndexedDB as local fallback
    try {
        const { initDB } = await import('./app.js');
        const db = await initDB();
        const tx = db.transaction('csvDataStore', 'readwrite');
        tx.objectStore('csvDataStore').put(data, 'thp_ecommerce_data');
        tx.objectStore('csvDataStore').put(new Date().toISOString(), 'thp_last_sync_time');
    } catch (dbErr) {
        console.error('[Supabase] Local IndexedDB Save Error:', dbErr);
        if (!savedToCloud) return false;
    }
    
    return true;
}

// ============================================
// HELPER: Get shipment count (for dashboard stats)
// ============================================
async function getShipmentCountSupabase(owner = null) {
    try {
        return await supabaseHelpers.getShipmentCount(owner);
    } catch (e) {
        console.error('[Supabase] Count error:', e);
        return 0;
    }
}

// ============================================
// AUTO-INIT: Replace original functions when Supabase ready
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    const initialized = await initSupabase();
    
    if (initialized) {
        // Override the original functions
        window.loadLargeData = loadLargeDataSupabase;
        window.saveLargeData = saveLargeDataSupabase;
        window.getShipmentCount = getShipmentCountSupabase;
        
        console.log('[Supabase] Functions overridden - ready to use');
        
        // Show connection status in sidebar
        const statusEl = document.getElementById('sidebar-last-updated');
        if (statusEl) {
            statusEl.textContent = 'Supabase: Connected';
            statusEl.style.color = '#10b981';
        }
    } else {
        console.warn('[Supabase] Not initialized - using original D1/IndexedDB functions');
    }
});

// Export for module usage
export { loadLargeDataSupabase, saveLargeDataSupabase, getShipmentCountSupabase, initSupabase };