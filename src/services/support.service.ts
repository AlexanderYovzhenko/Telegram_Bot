import * as ExcelJS from 'exceljs';

// Функция для проверки правильности адреса кошелька
function isValidAddress(walletAddress: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(walletAddress);
}

// Функция для вычисления данных транзакций
function calculateBalanceChange(
  transaction: any,
  walletAddress: string,
): string {
  const value = parseInt(transaction.value);
  // Преобразование с учетом десятичных знаков токена
  const amount = value / Math.pow(10, transaction.tokenDecimal);

  if (transaction.from.toLowerCase() === walletAddress.toLowerCase()) {
    // Транзакция отправлена с адреса кошелька
    return `-${amount.toFixed(4)} tokens`;
  } else if (transaction.to.toLowerCase() === walletAddress.toLowerCase()) {
    // Транзакция получена на адрес кошелька
    return `+${amount.toFixed(4)} tokens`;
  } else {
    // Транзакция не связана с данным кошельком
    return '0 tokens';
  }
}

// Функция для создания Excel-документа
async function createExcelDoc(
  walletAddress: string,
  dexTrades: any[],
): Promise<ExcelJS.Buffer> {
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
      walletAddress === trade.from ? 'ETH' : trade.tokenSymbol,
      trade.from,
      walletAddress === trade.to ? 'ETH' : trade.tokenSymbol,
      trade.to,
      new Date(parseInt(trade.timeStamp) * 1000).toLocaleString(),
      trade.contractAddress,
      'Uniswap V2', // Тип декса нужно получать отдельно
      balanceChange,
    ]);
  }

  // Сохранение Excel-документа
  const excelBuffer = await workbook.xlsx.writeBuffer();

  return excelBuffer;
}

export { isValidAddress, calculateBalanceChange, createExcelDoc };
