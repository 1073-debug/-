/* gacha.js
 * ガチャで手に入る装備アイテム。能力差はわざと小さくしてあり、
 * 「見た目のコレクション」を楽しむことを主目的にしている。
 */
const RARITY_INFO = {
  N: { label: "N", color: "#9AA5B1", weight: 50 },
  R: { label: "R", color: "#4C9AFF", weight: 30 },
  SR: { label: "SR", color: "#9D6FFF", weight: 14 },
  SSR: { label: "SSR", color: "#FFC94D", weight: 5 },
  UR: { label: "UR", color: "#FF7A5C", weight: 1 }
};

const ITEM_POOL = [
  // ---- weapon: XPボーナス ----
  { id: "w_none", slot: "weapon", rarity: "N", name: "そざつな えんぴつ", emoji: "✏️", bonus: { xp: 0 } },
  { id: "w_wood_sword", slot: "weapon", rarity: "N", name: "きの けん", emoji: "🗡️", bonus: { xp: 1 } },
  { id: "w_stick", slot: "weapon", rarity: "N", name: "まほうの えだ", emoji: "🪄", bonus: { xp: 1 } },
  { id: "w_iron_sword", slot: "weapon", rarity: "R", name: "はがねの けん", emoji: "⚔️", bonus: { xp: 2 } },
  { id: "w_bow", slot: "weapon", rarity: "R", name: "たんきゅうの ゆみ", emoji: "🏹", bonus: { xp: 2 } },
  { id: "w_hammer", slot: "weapon", rarity: "SR", name: "けんきゅうの ハンマー", emoji: "🔨", bonus: { xp: 3 } },
  { id: "w_wand", slot: "weapon", rarity: "SR", name: "ちえの つえ", emoji: "🪄", bonus: { xp: 3 } },
  { id: "w_star_blade", slot: "weapon", rarity: "SSR", name: "ほしくずの けん", emoji: "✨", bonus: { xp: 4 } },
  { id: "w_dragon_lance", slot: "weapon", rarity: "UR", name: "ドラゴンの やり", emoji: "🐉", bonus: { xp: 5 } },

  // ---- hat: コインボーナス ----
  { id: "h_none", slot: "hat", rarity: "N", name: "ぼうしなし", emoji: "🚫", bonus: { coin: 0 } },
  { id: "h_cap", slot: "hat", rarity: "N", name: "キャップ", emoji: "🧢", bonus: { coin: 1 } },
  { id: "h_ribbon", slot: "hat", rarity: "N", name: "リボン", emoji: "🎀", bonus: { coin: 1 } },
  { id: "h_wizard", slot: "hat", rarity: "R", name: "はかせの ぼうし", emoji: "🎓", bonus: { coin: 2 } },
  { id: "h_party", slot: "hat", rarity: "R", name: "パーティハット", emoji: "🥳", bonus: { coin: 2 } },
  { id: "h_crown_small", slot: "hat", rarity: "SR", name: "こがねの かんむり", emoji: "👑", bonus: { coin: 3 } },
  { id: "h_helmet", slot: "hat", rarity: "SR", name: "ゆうしゃの かぶと", emoji: "⛑️", bonus: { coin: 3 } },
  { id: "h_star_crown", slot: "hat", rarity: "SSR", name: "ほしの かんむり", emoji: "🌟", bonus: { coin: 4 } },
  { id: "h_dragon_horn", slot: "hat", rarity: "UR", name: "ドラゴンの つの", emoji: "🐲", bonus: { coin: 5 } },

  // ---- clothes: 見た目・演出変更（能力なし） ----
  { id: "c_none", slot: "clothes", rarity: "N", name: "ふだんぎ", emoji: "👕", bonus: {} },
  { id: "c_red", slot: "clothes", rarity: "N", name: "あかの マント", emoji: "🧥", bonus: {} },
  { id: "c_blue", slot: "clothes", rarity: "R", name: "あおの ローブ", emoji: "🥋", bonus: {} },
  { id: "c_gold", slot: "clothes", rarity: "SR", name: "きんの よろい", emoji: "🛡️", bonus: {} },
  { id: "c_rainbow", slot: "clothes", rarity: "SSR", name: "にじいろの ころも", emoji: "🌈", bonus: {} },
  { id: "c_star", slot: "clothes", rarity: "UR", name: "でんせつの しょうぞく", emoji: "💫", bonus: {} }
];

const GACHA_COST = 100;

function pickRarity() {
  const total = Object.values(RARITY_INFO).reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  for (const [key, info] of Object.entries(RARITY_INFO)) {
    if (roll < info.weight) return key;
    roll -= info.weight;
  }
  return "N";
}

function rollGachaItem() {
  const rarity = pickRarity();
  const candidates = ITEM_POOL.filter((it) => it.rarity === rarity && it.id.indexOf("_none") === -1);
  if (candidates.length === 0) return ITEM_POOL[0];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** ガチャを1回引く。コインが足りなければnullを返す。 */
function performGacha() {
  if (!Storage.spendCoins(GACHA_COST)) return null;
  const item = rollGachaItem();
  const isNew = Storage.addItem(item.id);
  let duplicateBonus = 0;
  if (!isNew) {
    duplicateBonus = 10;
    Storage.addCoins(duplicateBonus);
  }
  return { item, isNew, duplicateBonus };
}

function getItem(id) {
  return ITEM_POOL.find((it) => it.id === id);
}

function getEquippedBonuses() {
  const data = Storage.get();
  const weapon = getItem(data.character.equipped.weapon);
  const hat = getItem(data.character.equipped.hat);
  return {
    xpPercent: (weapon && weapon.bonus.xp) || 0,
    coinPercent: (hat && hat.bonus.coin) || 0
  };
}
