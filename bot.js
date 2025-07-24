require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.TELEGRAM_CHAT_ID;

// ВАЖНО: УДАЛЕНО { polling: true }
// Бот будет инициализирован, но не будет сам опрашивать Telegram.
// Вместо этого server.js будет передавать ему обновления через webhooks.
const bot = new TelegramBot(token);

const users = {}; // Состояния пользователей, теперь ключом может быть Telegram chatId или socket.id

const LANGS = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' }
];

const SERVICES = {
  ru: ['Татуировка', 'Пирсинг', 'Перманентный макияж'],
  en: ['Tattoo', 'Piercing', 'Permanent makeup']
};

const CITIES = {
  ru: ['Дублин', 'Корк', 'Голуэй', 'Лимерик', 'Другое'],
  en: ['Dublin', 'Cork', 'Galway', 'Limerick', 'Other']
};

const FAQ = {
  ru: [
    { q: 'Сколько стоит татуировка/пирсинг/перманент?', a: 'Стоимость зависит от объёма, стиля и сложности работы. Точную цену Kris сможет назвать после обсуждения вашей идеи и деталей.' },
    { q: 'Где находится студия?', a: 'Kris работает в Ирландии, чаще всего в Дублине. Точное место и дату уточняйте при записи.' },
    { q: 'Как подготовиться к процедуре?', a: 'Перед процедурой важно хорошо выспаться, не употреблять алкоголь и кофе, хорошо поесть. Подробности Kris расскажет лично.' },
    { q: 'Какой уход после процедуры?', a: 'После процедуры вы получите подробные инструкции по уходу и специальную заживляющую плёнку.' },
    { q: 'Как связаться с Kris?', a: 'Связаться с Kris можно через Telegram, WhatsApp, Instagram или по телефону. Все контакты доступны в разделе "Контакты".' },
    { q: 'Какие стили тату вы делаете?', a: 'Kris работает в стилях AQUA, COVER UP, LINE, MINI и других. Можно обсудить индивидуальный проект.' },
    { q: 'Можно ли перекрыть старую татуировку?', a: 'Да, можно! Kris профессионально перекрывает старую или неудачную татуировку.' },
    { q: 'Как записаться на консультацию?', a: 'Для консультации просто напишите Kris в Telegram или WhatsApp, либо воспользуйтесь этим ботом для записи.' }
  ],
  en: [
    { q: 'How much does a tattoo/piercing/permanent makeup cost?', a: 'The price depends on the size, style, and complexity. Kris will give you an exact quote after discussing your idea and details.' },
    { q: 'Where is the studio located?', a: 'Kris works in Ireland, mostly in Dublin. Exact place and date are clarified when booking.' },
    { q: 'How to prepare for the procedure?', a: 'Before the procedure, get a good night’s sleep, avoid alcohol and coffee, and have a good meal. Kris will give you all the details personally.' },
    { q: 'How to care after the procedure?', a: 'After the procedure, you will receive detailed aftercare instructions and a special healing film.' },
    { q: 'How to contact Kris?', a: 'You can contact Kris via Telegram, WhatsApp, Instagram, or phone. All contacts are available in the "Contacts" section.' },
    { q: 'What tattoo styles do you do?', a: 'Kris works in AQUA, COVER UP, LINE, MINI, and other styles. You can discuss your individual project.' },
    { q: 'Can you cover up an old tattoo?', a: 'Yes, you can! Kris professionally covers up old or unsuccessful tattoos.' },
    { q: 'How to book a consultation?', a: 'To book a consultation, just write to Kris in Telegram or WhatsApp, or use this bot to book.' }
  ]
};

const CONTACTS = {
  ru: `Контакты Kris:
Telegram: @mimimitattoo
WhatsApp UA: https://wa.me/380965157890
WhatsApp IRL: https://wa.me/353877167933
Instagram: https://www.instagram.com/mimimitattoo
Facebook: https://www.facebook.com/share/16r3PEdLeh/?mibextid=wwXIfr
Email: nika889list.ru@gmail.com
Телефоны: +380 96 515 78 90 (UA), +353 87 716 79 33 (IRL)`,
  en: `Kris's contacts:
Telegram: @mimimitattoo
WhatsApp UA: https://wa.me/380965157890
WhatsApp IRL: https://wa.me/353877167933
Instagram: https://www.instagram.com/mimimitattoo
Facebook: https://www.facebook.com/share/16r3PEdLeh/?mibextid=wwXIfr
Email: nika889list.ru@gmail.com
Phones: +380 96 515 78 90 (UA), +353 87 716 79 33 (IRL)`
};

// Отправка сообщения обратно клиенту (Telegram или Web)
async function sendMessageToClient(chatId, text, options = {}, source, ioInstance) {
  if (source === 'web') {
    // Отправляем сообщение на веб-виджет через Socket.IO
    if (ioInstance) {
      ioInstance.to(chatId).emit('botMessage', {
        text: text,
        buttons: options.reply_markup ? options.reply_markup.inline_keyboard : []
      });
    } else {
      console.error('Socket.IO instance not provided for web message');
    }
  } else { // source === 'telegram'
    // Отправляем сообщение в Telegram
    try {
      await bot.sendMessage(chatId, text, options);
    } catch (error) {
      console.error(`Error sending message to Telegram chat ${chatId}:`, error);
    }
  }
}

// Отправка отредактированного сообщения обратно клиенту (Telegram или Web)
async function editMessageToClient(chatId, messageId, text, options = {}, source, ioInstance) {
  if (source === 'web') {
    // Для веб-виджета, мы не поддерживаем прямое "редактирование" сообщений,
    // но можем отправить новое сообщение и обновить кнопки.
    if (ioInstance) {
      ioInstance.to(chatId).emit('botMessage', {
        text: text,
        buttons: options.reply_markup ? options.reply_markup.inline_keyboard : []
      });
      // Можно также отправить команду фронтенду удалить предыдущие кнопки, если они были
      ioInstance.to(chatId).emit('clearLastButtons'); // Предполагаемая команда фронтенду
    } else {
      console.error('Socket.IO instance not provided for web message edit');
    }
  } else { // source === 'telegram'
    try {
      await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, ...options });
    } catch (error) {
      console.error(`Error editing message in Telegram chat ${chatId}:`, error);
    }
  }
}

// Отправка alert-уведомления клиенту (только Telegram, для web - эмулируем)
async function answerCallbackQueryClient(queryId, options = {}, source, ioInstance) {
  if (source === 'web') {
    if (options.show_alert && ioInstance && options.chat_id) { // Добавляем chat_id в options
        ioInstance.to(options.chat_id).emit('showAlert', { text: options.text });
    }
  } else { // source === 'telegram'
    try {
      await bot.answerCallbackQuery(queryId, options);
    } catch (error) {
      console.error(`Error answering callback query ${queryId}:`, error);
    }
  }
}

// Удаление сообщения (только Telegram, для web - эмулируем)
async function deleteMessageClient(chatId, messageId, source, ioInstance) {
  if (source === 'web') {
    if (ioInstance) {
      // Для веб-виджета можно отправить команду на фронтенд для скрытия кнопок или сообщения
      ioInstance.to(chatId).emit('clearLastButtons'); // Предполагаемая команда фронтенду
    }
  } else { // source === 'telegram'
    try {
      await bot.deleteMessage(chatId, messageId);
    } catch (error) {
      console.error(`Error deleting message in Telegram chat ${chatId}:`, error);
    }
  }
}


function mainMenu(lang) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: lang === 'ru' ? '📝 Записаться к Kris' : '📝 Book an appointment', callback_data: 'book' }],
        [{ text: lang === 'ru' ? '❓ Частые вопросы' : '❓ FAQ', callback_data: 'faq' }],
        [{ text: lang === 'ru' ? '📞 Контакты' : '📞 Contacts', callback_data: 'contacts' }],
        [{ text: lang === 'ru' ? '🌐 Сменить язык' : '🌐 Change language', callback_data: 'lang' }]
      ]
    }
  };
}

function langMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Русский', callback_data: 'setlang_ru' }, { text: 'English', callback_data: 'setlang_en' }]
      ]
    }
  };
}

function servicesMenu(lang) {
  return {
    reply_markup: {
      inline_keyboard: SERVICES[lang].map((s, i) => [{ text: s, callback_data: `service_${i}` }])
        .concat([[{ text: lang === 'ru' ? '⬅️ Назад' : '⬅️ Back', callback_data: 'menu' }]])
    }
  };
}

function citiesMenu(lang) {
  return {
    reply_markup: {
      inline_keyboard: CITIES[lang].map((c, i) => [{ text: c, callback_data: `city_${i}` }])
        .concat([[{ text: lang === 'ru' ? '⬅️ Назад' : '⬅️ Back', callback_data: 'service' }]])
    }
  };
}

function faqMenu(lang) {
  return {
    reply_markup: {
      inline_keyboard: FAQ[lang].map((f, i) => [{ text: f.q, callback_data: `faq_${i}` }])
        .concat([[{ text: lang === 'ru' ? '⬅️ Назад' : '⬅️ Back', callback_data: 'menu' }]])
    }
  };
}

function getGreeting(lang) {
  return lang === 'ru'
    ? 'Привет! 👋\nЯ — бот сайта MIMIMI TATTOO. Здесь вы можете записаться к Kris на тату, пирсинг или перманент, а также узнать ответы на частые вопросы.\n\nПожалуйста, выберите действие:'
    : 'Hello! 👋\nI’m the MIMIMI TATTOO website bot. Here you can book an appointment with Kris for a tattoo, piercing, or permanent makeup, and get answers to common questions.\n\nPlease choose an option:';
}

function getFarewell(lang) {
  return lang === 'ru'
    ? 'Спасибо, что выбрали MIMIMI TATTOO. Если нужна дополнительная помощь — просто напишите сюда, я всегда на связи! Хорошего дня! 🌸'
    : 'Thank you for choosing MIMIMI TATTOO. If you need more help, just write here — I’m always in touch! Have a great day! 🌸';
}

// Сбросить пользователя в главное меню
function resetUser(chatId) {
  users[chatId] = { lang: users[chatId]?.lang || 'ru', step: 'menu' };
}


// === ГЛАВНАЯ ФУНКЦИЯ ОБРАБОТКИ СООБЩЕНИЙ ===
// Эта функция будет вызываться как для Telegram, так и для веб-виджета.
// Она принимает объект 'update' (либо от Telegram, либо от веб-виджета)
// и ioInstance (только если источник 'web' и нужно общаться по Socket.IO)
async function processMessage(update, ioInstance) {
  let chatId, text, data, source, queryId, messageId, message;

  // Определяем источник и извлекаем данные
  if (update.source === 'web') { // Сообщение с веб-виджета
    source = 'web';
    chatId = update.chatId; // socket.id
    text = update.text;
    data = update.data; // data теперь может прийти как data (callback_data)
    message = { chat: { id: chatId }, message_id: 'web_msg_' + Date.now() }; // Создаем mock-объект сообщения
  } else { // Сообщение от Telegram (webhook update)
    source = 'telegram';
    if (update.message) {
      message = update.message;
      chatId = message.chat.id;
      text = message.text;
    } else if (update.callback_query) {
      message = update.callback_query.message;
      chatId = message.chat.id;
      data = update.callback_query.data;
      queryId = update.callback_query.id; // Для answerCallbackQuery
      text = null; // Callback-запросы не имеют текстового сообщения
    } else {
        console.warn('Unknown update type from Telegram:', update);
        return;
    }
  }

  users[chatId] = users[chatId] || { lang: 'ru', step: 'menu' };
  const lang = users[chatId].lang;
  const currentStep = users[chatId].step; // Сохраняем текущий шаг пользователя

  try {
    // Если это callback_query или сообщение, которое надо обработать как callback
    if (data) {
      // Смена языка
      if (data === 'lang') {
        users[chatId].step = 'lang';
        return await editMessageToClient(
          chatId,
          message.message_id,
          lang === 'ru' ? 'Пожалуйста, выберите язык:' : 'Please choose your language:',
          langMenu(),
          source,
          ioInstance
        );
      }
      if (data.startsWith('setlang_')) {
        const newLang = data.split('_')[1];
        users[chatId].lang = newLang;
        resetUser(chatId); // Сброс состояния после смены языка
        return await editMessageToClient(
          chatId,
          message.message_id,
          getGreeting(newLang),
          mainMenu(newLang),
          source,
          ioInstance
        );
      }

      // Главное меню
      if (data === 'menu') {
        resetUser(chatId);
        return await editMessageToClient(
          chatId,
          message.message_id,
          getGreeting(lang),
          mainMenu(lang),
          source,
          ioInstance
        );
      }

      // Запись на услугу
      if (data === 'book') {
        users[chatId].step = 'service';
        return await editMessageToClient(
          chatId,
          message.message_id,
          lang === 'ru' ? 'Выберите услугу:' : 'Choose a service:',
          servicesMenu(lang),
          source,
          ioInstance
        );
      }
      if (data.startsWith('service_')) {
        const idx = Number(data.split('_')[1]);
        users[chatId].service = SERVICES[lang][idx];
        users[chatId].step = 'name';
        // Для веб-виджета, мы не можем удалить сообщение бота, просто отправляем следующий запрос
        if (source === 'web') {
            await sendMessageToClient(chatId, lang === 'ru' ? 'Как вас зовут?' : 'What is your name?', {}, source, ioInstance);
        } else {
            await deleteMessageClient(chatId, message.message_id, source, ioInstance); // Удаляем предыдущие кнопки в Telegram
            await sendMessageToClient(chatId, lang === 'ru' ? 'Как вас зовут?' : 'What is your name?', {}, source, ioInstance);
        }
        return;
      }

      // FAQ
      if (data === 'faq') {
        users[chatId].step = 'faq_list'; // Новое состояние для списка FAQ
        return await editMessageToClient(
          chatId,
          message.message_id,
          lang === 'ru' ? 'Выберите вопрос:' : 'Choose a question:',
          faqMenu(lang),
          source,
          ioInstance
        );
      }
      if (data.startsWith('faq_')) {
        const idx = Number(data.split('_')[1]);
        const answer = FAQ[lang][idx].a;
        if (source === 'telegram') {
            try {
                // Telegram's limit for inline query answer is ~200 chars for show_alert
                if (answer.length < 180) {
                    await answerCallbackQueryClient(queryId, { text: answer, show_alert: true }, source);
                } else {
                    await answerCallbackQueryClient(queryId, {}, source); // просто закрыть alert
                    await sendMessageToClient(chatId, answer, {}, source);
                }
            } catch (err) {
                console.error('answerCallbackQuery error (telegram):', err);
            }
        } else if (source === 'web') {
            // Для веб-виджета, мы не используем answerCallbackQuery, а просто добавляем сообщение
            await sendMessageToClient(chatId, answer, {}, source, ioInstance);
            if (FAQ[lang][idx].a.length < 180) { // Имитация show_alert для веб
                // ioInstance.to(chatId).emit('showAlert', { text: answer }); // Активировать, если нужно всплывающее окно на фронтенде
            }
        }
        return; // Не возвращаемся в меню после ответа на FAQ
      }

      // Контакты
      if (data === 'contacts') {
        // Мы не меняем шаг, просто отправляем контакты и держим пользователя в 'menu' или 'faq_list'
        return await editMessageToClient(
          chatId,
          message.message_id,
          CONTACTS[lang],
          mainMenu(lang),
          source,
          ioInstance
        );
      }

      // Город
      if (data.startsWith('city_')) {
        const idx = Number(data.split('_')[1]);
        if (CITIES[lang][idx] === (lang === 'ru' ? 'Другое' : 'Other')) {
          users[chatId].step = 'city_other';
          await deleteMessageClient(chatId, message.message_id, source, ioInstance);
          return await sendMessageToClient(chatId, lang === 'ru' ? 'Пожалуйста, напишите, в каком городе вы хотите записаться:' : 'Please type the city where you want to book:', {}, source, ioInstance);
        } else {
          users[chatId].city = CITIES[lang][idx];
          users[chatId].step = 'date';
          await deleteMessageClient(chatId, message.message_id, source, ioInstance);
          return await sendMessageToClient(chatId, lang === 'ru'
            ? 'Когда вам удобно прийти? (Напишите дату и время или пожелания)'
            : 'When would you like to come? (Please write date and time or your wishes)', {}, source, ioInstance);
        }
      }
    }

    // Если это текстовое сообщение (msg.text)
    if (text) {
        // Обработка /start и /menu (для веб-виджета также, если пользователь введет /start)
        if (text === '/start' || text === '/menu') {
            resetUser(chatId);
            return await sendMessageToClient(chatId, getGreeting(lang), mainMenu(lang), source, ioInstance);
        }

        // Имя
        if (currentStep === 'name') { // Используем сохраненный шаг
            users[chatId].name = text;
            users[chatId].step = 'phone';
            return await sendMessageToClient(chatId, lang === 'ru' ? 'Ваш номер телефона?' : 'Your phone number?', {}, source, ioInstance);
        }

        // Телефон
        if (currentStep === 'phone') { // Используем сохраненный шаг
            users[chatId].phone = text;
            users[chatId].step = 'city';
            return await sendMessageToClient(chatId, lang === 'ru' ? 'Выберите город:' : 'Choose a city:', citiesMenu(lang), source, ioInstance);
        }

        // Город (ручной ввод)
        if (currentStep === 'city_other') { // Используем сохраненный шаг
            users[chatId].city = text;
            users[chatId].step = 'date';
            return await sendMessageToClient(chatId, lang === 'ru'
                ? 'Когда вам удобно прийти? (Напишите дату и время или пожелания)'
                : 'When would you like to come? (Please write date and time or your wishes)', {}, source, ioInstance);
        }

        // Дата/время
        if (currentStep === 'date') { // Используем сохраненный шаг
            users[chatId].date = text;
            users[chatId].step = 'menu'; // Сброс в главное меню после завершения
            
            // Уведомление Kris
            const notify =
                (lang === 'ru' ? '✨ Новая заявка!\n' : '✨ New request!\n') +
                (lang === 'ru' ? 'Источник' : 'Source') + `: ${source}\n` + // Добавляем источник
                (lang === 'ru' ? 'Услуга' : 'Service') + `: ${users[chatId].service}\n` +
                (lang === 'ru' ? 'Имя' : 'Name') + `: ${users[chatId].name}\n` +
                (lang === 'ru' ? 'Телефон' : 'Phone') + `: ${users[chatId].phone}\n` +
                (lang === 'ru' ? 'Город' : 'City') + `: ${users[chatId].city}\n` +
                (lang === 'ru' ? 'Дата/время' : 'Date/Time') + `: ${users[chatId].date}`;

            try {
                await bot.sendMessage(adminChatId, notify); // Отправляем уведомление Kris в Telegram
            } catch (err) {
                console.error('sendMessage to admin error:', err);
            }

            // Ответ пользователю
            return await sendMessageToClient(chatId,
                (lang === 'ru'
                    ? 'Спасибо за заявку! Kris свяжется с вами для уточнения деталей. Важно: для подтверждения записи потребуется предоплата.\n\n'
                    : 'Thank you for your request! Kris will contact you to confirm the details. Note: a prepayment is required to confirm your booking.\n\n'
                ) + getFarewell(lang),
                mainMenu(lang), // Возвращаем кнопки главного меню
                source,
                ioInstance
            );
        }
    }
  } catch (err) {
    console.error('processMessage error:', err);
    // Отправляем сообщение об ошибке пользователю, если что-то пошло не так
    await sendMessageToClient(chatId, lang === 'ru' ? 'Извините, произошла ошибка. Попробуйте еще раз или напишите Kris напрямую.' : 'Sorry, an error occurred. Please try again or contact Kris directly.', {}, source, ioInstance);
    resetUser(chatId); // Сбрасываем состояние пользователя
  }
}

// ==== ЭКСПОРТИРУЕМ ФУНКЦИИ ====
module.exports = {
  // Для server.js, чтобы он передавал сюда webhook обновления от Telegram
  handleTelegramUpdate: async (update) => {
    // В зависимости от типа обновления (message, callback_query), вызываем processMessage
    // Для Telegram ioInstance не нужен
    if (update.message) {
        await processMessage({ ...update.message, source: 'telegram' }, null);
    } else if (update.callback_query) {
        await processMessage({ ...update.callback_query, message: update.callback_query.message, data: update.callback_query.data, queryId: update.callback_query.id, source: 'telegram' }, null);
    } else {
        console.warn('Unknown update type from Telegram:', update);
    }
  },
  // Для server.js, чтобы он передавал сюда сообщения с веб-виджета
  processMessage: processMessage // Экспортируем основную функцию обработки
};