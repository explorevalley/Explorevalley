export function autoCapitalizeNewLineStarts(input: string) {
  const text = String(input || "");
  return text.replace(/(^|[\n\r]+)([ \t]*)([a-z])/g, (_m, sep, ws, ch) => `${sep}${ws}${String(ch).toUpperCase()}`);
}

