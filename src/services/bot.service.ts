import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

import { createExcelDoc, isValidAddress } from './support.service';
import { getUserData, saveUserData } from './fs.service';
import { getDexTrades, getWalletBalance } from './request.service';
import { botCommandsList, botCommandsListDescription } from '../constants';
import { UserData } from '../types';

dotenv.config();

export const bot = new Telegraf(
  process.env.BOT_TOKEN || '6573324172:AAFPnfi9-8juFU7ctYJtU7tjGsyn0-liOMk',
);

// Доступные команды для пользователя
bot.telegram.setMyCommands([
  {
    command: botCommandsList[0],
    description: botCommandsListDescription.start,
  },
  {
    command: botCommandsList[1],
    description: botCommandsListDescription.help,
  },
  {
    command: botCommandsList[2],
    description: botCommandsListDescription.analyze,
  },
]);

// Приветственное сообщение и выбор роли
bot.start((ctx) => {
  const welcomeMessage = `Привет, ${ctx.from?.first_name}! Добро пожаловать в бота. Выбери свою роль:`;
  const keyboard = {
    reply_markup: {
      keyboard: [['Пользователь'], ['Аналитик']],
      one_time_keyboard: true,
    },
  };

  ctx.reply(welcomeMessage, keyboard);
});

// Обработка /help команды
bot.help((ctx) => {
  ctx.reply(
    'Это справочное сообщение. Вот список доступных команд:\n/start - Начать взаимодействие\n/help - Получить помощь\n/analyze - Выгрузка по кошельку',
  );
});

// Обработка выбора роли
bot.hears(['Пользователь', 'Аналитик'], async (ctx) => {
  const userId = ctx.from?.id.toString();

  const checkUserData = await getUserData(userId);

  if (checkUserData) {
    ctx.reply(
      `У вас уже есть роль ${checkUserData.role}. У вас осталось ${checkUserData.requestsLeft} запросов.`,
    );
    return;
  }

  const role: string = ctx.message?.text;

  const userData: UserData = {
    role,
    requestsLeft: role === 'Пользователь' ? 5 : 20,
    walletAddress: undefined,
  };

  // Сохранение данных о пользователе
  const isResetTimestamp = true;
  await saveUserData(userId, userData, isResetTimestamp);

  ctx.reply(
    `Теперь вы ${role}. У вас осталось ${userData.requestsLeft} запросов.`,
  );
});

// Обработка команды /analyze
bot.command('analyze', async (ctx) => {
  const userId = ctx.from?.id.toString();
  const userData = await getUserData(userId);

  if (!userData) {
    ctx.reply('У вас нет доступа для выполнения этой команды.');
    return;
  }

  if (userData.requestsLeft <= 0) {
    ctx.reply(`У вас закончились запросы, попробуйте позже`);
    return;
  }

  const commandArguments = ctx.message?.text.split(' ');
  if (commandArguments.length !== 3 || commandArguments[2] !== 'eth') {
    ctx.reply(
      'Неверный формат команды. Используйте: /analyze <адрес кошелька> eth',
    );
    return;
  }

  if (!isValidAddress(commandArguments[1])) {
    ctx.reply('Неверный формат адресa кошелька.');
    return;
  }

  const walletAddress = commandArguments[1];

  try {
    // Получение данных о торгах с использованием Etherscan API
    const dexTrades = await getDexTrades(walletAddress);

    // Логика обработки данных о торгах и добавления в Excel документ
    const excelBuffer = await createExcelDoc(walletAddress, dexTrades);

    // Получение текущего баланса
    const walletBalance = await getWalletBalance(walletAddress);

    ctx.reply(`Текущий баланс - ${walletBalance} ETH`);
    ctx.replyWithDocument({
      source: Buffer.from(excelBuffer), // Преобразование Excel-буфера в Buffer
      filename: 'trades.xlsx',
    });

    // Уменьшение количества оставшихся запросов
    userData.requestsLeft--;

    const isResetTimestamp = false;
    await saveUserData(userId, userData, isResetTimestamp);
  } catch (error) {
    ctx.reply('Произошла ошибка при получении данных о торгах.');
  }
});

// Обработка случайных команд
bot.on('text', (ctx) => {
  ctx.reply('Извините, такой команды не существует.');
});
