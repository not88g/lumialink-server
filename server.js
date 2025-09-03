const WebSocket = require('ws');
const { Client } = require('pg');

// Подключение к Postgres на Render
const db = new Client({
    connectionString: "postgresql://datalumiabaselink_user:MGeBsOZdrxxTbT1sVDd1oXlKOfvI7qBI@dpg-d2s5c1mmcj7s73fslto0-a.oregon-postgres.render.com/datalumiabaselink",
    ssl: { rejectUnauthorized: false }
});

db.connect()
  .then(() => console.log("Postgres подключён"))
  .catch(err => console.error("Ошибка подключения к Postgres:", err));

// WebSocket сервер
const wss = new WebSocket.Server({ port: 3000 }, () => {
    console.log("WebSocket запущен на ws://localhost:3000");
});

// Хранилище подключённых пользователей (username → ws)
const clients = {};

wss.on('connection', ws => {
    let currentUser = null;

    ws.on('message', async msg => {
        try {
            const data = JSON.parse(msg);

            // Регистрация
            if (data.type === 'register') {
                const res = await db.query('SELECT * FROM users WHERE username=$1', [data.username]);
                if (res.rows.length > 0) {
                    ws.send(JSON.stringify({ type: 'register_result', success: false, error: 'Пользователь уже существует' }));
                    return;
                }
                await db.query('INSERT INTO users(username,password) VALUES($1,$2)', [data.username, data.password]);

                // создаём "Сохранённое" чат для себя
                await db.query('INSERT INTO messages(sender,receiver,text) VALUES($1,$1,$2)', [data.username, 'Добро пожаловать в lumialink!']);

                ws.send(JSON.stringify({ type: 'register_result', success: true }));
            }

            // Вход
            if (data.type === 'login') {
                const res = await db.query('SELECT * FROM users WHERE username=$1 AND password=$2', [data.username, data.password]);
                if (res.rows.length === 0) {
                    ws.send(JSON.stringify({ type: 'login_result', success: false }));
                    return;
                }
                currentUser = data.username;
                clients[currentUser] = ws;

                // отправляем последние сообщения ("Сохранённое")
                const chatRes = await db.query('SELECT * FROM messages WHERE sender=$1 OR receiver=$1 ORDER BY ts ASC', [currentUser]);
                ws.send(JSON.stringify({ type: 'init_chats', chats: chatRes.rows }));

                ws.send(JSON.stringify({ type: 'login_result', success: true }));
            }

            // Отправка сообщений
            if (data.type === 'message' && currentUser) {
                const blockedRes = await db.query('SELECT * FROM blocks WHERE blocker=$1 AND blocked=$2', [data.to, currentUser]);
                if (blockedRes.rows.length === 0) {
                    await db.query('INSERT INTO messages(sender,receiver,text) VALUES($1,$2,$3)', [currentUser, data.to, data.text]);
                    
                    // отправка получателю, если онлайн
                    if (clients[data.to]) {
                        clients[data.to].send(JSON.stringify({ type: 'message', from: currentUser, text: data.text }));
                    }
                }
            }

            // Добавление в друзья
            if (data.type === 'add_friend' && currentUser) {
                await db.query('INSERT INTO friends(user1,user2) VALUES($1,$2) ON CONFLICT DO NOTHING', [currentUser, data.friend]);
            }

            // Блокировка
            if (data.type === 'block' && currentUser) {
                await db.query('INSERT INTO blocks(blocker,blocked) VALUES($1,$2) ON CONFLICT DO NOTHING', [currentUser, data.blocked]);
            }

        } catch (e) {
            console.error("Ошибка обработки сообщения:", e);
        }
    });

    ws.on('close', () => {
        if (currentUser) delete clients[currentUser];
    });
});
