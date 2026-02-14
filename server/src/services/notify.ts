import TelegramBot from "node-telegram-bot-api";

export function formatMoney(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export type BotCreateOptions = {
  // Enable long-polling ("getUpdates"). This must be false when running multiple instances,
  // otherwise Telegram will terminate the older poller with 409 Conflict.
  polling?: boolean;
};

export function makeBot(token: string, opts?: BotCreateOptions) {
  const enablePolling = Boolean(opts?.polling);
  const pollingOptions = enablePolling
    ? { interval: 3000, params: { timeout: 30 } }
    : false;

  return new TelegramBot(token, {
    polling: pollingOptions,
    request: { timeout: 30000 },
  });
}
