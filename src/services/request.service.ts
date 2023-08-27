import axios from 'axios';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

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

// Получение данных о торгах с использованием Etherscan API
async function getDexTrades(walletAddress: string): Promise<any> {
  try {
    const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

    const response = await axios.get(
      `https://api.etherscan.io/api?module=account&action=tokentx&address=${walletAddress}&startblock=0&endblock=999999999&sort=asc&apikey=${ETHERSCAN_API_KEY}`,
    );
    const dexTrades = response.data.result;

    return dexTrades;
  } catch (error) {
    console.error('Ошибка при получении данных о торгах.', error);
    throw new Error('Ошибка при получении данных о торгах.');
  }
}

export { getWalletBalance, getDexTrades };
