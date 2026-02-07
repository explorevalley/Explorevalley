import TelegramBot from "node-telegram-bot-api";

export function formatMoney(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function makeBot(token: string) {
  return new TelegramBot(token, { polling: true });
}
