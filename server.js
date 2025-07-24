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
const botLogic = require('./bot'); // Пока что это просто 'module.exports = bot;' в bot.js

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ===== ВАЖНО: Настройка Webhook для Telegram (вместо polling) =====
// Вам нужно один раз вызвать этот Webhook, чтобы Telegram знал, куда отправлять обновления.
// Можно вызвать через curl, браузер, или добавить временный маршрут здесь.
// Например, для установки Webhook:
// https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<YOUR_SERVER_DOMAIN>/telegram-webhook
// Замените <YOUR_BOT_TOKEN> и <YOUR_SERVER_DOMAIN>
// Если вы используете Render.com, то YOUR_SERVER_DOMAIN будет URL вашего развернутого сервера.
//
// Маршрут для Webhook от Telegram
app.post('/telegram-webhook', (req, res) => {
  botLogic.handleTelegramUpdate(req.body); // Передаем обновление в логику бота
  res.sendStatus(200); // Telegram ожидает 200 OK
});
// ==================================================================


// Корневой маршрут для Render/UptimeRobot
app.get('/', (req, res) => {
  res.send('MimimiTattooBot is running and ready for web & Telegram interactions!');
});

// Новый API маршрут для приема сообщений от веб-виджета (используем Socket.IO вместо POST)
// Этот маршрут POST /api/message становится ненужным, так как общение будет через Socket.IO
/*
app.post('/api/message', async (req, res) => {
  const { message } = req.body;

  try {
    // Здесь мы больше не будем напрямую отправлять в Telegram
    // Вместо этого мы будем использовать Socket.IO для отправки на веб-виджет,
    // и логика бота будет решать, куда отправить ответ.
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
      }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
*/

// Socket.IO обработчик соединений
io.on('connection', (socket) => {
  console.log('Пользователь подключился к веб-сокету:', socket.id);

  // Когда веб-виджет отправляет сообщение
  socket.on('webMessage', (data) => {
    console.log('Сообщение с веб-виджета:', data);
    // Передаем сообщение в логику бота, указывая источник как 'web'
    // и передаем socket.id, чтобы знать, куда отправлять ответ
    botLogic.processMessage({
      chatId: socket.id, // Используем socket.id как chatId для веб-пользователя
      text: data.message,
      isCallback: data.isCallback,
      source: 'web',
      io: io // Передаем объект io, чтобы бот мог отправлять ответы через сокет
    });
  });

  socket.on('disconnect', () => {
    console.log('Пользователь отключился от веб-сокета:', socket.id);
  });
});


const PORT = process.env.PORT || 3001;
// Используем server.listen вместо app.listen
server.listen(PORT, () => console.log(`Server started on port ${PORT} and Socket.IO is ready`));

// Запускаем Telegram-бота (но теперь bot.js будет экспортировать функции, а не запускать polling)
// В bot.js нам нужно будет экспортировать handleTelegramUpdate и processMessage
// require('./bot'); // Эта строка будет удалена/изменена