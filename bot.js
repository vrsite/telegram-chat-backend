require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.TELEGRAM_CHAT_ID;

const bot = new TelegramBot(token); // Убедитесь, что здесь нет { polling: true }

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
    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms задержка
    if (ioInstance) {
      console.log(`[BOT-SEND] Sending to web socket ${chatId}: ${text}`); // Логирование отправки на веб
      ioInstance.to(chatId).emit('botMessage', {
        text: text,
        buttons: options.reply_markup ? options.reply_markup.inline_keyboard : []
      });
    } else {
      console.error('[BOT-ERROR] Socket.IO instance not provided for web message. Cannot send to socket.');
    }
  } else { // source === 'telegram'
    try {
      console.log(`[BOT-SEND] Sending to Telegram chat ${chatId}: ${text}`); // Логирование отправки в ТГ
      await bot.sendMessage(chatId, text, options);
    } catch (error) {
      console.error(`[BOT-ERROR] Error sending message to Telegram chat ${chatId}:`, error);
    }
  }
}

// Отправка отредактированного сообщения обратно клиенту (Telegram или Web)
async function editMessageToClient(chatId, messageId, text, options = {}, source, ioInstance) {
  if (source === 'web') {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (ioInstance) {
      console.log(`[BOT-EDIT] Sending edited message to web socket ${chatId}: ${text}`); // Логирование отправки edit
      ioInstance.to(chatId).emit('botMessage', { // Для веб-виджета, отправляем новое сообщение вместо редактирования
        text: text,
        buttons: options.reply_markup ? options.reply_markup.inline_keyboard : []
      });
      // ioInstance.to(chatId).emit('clearLastButtons'); // Команда фронтенду для очистки предыдущих кнопок - ЭТУ СТРОКУ НУЖНО ЗАКОММЕНТИРОВАТЬ ИЛИ УДАЛИТЬ!
    } else {
      console.error('[BOT-ERROR] Socket.IO instance not provided for web message edit. Cannot send to socket.');
    }
  } else { // source === 'telegram'
    try {
      console.log(`[BOT-EDIT] Editing Telegram message ${messageId} in chat ${chatId}: ${text}`); // Логирование редактирования в ТГ
      await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, ...options });
    } catch (error) {
      console.error(`[BOT-ERROR] Error editing message in Telegram chat ${chatId}:`, error);
    }
  }
}

// Отправка alert-уведомления клиенту (только Telegram, для web - эмулируем)
async function answerCallbackQueryClient(queryId, options = {}, source, ioInstance) {
  if (source === 'web') {
    if (options.show_alert && ioInstance && options.text && options.chat_id) { // Убедимся, что text и chat_id в options есть
        console.log(`[BOT-ALERT] Sending alert to web socket ${options.chat_id}: ${options.text}`); // Логирование alert
        ioInstance.to(options.chat_id).emit('showAlert', { text: options.text });
    } else {
        console.warn('[BOT-WARN] showAlert called for web without necessary options or ioInstance.');
    }
  } else { // source === 'telegram'
    try {
      console.log(`[BOT-ALERT] Answering callback query ${queryId} in Telegram.`); // Логирование ответа на callback
      await bot.answerCallbackQuery(queryId, options);
    } catch (error) {
      console.error(`[BOT-ERROR] Error answering callback query ${queryId} in Telegram:`, error);
    }
  }
}

// Удаление сообщения (только Telegram, для web - эмулируем)
async function deleteMessageClient(chatId, messageId, source, ioInstance) {
  if (source === 'web') {
    if (ioInstance) {
      console.log(`[BOT-DELETE] Clearing buttons for web socket ${chatId}.`); // Логирование очистки
      ioInstance.to(chatId).emit('clearLastButtons'); // Команда фронтенду для очистки кнопок
    } else {
      console.error('[BOT-ERROR] Socket.IO instance not provided for web message delete. Cannot clear buttons.');
    }
  } else { // source === 'telegram'
    try {
      console.log(`[BOT-DELETE] Deleting Telegram message ${messageId} in chat ${chatId}.`); // Логирование удаления
      await bot.deleteMessage(chatId, messageId);
    } catch (error) {
      console.error(`[BOT-ERROR] Error deleting message in Telegram chat ${chatId}:`, error);
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
  console.log(`[BOT-STATE] User ${chatId} reset to menu state.`); // Логирование сброса состояния
}


// === ГЛАВНАЯ ФУНКЦИЯ ОБРАБОТКИ СООБЩЕНИЙ ===
// Эта функция будет вызываться как для Telegram, так и для веб-виджета.
// Она принимает объект 'updateData' (либо от Telegram, либо от веб-виджета)
// и ioInstance (только если источник 'web' и нужно общаться по Socket.IO)
async function processMessage(updateData, ioInstance) {
  let chatId, text, data, source, queryId, message;

  source = updateData.source;

  if (source === 'web') {
    chatId = updateData.chatId; // socket.id
    text = updateData.message;
    data = updateData.isCallback ? updateData.message : null;
    message = { chat: { id: chatId }, message_id: 'web_msg_' + Date.now() }; // Mock message object for web
  } else { // source === 'telegram'
    if (updateData.message) {
      message = updateData.message;
      chatId = message.chat.id;
      text = message.text;
      data = null;
      queryId = null;
    } else if (updateData.callback_query) {
      message = updateData.callback_query.message;
      chatId = message.chat.id;
      data = updateData.callback_query.data;
      queryId = updateData.callback_query.id;
      text = null;
    } else {
        console.warn('[BOT-WARN] Unknown Telegram update type in processMessage:', updateData);
        return;
    }
  }
  
  // Инициализация или получение состояния пользователя
  if (!users[chatId]) {
      users[chatId] = { lang: 'ru', step: 'menu' }; // Установка начального языка и шага
  }
  const lang = users[chatId].lang;
  const currentStep = users[chatId].step;

  console.log(`[BOT-PROCESS] Chat ${chatId} (${source}) - Step: ${currentStep}, Text: "${text}", Data: "${data}"`); // Детальное логирование процесса

  try {
    if (data) { // Handle callback_query or callback-like data
      if (data === 'lang') {
        users[chatId].step = 'lang';
        return await editMessageToClient(chatId, message.message_id, lang === 'ru' ? 'Пожалуйста, выберите язык:' : 'Please choose your language:', langMenu(), source, ioInstance);
      }
      if (data.startsWith('setlang_')) {
        const newLang = data.split('_')[1];
        users[chatId].lang = newLang;
        resetUser(chatId);
        return await editMessageToClient(chatId, message.message_id, getGreeting(newLang), mainMenu(newLang), source, ioInstance);
      }
      if (data === 'menu') {
        resetUser(chatId);
        return await editMessageToClient(chatId, message.message_id, getGreeting(lang), mainMenu(lang), source, ioInstance);
      }
      if (data === 'book') {
        users[chatId].step = 'service';
        return await editMessageToClient(chatId, message.message_id, lang === 'ru' ? 'Выберите услугу:' : 'Choose a service:', servicesMenu(lang), source, ioInstance);
      }
      if (data.startsWith('service_')) {
        const idx = Number(data.split('_')[1]);
        users[chatId].service = SERVICES[lang][idx];
        users[chatId].step = 'name';
        if (source === 'web') {
            await sendMessageToClient(chatId, lang === 'ru' ? 'Как вас зовут?' : 'What is your name?', {}, source, ioInstance);
        } else {
            await deleteMessageClient(chatId, message.message_id, source, ioInstance);
            await sendMessageToClient(chatId, lang === 'ru' ? 'Как вас зовут?' : 'What is your name?', {}, source, ioInstance);
        }
        return;
      }
      if (data === 'faq') {
        users[chatId].step = 'faq_list';
        return await editMessageToClient(chatId, message.message_id, lang === 'ru' ? 'Выберите вопрос:' : 'Choose a question:', faqMenu(lang), source, ioInstance);
      }
      if (data.startsWith('faq_')) {
        const idx = Number(data.split('_')[1]);
        const answer = FAQ[lang][idx].a;
        if (source === 'telegram') {
            if (answer.length < 180) {
                await answerCallbackQueryClient(queryId, { text: answer, show_alert: true }, source, ioInstance); // queryId для ТГ
            } else {
                await answerCallbackQueryClient(queryId, {}, source, ioInstance);
                await sendMessageToClient(chatId, answer, {}, source, ioInstance);
            }
        } else if (source === 'web') {
            await sendMessageToClient(chatId, answer, {}, source, ioInstance);
            if (FAQ[lang][idx].a.length < 180) {
                // ioInstance.to(chatId).emit('showAlert', { text: answer }); // Активировать, если нужно всплывающее окно на фронтенде
            }
        }
        return;
      }
      if (data === 'contacts') {
        return await editMessageToClient(chatId, message.message_id, CONTACTS[lang], mainMenu(lang), source, ioInstance);
      }
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

    if (text) { // Handle text messages
        if (text === '/start' || text === '/menu') {
            resetUser(chatId);
            return await sendMessageToClient(chatId, getGreeting(lang), mainMenu(lang), source, ioInstance);
        }
        if (currentStep === 'name') {
            users[chatId].name = text;
            users[chatId].step = 'phone';
            return await sendMessageToClient(chatId, lang === 'ru' ? 'Ваш номер телефона?' : 'Your phone number?', {}, source, ioInstance);
        }
        if (currentStep === 'phone') {
            users[chatId].phone = text;
            users[chatId].step = 'city';
            return await sendMessageToClient(chatId, lang === 'ru' ? 'Выберите город:' : 'Choose a city:', citiesMenu(lang), source, ioInstance);
        }
        if (currentStep === 'city_other') {
            users[chatId].city = text;
            users[chatId].step = 'date';
            return await sendMessageToClient(chatId, lang === 'ru'
                ? 'Когда вам удобно прийти? (Напишите дату и время или пожелания)'
                : 'When would you like to come? (Please write date and time or your wishes)', {}, source, ioInstance);
        }
        if (currentStep === 'date') {
            users[chatId].date = text;
            users[chatId].step = 'menu';
            
            const notify =
                (lang === 'ru' ? '✨ Новая заявка!\n' : '✨ New request!\n') +
                (lang === 'ru' ? 'Источник' : 'Source') + `: ${source}\n` +
                (lang === 'ru' ? 'Услуга' : 'Service') + `: ${users[chatId].service}\n` +
                (lang === 'ru' ? 'Имя' : 'Name') + `: ${users[chatId].name}\n` +
                (lang === 'ru' ? 'Телефон' : 'Phone') + `: ${users[chatId].phone}\n` +
                (lang === 'ru' ? 'Город' : 'City') + `: ${users[chatId].city}\n` +
                (lang === 'ru' ? 'Дата/время' : 'Date/Time') + `: ${users[chatId].date}`;

            try {
                await bot.sendMessage(adminChatId, notify);
            } catch (err) {
                console.error('[BOT-ERROR] sendMessage to admin error:', err);
            }

            return await sendMessageToClient(chatId,
                (lang === 'ru'
                    ? 'Спасибо за заявку! Kris свяжется с вами для уточнения деталей. Важно: для подтверждения записи потребуется предоплата.\n\n'
                    : 'Thank you for your request! Kris will contact you to confirm the details. Note: a prepayment is required to confirm your booking.\n\n'
                ) + getFarewell(lang),
                mainMenu(lang),
                source,
                ioInstance
            );
        }
    }
  } catch (err) {
    console.error(`[BOT-ERROR] processMessage error for chat ${chatId}:`, err);
    await sendMessageToClient(chatId, lang === 'ru' ? 'Извините, произошла ошибка. Попробуйте еще раз или напишите Kris напрямую.' : 'Sorry, an error occurred. Please try again or contact Kris directly.', {}, source, ioInstance);
    resetUser(chatId);
  }
}

// ЭКСПОРТИРУЕМ ФУНКЦИИ
module.exports = {
  // handleTelegramUpdate теперь принимает raw updateBody
  handleTelegramUpdate: async (updateBody, ioInstance) => {
    // Просто передаем raw updateBody в processMessage.
    // processMessage сам определит, это message или callback_query.
    // Важно: ioInstance здесь нужен, если Telegram-бот отправляет сообщение на веб-виджет
    // (например, при ответе администратора в Telegram на заявку с сайта).
    await processMessage({ ...updateBody, source: 'telegram' }, ioInstance);
  },
  processMessage: processMessage // Для приема сообщений с веб-виджета
};