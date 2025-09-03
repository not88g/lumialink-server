const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });

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
