interface UserData {
  role: string;
  requestsLeft: number;
  lastResetTimestamp?: number;
  walletAddress?: string;
}

export { UserData };
