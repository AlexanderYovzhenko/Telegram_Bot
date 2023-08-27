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
  if (transaction.from.toLowerCase() === walletAddress.toLowerCase()) {
    // Транзакция отправлена с адреса кошелька
    const value = parseInt(transaction.value);

    return `-${value.toFixed(4)} WEI`;
  } else if (transaction.to.toLowerCase() === walletAddress.toLowerCase()) {
    // Транзакция получена на адрес кошелька
    const value = parseInt(transaction.value);

    return `+${value.toFixed(4)} WEI`;
  } else {
    // Транзакция не связана с данным кошельком
    return '0 WEI';
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

  // Сохранение Excel-документа
  const excelBuffer = await workbook.xlsx.writeBuffer();

  return excelBuffer;
}

export { isValidAddress, calculateBalanceChange, createExcelDoc };
