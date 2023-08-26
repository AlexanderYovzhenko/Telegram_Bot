const botCommandList = {
  start: /\/start/,
  help: /\/help/,
  analyze: /\/analyze <адрес кошелька> eth/,
};

const botCommandListDescription = {
  start: 'Начать взаимодействие',
  help: 'Получить помощь',
  analyze: 'Выгрузка по кошельку',
};

export { botCommandList, botCommandListDescription };
