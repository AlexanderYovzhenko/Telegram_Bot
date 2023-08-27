import { readFile, writeFile } from 'fs/promises';

import { UserData } from '../types';

// Загрузка данных о пользователе
async function getUserData(userId: string): Promise<UserData | undefined> {
  try {
    const data = await readFile(`${userId}.json`, 'utf8');
    const userData = JSON.parse(data) as UserData;

    // Проверяем, прошло ли более 24 часов с момента последнего сброса лимитов
    const currentTime = new Date().getTime();
    const lastResetTime = userData.lastResetTimestamp || 0;
    const elapsedTime = currentTime - lastResetTime;

    if (elapsedTime >= 24 * 60 * 60 * 1000) {
      userData.requestsLeft = userData.role === 'Пользователь' ? 5 : 20;

      const isResetTimestamp = true;
      saveUserData(userId, userData, isResetTimestamp);
    }

    return userData;
  } catch (error) {
    return undefined;
  }
}

// Сохранение данных о пользователе
async function saveUserData(
  userId: string,
  data: UserData,
  isResetTimestamp: boolean,
) {
  if (isResetTimestamp) {
    data.lastResetTimestamp = new Date().getTime();
  }

  await writeFile(`${userId}.json`, JSON.stringify(data));
}

export { getUserData, saveUserData };
