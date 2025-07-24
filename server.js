const express = require('express');
const axios = require('axios');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const botLogic = require('./bot');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.post('/telegram-webhook', (req, res) => {
  botLogic.handleTelegramUpdate(req.body, io); // Передаем io здесь тоже, на случай если боту понадобится отправить что-то в веб-сокет из-за телеграма
  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.send('MimimiTattooBot is running and ready for web & Telegram interactions!');
});

io.on('connection', (socket) => {
  console.log('Пользователь подключился к веб-сокету:', socket.id);

  socket.on('webMessage', (data) => {
    console.log('Сообщение с веб-виджета:', data);
    // ИСПРАВЛЕНИЕ ЗДЕСЬ: io передается как отдельный аргумент processMessage
    botLogic.processMessage({
      chatId: socket.id,
      text: data.message,
      data: data.isCallback ? data.message : null,
      source: 'web'
    }, io); // io передается вторым аргументом
  });

  socket.on('disconnect', () => {
    console.log('Пользователь отключился от веб-сокета:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server started on port ${PORT} and Socket.IO is ready`));