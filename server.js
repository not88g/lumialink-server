const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });
const { Client } = require('pg');

const db = new Client({
    connectionString: "postgresql://datalumiabaselink_user:MGeBsOZdrxxTbT1sVDd1oXlKOfvI7qBI@dpg-d2s5c1mmcj7s73fslto0-a/datalumiabaselink",
    ssl: { rejectUnauthorized: false }
});

db.connect()
  .then(() => console.log("Postgres подключён"))
  .catch(err => console.error("Ошибка подключения к Postgres:", err));

wss.on('connection', ws => {
  console.log('📲 Новый клиент подключился');

  ws.on('message', message => {
    console.log('Сообщение:', message.toString());

    // Отправляем всем подключенным клиентам
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    });
  });
});

