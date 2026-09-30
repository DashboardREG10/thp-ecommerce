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
let mainChartInstance = null;
let performanceChartInstance = null;
let funnelChartInstance = null;
let statusBarChartInstance = null;
let uniqueStatuses = new Set();
let uniqueDates = new Set();

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

async function saveLargeData(key, data) {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(data, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("IndexedDB Save Error:", e);
    }
}

async function loadLargeData(key) {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("IndexedDB Load Error:", e);
        return null;
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    // Version logic
    const today = new Date();
    const dateString = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
    const version = `V.1.1.${dateString}`;
    
    const versionEl = document.getElementById('app-version');
    if (versionEl) versionEl.textContent = version;

    // Initialize Flatpickr for Date Inputs
    if (typeof flatpickr !== 'undefined') {
        flatpickr("#filter-start-date", { dateFormat: "d/m/Y", locale: "th" });
        flatpickr("#filter-end-date", { dateFormat: "d/m/Y", locale: "th" });
    }

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
                
                if (user === '34000' && pass === '1234') {
                    sessionStorage.setItem('isLoggedIn', 'true');
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

    setupGlobalFunctions();
});

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
    
    if (!savedData || savedData.length === 0) {
        addLog('ไม่พบข้อมูลในระบบ กรุณานำเข้าข้อมูลใหม่...');
        if (progressEl) progressEl.style.width = '100%';
        setTimeout(() => {
            if(loadingOverlay) loadingOverlay.style.display = 'none';
            renderRecentOrders();
        }, 1500);
        return;
    }

    addLog(`พบข้อมูลดิบทั้งหมด ${savedData.length.toLocaleString()} รายการ กำลังเริ่มการสตรีมและวิเคราะห์...`);
    currentData = [];

    // Process in chunks to show real progress without freezing UI
    const totalItems = savedData.length;
    // Divide into 40 chunks for smooth progress bar updates
    const chunkSize = Math.max(1, Math.floor(totalItems / 40)); 
    
    for (let i = 0; i < totalItems; i += chunkSize) {
        const chunk = savedData.slice(i, i + chunkSize);
        
        // Clean old data on the fly (in case the file was uploaded before the fix)
        chunk.forEach(row => {
            if (row['สถานะปัจจุบัน'] && row['สถานะปัจจุบัน'].includes(':')) {
                row['สถานะปัจจุบัน'] = row['สถานะปัจจุบัน'].toString().split(':')[0].trim();
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

function updateDashboard() {
    if (!currentData || currentData.length === 0) return;

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

    currentData.forEach(row => {
        const status = row['สถานะปัจจุบัน'] || 'ไม่ทราบสถานะ';
        const sender = row['ชื่อ-นามสกุลผู้ฝากส่ง'] || '';
        let dateStr = row['วันที่รับฝาก'];
        
        uniqueStatuses.add(status);
        
        const groupedStatus = groupStatusForChart(status);
        allStatusCounts[groupedStatus] = (allStatusCounts[groupedStatus] || 0) + 1;
        
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
    });

    // Executive KPI Calculations
    const sortedDailyDates = Object.keys(dailyData).sort((a, b) => {
        const [d1, m1, y1] = a.split('/').map(Number);
        const [d2, m2, y2] = b.split('/').map(Number);
        if (y1 !== y2) return y1 - y2;
        if (m1 !== m2) return m1 - m2;
        return d1 - d2;
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
    if(dObj('kpi-orders-val')) dObj('kpi-orders-val').textContent = totalOrders.toLocaleString();
    if(dObj('kpi-gmv-val')) dObj('kpi-gmv-val').textContent = '฿' + (totalGmv >= 1000000 ? (totalGmv/1000000).toFixed(2) + 'M' : totalGmv.toLocaleString());
    if(dObj('kpi-fulfill-val')) dObj('kpi-fulfill-val').textContent = fulfillRate.toFixed(1) + '%';
    if(dObj('kpi-success-val')) dObj('kpi-success-val').textContent = successRate.toFixed(1) + '%';
    if(dObj('kpi-exception-val')) dObj('kpi-exception-val').textContent = exceptionRate.toFixed(1) + '%';

    function setTrendUI(id, val, invertColors = false) {
        const span = dObj(id);
        if (!span) return;
        const parent = span.parentElement;
        const icon = parent.querySelector('i');
        const isUp = val >= 0;
        const isGood = invertColors ? !isUp : isUp;
        
        span.textContent = Math.abs(val).toFixed(1) + '%';
        parent.className = 'kpi-trend ' + (isGood ? 'trend-up' : 'trend-down');
        parent.style.color = isGood ? '#10b981' : '#ef4444';
        if(icon) icon.className = isUp ? 'fa-solid fa-arrow-up' : 'fa-solid fa-arrow-down';
    }

    setTrendUI('kpi-orders-trend', orderTrend);
    setTrendUI('kpi-gmv-trend', gmvTrend);
    setTrendUI('kpi-fulfill-trend', fulfillTrend);
    setTrendUI('kpi-success-trend', successTrend);
    setTrendUI('kpi-exception-trend', exceptionTrend, true);

    function createSpark(id, dPoints, color) {
        const ctx = dObj(id);
        if (!ctx) return;
        if (window['spark_'+id]) window['spark_'+id].destroy();
        window['spark_'+id] = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: dPoints.map((_, i) => i),
                datasets: [{ data: dPoints, backgroundColor: color, borderRadius: 2 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false, beginAtZero: true } },
                layout: { padding: 0 }
            }
        });
    }

    createSpark('sparkline-orders', sortedDailyDates.map(d => dailyData[d].orders), '#3b82f6');
    createSpark('sparkline-gmv', sortedDailyDates.map(d => dailyData[d].gmv), '#8b5cf6');
    createSpark('sparkline-fulfill', sortedDailyDates.map(d => dailyData[d].orders > 0 ? (dailyData[d].fulfill/dailyData[d].orders)*100 : 0), '#f59e0b');
    createSpark('sparkline-success', sortedDailyDates.map(d => dailyData[d].orders > 0 ? (dailyData[d].success/dailyData[d].orders)*100 : 0), '#10b981');
    createSpark('sparkline-exception', sortedDailyDates.map(d => dailyData[d].orders > 0 ? (dailyData[d].exception/dailyData[d].orders)*100 : 0), '#ef4444');

    // Update BI Insights
    const formatDate = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    if(dObj('sidebar-last-updated')) dObj('sidebar-last-updated').textContent = 'อัปเดตล่าสุด ' + formatDate.split(' ')[1];
    if(dObj('topbar-last-updated')) dObj('topbar-last-updated').textContent = 'อัปเดตข้อมูลล่าสุด ' + formatDate;

    if(dObj('insight-order-increase')) dObj('insight-order-increase').textContent = Math.abs(orderTrend).toFixed(1) + '%';
    if(dObj('insight-pending')) dObj('insight-pending').textContent = pendingPackages.toLocaleString();
    if(dObj('insight-exception')) dObj('insight-exception').textContent = totalException.toLocaleString();

    // SLA Performance
    if(dObj('sla-value')) dObj('sla-value').textContent = fulfillRate.toFixed(1) + '%';
    if(dObj('sla-diff')) {
        const diff = fulfillRate - 95;
        dObj('sla-diff').textContent = (diff >= 0 ? '+' : '') + diff.toFixed(1) + ' จุด ' + (diff >= 0 ? '(เหนือเป้าหมาย)' : '(ต่ำกว่าเป้าหมาย)');
        dObj('sla-diff').style.color = diff >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
    }
    if(dObj('sla-bar')) dObj('sla-bar').style.width = fulfillRate + '%';

    // Operational Pulse
    if(dObj('pulse-orders')) dObj('pulse-orders').textContent = currOrders.toLocaleString();
    if(dObj('pulse-pending')) dObj('pulse-pending').textContent = pendingPackages.toLocaleString();
    if(dObj('pulse-exceptions')) dObj('pulse-exceptions').textContent = totalException.toLocaleString();
    if(dObj('pulse-success')) dObj('pulse-success').textContent = successPackages.toLocaleString();

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
        
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #e2e8f0';
        
        tr.innerHTML = `
            <td style="padding: 0.5rem; text-align: center; color: #475569; background-color: white;">${index + 1}.</td>
            <td style="padding: 0.5rem; color: #334155; background-color: white;">${area}</td>
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
        const rowDate = row['วันที่รับฝาก'] ? row['วันที่รับฝาก'].split(' ')[0] : null;
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



function renderPerformanceTable() {
    const tableBody = document.querySelector('#cec-tracking-table tbody');
    if(!tableBody) return;
    tableBody.innerHTML = '';
    
    // Filter critical items (e.g., exceptions, returns, etc.)
    const criticalItems = currentData.filter(row => {
        const group = groupStatusForChart(row['สถานะปัจจุบัน'] || '');
        return group === 'นำจ่ายไม่สำเร็จ' || group === 'คืนต้นทาง' || group === 'รอจ่าย ณ ที่ทำการ' || group === 'โทรศัพท์ติดต่อผู้รับ';
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

        const qmsUrl = trackNo !== '-' ? `http://qms.thailandpost.com/web/Tracking/singleTracking.aspx?type=item&id=${trackNo}` : '#';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <a href="${qmsUrl}" target="_blank" style="color: var(--color-primary); text-decoration: underline; font-weight: bold;">
                    ${trackNo} <i class="fa-solid fa-external-link-alt" style="font-size: 0.7rem;"></i>
                </a>
            </td>
            <td>
                <div style="font-weight: 500; color: var(--color-navy); margin-bottom: 2px;">${receiver}</div>
                <div style="font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 2px;"><i class="fa-solid fa-location-dot" style="width: 14px;"></i> ${address}</div>
                <div style="font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 2px;"><i class="fa-solid fa-phone" style="width: 14px;"></i> ${phone}</div>
                <div style="font-size: 0.8rem; color: var(--color-success); font-weight: 600;"><i class="fa-solid fa-coins" style="width: 14px;"></i> COD: ${codAmount}</div>
            </td>
            <td><span class="badge-status ${type}">${statusText}</span></td>
            <td>
                <button class="cec-btn" onclick="this.classList.toggle('active')">ติดตามครั้งที่ 1</button>
                <button class="cec-btn" onclick="this.classList.toggle('active')">ติดตามครั้งที่ 2</button>
                <button class="cec-btn" onclick="this.classList.toggle('active')">ติดตามครั้งที่ 3</button>
            </td>
            <td>
                <input type="text" class="cec-note-input" placeholder="พิมพ์หมายเหตุ...">
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

    window.handleFileUpload = async (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        if (files.length > 10) {
            alert("สามารถอัปโหลดได้สูงสุด 10 ไฟล์ต่อครั้งครับ");
            event.target.value = '';
            return;
        }

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
                
                let rawJsonArr = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
                
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
                        
                        allJson.push({
                            'วันที่รับฝาก': dateIdx >= 0 ? row[dateIdx] : '',
                            'ชื่อ-นามสกุลผู้ฝากส่ง': rawSenderName,
                            'ชื่อ-นามสกุลผู้รับ': receiverNameIdx >= 0 ? row[receiverNameIdx] : '',
                            'ที่ทำการปลายทาง': areaDest,
                            'ยอด COD': codIdx >= 0 ? row[codIdx] : '',
                            'Track No.': trackIdx >= 0 ? row[trackIdx] : '',
                            'สถานะปัจจุบัน': status,
                            'ที่อยู่ผู้รับ': addressIdx >= 0 ? row[addressIdx] : '',
                            'เบอร์โทรศัพท์ผู้รับ': phone,
                            'เขตที่ทำการ': areaDest
                        });
                    }
                }
            }

                console.log("นำเข้าข้อมูลและทำ Data Cleaning สำเร็จ: ", allJson.length, " รายการ");
                
                // อัพเดตข้อมูล
                currentData = allJson;
                
                // บันทึกลง IndexedDB แทน localStorage เนื่องจากไฟล์อาจใหญ่เกิน 5MB
                await saveLargeData('thp_ecommerce_data', currentData);
                
                // อัพเดต Dashboard
                updateDashboard();
                
                alert(`อ่านข้อมูลสำเร็จ! พบข้อมูลจำนวน ${allJson.length} รายการ ข้อมูลบนระบบได้รับการอัพเดตแล้ว`);
                
                // สลับกลับไปยังหน้า Dashboard เพื่อให้เห็นผลลัพธ์
                window.switchView('dashboard');
            } catch (error) {
                console.error("Error reading file:", error);
                alert("เกิดข้อผิดพลาดในการอ่านไฟล์: " + error.message);
            }
            // เคลียร์ค่า input เพื่อให้สามารถเลือกไฟล์เดิมซ้ำได้
            event.target.value = '';
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
    const targetDate = document.getElementById('delete-target-date').value.trim();
    
    if (condition === 'date' && !targetDate) {
        alert('กรุณาระบุวันที่ต้องการลบ');
        return;
    }
    
    const pass = prompt('กรุณายืนยันรหัสผ่าน (1234) เพื่อลบข้อมูล:');
    if (pass !== '1234') {
        alert('รหัสผ่านไม่ถูกต้อง ยกเลิกการลบข้อมูล');
        return;
    }
    
    if (condition === 'all') {
        if(confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลทั้งหมดในระบบ?')) {
            await saveLargeData('thp_ecommerce_data', []);
            originalData = [];
            currentData = [];
            alert('ลบข้อมูลทั้งหมดเรียบร้อยแล้ว');
            updateDashboard();
        }
    } else if (condition === 'date') {
        // filter out the specific date
        const newData = originalData.filter(row => {
            if(!row['วันที่รับฝาก']) return true;
            const rowDate = row['วันที่รับฝาก'].split(' ')[0]; // DD/MM/YYYY
            return rowDate !== targetDate;
        });
        
        const deletedCount = originalData.length - newData.length;
        if (deletedCount === 0) {
            alert('ไม่พบข้อมูลของวันที่ระบุ (' + targetDate + ')');
            return;
        }
        
        await saveLargeData('thp_ecommerce_data', newData);
        originalData = [...newData];
        currentData = [...newData];
        alert('ลบข้อมูลของวันที่ ' + targetDate + ' จำนวน ' + deletedCount + ' รายการ เรียบร้อยแล้ว');
        updateDashboard();
    }
}

function applyDateFilter() {
    const start = document.getElementById('filter-start-date').value;
    const end = document.getElementById('filter-end-date').value;
    if(!start || !end) {
        alert('กรุณาเลือกช่วงเวลาให้ครบทั้งเริ่มต้นและสิ้นสุด');
        return;
    }

    const startD = new Date(start);
    startD.setHours(0,0,0,0);
    const endD = new Date(end);
    endD.setHours(23,59,59,999);

    currentData = originalData.filter(row => {
        if(!row['วันที่รับฝาก']) return false;
        const parts = row['วันที่รับฝาก'].split(' ')[0].split('/');
        if(parts.length !== 3) return false;
        // DD/MM/YYYY -> YYYY, MM-1, DD
        const d = new Date(parts[2], parts[1]-1, parts[0]);
        return d >= startD && d <= endD;
    });
    
    updateDashboard();
}

function resetDateFilter() {
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    currentData = [...originalData];
    updateDashboard();
}
