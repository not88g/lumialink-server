// Подключаем postgres
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Render сам подставит
  ssl: { rejectUnauthorized: false }
});

// Регистрация
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const exists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, password]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

// Вход
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Неверные данные' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка входа' });
  }
});
