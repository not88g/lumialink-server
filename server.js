const WebSocket = require("ws");

const port = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port });

let users = {};    // username -> ws
let friends = {};  // username -> [friends]
let blocked = {};  // username -> [blocked]

function ensureUser(name) {
  if (!friends[name]) friends[name] = [];
  if (!blocked[name]) blocked[name] = [];
}

wss.on("connection", (ws) => {
  console.log("📲 Новый клиент подключился");

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      // 🔹 Регистрация
      if (data.type === "register") {
        if (!data.username.startsWith("@")) {
          ws.send(JSON.stringify({ error: "Username must start with @" }));
          return;
        }
        users[data.username] = ws;
        ensureUser(data.username);
        ws.send(
          JSON.stringify({ type: "registered", username: data.username })
        );
        console.log(`✅ Зарегистрирован: ${data.username}`);
      }

      // 🔹 Поиск
      if (data.type === "search") {
        const found = users[data.username] ? true : false;
        ws.send(
          JSON.stringify({
            type: "search_result",
            username: data.username,
            found,
          })
        );
      }

      // 🔹 Сообщения
      if (data.type === "message") {
        const to = data.to;
        ensureUser(to);
        if (blocked[to] && blocked[to].includes(data.from)) {
          console.log(`🚫 ${data.from} заблокирован у ${to}`);
          return;
        }
        const targetWs = users[to];
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          targetWs.send(
            JSON.stringify({
              type: "message",
              from: data.from,
              message: data.message,
            })
          );
        } else {
          ws.send(JSON.stringify({ error: "User offline" }));
        }
      }

      // 🔹 Добавить в друзья
      if (data.type === "add_friend") {
        ensureUser(data.from);
        ensureUser(data.to);
        if (!friends[data.from].includes(data.to)) {
          friends[data.from].push(data.to);
        }
        ws.send(
          JSON.stringify({
            type: "friend_added",
            friend: data.to,
          })
        );
      }

      // 🔹 Заблокировать
      if (data.type === "block_user") {
        ensureUser(data.from);
        if (!blocked[data.from].includes(data.to)) {
          blocked[data.from].push(data.to);
        }
        ws.send(
          JSON.stringify({
            type: "user_blocked",
            blocked: data.to,
          })
        );
      }
    } catch (e) {
      console.log("Ошибка:", e.message);
    }
  });

  ws.on("close", () => {
    for (let u in users) {
      if (users[u] === ws) delete users[u];
    }
  });
});

console.log(`🌐 lumialink сервер запущен на порту ${port}`);
