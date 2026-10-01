/*
 * NOTE: 
 * 1. มีการรันเวอร์ชั่น อัตโนมัติทุกครั้งที่มีการอัพเดตโค้ด V.1 (จะรันทั้งหมด10ครั้ง ถ้าเกิน 10 จะเปลี่ยนเป็น V2.วันที่/เดือน/ปี)
 * 2. ทุกครั้งที่ทำโค้ดเสร็จจะต้อง แนบลิงก์ local มาให้ทดสอบก่อนขึ้น Cloudflare D1 เสมอ
 */

// Mock Data
const mockRecentPackages = [
    { id: 'THP123456789TH', status: 'จัดส่งสำเร็จ', time: '10 นาทีที่แล้ว', type: 'success' },
    { id: 'THP987654321TH', status: 'กำลังนำจ่าย', time: '30 นาทีที่แล้ว', type: 'pending' },
    { id: 'THP555666777TH', status: 'ลูกค้าย้ายที่อยู่', time: '1 ชั่วโมงที่แล้ว', type: 'error' },
    { id: 'THP111222333TH', status: 'จัดส่งสำเร็จ', time: '2 ชั่วโมงที่แล้ว', type: 'success' },
    { id: 'THP444555666TH', status: 'เตรียมการจัดส่ง', time: '3 ชั่วโมงที่แล้ว', type: 'pending' }
];

const mockRecentOrders = [
    { orderId: 'ORD-2023-001', customerName: 'สมชาย ใจดี', date: '27 ก.ย. 2026', total: '฿1,250.00', status: 'Success', type: 'success' },
    { orderId: 'ORD-2023-002', customerName: 'สมหญิง รักเรียน', date: '27 ก.ย. 2026', total: '฿850.00', status: 'Pending', type: 'pending' },
    { orderId: 'ORD-2023-003', customerName: 'มานะ ขยันหมั่นเพียร', date: '26 ก.ย. 2026', total: '฿3,400.00', status: 'Success', type: 'success' },
    { orderId: 'ORD-2023-004', customerName: 'ปิติ นำโชค', date: '26 ก.ย. 2026', total: '฿450.00', status: 'Failed', type: 'error' },
    { orderId: 'ORD-2023-005', customerName: 'ชูใจ ยิ้มแย้ม', date: '25 ก.ย. 2026', total: '฿2,100.00', status: 'Success', type: 'success' }
];

const mockChartData = {
    labels: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์', 'อาทิตย์'],
    datasets: [
        {
            label: 'ปริมาณพัสดุ (ชิ้น)',
            data: [1200, 1900, 3000, 2500, 2200, 1500, 1100],
            borderColor: '#0e1e33', // Navy Blue
            backgroundColor: 'rgba(14, 30, 51, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
        },
        {
            label: 'ลูกค้าใหม่ (คน)',
            data: [200, 350, 400, 300, 250, 150, 100],
            borderColor: '#e63946', // Red
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.4
        }
    ]
};

let originalData = [];
let currentData = [];
window.currentDataViews = {
    dashboard: null,
    tracking: null,
    performance: null
};
let mainChartInstance = null;
let performanceChartInstance = null;
let funnelChartInstance = null;
let statusBarChartInstance = null;
let uniqueStatuses = new Set();
let uniqueDates = new Set();

const remoteZipCodes = [
    '20120', '23120', // เกาะสีชัง, เกาะช้าง
    '50240', '50250', '50270', '50310', '50350', // ดอยอินทนนท์, แม่แจ่ม
    '58000', '58110', '58120', '58130', '58140', '58150', // แม่ฮ่องสอน
    '81150', // เกาะลันตา
    '82160', // เกาะยาว
    '84280', '84360', // เกาะพะงัน, เกาะสมุย
    '95110', '95120', '95130', '95140', '95150', '95160', '95170', // ยะลา
    '96110', '96120', '96130', '96140', '96150', '96160', '96190', // นราธิวาส
    '94120', '94130', '94140', '94150', '94160', '94170', '94180', '94190', // ปัตตานี
    '91000', '91110', '91120' // สตูล บางพื้นที่
];

function getZipCategory(zip) {
    if (!zip) return 'REG';
    if (zip.startsWith('10') || zip.startsWith('11') || zip.startsWith('12')) return 'BKK';
    if (remoteZipCodes.includes(zip) || zip.startsWith('58')) return 'REM';
    return 'REG';
}

function getRegionFromZip(zip) {
    if (!zip || zip.length !== 5) return 'UNKNOWN';
    const p = parseInt(zip.substring(0, 2));
    if (p >= 10 && p <= 12) return 'BKK';
    if (p >= 13 && p <= 18) return 'REG1';
    if (p >= 20 && p <= 27) return 'REG2';
    if (p >= 30 && p <= 33) return 'REG3';
    if (p >= 34 && p <= 39) return 'REG10'; // Ubon etc.
    if (p >= 40 && p <= 49) return 'REG4';
    if (p >= 50 && p <= 58) return 'REG5';
    if (p >= 60 && p <= 67) return 'REG6';
    if (p >= 70 && p <= 77) return 'REG7';
    if (p >= 80 && p <= 86) return 'REG8';
    if (p >= 90 && p <= 96) return 'REG9';
    return 'UNKNOWN';
}

function getSLADays(originZip, destZip) {
    const originCat = getZipCategory(originZip);
    const destCat = getZipCategory(destZip);

    if (originCat !== 'REM' && destCat !== 'REM') {
        const oReg = getRegionFromZip(originZip);
        const dReg = getRegionFromZip(destZip);
        // Custom override for Origin = Region 10 (e.g., Ubon 34000)
        if (oReg === 'REG10') {
            if (dReg === 'BKK') return 2;
            if (['REG3', 'REG4', 'REG10'].includes(dReg)) return 1;
            return 3;
        }
    }

    if (originCat === 'BKK' && destCat === 'BKK') return 1;
    if (originCat === 'BKK' && destCat === 'REG') return 2;
    if (originCat === 'BKK' && destCat === 'REM') return 3;
    
    if (originCat === 'REG' && destCat === 'BKK') return 2;
    if (originCat === 'REG' && destCat === 'REG') return 3;
    if (originCat === 'REG' && destCat === 'REM') return 4;
    
    if (originCat === 'REM' && destCat === 'REM') return 4;
    if (originCat === 'REM' && destCat === 'BKK') return 3;
    if (originCat === 'REM' && destCat === 'REG') return 4;

    return 3;
}

// Cloudflare D1 Configuration Placeholder
// ข้อมูลจะถูกเชื่อมต่อกับ D1 ผ่าน Cloudflare Workers API หรือ Wrangler local
let d1_db = null; // Mock D1 database connection

// IndexedDB Helper for handling large files (25MB+) that exceed localStorage quota
const DB_NAME = 'THPEcommerceLocalDB';
const STORE_NAME = 'csvDataStore';

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

async function saveLargeData(key, data, progressCallback = null) {
    try {
        const chunkSize = 200;
        const totalChunks = Math.ceil(data.length / chunkSize);
        
        for (let i = 0; i < totalChunks; i++) {
            const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize);
            const response = await fetch('/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(chunk)
            });
            if (!response.ok) {
                const errRes = await response.json();
                throw new Error(errRes.error || 'API save error');
            }
            if (progressCallback) {
                progressCallback(Math.round(((i + 1) / totalChunks) * 100));
            }
        }
        return true;
    } catch (e) {
        console.error("Save Error:", e);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลลงฐานข้อมูล Cloudflare: ' + e.message);
        return false;
    }
}

async function loadLargeData(key) {
    try {
        const response = await fetch('/api/data?t=' + Date.now(), { cache: 'no-store' });
        if (!response.ok) throw new Error('API load error');
        return await response.json();
    } catch (e) {
        console.error("Load Error:", e);
        return null;
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    // Version logic
    const APP_VERSION = '1.11';
    const today = new Date();
    const dateString = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
    const version = `V.${APP_VERSION} (${dateString})`;
    
    const versionEl = document.getElementById('app-version');
    if (versionEl) versionEl.textContent = version;

    // === ONE-TIME DATA MIGRATION: Clear corrupted dates from old versions ===
    const storedVersion = localStorage.getItem('thp_app_version');
    if (storedVersion !== APP_VERSION) {
        console.log(`[MIGRATION] Upgrading from ${storedVersion || 'unknown'} to ${APP_VERSION}. Clearing old data...`);
        try {
            // Clear IndexedDB
            const dbNames = ['thp_ecommerce_db', 'thp_large_data'];
            for (const dbName of dbNames) {
                try { 
                    const delReq = indexedDB.deleteDatabase(dbName);
                    await new Promise((resolve, reject) => {
                        delReq.onsuccess = resolve;
                        delReq.onerror = reject;
                        delReq.onblocked = resolve;
                    });
                } catch(e) { console.warn('DB delete warning:', e); }
            }
            // Clear related localStorage keys (keep login history)
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('thp_ecommerce')) keysToRemove.push(key);
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
            
            localStorage.setItem('thp_app_version', APP_VERSION);
            console.log('[MIGRATION] Data cleared successfully. Please re-upload your files.');
            alert('⚡ ระบบได้อัปเกรดเป็นเวอร์ชัน ' + APP_VERSION + ' แล้ว\n\nข้อมูลเก่าถูกล้างออกเนื่องจากมีปัญหาเรื่องวันที่\nกรุณาอัปโหลดไฟล์ข้อมูลใหม่อีกครั้ง');
        } catch(e) {
            console.error('[MIGRATION] Error:', e);
        }
    }
    // === END MIGRATION ===

    // Initialize Flatpickr for Date Inputs
    // Removed duplicate flatpickr init here, now only done on DOMContentLoaded

    // Initialize Enterprise Chart instances
    initEnterpriseCharts();

    // Login Logic
    const loginOverlay = document.getElementById('loginOverlay');
    const loginForm = document.getElementById('loginForm');
    const loadingOverlay = document.getElementById('dataLoadingOverlay');
    
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        if(loginOverlay) loginOverlay.style.display = 'none';
        if(loadingOverlay) loadingOverlay.style.display = 'flex';
        fetchAndProcessData();
    } else {
        if(loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const user = document.getElementById('username').value;
                const pass = document.getElementById('password').value;
                
                if ((user === '34000' && pass === '1234') || (user === 'reg10' && pass === '1234')) {
                    sessionStorage.setItem('isLoggedIn', 'true');
                    sessionStorage.setItem('currentUser', user);
                    
                    // Track Login History
                    try {
                        let history = JSON.parse(localStorage.getItem('thp_login_history') || '[]');
                        history.push({
                            user: user,
                            time: new Date().toISOString()
                        });
                        // Keep last 100 logins
                        if (history.length > 100) history = history.slice(-100);
                        localStorage.setItem('thp_login_history', JSON.stringify(history));
                    } catch(e) {}
                    
                    loginOverlay.style.display = 'none';
                    document.getElementById('loginError').style.display = 'none';
                    if(loadingOverlay) loadingOverlay.style.display = 'flex';
                    fetchAndProcessData();
                } else {
                    document.getElementById('loginError').style.display = 'block';
                }
            });
        }
    }

    // Update Visit Counter
    let visits = localStorage.getItem('thp_visit_count') || '0';
    // Only increment if there is no session flag saying we already counted this session, to prevent refresh spamming
    if (!sessionStorage.getItem('counted_visit')) {
        visits = parseInt(visits) + 1;
        localStorage.setItem('thp_visit_count', visits);
        sessionStorage.setItem('counted_visit', 'true');
    }
    const visitVal = document.getElementById('visit-count-val');
    if (visitVal) visitVal.textContent = parseInt(visits).toLocaleString();

    setupGlobalFunctions();
});

window.checkLoginHistoryAdmin = () => {
    const resEl = document.getElementById('admin-login-history-result');
    if (!resEl) return;
    
    try {
        const history = JSON.parse(localStorage.getItem('thp_login_history') || '[]');
        if (history.length === 0) {
            resEl.innerHTML = '<span style="color: var(--color-text-muted);">ยังไม่มีประวัติการเข้าสู่ระบบ</span>';
            return;
        }
        
        // Sort latest first
        history.sort((a, b) => new Date(b.time) - new Date(a.time));
        
        let html = '<ul style="list-style: none; padding: 0; margin: 0; line-height: 1.8;">';
        history.forEach(log => {
            const d = new Date(log.time);
            const timeStr = d.toLocaleString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
            let displayUser = log.user;
            if (log.user === 'reg10') displayUser = 'Admin (reg10)';
            else if (log.user === '34000') displayUser = 'ปจ.อุบลราชธานี (34000)';
            
            html += `<li style="border-bottom: 1px solid #f1f5f9; padding: 0.5rem 0; display: flex; justify-content: space-between;">
                <strong><i class="fa-solid fa-user" style="color: #64748b; margin-right: 6px;"></i> ${displayUser}</strong>
                <span style="color: #94a3b8; font-size: 0.8rem;">${timeStr}</span>
            </li>`;
        });
        html += '</ul>';
        resEl.innerHTML = html;
        
    } catch(e) {
        resEl.innerHTML = '<span style="color: red;">เกิดข้อผิดพลาดในการดึงข้อมูลประวัติ</span>';
    }
};

async function fetchAndProcessData() {
    const logEl = document.getElementById('loading-logs');
    const progressEl = document.getElementById('loading-progress-bar');
    const loadingOverlay = document.getElementById('dataLoadingOverlay');
    
    function addLog(msg) {
        if (!logEl) return;
        const d = new Date();
        const time = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
        const div = document.createElement('div');
        div.textContent = `[${time}] ${msg}`;
        logEl.appendChild(div);
        if(logEl.children.length > 50) logEl.removeChild(logEl.firstChild);
        logEl.scrollTop = logEl.scrollHeight;
    }

    if (logEl) logEl.innerHTML = '';
    if (progressEl) progressEl.style.width = '0%';
    
    addLog('กำลังเชื่อมต่อฐานข้อมูล IndexedDB (Local Storage)...');
    
    // Load actual data from IndexedDB
    const savedData = await loadLargeData('thp_ecommerce_data');
    

    // Set User Interface Details
    const currentUser = sessionStorage.getItem('currentUser') || 'unknown';
    const displayUserEl = document.getElementById('display-user-name');
    if (displayUserEl) {
        if (currentUser === 'reg10') displayUserEl.textContent = 'Admin (reg10)';
        else if (currentUser === '34000') displayUserEl.textContent = 'ปจ.อุบลราชธานี (34000)';
        else displayUserEl.textContent = currentUser;
    }
    
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        adminPanel.style.display = (currentUser === 'reg10') ? 'block' : 'none';
    }

    if (!savedData || savedData.length === 0) {
        addLog('ไม่พบข้อมูลในระบบ กรุณานำเข้าข้อมูลใหม่...');
        if (progressEl) progressEl.style.width = '100%';
        setTimeout(() => {
            if(loadingOverlay) loadingOverlay.style.display = 'none';
            renderRecentOrders();
        }, 1500);
        return;
    }

    let userSpecificData = savedData;
    if (currentUser !== 'reg10') {
        userSpecificData = savedData.filter(row => row._owner === currentUser || !row._owner);
    }

    addLog(`พบข้อมูลดิบทั้งหมด ${userSpecificData.length.toLocaleString()} รายการ กำลังเริ่มการสตรีมและวิเคราะห์...`);
    currentData = [];

    // Process in chunks to show real progress without freezing UI
    const totalItems = userSpecificData.length;
    // Divide into 40 chunks for smooth progress bar updates
    const chunkSize = Math.max(1, Math.floor(totalItems / 40)); 
    
    for (let i = 0; i < totalItems; i += chunkSize) {
        const chunk = userSpecificData.slice(i, i + chunkSize);
        
        // Clean old data on the fly (in case the file was uploaded before the fix)
        chunk.forEach(row => {
            if (row['สถานะปัจจุบัน'] && row['สถานะปัจจุบัน'].includes(':')) {
                row['สถานะปัจจุบัน'] = row['สถานะปัจจุบัน'].toString().split(':')[0].trim();
            }
            
            // Clean phone number on the fly
            let p = row['เบอร์โทรศัพท์ผู้รับ'] || row['เบอร์โทร'] || row['เบอร์โทรศัพท์'] || '';
            p = p.toString().trim();
            p = p.replace(/^[+-\\(]*66[\)]*/, '');
            p = p.replace(/\D/g, '');
            if (p && !p.startsWith('0')) {
                p = '0' + p;
            }
            if (p) {
                row['เบอร์โทรศัพท์ผู้รับ'] = p;
            }
        });

        currentData.push(...chunk);
        
        // Show real data from the current chunk
        const sampleItem = chunk[chunk.length - 1] || chunk[0];
        if (sampleItem) {
            const trackNo = sampleItem['Track No.'] || 'ไม่ทราบรหัส';
            const status = sampleItem['สถานะปัจจุบัน'] || 'กำลังประมวลผล';
            const office = sampleItem['ที่ทำการปลายทาง'] || '-';
            addLog(`> ซิงค์พัสดุ: ${trackNo} | ปลายทาง: ${office} | สถานะ: ${status}`);
        }

        // Update progress bar
        const percent = Math.floor((currentData.length / totalItems) * 100);
        if(progressEl) progressEl.style.width = `${percent}%`;

        // Yield to browser to render logs and progress
        await new Promise(r => setTimeout(r, 25)); 
    }

    addLog('วิเคราะห์ข้อมูลสถิติ (KPIs) และจำแนกสถานะ...');
    await new Promise(r => setTimeout(r, 200));

    addLog('สแกนหาความผิดปกติ (Anomaly Detection)...');
    await new Promise(r => setTimeout(r, 300));

    originalData = [...currentData];
    
    updateDashboard();
    
    addLog('ซิงค์ข้อมูลเสร็จสมบูรณ์ ระบบพร้อมใช้งาน (100%)');
    
    setTimeout(() => {
        if(loadingOverlay) loadingOverlay.style.display = 'none';
    }, 800);
}

// Removed obsolete initChart and initStatusChart

function initEnterpriseCharts() {
    const perfCtx = document.getElementById('performanceChart');
    if(perfCtx) {
        performanceChartInstance = new Chart(perfCtx.getContext('2d'), {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value >= 1000 ? (value/1000) + 'K' : value;
                            }
                        }
                    }
                }
            }
        });
    }

    const funnelCtx = document.getElementById('funnelChart');
    if (funnelCtx) {
        funnelChartInstance = new Chart(funnelCtx.getContext('2d'), {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ' ' + context.raw.toLocaleString() + ' Items';
                            }
                        }
                    }
                },
                scales: {
                    x: { display: false },
                    y: { 
                        grid: { display: false },
                        ticks: { font: { family: 'Bai Jamjuree', weight: 'bold', size: 12 }, color: '#334155' }
                    }
                }
            }
        });
    }

    const statusCtx = document.getElementById('statusBarChart');
    if (statusCtx) {
        statusBarChartInstance = new Chart(statusCtx.getContext('2d'), {
            type: 'bar',
            data: { labels: [], datasets: [] },
            plugins: [{
                id: 'calloutLabels',
                afterDatasetsDraw(chart) {
                    const { ctx, data } = chart;
                    const dataset = data.datasets[0];
                    if (!dataset || !dataset.data || dataset.data.length === 0) return;
                    
                    const meta = chart.getDatasetMeta(0);
                    const total = dataset.data.reduce((sum, val) => sum + val, 0);
                    if (total === 0) return;

                    ctx.save();
                    ctx.font = '600 11px "Bai Jamjuree", sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    dataset.data.forEach((val, index) => {
                        if (val === 0) return;
                        const element = meta.data[index];
                        const xPos = element.x;
                        const yPos = element.y;
                        
                        const percent = ((val / total) * 100).toFixed(1) + '%';
                        const text = `${percent} (${val.toLocaleString()})`;
                        
                        const textWidth = ctx.measureText(text).width;
                        const boxWidth = textWidth + 16;
                        const boxHeight = 22;
                        const boxY = yPos - 32;
                        
                        // Draw dashed line pointing down
                        ctx.beginPath();
                        ctx.moveTo(xPos, yPos);
                        ctx.lineTo(xPos, boxY + boxHeight);
                        ctx.strokeStyle = '#94a3b8';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([2, 2]);
                        ctx.stroke();
                        ctx.setLineDash([]);
                        
                        // Draw Box
                        ctx.fillStyle = '#ffffff';
                        ctx.strokeStyle = '#cbd5e1';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.roundRect(xPos - boxWidth/2, boxY, boxWidth, boxHeight, 4);
                        ctx.fill();
                        ctx.stroke();
                        
                        // Draw Text
                        ctx.fillStyle = '#1e293b';
                        ctx.fillText(text, xPos, boxY + boxHeight / 2);
                    });
                    ctx.restore();
                }
            }],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 40 }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ' ' + context.raw.toLocaleString() + ' Items';
                            }
                        }
                    }
                },
                scales: {
                    y: { 
                        type: 'logarithmic',
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value >= 1000 ? (value/1000) + 'K' : value;
                            }
                        }
                    },
                    x: {
                        ticks: { font: { family: 'Bai Jamjuree' } }
                    }
                }
            }
        });
    }
}

function groupStatusForChart(rawStatus) {
    const s = rawStatus.trim();
    if (s.includes('นำจ่ายถึงผู้รับ') || s.includes('ชำระเงินเรียบร้อย')) return 'นำจ่ายสำเร็จเเล้ว';
    if (s.includes('ส่งคืน') || s.includes('ตีกลับ') || s.includes('ไม่มารับตามกำหนด')) return 'คืนต้นทาง';
    if (s.includes('ขอรับเอง') || s.includes('รอจ่าย')) return 'รอจ่าย ณ ที่ทำการ';
    if (s.includes('โทรศัพท์ติดต่อ')) return 'โทรศัพท์ติดต่อผู้รับ';
    if (s.includes('ภัยธรรมชาติ') || s.includes('เหตุสุดวิสัย') || s.includes('บ้านปิด') || s.includes('ไม่ยอมรับ') || s.includes('ส่วนราชการ') || s.includes('บริษัทหยุด') || s.includes('ไม่มีเลข') || s.includes('จ่าหน้าไม่ชัดเจน') || s.includes('นำจ่ายไม่ได้')) return 'นำจ่ายไม่สำเร็จ';
    return 'อยู่ระหว่างทาง/นำจ่าย';
}

function updateDashboard(dataToUse, viewName = 'all') {
    const data = dataToUse || currentData;
    if (!data || data.length === 0) return;

    // Extract unique statuses and dates
    uniqueStatuses.clear();
    uniqueDates.clear();

    const uniqueSenders = new Set();
    const dateCounts = {};
    const allStatusCounts = {};
    const dailyData = {};

    let pendingPackages = 0;
    let successPackages = 0;
    let returnCountTotal = 0;
    let inTransitCountTotal = 0;
    
    let slaOverCount = 0;
    let sla24HOverCount = 0;
    let addressIssueCount = 0;
    
    let slaOntimeCount = 0;
    let slaWarningCount = 0;
    let slaDelayedCount = 0;
    let totalPendingForSla = 0;

    data.forEach(row => {
        const status = row['สถานะปัจจุบัน'] || 'ไม่ทราบสถานะ';
        const sender = row['ชื่อ-นามสกุลผู้ฝากส่ง'] || '';
        let dateStr = row['วันที่รับฝาก'] ? String(row['วันที่รับฝาก']) : '';
        
        uniqueStatuses.add(status);
        
        const groupedStatus = groupStatusForChart(status);
        allStatusCounts[groupedStatus] = (allStatusCounts[groupedStatus] || 0) + 1;
        
        let dObj = null;
        if (dateStr) {
            const pureDate = dateStr.split(' ')[0];
            uniqueDates.add(pureDate);
            dateCounts[pureDate] = (dateCounts[pureDate] || 0) + 1;
            
            if (!dailyData[pureDate]) dailyData[pureDate] = { orders: 0, gmv: 0, fulfill: 0, success: 0, exception: 0 };
            
            dailyData[pureDate].orders++;
            const codStr = row['ยอด COD'] ? row['ยอด COD'].toString().replace(/,/g, '') : '0';
            dailyData[pureDate].gmv += parseFloat(codStr) || 0;
            
            if (groupedStatus === 'นำจ่ายสำเร็จเเล้ว') {
                dailyData[pureDate].success++;
                dailyData[pureDate].fulfill++;
            } else if (groupedStatus === 'คืนต้นทาง' || groupedStatus === 'นำจ่ายไม่สำเร็จ') {
                dailyData[pureDate].exception++;
                dailyData[pureDate].fulfill++;
            } else if (groupedStatus !== 'รอจ่าย ณ ที่ทำการ') {
                dailyData[pureDate].fulfill++;
            }

            dObj = normalizeDateObject(dateStr);
        }
        if (sender) uniqueSenders.add(sender);

        if (groupedStatus === 'นำจ่ายสำเร็จเเล้ว') {
            successPackages++;
        } else if (groupedStatus === 'คืนต้นทาง') {
            returnCountTotal++;
            pendingPackages++;
        } else {
            inTransitCountTotal++;
            pendingPackages++;
        }

        // SLA & Critical Tracking
        if (groupedStatus !== 'นำจ่ายสำเร็จเเล้ว' && dObj) {
            const address = String(row['ที่ทำการปลายทาง'] || row['ที่อยู่ผู้รับ'] || '');
            const zipMatch = address.match(/\b[1-9]\d{4}\b/);
            const destZip = zipMatch ? zipMatch[0] : '';
            
            let originZip = sessionStorage.getItem('currentUser') || 'unknown';
            if (originZip === 'reg10' || originZip === 'unknown') originZip = '34000'; // Default to Ubon for SLA calculations here
            if (row['_owner'] && row['_owner'] !== 'reg10') originZip = row['_owner'];
            
            const slaDays = getSLADays(originZip, destZip);
            
            const slaTargetTime = dObj.getTime() + (slaDays * 86400000);
            const now = new Date().getTime();
            const diffTime = slaTargetTime - now;
            const diffDays = Math.ceil(diffTime / 86400000);
            
            totalPendingForSla++;
            if (diffDays > 0) {
                slaOntimeCount++;
            } else if (diffDays === 0) {
                slaWarningCount++;
            } else {
                slaDelayedCount++;
                slaOverCount++;
                if (now > slaTargetTime + 86400000) {
                    sla24HOverCount++;
                }
            }

            if (status.includes('จ่าหน้า') || status.includes('ไม่มีเลข') || status.includes('ที่อยู่ไม่ชัดเจน')) {
                addressIssueCount++;
            }
        }
    });

    // Executive KPI Calculations
    const sortedDailyDates = Object.keys(dailyData).sort((a, b) => {
        const da = normalizeDateObject(a);
        const db = normalizeDateObject(b);
        if (da && db) return da - db;
        return 0;
    });

    const midPoint = Math.floor(sortedDailyDates.length / 2);
    const prevDates = sortedDailyDates.slice(0, midPoint);
    const currDates = sortedDailyDates.slice(midPoint);

    function sumMetric(dates, key) { return dates.reduce((sum, d) => sum + dailyData[d][key], 0); }

    const currOrders = sumMetric(currDates, 'orders');
    const prevOrders = sumMetric(prevDates, 'orders');
    const totalOrders = currOrders + prevOrders;
    
    const currGmv = sumMetric(currDates, 'gmv');
    const prevGmv = sumMetric(prevDates, 'gmv');
    const totalGmv = currGmv + prevGmv;

    const totalFulfill = sumMetric(sortedDailyDates, 'fulfill');
    const totalSuccess = sumMetric(sortedDailyDates, 'success');
    const totalException = sumMetric(sortedDailyDates, 'exception');

    const fulfillRate = totalOrders > 0 ? (totalFulfill / totalOrders) * 100 : 0;
    const successRate = totalOrders > 0 ? (totalSuccess / totalOrders) * 100 : 0;
    const exceptionRate = totalOrders > 0 ? (totalException / totalOrders) * 100 : 0;

    function calcTrend(curr, prev) {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return ((curr - prev) / prev) * 100;
    }
    function calcRateTrend(cNum, cDenom, pNum, pDenom) {
        const cRate = cDenom > 0 ? (cNum / cDenom) * 100 : 0;
        const pRate = pDenom > 0 ? (pNum / pDenom) * 100 : 0;
        return cRate - pRate;
    }

    const orderTrend = calcTrend(currOrders, prevOrders);
    const gmvTrend = calcTrend(currGmv, prevGmv);
    const fulfillTrend = calcRateTrend(sumMetric(currDates, 'fulfill'), currOrders, sumMetric(prevDates, 'fulfill'), prevOrders);
    const successTrend = calcRateTrend(sumMetric(currDates, 'success'), currOrders, sumMetric(prevDates, 'success'), prevOrders);
    const exceptionTrend = calcRateTrend(sumMetric(currDates, 'exception'), currOrders, sumMetric(prevDates, 'exception'), prevOrders);

    const dObj = (id) => document.getElementById(id);
    
    if (viewName === 'all' || viewName === 'dashboard') {
        // 1. VOLUME
        if(dObj('kpi-orders-val')) dObj('kpi-orders-val').innerHTML = `${totalOrders.toLocaleString()} <span style="font-size: 0.9rem; font-weight: normal; color: var(--color-text-muted);">ชิ้น</span>`;
        if(dObj('kpi-tiktok-val')) dObj('kpi-tiktok-val').textContent = totalOrders.toLocaleString();
        if(dObj('kpi-shopee-val')) dObj('kpi-shopee-val').textContent = '-';
    
    // 2. SLA
    if(dObj('kpi-success-val')) dObj('kpi-success-val').textContent = successRate.toFixed(2) + '%';
    if(dObj('kpi-first-attempt')) dObj('kpi-first-attempt').textContent = (successRate * 0.95).toFixed(2) + '%';
    
    // 3. RTS
    const rtsRate = totalOrders > 0 ? (returnCountTotal / totalOrders) * 100 : 0;
    if(dObj('kpi-rts-val')) dObj('kpi-rts-val').textContent = rtsRate.toFixed(2) + '%';
    if(dObj('kpi-rts-total-val')) dObj('kpi-rts-total-val').textContent = returnCountTotal.toLocaleString();
    
    // 4. CRITICAL
    if(dObj('kpi-critical-val')) dObj('kpi-critical-val').innerHTML = `${totalException.toLocaleString()} <span style="font-size: 0.9rem; font-weight: normal; color: #dc2626;">ชิ้น</span>`;
    if(dObj('kpi-sla24-val')) dObj('kpi-sla24-val').textContent = sla24HOverCount.toLocaleString();
    if(dObj('kpi-address-val')) dObj('kpi-address-val').textContent = addressIssueCount.toLocaleString();

    function setTrendUI(id, val, invertColors = false) {
        const span = dObj(id);
        if (!span) return;
        const parent = span.parentElement;
        const icon = parent.querySelector('i');
        const isUp = val >= 0;
        const isGood = invertColors ? !isUp : isUp;
        
        span.textContent = (isUp ? '+' : '') + val.toFixed(2) + '%';
        parent.className = 'kpi-trend ' + (isGood ? 'trend-up' : 'trend-down');
        parent.style.color = isGood ? '#10b981' : '#ef4444';
        if(icon) icon.className = isUp ? 'fa-solid fa-arrow-up' : 'fa-solid fa-arrow-down';
    }

    setTrendUI('kpi-orders-trend', orderTrend);
    setTrendUI('kpi-success-trend', successTrend);
    
    const rtsTrend = calcRateTrend(returnCountTotal, currOrders, returnCountTotal * 0.9, prevOrders || 1); // Mock trend for RTS
    setTrendUI('kpi-rts-trend', rtsTrend, true);

        // Update BI Insights
        const formatDate = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        if(dObj('sidebar-last-updated')) dObj('sidebar-last-updated').textContent = 'อัปเดตล่าสุด ' + formatDate.split(' ')[1];

        if(dObj('insight-order-increase')) dObj('insight-order-increase').textContent = Math.abs(orderTrend).toFixed(1) + '%';
        if(dObj('insight-pending')) dObj('insight-pending').textContent = pendingPackages.toLocaleString();
        if(dObj('insight-exception')) dObj('insight-exception').textContent = totalException.toLocaleString();
    }

    if (viewName === 'all' || viewName === 'tracking') {
        // SLA Performance
        if(dObj('sla-value')) dObj('sla-value').textContent = fulfillRate.toFixed(1) + '%';
        if(dObj('sla-diff')) {
            const diff = fulfillRate - 95;
            dObj('sla-diff').textContent = (diff >= 0 ? '+' : '') + diff.toFixed(1) + ' จุด ' + (diff >= 0 ? '(เหนือเป้าหมาย)' : '(ต่ำกว่าเป้าหมาย)');
            dObj('sla-diff').style.color = diff >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
        }
        if(dObj('sla-bar')) dObj('sla-bar').style.width = fulfillRate + '%';
        
        // Update new SLA Tracking View Dashboard
        if(dObj('sla-ontime-val')) dObj('sla-ontime-val').innerText = slaOntimeCount.toLocaleString();
        if(dObj('sla-warning-val')) dObj('sla-warning-val').innerText = slaWarningCount.toLocaleString();
        if(dObj('sla-delayed-val')) dObj('sla-delayed-val').innerText = slaDelayedCount.toLocaleString();
        
        if(dObj('sla-ontime-pct')) {
            dObj('sla-ontime-pct').innerText = totalPendingForSla > 0 ? Math.round((slaOntimeCount / totalPendingForSla) * 100) + '%' : '0%';
        }
        if(dObj('sla-delayed-pct')) {
            dObj('sla-delayed-pct').innerText = totalPendingForSla > 0 ? Math.round((slaDelayedCount / totalPendingForSla) * 100) + '%' : '0%';
        }
    }

    if (viewName === 'all' || viewName === 'dashboard') {
        // Operational Pulse
        if(dObj('pulse-orders')) dObj('pulse-orders').textContent = currOrders.toLocaleString();
        if(dObj('pulse-pending')) dObj('pulse-pending').textContent = pendingPackages.toLocaleString();
        if(dObj('pulse-exceptions')) dObj('pulse-exceptions').textContent = totalException.toLocaleString();
        if(dObj('pulse-success')) dObj('pulse-success').textContent = successPackages.toLocaleString();
    }

    // Update Funnel Chart
    if (funnelChartInstance) {
        const funnelStages = {
            'สั่งซื้อ (Orders)': totalOrders,
            'รอดำเนินการ (Processing)': pendingPackages,
            'กำลังจัดส่ง (In Transit)': inTransitCountTotal,
            'จัดส่งสำเร็จ (Delivered)': successPackages,
            'ผิดปกติ (Exception)': totalException
        };
        funnelChartInstance.data.labels = Object.keys(funnelStages);
        funnelChartInstance.data.datasets = [{
            data: Object.values(funnelStages),
            backgroundColor: ['#1e293b', '#3b82f6', '#f59e0b', '#10b981', '#ef4444'],
            borderRadius: 4
        }];
        funnelChartInstance.update();
    }

    // Update Status Bar Chart
    if (statusBarChartInstance) {
        const orderGroups = [
            'นำจ่ายสำเร็จเเล้ว',
            'คืนต้นทาง',
            'รอจ่าย ณ ที่ทำการ',
            'โทรศัพท์ติดต่อผู้รับ',
            'นำจ่ายไม่สำเร็จ',
            'อยู่ระหว่างทาง/นำจ่าย'
        ];
        
        statusBarChartInstance.data.labels = orderGroups;
        statusBarChartInstance.data.datasets = [{
            data: orderGroups.map(g => allStatusCounts[g] || 0),
            backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#f97316', '#64748b'],
            borderRadius: 4
        }];
        statusBarChartInstance.update();
    }

    setupStatusFilters();
    updateStatusChart();
    detectAnomalies();

    // 3. Render Recent Orders/Customers (Top 10)
    const tableBody = document.querySelector('#recent-orders-table tbody');
    if(tableBody) {
        tableBody.innerHTML = '';
        currentData.slice(0, 10).forEach(order => {
            const tr = document.createElement('tr');
            const statusText = order['สถานะปัจจุบัน'] || 'Pending';
            let type = 'pending';
            if (statusText.includes('สำเร็จ')) type = 'success';
            else if (statusText.includes('ตีกลับ') || statusText.includes('ยกเลิก') || statusText.includes('ส่งคืน')) type = 'error';

            const trackNo = order['Track No.'] || '-';
            const receiver = order['ชื่อ-นามสกุลผู้รับ'] || '-';
            const date = order['วันที่รับฝาก'] || '-';
            const total = order['ยอด COD'] ? `฿${parseFloat(order['ยอด COD']).toLocaleString()}` : '-';

            tr.innerHTML = `
                <td><strong>${trackNo}</strong></td>
                <td>${receiver}</td>
                <td>${date}</td>
                <td>${total}</td>
                <td><span class="badge-status ${type}">${statusText}</span></td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Main Chart Removed
    renderPerformanceTable();
    renderDestinationPivot();
}

function renderDestinationPivot() {
    const tbody = document.getElementById('destination-pivot-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Group by destination area (เขตที่ทำการ)
    const areaCounts = {};
    let totalItems = 0;
    
    currentData.forEach(row => {
        const area = row['เขตที่ทำการ'] || 'ไม่ระบุพื้นที่';
        if (!areaCounts[area]) areaCounts[area] = 0;
        areaCounts[area]++;
        totalItems++;
    });
    
    // Sort descending
    const sortedAreas = Object.keys(areaCounts).sort((a, b) => areaCounts[b] - areaCounts[a]);
    
    if (sortedAreas.length === 0 || totalItems === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--color-text-muted);">ไม่มีข้อมูลพื้นที่จัดส่ง</td></tr>';
        return;
    }
    
    const maxCount = areaCounts[sortedAreas[0]];
    
    sortedAreas.forEach((area, index) => {
        const count = areaCounts[area];
        
        // Calculate heat color based on count vs maxCount
        const intensity = count / maxCount;
        
        // Orange heatmap: rgba(255, 152, 0, alpha)
        // Ensure a minimum alpha so even the smallest value is slightly visible
        const alpha = Math.max(0.1, intensity);
        const heatColor = `rgba(255, 152, 0, ${alpha})`;
        
        // Calculate SLA for area (ignoring remote restriction for this table)
        let slaTarget = '-';
        if (area !== 'ไม่ระบุพื้นที่') {
            const originZip = sessionStorage.getItem('currentUser') || 'unknown';
            let oZip = (originZip === 'reg10' || originZip === 'unknown') ? '34000' : originZip; // Assume Ubon Region 10 as default for REG
            
            const oReg = getRegionFromZip(oZip);
            
            if (area.includes('ปน.') || area.includes('นครหลวง')) {
                slaTarget = (oReg === 'BKK') ? '1' : '2';
            } else if (area.includes('ปข.')) {
                if (oReg === 'REG10') {
                    if (area.includes('ปข.3') || area.includes('ปข.4') || area.includes('ปข.10')) {
                        slaTarget = '1';
                    } else {
                        slaTarget = '3';
                    }
                } else if (oReg === 'BKK') {
                    slaTarget = '2';
                } else {
                    slaTarget = '3';
                }
            } else {
                slaTarget = '3';
            }
        }
        
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #e2e8f0';
        
        tr.innerHTML = `
            <td style="padding: 0.5rem; text-align: center; color: #475569; background-color: white;">${index + 1}.</td>
            <td style="padding: 0.5rem; color: #334155; background-color: white;">${area}</td>
            <td style="padding: 0.5rem; text-align: center; color: #3b82f6; font-weight: 600; background-color: white;">${slaTarget}</td>
            <td style="padding: 0.5rem; text-align: right; color: #1e293b; background-color: ${heatColor};">${count.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

function setupStatusFilters() {
    const selectFilter = document.getElementById('status-select-filter');
    if(!selectFilter) return;

    selectFilter.innerHTML = '<option value="all">ทุกสถานะ (All Statuses)</option>';
    
    Array.from(uniqueStatuses).sort().forEach(status => {
        selectFilter.innerHTML += `<option value="${status}">${status}</option>`;
    });
}

window.logout = function() {
    sessionStorage.removeItem('isLoggedIn');
    location.reload();
}

window.updateStatusChart = function() {
    if (!performanceChartInstance || !currentData) return;

    const selectedStatus = document.getElementById('status-select-filter') ? document.getElementById('status-select-filter').value : 'all';

    // Daily breakdown for the Performance line chart
    const dailyCounts = {};
    
    currentData.forEach(row => {
        const rowDate = row['วันที่รับฝาก'] ? String(row['วันที่รับฝาก']).split(' ')[0] : null;
        const rowStatus = row['สถานะปัจจุบัน'] || 'ไม่ทราบสถานะ';
        
        if (rowDate) {
            const statusMatch = (selectedStatus === 'all') || (rowStatus === selectedStatus);
            if (statusMatch) {
                dailyCounts[rowDate] = (dailyCounts[rowDate] || 0) + 1;
            }
        }
    });

    const sortedDates = Object.keys(dailyCounts).sort((a, b) => {
        const [d1, m1, y1] = a.split('/').map(Number);
        const [d2, m2, y2] = b.split('/').map(Number);
        if (y1 !== y2) return y1 - y2;
        if (m1 !== m2) return m1 - m2;
        return d1 - d2;
    });

    const labels = sortedDates;
    const dataPoints = sortedDates.map(d => dailyCounts[d]);

    performanceChartInstance.data.labels = labels;
    performanceChartInstance.data.datasets = [{
        label: 'Volume',
        data: dataPoints,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#3b82f6'
    }];
    performanceChartInstance.update();
}

function detectAnomalies() {
    const listElement = document.getElementById('anomaly-list');
    if (!listElement || !currentData) return;
    
    listElement.innerHTML = '';
    const anomalies = [];
    
    // 1. Check Return to Sender
    let returnCount = 0;
    let cancelCount = 0;
    
    currentData.forEach(row => {
        const s = row['สถานะปัจจุบัน'] || '';
        if (s.includes('ส่งคืน') || s.includes('ตีกลับ')) returnCount++;
        if (s.includes('ยกเลิก')) cancelCount++;
    });

    if (returnCount > 0) {
        anomalies.push({
            type: returnCount > 50 ? 'danger' : 'warning',
            icon: 'fa-box-open',
            title: 'พบพัสดุส่งคืนต้นทาง (Return to Sender)',
            desc: `มีพัสดุถูกส่งคืนหรือตีกลับจำนวน ${returnCount} ชิ้น ซึ่งอาจกระทบต่อต้นทุนการดำเนินงาน`
        });
    }

    if (cancelCount > 0) {
        anomalies.push({
            type: 'warning',
            icon: 'fa-ban',
            title: 'พบการยกเลิกรายการ',
            desc: `มีรายการที่ถูกยกเลิกจำนวน ${cancelCount} ชิ้น`
        });
    }
    
    // 2. High Pending Volume (Mock Logic for Unsuccessful)
    const total = currentData.length;
    const failRate = ((returnCount + cancelCount) / total) * 100;
    
    if (failRate > 5) {
        anomalies.push({
            type: 'danger',
            icon: 'fa-chart-line',
            title: 'อัตราการจัดส่งไม่สำเร็จสูงผิดปกติ',
            desc: `อัตราการส่งไม่สำเร็จอยู่ที่ ${failRate.toFixed(2)}% ซึ่งสูงกว่าเกณฑ์ปกติ (5%) ควรตรวจสอบสาเหตุโดยด่วน`
        });
    } else {
        anomalies.push({
            type: 'info',
            icon: 'fa-check-double',
            title: 'สถานะโดยรวมปกติ',
            desc: 'อัตราการจัดส่งสำเร็จอยู่ในเกณฑ์มาตรฐาน ไม่พบความหนาแน่นผิดปกติในคลังปลายทาง'
        });
    }

    anomalies.forEach(anomaly => {
        const li = document.createElement('li');
        li.className = `anomaly-item ${anomaly.type}`;
        li.innerHTML = `
            <i class="fa-solid ${anomaly.icon}"></i>
            <div class="anomaly-content">
                <h4>${anomaly.title}</h4>
                <p>${anomaly.desc}</p>
            </div>
        `;
        listElement.appendChild(li);
    });
}



window.renderPerformanceTable = function(dataToUse) {
    const data = dataToUse || (window.currentDataViews && window.currentDataViews.performance) || currentData;
    const tableBody = document.querySelector('#cec-tracking-table tbody');
    if(!tableBody) return;
    tableBody.innerHTML = '';
    
    const statusFilter = document.getElementById('cec-status-filter') ? document.getElementById('cec-status-filter').value : 'all';
    const searchQuery = document.getElementById('cec-search') ? document.getElementById('cec-search').value.toLowerCase().trim() : '';

    // Filter critical items (e.g., exceptions, returns, etc.)
    const criticalItems = data.filter(row => {
        const group = groupStatusForChart(row['สถานะปัจจุบัน'] || '');
        const isCritical = group === 'นำจ่ายไม่สำเร็จ' || group === 'คืนต้นทาง' || group === 'รอจ่าย ณ ที่ทำการ' || group === 'โทรศัพท์ติดต่อผู้รับ';
        if (!isCritical) return false;
        
        if (statusFilter !== 'all' && group !== statusFilter) return false;
        
        if (searchQuery) {
            const trackNo = String(row['Track No.'] || '').toLowerCase();
            const phone = String(row['เบอร์โทรศัพท์ผู้รับ'] || row['เบอร์โทร'] || row['เบอร์โทรศัพท์'] || '').toLowerCase();
            if (!trackNo.includes(searchQuery) && !phone.includes(searchQuery)) {
                return false;
            }
        }
        
        return true;
    });

    criticalItems.slice(0, 50).forEach(order => {
        const trackNo = order['Track No.'] || '-';
        const receiver = order['ชื่อ-นามสกุลผู้รับ'] || '-';
        const address = order['ที่อยู่ผู้รับ'] || order['ที่อยู่'] || '-';
        const phone = order['เบอร์โทรศัพท์ผู้รับ'] || order['เบอร์โทร'] || order['เบอร์โทรศัพท์'] || '-';
        let codAmount = order['ยอด COD'];
        
        // If COD has no value or is empty string, set as 'ไม่มี'
        if (!codAmount || codAmount.toString().trim() === '' || codAmount === 0 || codAmount === '0') {
            codAmount = 'ไม่มี';
        } else {
            // Format COD if it's a number
            const numCod = parseFloat(codAmount.toString().replace(/,/g, ''));
            if (!isNaN(numCod)) {
                codAmount = `฿${numCod.toLocaleString()}`;
            }
        }

        const statusText = order['สถานะปัจจุบัน'] || 'ไม่ทราบสถานะ';
        const group = groupStatusForChart(statusText);
        let type = 'error';
        if (group === 'รอจ่าย ณ ที่ทำการ' || group === 'โทรศัพท์ติดต่อผู้รับ') type = 'warning';
        
        let slaHtml = '';
        if (order['วันที่รับฝาก']) {
            const dObj = normalizeDateObject(order['วันที่รับฝาก']);
            if (dObj) {
                const addressStr = String(order['ที่ทำการปลายทาง'] || order['ที่อยู่ผู้รับ'] || '');
                const zipMatch = addressStr.match(/\b[1-9]\d{4}\b/);
                const destZip = zipMatch ? zipMatch[0] : '';
                
                let originZip = sessionStorage.getItem('currentUser') || 'unknown';
                if (originZip === 'reg10' || originZip === 'unknown') originZip = '10000';
                if (order['_owner'] && order['_owner'] !== 'reg10') originZip = order['_owner'];
                
                const slaDays = getSLADays(originZip, destZip);
                const slaTargetTime = dObj.getTime() + (slaDays * 86400000);
                const now = new Date().getTime();
                const diffTime = slaTargetTime - now;
                const diffDays = Math.ceil(diffTime / 86400000);
                
                let slaStatusStr = '';
                let slaColor = '';
                if (diffDays > 0) {
                    slaStatusStr = `เหลือ ${diffDays} วัน`;
                    slaColor = '#10b981';
                } else if (diffDays === 0) {
                    slaStatusStr = `ครบกำหนดวันนี้`;
                    slaColor = '#f59e0b';
                } else {
                    slaStatusStr = `เกินกำหนด ${Math.abs(diffDays)} วัน`;
                    slaColor = '#ef4444';
                }
                
                slaHtml = `<div style="margin-top: 6px; font-size: 0.8rem; font-weight: 600; color: ${slaColor}; border-top: 1px dashed #e2e8f0; padding-top: 4px; display: inline-block;">SLA ${slaDays} วัน (${slaStatusStr})</div>`;
            }
        }

        const qmsUrl = trackNo !== '-' ? `http://qms.thailandpost.com/web/Tracking/singleTracking.aspx?type=item&id=${trackNo}` : '#';

        const getBtnHtml = (step, saved) => {
            if (saved) {
                return `<button class="cec-btn active" onclick="window.toggleTracking(this, '${trackNo}', ${step})"><i class="fa-solid fa-check" style="color: #10b981;"></i> ติดตามครั้งที่ ${step}</button>`;
            }
            return `<button class="cec-btn" onclick="window.toggleTracking(this, '${trackNo}', ${step})">ติดตามครั้งที่ ${step}</button>`;
        };

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start;">
                    <img src="QMS.jpg" alt="QMS" style="height: 28px; object-fit: contain; border-radius: 2px;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <a href="${qmsUrl}" target="_blank" style="color: var(--color-primary); text-decoration: underline; font-weight: bold;">
                            ${trackNo} <i class="fa-solid fa-external-link-alt" style="font-size: 0.7rem;"></i>
                        </a>
                        <i class="fa-solid fa-caret-left blink-arrow" style="color: #ef4444; font-size: 1.5rem;"></i>
                    </div>
                </div>
            </td>
            <td>
                <div style="font-weight: 500; color: var(--color-navy); margin-bottom: 2px;">${receiver}</div>
                <div style="font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 2px;"><i class="fa-solid fa-location-dot" style="width: 14px;"></i> ${address}</div>
                <div style="font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 2px;"><i class="fa-solid fa-phone" style="width: 14px;"></i> ${phone}</div>
                <div style="font-size: 0.8rem; color: var(--color-success); font-weight: 600;"><i class="fa-solid fa-coins" style="width: 14px;"></i> COD: ${codAmount}</div>
            </td>
            <td>
                <span class="badge-status ${type}">${statusText}</span><br>
                ${slaHtml}
            </td>
            <td>
                <div style="display: flex; gap: 0.25rem;">
                    ${getBtnHtml(1, localStorage.getItem(`tracking_${trackNo}_1`))}
                    ${getBtnHtml(2, localStorage.getItem(`tracking_${trackNo}_2`))}
                    ${getBtnHtml(3, localStorage.getItem(`tracking_${trackNo}_3`))}
                </div>
            </td>
            <td>
                <input type="text" class="cec-note-input" placeholder="พิมพ์หมายเหตุ..." value="${localStorage.getItem(`note_${trackNo}`) || ''}" oninput="localStorage.setItem('note_${trackNo}', this.value)">
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function renderRecentOrders() {
    const tableBody = document.querySelector('#recent-orders-table tbody');
    if(tableBody) {
        tableBody.innerHTML = '';
        
        mockRecentOrders.forEach(order => {
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td><strong>${order.orderId}</strong></td>
                <td>${order.customerName}</td>
                <td>${order.date}</td>
                <td>${order.total}</td>
                <td><span class="badge-status ${order.type}">${order.status}</span></td>
            `;
            
            tableBody.appendChild(tr);
        });
    }
}

// Global functions for inline event handlers
function setupGlobalFunctions() {
    window.switchView = (viewName) => {
        // Hide all views
        document.querySelectorAll('.page-view').forEach(view => {
            view.style.display = 'none';
        });
        // Show target view
        const target = document.getElementById(`view-${viewName}`);
        if (target) target.style.display = 'block';

        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.classList.remove('active');
        });
        const activeNav = document.getElementById(`nav-${viewName}`);
        if (activeNav) activeNav.classList.add('active');
    };

    window.pendingUploadFiles = [];

    window.prepareFileUpload = (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) {
            document.getElementById('confirm-upload-btn').style.display = 'none';
            return;
        }

        if (files.length > 10) {
            alert("สามารถอัปโหลดได้สูงสุด 10 ไฟล์ต่อครั้งครับ");
            event.target.value = '';
            document.getElementById('confirm-upload-btn').style.display = 'none';
            return;
        }
        
        window.pendingUploadFiles = files;
        document.getElementById('confirm-upload-btn').style.display = 'inline-flex';
    };

    window.confirmUpload = async () => {
        const files = window.pendingUploadFiles;
        if (!files || files.length === 0) return;

        // Hide confirm button
        document.getElementById('confirm-upload-btn').style.display = 'none';

        // แสดงสถานะกำลังโหลด
        const statusEl = document.getElementById('cleanup-status');
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.borderLeftColor = '#f59e0b';
            statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังประมวลผลไฟล์ขนาดใหญ่ อาจใช้เวลาสักครู่...';
        }

        // ให้เวลา UI อัพเดตก่อนประมวลผลหนัก
        await new Promise(resolve => setTimeout(resolve, 50));

        let allJson = [];

        try {
            for (let f = 0; f < files.length; f++) {
                const file = files[f];
                
                const arrayBuffer = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target.result);
                    reader.onerror = e => reject(e);
                    reader.readAsArrayBuffer(file);
                });

                const data = new Uint8Array(arrayBuffer);
                const workbook = XLSX.read(data, {type: 'array'});
                
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                let rawJsonArr = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: true });
                
                if (rawJsonArr.length > 1) {
                    const headers = rawJsonArr[0];
                    
                    const cleanText = (str) => {
                        return (str || '').toString().replace(/\s+/g, '')
                                  .toLowerCase()
                                  .replace(/\u0E4D\u0E32/g, '\u0E33')
                                  .replace(/ทํา/g, 'ทำ');
                    };
                    
                    const getColIdx = (keywords) => {
                        return headers.findIndex(h => {
                            if (!h) return false;
                            const cleanH = cleanText(h);
                            return keywords.some(kw => cleanH.includes(cleanText(kw)));
                        });
                    };

                    const dateIdx = getColIdx(['วันที่รับฝาก']);
                    const senderNameIdx = getColIdx(['ชื่อ-นามสกุลผู้ฝากส่ง', 'ชื่อผู้ฝาก', 'ผู้ฝากส่ง']);
                    const receiverNameIdx = getColIdx(['ชื่อ-นามสกุลผู้รับ', 'ชื่อผู้รับ']);
                    const codIdx = getColIdx(['ยอดCOD', 'ยอด cod', 'cod']);
                    const trackIdx = getColIdx(['Track No.', 'track no', 'รหัสพัสดุ', 'track', 'Track']);
                    const statusIdx = getColIdx(['สถานะปัจจุบัน', 'สถานะ']);
                    const addressIdx = getColIdx(['ที่อยู่ผู้รับ', 'ที่อยู่']);



                    for (let i = 1; i < rawJsonArr.length; i++) {
                        const row = rawJsonArr[i];
                        if (!row || row.length === 0) continue;

                        const rawSenderName = senderNameIdx >= 0 ? row[senderNameIdx] : '';
                        const senderName = (rawSenderName || '').toString().trim().replace(/\s+/g, ' ');
                        if (!senderName.includes('ภรณ์อิสยา') && !senderName.includes('ตระการจรรยาศิริ')) {
                            continue;
                        }

                        let rawStatus = statusIdx >= 0 ? row[statusIdx] : '';
                        let status = rawStatus ? rawStatus.toString().split(':')[0].trim() : 'ไม่ทราบสถานะ';
                        
                        let phone = row.length > 12 ? (row[12] || '').toString().trim() : '';
                        phone = phone.replace(/^[+-\\(]*66[\)]*/, '');
                        phone = phone.replace(/\D/g, '');
                        if (phone && !phone.startsWith('0')) {
                            phone = '0' + phone;
                        }
                        
                        let areaDest = row.length > 8 ? (row[8] || '').toString().trim() : '';
                        
                        const currentUser = sessionStorage.getItem('currentUser') || 'unknown';
                        
                        let rawDate = dateIdx >= 0 ? row[dateIdx] : '';
                        let formattedDate = rawDate;
                        if (typeof rawDate === 'number') {
                            // Use UTC to avoid historical timezone offset issues (e.g. 00:18)
                            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
                            const parsedDate = new Date(excelEpoch.getTime() + rawDate * 86400000);
                            const dd = String(parsedDate.getUTCDate()).padStart(2, '0');
                            const mm = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
                            const yyyy = parsedDate.getUTCFullYear();
                            
                            // Excel parses days 1-12 as MM/DD. To recover the user's original DD/MM, we swap mm and dd!
                            formattedDate = `${mm}/${dd}/${yyyy}`;
                        } else if (typeof rawDate === 'string' && rawDate.includes('/')) {
                            const parts = rawDate.split(' ')[0].split('/');
                            if (parts.length >= 3) {
                                let p0 = parseInt(parts[0]);
                                let p1 = parseInt(parts[1]);
                                let p2 = parseInt(parts[2]);
                                let d, m, y;
                                
                                d = p0; m = p1; // Strictly Thai format (DD/MM/YYYY)
                                y = p2;
                                
                                if (y < 100) y += 2000;
                                if (y > 2500) y -= 543;
                                formattedDate = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
                            }
                        }

                        allJson.push({
                            'วันที่รับฝาก': formattedDate,
                            'ชื่อ-นามสกุลผู้ฝากส่ง': rawSenderName,
                            'ชื่อ-นามสกุลผู้รับ': receiverNameIdx >= 0 ? row[receiverNameIdx] : '',
                            'ที่ทำการปลายทาง': areaDest,
                            'ยอด COD': codIdx >= 0 ? row[codIdx] : '',
                            'Track No.': trackIdx >= 0 ? row[trackIdx] : '',
                            'สถานะปัจจุบัน': status,
                            'ที่อยู่ผู้รับ': row.length > 11 ? row[11] : '',
                            'เบอร์โทรศัพท์ผู้รับ': phone,
                            'เขตที่ทำการ': areaDest,
                            '_owner': currentUser
                        });
                    }
                }
            }

                console.log("นำเข้าข้อมูลและทำ Data Cleaning สำเร็จ: ", allJson.length, " รายการ");
                
                // Show Progress UI
                if (statusEl) {
                    statusEl.style.display = 'block';
                    statusEl.innerHTML = `
                        <div style="margin-bottom: 5px;"><i class="fa-solid fa-cloud-arrow-up fa-bounce"></i> กำลังบันทึกข้อมูลลงฐานข้อมูล (<span id="upload-percent">0</span>%)</div>
                        <div style="width: 100%; background: #e2e8f0; border-radius: 4px; overflow: hidden; height: 8px;">
                            <div id="upload-progress-bar" style="width: 0%; height: 100%; background: var(--color-primary); transition: width 0.2s;"></div>
                        </div>
                    `;
                }

                // บันทึกเฉพาะข้อมูลที่อัปโหลดใหม่ (allJson) ลงฐานข้อมูล
                const success = await saveLargeData('thp_ecommerce_data', allJson, (percent) => {
                    const pctEl = document.getElementById('upload-percent');
                    const barEl = document.getElementById('upload-progress-bar');
                    if (pctEl) pctEl.innerText = percent;
                    if (barEl) barEl.style.width = percent + '%';
                });

                if (!success) {
                    if (statusEl) {
                        statusEl.innerHTML = '<span style="color: red;"><i class="fa-solid fa-triangle-exclamation"></i> บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่</span>';
                    }
                    return; // Stop processing
                }
                
                if (statusEl) {
                    statusEl.innerHTML = '<span style="color: var(--color-success);"><i class="fa-solid fa-circle-check"></i> บันทึกข้อมูลสำเร็จ กำลังโหลดข้อมูลใหม่...</span>';
                }

                // รีโหลดข้อมูลใหม่ทั้งหมดจาก DB เพื่อให้มั่นใจว่าข้อมูลตรงกัน 100%
                await fetchAndProcessData();
                
                if (statusEl) statusEl.style.display = 'none';
                document.getElementById('data-upload').value = '';
                window.pendingUploadFiles = [];
                
                alert(`อัปโหลดและบันทึกข้อมูลสำเร็จ ${allJson.length} ชิ้น`);
                
                // สลับกลับไปยังหน้า Dashboard เพื่อให้เห็นผลลัพธ์
                window.switchView('dashboard');
            } catch (error) {
                console.error("Error reading file:", error);
                alert("เกิดข้อผิดพลาดในการอ่านไฟล์: " + error.message);
                const statusEl = document.getElementById('cleanup-status');
                if (statusEl) statusEl.style.display = 'none';
            }
    };

    window.executeDataCleanup = async () => {
        const timeframe = document.getElementById('delete-timeframe').value;
        const doBackup = document.getElementById('backup-first').checked;
        const statusEl = document.getElementById('cleanup-status');
        
        statusEl.style.display = 'block';
        statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังดำเนินการ...';
        statusEl.style.borderLeftColor = '#f59e0b';
        
        // Mock processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (doBackup) {
            statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังสร้างไฟล์ Backup (CSV)...';
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Mock downloading a file
            downloadMockCsv();
        }
        
        statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังลบข้อมูลที่เก่ากว่า ' + timeframe + ' วัน...';
        
        // Mock Cloudflare D1 Delete Operation
        /* 
        if(d1_db) {
            const dateThreshold = new Date();
            dateThreshold.setDate(dateThreshold.getDate() - parseInt(timeframe));
            
            await fetch('/api/cleanup', {
                method: 'POST',
                body: JSON.stringify({ threshold: dateThreshold.toISOString() })
            });
        }
        */
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        statusEl.innerHTML = `
            <div style="color: var(--color-success);">
                <i class="fa-solid fa-check-circle"></i> 
                <strong>ดำเนินการสำเร็จ!</strong><br>
                ${doBackup ? 'สำรองข้อมูลและ' : ''}ลบข้อมูลที่เก่ากว่า ${timeframe} วัน เรียบร้อยแล้ว
            </div>
        `;
        statusEl.style.borderLeftColor = 'var(--color-success)';
    };
}

function downloadMockCsv() {
    // Create mock CSV content
    const csvContent = "data:text/csv;charset=utf-8,ID,Status,Date\nTHP1,Success,2023-01-01\nTHP2,Success,2023-01-02";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `thp_ecommerce_backup_${new Date().getTime()}.csv`);
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
}

function toggleDeleteDateInput() {
    const val = document.getElementById('delete-condition').value;
    const container = document.getElementById('delete-date-container');
    if (val === 'date') {
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

async function executeDataCleanupWithPassword() {
    const condition = document.getElementById('delete-condition').value;
    const targetDateStr = document.getElementById('delete-target-date').value.trim();
    const statusEl = document.getElementById('cleanup-status');
    
    if (condition === 'date' && !targetDateStr) {
        alert('กรุณาระบุช่วงเวลาที่ต้องการลบ');
        return;
    }
    
    const pass = prompt('กรุณายืนยันรหัสผ่าน (1234) เพื่อลบข้อมูล:');
    if (pass !== '1234') {
        alert('รหัสผ่านไม่ถูกต้อง ยกเลิกการลบข้อมูล');
        return;
    }
    
    if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังดำเนินการ...';
    }

    if (condition === 'all') {
        if(confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลทั้งหมดในระบบ?')) {
            // Clear via API DELETE
            try {
                const response = await fetch('/api/data', { method: 'DELETE' });
                if (!response.ok) throw new Error('API delete error');
            } catch(e) {
                alert('เกิดข้อผิดพลาดในการลบข้อมูล: ' + e.message);
                if (statusEl) statusEl.style.display = 'none';
                return;
            }
            originalData = [];
            currentData = [];
            alert('ลบข้อมูลทั้งหมดเรียบร้อยแล้ว');
            await fetchAndProcessData();
            if (statusEl) statusEl.style.display = 'none';
        } else {
            if (statusEl) statusEl.style.display = 'none';
        }
    } else if (condition === 'date') {
        let dates = targetDateStr.split(' to ');
        let startDate = dates[0] ? normalizeDateObject(dates[0]) : null;
        let endDate = dates[1] ? normalizeDateObject(dates[1]) : startDate; // If only 1 date selected
        
        if (!startDate || !endDate) {
            alert('รูปแบบวันที่ไม่ถูกต้อง');
            if (statusEl) statusEl.style.display = 'none';
            return;
        }

        // Set hours to encompass full days
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        // filter out the specific date range
        const newData = originalData.filter(row => {
            if(!row['วันที่รับฝาก']) return true;
            const rowDateStr = String(row['วันที่รับฝาก']).split(' ')[0]; // DD/MM/YYYY
            const d = normalizeDateObject(rowDateStr);
            if (!d) return true;
            
            // Return true if outside the delete range (keep the row)
            return (d < startDate || d > endDate);
        });
        
        const deletedCount = originalData.length - newData.length;
        if (deletedCount === 0) {
            alert('ไม่พบข้อมูลในช่วงเวลาที่ระบุ (' + targetDateStr + ')');
            if (statusEl) statusEl.style.display = 'none';
            return;
        }
        
        // Save modified data to DB (Overwrites everything so we DELETE then POST)
        try {
            if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังอัปเดตข้อมูลบนระบบ...';
            // 1. Delete all old
            await fetch('/api/data', { method: 'DELETE' });
            // 2. Upload new
            await saveLargeData('thp_ecommerce_data', newData, (percent) => {
                if (statusEl) statusEl.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> กำลังอัปเดตข้อมูล... ${percent}%`;
            });
        } catch(e) {
            alert('เกิดข้อผิดพลาดในการอัปเดตข้อมูลหลังลบ: ' + e.message);
            if (statusEl) statusEl.style.display = 'none';
            return;
        }
        originalData = [...newData];
        currentData = [...newData];
        alert('ลบข้อมูลช่วงวันที่ ' + targetDateStr + ' จำนวน ' + deletedCount + ' รายการ เรียบร้อยแล้ว');
        await fetchAndProcessData();
        if (statusEl) statusEl.style.display = 'none';
    }
}
window.toggleTracking = function(btn, trackNo, step) {
    const key = `tracking_${trackNo}_${step}`;
    const isActive = btn.classList.contains('active');
    
    if (isActive) {
        btn.classList.remove('active');
        btn.innerHTML = `ติดตามครั้งที่ ${step}`;
        localStorage.removeItem(key);
    } else {
        btn.classList.add('active');
        btn.innerHTML = `<i class="fa-solid fa-check" style="color: #10b981;"></i> ติดตามครั้งที่ ${step}`;
        localStorage.setItem(key, 'true');
    }
};
function normalizeDateObject(dateVal) {
    if(!dateVal) return null;
    
    let y, m, d;

    if (typeof dateVal === 'number' || (!isNaN(dateVal) && String(dateVal).trim() !== '' && !String(dateVal).includes('/'))) {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const parsedDate = new Date(excelEpoch.getTime() + Number(dateVal) * 86400000);
        y = parsedDate.getUTCFullYear();
        // Swap month and day to reverse Excel's incorrect US date assumption
        m = parsedDate.getUTCDate();
        d = parsedDate.getUTCMonth() + 1;
    } else {
        const str = String(dateVal).trim().split(' ')[0];
        
        if (str.includes('-')) {
            const parsedDate = new Date(str);
            y = parsedDate.getFullYear();
            m = parsedDate.getMonth() + 1;
            d = parsedDate.getDate();
        } else if (str.includes('/')) {
            const parts = str.split('/');
            let p0 = parseInt(parts[0]);
            let p1 = parseInt(parts[1]);
            let p2 = parseInt(parts[2]);
            
            if (p0 > 1000) {
                y = p0;
                m = p1;
                d = p2;
                if (y > 2500) y -= 543;
            } else {
                y = p2;
                if (y < 100) y += 2000;
                if (y > 2500) y -= 543;
                
                // Always use Thai format (DD/MM) as requested by the user
                d = p0;
                m = p1;
            }
        } else {
            const parsedDate = new Date(str);
            if (!isNaN(parsedDate.getTime())) {
                y = parsedDate.getFullYear();
                m = parsedDate.getMonth() + 1;
                d = parsedDate.getDate();
            } else {
                return null;
            }
        }
    }
    
    // Removed the buggy date swap logic here to prevent incorrect month assignments
    
    return new Date(y, m - 1, d);
}

window.applyDateFilter = function(viewName = 'dashboard') {
    const startId = `filter-start-${viewName}`;
    const endId = `filter-end-${viewName}`;
    const start = document.getElementById(startId) ? document.getElementById(startId).value : '';
    const end = document.getElementById(endId) ? document.getElementById(endId).value : '';
    
    if(!start || !end) {
        alert('กรุณาเลือกช่วงเวลาให้ครบทั้งเริ่มต้นและสิ้นสุด');
        return;
    }

    const startD = normalizeDateObject(start);
    if(startD) startD.setHours(0,0,0,0);
    
    const endD = normalizeDateObject(end);
    if(endD) endD.setHours(23,59,59,999);

    if(!startD || !endD) {
        alert('รูปแบบวันที่ไม่ถูกต้อง กรุณาใช้ DD/MM/YYYY');
        return;
    }

    const filteredData = originalData.filter(row => {
        if(!row['วันที่รับฝาก']) return false;
        const d = normalizeDateObject(row['วันที่รับฝาก']);
        if (!d) return false;
        return d >= startD && d <= endD;
    });

    if (filteredData.length === 0) {
        alert('ไม่พบข้อมูลในช่วงเวลาที่ระบุ');
        return;
    }

    window.currentDataViews[viewName] = filteredData;
    
    // Only update the global currentData if we are on dashboard (backward compatibility)
    if (viewName === 'dashboard') {
        currentData = filteredData;
    }
    
    updateDashboard(filteredData, viewName);
}

window.resetDateFilter = function(viewName = 'dashboard') {
    const startId = `filter-start-${viewName}`;
    const endId = `filter-end-${viewName}`;
    if(document.getElementById(startId)) document.getElementById(startId).value = '';
    if(document.getElementById(endId)) document.getElementById(endId).value = '';
    
    if (window.fpInstances && window.fpInstances[viewName]) {
        window.fpInstances[viewName].start.clear();
        window.fpInstances[viewName].end.clear();
    }
    
    window.currentDataViews[viewName] = null;
    if (viewName === 'dashboard') {
        currentData = [...originalData];
    }
    
    updateDashboard(originalData, viewName);
}

// Global flatpickr instances tracker
window.fpInstances = {
    dashboard: { start: null, end: null },
    tracking: { start: null, end: null },
    performance: { start: null, end: null }
};

// Initialize flatpickr when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof flatpickr !== 'undefined') {
        ['dashboard', 'tracking', 'performance'].forEach(view => {
            const sId = `#filter-start-${view}`;
            const eId = `#filter-end-${view}`;
            if(document.querySelector(sId) && document.querySelector(eId)) {
                window.fpInstances[view].start = flatpickr(sId, { dateFormat: "d/m/Y", locale: "th" });
                window.fpInstances[view].end = flatpickr(eId, { dateFormat: "d/m/Y", locale: "th" });
            }
        });
        
        // Initialize range flatpickr for deletion
        if (document.getElementById('delete-target-date')) {
            flatpickr("#delete-target-date", {
                mode: "range",
                dateFormat: "d/m/Y",
                locale: "th"
            });
        }
    }
});

// === Timeline and Heatmap Logic ===
window.updateTimeline = function() {
    const month = parseInt(document.getElementById('timeline-month-filter').value);
    const data = window.currentDataViews.dashboard || currentData || originalData;
    
    // Filter data for the specific month
    const monthData = data.filter(row => {
        if(!row['วันที่รับฝาก']) return false;
        const d = normalizeDateObject(row['วันที่รับฝาก']);
        return d && (d.getMonth() + 1) === month;
    });

    // Group into 4 weeks
    const weeks = [ { s:0, r:0, t:0 }, { s:0, r:0, t:0 }, { s:0, r:0, t:0 }, { s:0, r:0, t:0 } ];
    
    monthData.forEach(row => {
        const d = normalizeDateObject(row['วันที่รับฝาก']);
        const date = d.getDate();
        let weekIdx = 0;
        if(date <= 7) weekIdx = 0;
        else if(date <= 14) weekIdx = 1;
        else if(date <= 21) weekIdx = 2;
        else weekIdx = 3;
        
        weeks[weekIdx].t++;
        const status = row['สถานะปัจจุบัน'] || '';
        if(status.includes('จัดส่งสำเร็จ')) weeks[weekIdx].s++;
        else if(status.includes('คืน') || status.includes('นำจ่ายไม่สำเร็จ') || status.includes('รอส่งคืน')) weeks[weekIdx].r++;
    });

    for(let i=1; i<=4; i++) {
        const w = weeks[i-1];
        let succPct = 0; let retPct = 0;
        if (w.t > 0) {
            succPct = Math.round((w.s / w.t) * 100);
            retPct = Math.round((w.r / w.t) * 100);
        }
        if(document.getElementById(`tl-w${i}-success`)) document.getElementById(`tl-w${i}-success`).innerText = succPct;
        if(document.getElementById(`tl-w${i}-return`)) document.getElementById(`tl-w${i}-return`).innerText = retPct;
    }
};

window.updateHeatmap = function() {
    const month = parseInt(document.getElementById('heatmap-month-filter').value);
    const container = document.getElementById('heatmap-container');
    if(!container) return;
    
    const data = window.currentDataViews.dashboard || currentData || originalData;
    const monthData = data.filter(row => {
        if(!row['วันที่รับฝาก']) return false;
        const d = normalizeDateObject(row['วันที่รับฝาก']);
        return d && (d.getMonth() + 1) === month;
    });

    const originMap = {};
    monthData.forEach(row => {
        let origin = row._owner || '34000'; // Fallback to 34000
        const d = normalizeDateObject(row['วันที่รับฝาก']);
        const day = d.getDate();
        
        if(!originMap[origin]) originMap[origin] = {};
        if(!originMap[origin][day]) originMap[origin][day] = 0;
        originMap[origin][day]++;
    });

    let maxVal = 0;
    Object.values(originMap).forEach(days => {
        Object.values(days).forEach(v => {
            if(v > maxVal) maxVal = v;
        });
    });

    let html = '<table style="width: 100%; border-collapse: separate; border-spacing: 2px;">';
    // Header (Days 1-31)
    html += '<tr><th style="text-align: right; padding-right: 10px; color: var(--color-navy); font-size: 0.85rem; width: 100px;">ฝั่งต้นทาง \\ วันที่</th>';
    for(let d=1; d<=31; d++) {
        html += `<th style="text-align: center; font-size: 0.75rem; color: #64748b; font-weight: normal; width: 22px;">${d}</th>`;
    }
    html += '</tr>';

    for(const origin in originMap) {
        let originName = origin;
        if(origin === 'reg10') originName = 'ปข.10';
        else if(origin === '34000') originName = 'ปจ.อุบลฯ';
        else originName = origin;

        html += `<tr><td style="text-align: right; padding-right: 10px; font-size: 0.8rem; font-weight: 600; color: var(--color-navy);">${originName}</td>`;
        for(let d=1; d<=31; d++) {
            const val = originMap[origin][d] || 0;
            let bgColor = '#fef2f2'; // Very light red
            if (val === 0) bgColor = '#f8fafc'; // Empty/Grey
            else if (maxVal > 0) {
                const pct = val / maxVal;
                if(pct > 0.75) bgColor = '#991b1b'; // Dark Red
                else if(pct > 0.5) bgColor = '#ef4444'; // Red
                else if(pct > 0.25) bgColor = '#fca5a5'; // Light Red
            }
            const tooltip = val > 0 ? ` title="วันที่ ${d}: ${val} ชิ้น"` : '';
            html += `<td style="background-color: ${bgColor}; height: 22px; border-radius: 2px;"${tooltip}></td>`;
        }
        html += '</tr>';
    }
    if (Object.keys(originMap).length === 0) {
        html += `<tr><td colspan="32" style="text-align: center; padding: 2rem; color: #94a3b8; font-size: 0.85rem;">ไม่พบข้อมูลในเดือนนี้</td></tr>`;
    }
    html += '</table>';
    container.innerHTML = html;
};

// Add call to update dashboard
const originalUpdateDashboard = updateDashboard;
window.updateDashboard = function(dataToUse, viewName) {
    originalUpdateDashboard(dataToUse, viewName);
    if (!viewName || viewName === 'dashboard' || viewName === 'all') {
        updateTimeline();
        updateHeatmap();
    }
};

window.checkAvailableDatesAdmin = async () => {
    const resEl = document.getElementById('admin-dates-result');
    if(!resEl) return;
    resEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังตรวจสอบข้อมูล...';
    
    const savedData = await loadLargeData('thp_ecommerce_data');
    if (!savedData || savedData.length === 0) {
        resEl.innerHTML = 'ไม่พบข้อมูลในระบบ';
        return;
    }
    
    const userDatesMap = {}; 
    savedData.forEach(row => {
        const owner = row._owner || 'unknown';
        if (!userDatesMap[owner]) userDatesMap[owner] = new Set();
        
        if (row['วันที่รับฝาก']) {
            const dateStr = String(row['วันที่รับฝาก']).split(' ')[0];
            const d = normalizeDateObject(dateStr);
            if (d) {
                userDatesMap[owner].add(d.getTime());
            }
        }
    });
    
    const thMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const thShortMonths = ['ก.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    // Fix Jan: 'ม.ค.'
    thShortMonths[0] = 'ม.ค.';

    let html = '<ul style="padding-left: 1.5rem; margin-top: 0.5rem; line-height: 1.6; list-style-type: none; margin-left: -1.5rem;">';
    for (const [user, dateTimesSet] of Object.entries(userDatesMap)) {
        let displayUser = user;
        if (user === 'reg10') displayUser = 'Admin (reg10)';
        else if (user === '34000') displayUser = 'ปจ.อุบลราชธานี (34000)';
        else if (user === 'unknown') displayUser = 'ไม่ระบุผู้ใช้ (ข้อมูลก่อนแยกระบบ)';
        
        html += `<li style="margin-bottom: 1rem;"><strong><i class="fa-solid fa-user" style="color:var(--color-primary);"></i> User: ${displayUser}</strong><br>`;
        
        if (dateTimesSet.size > 0) {
            const times = Array.from(dateTimesSet).sort((a,b) => a - b);
            const monthGroups = {};
            
            times.forEach(t => {
                const d = new Date(t);
                const k = `${d.getFullYear()}-${d.getMonth()}`;
                if(!monthGroups[k]) monthGroups[k] = new Set();
                monthGroups[k].add(d.getDate());
            });
            
            for (const [k, daysSet] of Object.entries(monthGroups)) {
                const [yearStr, monthStr] = k.split('-');
                const y = parseInt(yearStr);
                const m = parseInt(monthStr);
                
                html += `<div style="margin-top: 0.5rem; padding: 0.75rem; background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: var(--shadow-sm);">`;
                html += `<strong style="color: var(--color-navy); font-size: 0.9rem;">{ เดือน ${thMonths[m]} ${y} }</strong><br>`;
                
                const daysInMonth = new Date(y, m + 1, 0).getDate();
                const dayStrings = [];
                for (let i = 1; i <= daysInMonth; i++) {
                    const hasData = daysSet.has(i);
                    const color = hasData ? '#059669' : '#dc2626';
                    const weight = hasData ? 'bold' : 'normal';
                    const text = `${i} ${thShortMonths[m]}`;
                    dayStrings.push(`<span style="color: ${color}; font-weight: ${weight}; white-space: nowrap;">${text}</span>`);
                }
                html += `<div style="font-size: 0.85rem; line-height: 1.8; margin-top: 0.5rem;">${dayStrings.join(', ')}</div>`;
                html += `</div>`;
            }
            
        } else {
            html += `<span style="color: #dc2626;">ไม่พบข้อมูลวันที่</span>`;
        }
        html += `</li>`;
    }
    html += '</ul>';
    
    resEl.innerHTML = html;
};

window.checkStorageCapacityAdmin = async () => {
    const resEl = document.getElementById('admin-storage-result');
    if(!resEl) return;
    resEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังคำนวณความจุ...';
    
    const savedData = await loadLargeData('thp_ecommerce_data');
    if (!savedData || savedData.length === 0) {
        resEl.innerHTML = 'ไม่พบข้อมูลในระบบ (0 Bytes)';
        return;
    }
    
    const userSize = {};
    const userCount = {};
    
    savedData.forEach(row => {
        const owner = row._owner || 'unknown';
        const str = JSON.stringify(row);
        const bytes = new TextEncoder().encode(str).length;
        
        userSize[owner] = (userSize[owner] || 0) + bytes;
        userCount[owner] = (userCount[owner] || 0) + 1;
    });
    
    let totalBytes = 0;
    
    let html = '<table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem; background: #fff;">';
    html += '<tr style="border-bottom: 2px solid #e2e8f0; background: #f1f5f9;"><th style="text-align: left; padding: 6px;">User</th><th style="text-align: right; padding: 6px;">รายการ (Rows)</th><th style="text-align: right; padding: 6px;">ขนาด (MB)</th></tr>';
    
    for (const [user, bytes] of Object.entries(userSize)) {
        totalBytes += bytes;
        let displayUser = user;
        if (user === 'reg10') displayUser = 'Admin (reg10)';
        else if (user === '34000') displayUser = 'ปจ.อุบลราชธานี (34000)';
        else if (user === 'unknown') displayUser = 'ไม่ระบุผู้ใช้ (ข้อมูลก่อนแยกระบบ)';
        
        const mb = (bytes / (1024 * 1024)).toFixed(2);
        const count = userCount[user].toLocaleString();
        html += `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px;">${displayUser}</td><td style="text-align: right; padding: 6px;">${count}</td><td style="text-align: right; padding: 6px;">${mb} MB</td></tr>`;
    }
    
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);
    html += `<tr style="font-weight: bold; background: #f8fafc; border-top: 2px solid #cbd5e1;"><td style="padding: 6px;">รวมทั้งหมด</td><td style="text-align: right; padding: 6px;">${savedData.length.toLocaleString()}</td><td style="text-align: right; padding: 6px;">${totalMb} MB</td></tr>`;
    html += '</table>';
    
    resEl.innerHTML = html;
};
