const WebSocket = require("ws");

const port = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port });

let users = {};    // @username → ws
let friends = {};  // @username → [friends]
let blocked = {};  // @username → [blocked]

function ensureUser(name) {
  if (!friends[name]) friends[name] = [];
  if (!blocked[name]) blocked[name] = [];
}

wss.on("connection", ws => {
  console.log("📲 Новый клиент подключился");

  ws.on("message", msg => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      console.log("Ошибка парсинга:", msg);
      return;
    }

    // 🔹 Регистрация
    if (data.type === "register") {
      if (!data.username.startsWith("@")) {
        ws.send(JSON.stringify({ type: "error", message: "Username must start with @" }));
        return;
      }
      users[data.username] = ws;
      ensureUser(data.username);
      ws.username = data.username; // сохраним в объекте ws
      ws.send(JSON.stringify({ type: "registered", username: data.username }));
      console.log(`✅ ${data.username} вошёл`);
    }

    // 🔹 Поиск
    if (data.type === "search") {
      const found = users[data.username] ? true : false;
      ws.send(JSON.stringify({ type: "search_result", username: data.username, found }));
    }

    // 🔹 Сообщение
    if (data.type === "message") {
      const to = data.to;
      ensureUser(to);
      if (blocked[to] && blocked[to].includes(data.from)) {
        console.log(`🚫 ${data.from} заблокирован у ${to}`);
        return;
      }
      const targetWs = users[to];
      if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify({
          type: "message",
          from: data.from,
          message: data.message
        }));
      }
    }

    // 🔹 Добавить друга
    if (data.type === "add_friend") {
      ensureUser(data.from);
      ensureUser(data.to);
      if (!friends[data.from].includes(data.to)) {
        friends[data.from].push(data.to);
      }
      ws.send(JSON.stringify({ type: "friend_added", friend: data.to }));
    }

    // 🔹 Заблокировать
    if (data.type === "block_user") {
      ensureUser(data.from);
      if (!blocked[data.from].includes(data.to)) {
        blocked[data.from].push(data.to);
      }
      ws.send(JSON.stringify({ type: "user_blocked", user: data.to }));
    }
  });

  ws.on("close", () => {
    if (ws.username) {
      console.log(`❌ ${ws.username} отключился`);
      delete users[ws.username];
    }
  });
});

console.log(`🌐 Сервер запущен на порту ${port}`);
