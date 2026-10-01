export async function onRequestGet(context) {
    const { env } = context;
    try {
        const { results } = await env.DB.prepare('SELECT * FROM shipments').all();
        // Convert to the JSON format app.js expects
        const allJson = results.map(row => ({
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
        }));
        return new Response(JSON.stringify(allJson), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const data = await request.json();
        
        // Use a batch transaction for better performance
        const stmts = data.map(item => {
            return env.DB.prepare(`
                INSERT INTO shipments (
                    track_no, date_received, sender_name, receiver_name, destination_office,
                    cod_amount, current_status, receiver_address, receiver_phone, area, owner
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(track_no) DO UPDATE SET 
                    date_received=excluded.date_received,
                    sender_name=excluded.sender_name,
                    receiver_name=excluded.receiver_name,
                    destination_office=excluded.destination_office,
                    cod_amount=excluded.cod_amount,
                    current_status=excluded.current_status,
                    receiver_address=excluded.receiver_address,
                    receiver_phone=excluded.receiver_phone,
                    area=excluded.area,
                    owner=excluded.owner,
                    updated_at=CURRENT_TIMESTAMP
            `).bind(
                item['Track No.'],
                item['วันที่รับฝาก'],
                item['ชื่อ-นามสกุลผู้ฝากส่ง'],
                item['ชื่อ-นามสกุลผู้รับ'],
                item['ที่ทำการปลายทาง'],
                item['ยอด COD'],
                item['สถานะปัจจุบัน'],
                item['ที่อยู่ผู้รับ'],
                item['เบอร์โทรศัพท์ผู้รับ'],
                item['เขตที่ทำการ'],
                item['_owner']
            );
        });
        
        // Chunk the statements into blocks of 100 to avoid D1 batch limits
        const chunkSize = 100;
        for (let i = 0; i < stmts.length; i += chunkSize) {
            const chunk = stmts.slice(i, i + chunkSize);
            await env.DB.batch(chunk);
        }
        
        return new Response(JSON.stringify({ success: true, inserted: data.length }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestDelete(context) {
    const { env } = context;
    try {
        await env.DB.prepare('DELETE FROM shipments').run();
        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
