require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.TELEGRAM_CHAT_ID;
const bot = new TelegramBot(token, { polling: true });

const users = {};

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
    { q: 'Где находится студия?', a: 'Kris работает в Ирландии, чаще всего в Дублине, но иногда бывает и в других городах. Точное место и дату можно уточнить при записи — просто напишите, где вы находитесь, и Kris подберёт удобный вариант!' },
    { q: 'Как подготовиться к процедуре?', a: 'Перед процедурой важно хорошо выспаться, не употреблять алкоголь и кофе, хорошо поесть. Подробности Kris расскажет лично.' },
    { q: 'Какой уход после процедуры?', a: 'После процедуры вы получите подробные инструкции по уходу и специальную заживляющую плёнку.' },
    { q: 'Как связаться с Kris?', a: 'Связаться с Kris можно через Telegram, WhatsApp, Instagram или по телефону. Все контакты доступны в разделе "Контакты".' },
    { q: 'Какие стили тату вы делаете?', a: 'Kris работает в стилях AQUA, COVER UP, LINE, MINI и других. Можно обсудить индивидуальный проект.' },
    { q: 'Можно ли перекрыть старую татуировку?', a: 'Да, можно! Kris профессионально перекрывает старые или неудачные татуировки.' },
    { q: 'Как записаться на консультацию?', a: 'Для консультации просто напишите Kris в Telegram или WhatsApp, либо воспользуйтесь этим ботом для записи.' }
  ],
  en: [
    { q: 'How much does a tattoo/piercing/permanent makeup cost?', a: 'The price depends on the size, style, and complexity. Kris will give you an exact quote after discussing your idea and details.' },
    { q: 'Where is the studio located?', a: 'Kris works in Ireland, most often in Dublin, but sometimes visits other cities. The exact location and date can be clarified when booking — just let us know where you are, and Kris will find the best option for you!' },
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

bot.onText(/\/start|\/menu/, (msg) => {
  const chatId = msg.chat.id;
  users[chatId] = { lang: users[chatId]?.lang || 'ru', step: 'menu' };
  bot.sendMessage(chatId, getGreeting(users[chatId].lang), mainMenu(users[chatId].lang));
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  users[chatId] = users[chatId] || { lang: 'ru', step: 'menu' };
  const lang = users[chatId].lang;

  // Смена языка
  if (data === 'lang') {
    users[chatId].step = 'lang';
    return bot.editMessageText(
      lang === 'ru'
        ? 'Пожалуйста, выберите язык:'
        : 'Please choose your language:',
      { chat_id: chatId, message_id: query.message.message_id, ...langMenu() }
    );
  }
  if (data.startsWith('setlang_')) {
    const newLang = data.split('_')[1];
    users[chatId].lang = newLang;
    users[chatId].step = 'menu';
    return bot.editMessageText(getGreeting(newLang), { chat_id: chatId, message_id: query.message.message_id, ...mainMenu(newLang) });
  }

  // Главное меню
  if (data === 'menu') {
    resetUser(chatId);
    return bot.editMessageText(getGreeting(lang), { chat_id: chatId, message_id: query.message.message_id, ...mainMenu(lang) });
  }

  // Запись на услугу
  if (data === 'book') {
    users[chatId].step = 'service';
    return bot.editMessageText(
      lang === 'ru' ? 'Выберите услугу:' : 'Choose a service:',
      { chat_id: chatId, message_id: query.message.message_id, ...servicesMenu(lang) }
    );
  }
  if (data.startsWith('service_')) {
    const idx = Number(data.split('_')[1]);
    users[chatId].service = SERVICES[lang][idx];
    users[chatId].step = 'name';
    bot.deleteMessage(chatId, query.message.message_id);
    return bot.sendMessage(chatId, lang === 'ru' ? 'Как вас зовут?' : 'What is your name?');
  }

  // FAQ
  if (data === 'faq') {
    users[chatId].step = 'faq';
    return bot.editMessageText(lang === 'ru' ? 'Выберите вопрос:' : 'Choose a question:', { chat_id: chatId, message_id: query.message.message_id, ...faqMenu(lang) });
  }
  if (data.startsWith('faq_')) {
    const idx = Number(data.split('_')[1]);
    return bot.answerCallbackQuery(query.id, { text: FAQ[lang][idx].a, show_alert: true });
  }

  // Контакты
  if (data === 'contacts') {
    return bot.editMessageText(CONTACTS[lang], { chat_id: chatId, message_id: query.message.message_id, ...mainMenu(lang) });
  }

  // Город
  if (data === 'service') {
    users[chatId].step = 'service';
    return bot.editMessageText(
      lang === 'ru' ? 'Выберите услугу:' : 'Choose a service:',
      { chat_id: chatId, message_id: query.message.message_id, ...servicesMenu(lang) }
    );
  }
  if (data.startsWith('city_')) {
    const idx = Number(data.split('_')[1]);
    if (CITIES[lang][idx] === (lang === 'ru' ? 'Другое' : 'Other')) {
      users[chatId].step = 'city_other';
      bot.deleteMessage(chatId, query.message.message_id);
      return bot.sendMessage(chatId, lang === 'ru' ? 'Пожалуйста, напишите, в каком городе вы хотите записаться:' : 'Please type the city where you want to book:');
    } else {
      users[chatId].city = CITIES[lang][idx];
      users[chatId].step = 'date';
      bot.deleteMessage(chatId, query.message.message_id);
      return bot.sendMessage(chatId, lang === 'ru'
        ? 'Когда вам удобно прийти? (Напишите дату и время или пожелания)'
        : 'When would you like to come? (Please write date and time or your wishes)');
    }
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  if (!users[chatId]) users[chatId] = { lang: 'ru', step: 'menu' };
  const lang = users[chatId].lang;

  // /start и /menu уже обработаны выше

  // Имя
  if (users[chatId].step === 'name') {
    users[chatId].name = text;
    users[chatId].step = 'phone';
    return bot.sendMessage(chatId, lang === 'ru' ? 'Ваш номер телефона?' : 'Your phone number?');
  }

  // Телефон
  if (users[chatId].step === 'phone') {
    users[chatId].phone = text;
    users[chatId].step = 'city';
    return bot.sendMessage(chatId, lang === 'ru' ? 'Выберите город:' : 'Choose a city:', citiesMenu(lang));
  }

  // Город (ручной ввод)
  if (users[chatId].step === 'city_other') {
    users[chatId].city = text;
    users[chatId].step = 'date';
    return bot.sendMessage(chatId, lang === 'ru'
      ? 'Когда вам удобно прийти? (Напишите дату и время или пожелания)'
      : 'When would you like to come? (Please write date and time or your wishes)');
  }

  // Дата/время
  if (users[chatId].step === 'date') {
    users[chatId].date = text;
    users[chatId].step = 'menu';

    // Уведомление Kris
    const notify = 
      (lang === 'ru' ? '✨ Новая заявка!\n' : '✨ New request!\n') +
      (lang === 'ru' ? 'Услуга' : 'Service') + `: ${users[chatId].service}\n` +
      (lang === 'ru' ? 'Имя' : 'Name') + `: ${users[chatId].name}\n` +
      (lang === 'ru' ? 'Телефон' : 'Phone') + `: ${users[chatId].phone}\n` +
      (lang === 'ru' ? 'Город' : 'City') + `: ${users[chatId].city}\n` +
      (lang === 'ru' ? 'Дата/время' : 'Date/Time') + `: ${users[chatId].date}`;

    bot.sendMessage(adminChatId, notify);

    // Ответ пользователю
    return bot.sendMessage(chatId,
      (lang === 'ru'
        ? 'Спасибо за заявку! Kris свяжется с вами для уточнения деталей. Важно: для подтверждения записи потребуется предоплата.\n\n'
        : 'Thank you for your request! Kris will contact you to confirm the details. Note: a prepayment is required to confirm your booking.\n\n'
      ) + getFarewell(lang),
      mainMenu(lang)
    );
  }
});