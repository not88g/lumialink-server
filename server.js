const WebSocket = require('ws');
const { Client } = require('pg');

const db = new Client({
    connectionString: "postgresql://datalumiabaselink_user:MGeBsOZdrxxTbT1sVDd1oXlKOfvI7qBI@dpg-d2s5c1mmcj7s73fslto0-a.oregon-postgres.render.com/datalumiabaselink",
    ssl: { rejectUnauthorized: false }
});

db.connect()
  .then(() => console.log("Postgres подключён"))
  .catch(err => console.error("Ошибка подключения к Postgres:", err));

const wss = new WebSocket.Server({ port: process.env.PORT || 3000 });

let clients = {}; // username => ws

wss.on('connection', ws => {
    let currentUser = null;

    ws.on('message', async msg => {
        const data = JSON.parse(msg);

        if(data.type === "register"){
            const res = await db.query('SELECT * FROM users WHERE username=$1', [data.username]);
            if(res.rows.length === 0){
                await db.query('INSERT INTO users(username,password) VALUES($1,$2)', [data.username, data.password]);
                currentUser = data.username;
                clients[currentUser] = ws;
                ws.send(JSON.stringify({ type: "register_result", success: true }));
            } else {
                ws.send(JSON.stringify({ type: "register_result", success: false, message: "username taken" }));
            }
        }

        if(data.type === "login"){
            const res = await db.query('SELECT * FROM users WHERE username=$1 AND password=$2', [data.username, data.password]);
            if(res.rows.length > 0){
                currentUser = data.username;
                clients[currentUser] = ws;
                ws.send(JSON.stringify({ type: "login_result", success: true }));
            } else {
                ws.send(JSON.stringify({ type: "login_result", success: false, message: "wrong credentials" }));
            }
        }

        if(data.type === "message"){
            // проверка на блокировки
            const blocked = await db.query('SELECT * FROM blocks WHERE blocker=$1 AND blocked=$2', [data.to, data.from]);
            if(blocked.rows.length === 0){
                await db.query('INSERT INTO messages(sender,receiver,text) VALUES($1,$2,$3)',
                    [data.from, data.to, data.text]);

                // отправляем получателю если онлайн
                if(clients[data.to] && clients[data.to].readyState === WebSocket.OPEN){
                    clients[data.to].send(JSON.stringify({
                        type: "message",
                        from: data.from,
                        text: data.text
                    }));
                }
            }
        }

        if(data.type === "get_saved"){
            const msgs = await db.query('SELECT * FROM messages WHERE sender=$1 AND receiver=$1 ORDER BY ts ASC', [currentUser]);
            ws.send(JSON.stringify({ type: "saved_messages", messages: msgs.rows }));
        }
    });

    ws.on('close', () => {
        if(currentUser) delete clients[currentUser];
    });
});

console.log("WebSocket сервер запущен на порту 3000");
