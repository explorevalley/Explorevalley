export function parseAdminChatIds(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw.split(",").map(s => Number(s.trim())).filter(n => Number.isFinite(n));
}

export function isAdmin(chatId: number, admins: number[]) {
  return admins.includes(chatId);
}
