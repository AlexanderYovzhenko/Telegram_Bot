import { Telegraf } from 'telegraf';
import { ethers } from 'ethers';
import axios from 'axios';
import * as ExcelJS from 'exceljs';
import { readFileSync, writeFileSync } from 'fs';
import dotenv from 'dotenv';
import { botCommandListDescription } from '../constants/commands';

dotenv.config();

export const bot = new Telegraf(
  process.env.BOT_TOKEN || '6573324172:AAFPnfi9-8juFU7ctYJtU7tjGsyn0-liOMk',
);

interface UserData {
  role: string;
  requestsLeft: number;
  lastResetTimestamp?: number;
  walletAddress?: string;
}

bot.telegram.setMyCommands([
  {
    command: '/start',
    description: botCommandListDescription.start,
  },
  {
    command: '/help',
    description: botCommandListDescription.help,
  },
  {
    command: '/analyze',
    description: botCommandListDescription.analyze,
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
bot.hears(['Пользователь', 'Аналитик'], (ctx) => {
  const userId = ctx.from?.id.toString();
  const role: string = ctx.message?.text;

  const userData: UserData = {
    role,
    requestsLeft: role === 'Пользователь' ? 5 : 20,
    walletAddress: undefined,
  };

  // Сохранение данных о пользователе
  saveUserData(userId, userData);

  ctx.reply(
    `Теперь вы ${role}. У вас осталось ${userData.requestsLeft} запросов.`,
  );
});

// Обработка команды /analyze
bot.command('analyze', async (ctx) => {
  const userId = ctx.from?.id.toString();
  const userData = getUserData(userId);

  if (!userData || userData.requestsLeft <= 0) {
    ctx.reply('У вас нет доступа для выполнения этой команды.');
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
  const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

  try {
    // Получение данных о торгах с использованием Etherscan API
    const response = await axios.get(
      `https://api.etherscan.io/api?module=account&action=tokentx&address=${walletAddress}&startblock=0&endblock=999999999&sort=asc&apikey=${ETHERSCAN_API_KEY}`,
    );
    const dexTrades = response.data.result;

    // Создание Excel-документа
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Торги');

    // Добавление заголовков
    worksheet.addRow([
      'Тикер монеты A',
      'Адрес контракта монеты A',
      'Тикер монеты B',
      'Адрес контракта монеты B',
      'Дата сделки',
      'Адрес контракта пула для данной пары',
      'Тип декса Uniswap v2',
      'Завершённые транзакции',
    ]);

    // Логика обработки данных о торгах и добавления строк в Excel
    for (const trade of dexTrades) {
      const balanceChange = calculateBalanceChange(trade, walletAddress);

      worksheet.addRow([
        trade.tokenSymbol,
        trade.contractAddress,
        trade.tokenSymbol, // Предполагается, что оба маркера одинаковы в торговле
        trade.contractAddress, // Предполагается, что оба маркера одинаковы в торговле
        new Date(parseInt(trade.timeStamp) * 1000).toLocaleString(),
        trade.to, // Адрес контракта пула нужно получать отдельно
        'Uniswap V2', // Тип декса нужно получать отдельно
        balanceChange,
      ]);
    }

    // Получение текущего баланса
    const walletBalance = await getWalletBalance(walletAddress);

    // Сохранение Excel-документа
    const excelBuffer = await workbook.xlsx.writeBuffer();
    ctx.reply(`Текущий баланс - ${walletBalance} ETH`);
    ctx.replyWithDocument({
      source: Buffer.from(excelBuffer), // Преобразование Excel-буфера в Buffer
      filename: 'trades.xlsx',
    });

    // Уменьшение количества оставшихся запросов
    userData.requestsLeft--;
    saveUserData(userId, userData);
  } catch (error) {
    ctx.reply('Произошла ошибка при получении данных о торгах.');
  }
});

// Обработка случайных команд
bot.on('text', (ctx) => {
  ctx.reply('Извините, такой команды не существует.');
});

// Функция для проверки правильности адреса кошелька
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Функция для вычисления изменения баланса на основе данных транзакции
function calculateBalanceChange(
  transaction: any,
  walletAddress: string,
): string {
  const ethToWei = 10 ** 18; // 1 эфир = 10^18 вей

  if (transaction.from.toLowerCase() === walletAddress.toLowerCase()) {
    // Транзакция отправлена с адреса кошелька
    const value = parseInt(transaction.value) / ethToWei;

    return `-${value.toFixed(4)} ETH`;
  } else if (transaction.to.toLowerCase() === walletAddress.toLowerCase()) {
    // Транзакция получена на адрес кошелька
    const value = parseInt(transaction.value) / ethToWei;

    return `+${value.toFixed(4)} ETH`;
  } else {
    // Транзакция не связана с данным кошельком
    return '0 ETH';
  }
}

// Функция для получения текущего баланса кошелька
async function getWalletBalance(walletAddress: string): Promise<string> {
  try {
    const INFURA_API_KEY = process.env.INFURA_API_KEY;

    // Получение баланса кошелька
    const provider = new ethers.providers.JsonRpcProvider(
      `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
    );
    const balance = await provider.getBalance(walletAddress);

    // Конвертация баланса из wei в ETH
    const balanceInEth = ethers.utils.formatEther(balance);

    return balanceInEth;
  } catch (error) {
    console.error('Ошибка при получении баланса кошелька:', error);
    return '';
  }
}

// Загрузка данных о пользователе
function getUserData(userId: string): UserData | undefined {
  try {
    const data = readFileSync(`${userId}.json`, 'utf8');
    const userData = JSON.parse(data) as UserData;

    // Проверяем, прошло ли более 24 часов с момента последнего сброса лимитов
    const currentTime = new Date().getTime();
    const lastResetTime = userData.lastResetTimestamp || 0;
    const elapsedTime = currentTime - lastResetTime;

    if (elapsedTime >= 24 * 60 * 60 * 1000) {
      userData.requestsLeft = userData.role === 'Пользователь' ? 5 : 20;
      userData.lastResetTimestamp = currentTime;
      saveUserData(userId, userData);
    }

    return userData;
  } catch (error) {
    return undefined;
  }
}

// Сохранение данных о пользователе
function saveUserData(userId: string, data: UserData) {
  data.lastResetTimestamp = new Date().getTime();
  writeFileSync(`${userId}.json`, JSON.stringify(data));
}
