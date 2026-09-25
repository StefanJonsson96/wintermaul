const ADJ = [
  'Frosty', 'Brave', 'Sleepy', 'Grumpy', 'Swift', 'Mighty', 'Clever', 'Icy', 'Stormy', 'Wild', 'Lucky', 'Silent',
  'Rusty', 'Golden', 'Shadow', 'Crimson', 'Noble', 'Tiny', 'Hasty', 'Jolly', 'Arcane', 'Frozen', 'Blazing', 'Humble',
];
const NOUN = [
  'Yeti', 'Walrus', 'Penguin', 'Mammoth', 'Wolf', 'Owl', 'Troll', 'Builder', 'Wisp', 'Golem', 'Fox', 'Moose',
  'Hare', 'Lynx', 'Bear', 'Seal', 'Raven', 'Kobold', 'Warden', 'Mazer', 'Tinker', 'Druid', 'Paladin', 'Gnome',
];
const BOT = ['Frostbot', 'Glacier-9', 'Snowplow', 'Iceberg', 'Blizzard AI', 'Tundra', 'Permafrost', 'Sleet'];

export function randomName(): string {
  return `${ADJ[Math.floor(Math.random() * ADJ.length)]} ${NOUN[Math.floor(Math.random() * NOUN.length)]}`;
}

export function botName(i: number): string {
  return `${BOT[i % BOT.length]} (bot)`;
}

export function cleanName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 18);
}

export function cleanChat(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 200);
}
