const express = require('express');
const axios = require('axios');
const cors = require('cors');
const http = require('http'); // Добавлено для создания HTTP сервера
const { Server } = require('socket.io'); // Добавлено для Socket.IO

const app = express();
const server = http.createServer(app); // Создаем HTTP сервер из Express приложения
const io = new Server(server, {
  cors: {
    origin: "*", // Разрешаем подключение с любого домена (для разработки). В продакшене лучше указать домен вашего сайта.
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Переносим импорт логики бота сюда, чтобы передать ей io объект
const botLogic = require('./bot');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Маршрут для Webhook от Telegram
app.post('/telegram-webhook', (req, res) => {
  // Передаем io в handleTelegramUpdate, чтобы бот мог отправлять сообщения на веб-виджет
  botLogic.handleTelegramUpdate(req.body, io);
  res.sendStatus(200); // Telegram ожидает 200 OK
});

// Корневой маршрут для Render/UptimeRobot
app.get('/', (req, res) => {
  res.send('MimimiTattooBot is running and ready for web & Telegram interactions!');
});

// Socket.IO обработчик соединений
io.on('connection', (socket) => {
  console.log('Пользователь подключился к веб-сокету:', socket.id);

  socket.on('webMessage', (data) => {
    console.log('Сообщение с веб-виджета:', data);
    // Передаем io как отдельный аргумент processMessage
    botLogic.processMessage({
      chatId: socket.id,
      text: data.message,
      data: data.isCallback ? data.message : null, // data - это callback_data, если это callback
      source: 'web'
    }, io); // io передается вторым аргументом
  });

  socket.on('disconnect', () => {
    console.log('Пользователь отключился от веб-сокета:', socket.id);
  });
});


const PORT = process.env.PORT || 3001;
// Используем server.listen вместо app.listen
server.listen(PORT, () => console.log(`Server started on port ${PORT} and Socket.IO is ready`));