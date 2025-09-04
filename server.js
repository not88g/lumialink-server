const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const LLD_API_URL = 'https://lldbapi.onrender.com';
const LLM_API_URL = 'https://llmapi-zau6.onrender.com';

// Регистрация нового пользователя
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const response = await axios.post(`${LLD_API_URL}/users`, {
            username,
            password
        });
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Логин пользователя
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const response = await axios.post(`${LLD_API_URL}/login`, {
            username,
            password
        });
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получение сообщений
app.get('/messages/:chatId', async (req, res) => {
    const chatId = req.params.chatId;
    try {
        const response = await axios.get(`${LLD_API_URL}/messages/${chatId}`);
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Отправка пуша
app.post('/push', async (req, res) => {
    const { title, body, userId } = req.body;
    try {
        const response = await axios.post(`${LLM_API_URL}/push`, {
            title,
            body,
            userId
        });
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Статус онлайн
app.post('/status', async (req, res) => {
    const { userId, online } = req.body;
    try {
        const response = await axios.post(`${LLD_API_URL}/status`, {
            userId,
            online
        });
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
