const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3000 });

let users = {};   // { username: ws }
let chats = {};   // { username: [messages] }

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        try {
            const data = JSON.parse(message);

            if (data.type === 'register') {
                const username = data.username;
                users[username] = ws;
                chats[username] = [{ from: username, text: "чат «сохранённое» создан!" }];
                ws.send(JSON.stringify({ type: 'system', message: 'сохранённый чат создан' }));
            }

            if (data.type === 'message') {
                const to = data.to;
                const from = data.from;
                const text = data.text;

                // сохраняем в чат отправителя
                if (!chats[from]) chats[from] = [];
                chats[from].push({ from, text });

                // сохраняем у получателя и отправляем
                if (!chats[to]) chats[to] = [];
                chats[to].push({ from, text });

                if (users[to]) {
                    users[to].send(JSON.stringify({ type: 'message', from, text }));
                }
            }
        } catch (err) {
            console.log('Ошибка обработки сообщения:', err);
        }
    });

    ws.on('close', () => {
        // удаляем пользователя из списка
        for (let u in users) {
            if (users[u] === ws) delete users[u];
        }
    });
});

console.log('Server running on ws://localhost:3000');
