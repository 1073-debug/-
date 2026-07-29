/* storage.js
 * すべてのゲームデータをlocalStorageに保存するレイヤー。
 * 将来のデータ追加に強くするため、常に「デフォルト値とマージ」してから使う。
 */
const STORAGE_KEY = "keisanAdventure.save.v1";

const DEFAULT_SAVE = () => ({
  version: 1,
  character: {
    name: "そうくん",
    level: 1,
    xp: 0,
    coins: 50,
    equipped: { weapon: "w_none", hat: "h_none", clothes: "c_none" }
  },
  inventory: ["w_none", "h_none", "c_none"],
  badges: [],
  history: {
    sessions: [], // {date, subject, difficulty, count, correct, total, avgTimeSec, score, durationSec}
    totalSessions: 0,
    totalCorrect: 0,
    totalQuestions: 0,
    totalStudySeconds: 0
  },
  weakPoints: {}, // key -> {subject, difficulty, a, b, op, wrongCount, mastered, lastSeen}
  daily: {
    lastLoginDate: null,
    consecutiveDays: 0,
    todayStudySeconds: 0,
    todayDate: null,
    challenge: null // {id, label, target, progress, done, reward}
  },
  settings: { sound: true }
});

function deepMerge(base, override) {
  if (Array.isArray(base)) return override !== undefined ? override : base;
  if (typeof base === "object" && base !== null) {
    const out = { ...base };
    for (const k of Object.keys(base)) {
      if (override && override[k] !== undefined) {
        out[k] = deepMerge(base[k], override[k]);
      }
    }
    // keep any extra keys already present in override that aren't in base (forward-safe)
    if (override) {
      for (const k of Object.keys(override)) {
        if (!(k in out)) out[k] = override[k];
      }
    }
    return out;
  }
  return override !== undefined ? override : base;
}

const Storage = {
  _cache: null,

  load() {
    if (this._cache) return this._cache;
    let saved = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (e) {
      console.warn("save data corrupted, resetting", e);
    }
    const merged = deepMerge(DEFAULT_SAVE(), saved || {});
    this._cache = merged;
    return merged;
  },

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._cache));
    } catch (e) {
      console.error("failed to save", e);
    }
  },

  get() {
    return this.load();
  },

  reset() {
    this._cache = DEFAULT_SAVE();
    this.save();
    return this._cache;
  },

  // ---- レベル・経験値 ----
  xpToNextLevel(level) {
    return 50 + (level - 1) * 20;
  },

  addXp(amount) {
    const data = this.load();
    data.character.xp += amount;
    const levelUps = [];
    while (data.character.xp >= this.xpToNextLevel(data.character.level)) {
      data.character.xp -= this.xpToNextLevel(data.character.level);
      data.character.level += 1;
      levelUps.push(data.character.level);
    }
    this.save();
    return levelUps; // array of new levels reached (empty if none)
  },

  addCoins(amount) {
    const data = this.load();
    data.character.coins = Math.max(0, data.character.coins + amount);
    this.save();
    return data.character.coins;
  },

  spendCoins(amount) {
    const data = this.load();
    if (data.character.coins < amount) return false;
    data.character.coins -= amount;
    this.save();
    return true;
  },

  // ---- インベントリ / 装備 ----
  addItem(itemId) {
    const data = this.load();
    if (!data.inventory.includes(itemId)) {
      data.inventory.push(itemId);
      this.save();
      return true; // new item
    }
    return false; // duplicate
  },

  equip(slot, itemId) {
    const data = this.load();
    data.character.equipped[slot] = itemId;
    this.save();
  },

  // ---- バッジ ----
  addBadge(badgeId) {
    const data = this.load();
    if (!data.badges.includes(badgeId)) {
      data.badges.push(badgeId);
      this.save();
      return true;
    }
    return false;
  },

  // ---- 学習履歴 ----
  recordSession(session) {
    const data = this.load();
    data.history.sessions.push(session);
    if (data.history.sessions.length > 100) data.history.sessions.shift();
    data.history.totalSessions += 1;
    data.history.totalCorrect += session.correct;
    data.history.totalQuestions += session.total;
    data.history.totalStudySeconds += session.durationSec;

    // 今日の勉強時間も加算
    const today = new Date().toISOString().slice(0, 10);
    if (data.daily.todayDate !== today) {
      data.daily.todayDate = today;
      data.daily.todayStudySeconds = 0;
    }
    data.daily.todayStudySeconds += session.durationSec;

    this.save();
  },

  // ---- 苦手問題 ----
  keyFor(subject, a, b, op) {
    return `${subject}:${op}:${a}:${b}`;
  },

  recordMistake(subject, difficulty, a, b, op) {
    const data = this.load();
    const key = this.keyFor(subject, a, b, op);
    const wp = data.weakPoints[key] || {
      subject, difficulty, a, b, op, wrongCount: 0, mastered: false
    };
    wp.wrongCount += 1;
    wp.mastered = false;
    wp.lastSeen = Date.now();
    data.weakPoints[key] = wp;
    this.save();
  },

  recordCorrectForWeakPoint(subject, a, b, op) {
    const data = this.load();
    const key = this.keyFor(subject, a, b, op);
    const wp = data.weakPoints[key];
    if (wp) {
      wp.wrongCount = Math.max(0, wp.wrongCount - 1);
      if (wp.wrongCount === 0) wp.mastered = true;
      wp.lastSeen = Date.now();
      this.save();
    }
  },

  getWeakPoints(subject, limit = 10) {
    const data = this.load();
    return Object.values(data.weakPoints)
      .filter((wp) => !wp.mastered && (!subject || wp.subject === subject))
      .sort((a, b) => b.wrongCount - a.wrongCount || b.lastSeen - a.lastSeen)
      .slice(0, limit);
  },

  // ---- デイリー ----
  checkDailyLogin() {
    const data = this.load();
    const today = new Date().toISOString().slice(0, 10);
    if (data.daily.lastLoginDate === today) {
      return { isNewDay: false, consecutiveDays: data.daily.consecutiveDays };
    }
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (data.daily.lastLoginDate === yesterday) {
      data.daily.consecutiveDays += 1;
    } else {
      data.daily.consecutiveDays = 1;
    }
    data.daily.lastLoginDate = today;
    data.daily.todayDate = today;
    data.daily.todayStudySeconds = 0;
    data.daily.challenge = this._generateChallenge();
    this.save();
    return { isNewDay: true, consecutiveDays: data.daily.consecutiveDays };
  },

  _generateChallenge() {
    const templates = [
      { id: "solve10", label: "もんだいを 10もん とく", target: 10, reward: 20 },
      { id: "score100", label: "1かいで 100てんを とる", target: 1, reward: 30 },
      { id: "solve20", label: "もんだいを 20もん とく", target: 20, reward: 25 },
      { id: "streak5", label: "5もん れんぞく せいかい", target: 1, reward: 25 }
    ];
    const t = templates[Math.floor(Math.random() * templates.length)];
    return { ...t, progress: 0, done: false };
  },

  updateChallengeProgress(type, value) {
    const data = this.load();
    const c = data.daily.challenge;
    if (!c || c.done) return null;
    if (c.id === "solve10" || c.id === "solve20") {
      if (type === "questions") c.progress += value;
    } else if (c.id === "score100") {
      if (type === "perfectScore" && value) c.progress = 1;
    } else if (c.id === "streak5") {
      if (type === "streak5" && value) c.progress = 1;
    }
    if (c.progress >= c.target) {
      c.progress = c.target;
      c.done = true;
    }
    this.save();
    return c;
  }
};
