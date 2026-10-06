/**
 * Canonical combo format: modifiers in the order Ctrl, Alt, Shift, then the key.
 * Examples: "Ctrl+Shift+Z", "V", "[", "Ctrl+=".
 * On macOS Cmd is treated as Ctrl and Option as Alt.
 */

const MOD_ORDER = ["Ctrl", "Alt", "Shift"] as const;
const MOD_ALIASES: Record<string, (typeof MOD_ORDER)[number]> = {
  ctrl: "Ctrl",
  control: "Ctrl",
  cmd: "Ctrl",
  command: "Ctrl",
  meta: "Ctrl",
  "⌘": "Ctrl",
  alt: "Alt",
  option: "Alt",
  opt: "Alt",
  "⌥": "Alt",
  shift: "Shift",
  "⇧": "Shift",
};

export function normalizeCombo(input: string): string {
  const raw = input.trim();
  const parts = raw.split(/\s*\+\s*(?!$)/).filter(Boolean);
  const mods = new Set<string>();
  let key = "";
  for (const p of parts) {
    const alias = MOD_ALIASES[p.toLowerCase()];
    if (alias) mods.add(alias);
    else key = p.length === 1 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1);
  }
  return [...MOD_ORDER.filter((m) => mods.has(m)), key].filter(Boolean).join("+");
}

const CODE_MAP: Record<string, string> = {
  Equal: "=",
  Minus: "-",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backquote: "`",
  Space: "Space",
  Enter: "Enter",
  Tab: "Tab",
  Escape: "Esc",
  Backspace: "Backspace",
  Delete: "Delete",
  NumpadAdd: "=",
  NumpadSubtract: "-",
};

/** Layout-independent: uses the physical key so a Russian layout still yields "Z". */
export function comboFromEvent(e: Pick<KeyboardEvent, "code" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">): string | null {
  let key: string | null = null;
  if (/^Key[A-Z]$/.test(e.code)) key = e.code.slice(3);
  else if (/^Digit\d$/.test(e.code)) key = e.code.slice(5);
  else if (/^Numpad\d$/.test(e.code)) key = e.code.slice(6);
  else if (/^F\d{1,2}$/.test(e.code)) key = e.code;
  else if (CODE_MAP[e.code]) key = CODE_MAP[e.code];
  if (!key) return null; // modifier-only press
  const mods: string[] = [];
  if (e.ctrlKey || e.metaKey) mods.push("Ctrl");
  if (e.altKey) mods.push("Alt");
  if (e.shiftKey) mods.push("Shift");
  return [...mods, key].join("+");
}

/** Combos the browser keeps for itself — the page never receives them. */
const RESERVED = new Set([
  "Ctrl+N",
  "Ctrl+T",
  "Ctrl+W",
  "Ctrl+Shift+N",
  "Ctrl+Shift+T",
  "Ctrl+Shift+W",
  "Ctrl+Tab",
  "Ctrl+Shift+Tab",
  "Ctrl+Shift+I",
  "Ctrl+Shift+J",
  "Ctrl+Shift+Q",
]);

export function isBrowserReserved(combo: string) {
  return RESERVED.has(normalizeCombo(combo));
}
