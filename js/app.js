/* app.js
 * 画面遷移とゲームフロー全体を管理するメインコントローラー。
 */
const BADGES = [
  { id: "first_100", emoji: "💯", name: "はじめての100点", subtitle: "1かいの べんきょうで 100てんを とった！",
    check: (d) => d.history.sessions.some((s) => s.score === 100) },
  { id: "level10", emoji: "🌟", name: "レベル10 とうたつ", subtitle: "キャラクターが レベル10に なった！",
    check: (d) => d.character.level >= 10 },
  { id: "level30", emoji: "🏆", name: "レベル30 とうたつ", subtitle: "キャラクターが レベル30に なった！",
    check: (d) => d.character.level >= 30 },
  { id: "streak3", emoji: "🔥", name: "3日れんぞく ログイン", subtitle: "3日連続で アプリを ひらいた！",
    check: (d) => d.daily.consecutiveDays >= 3 },
  { id: "streak7", emoji: "🔥", name: "7日れんぞく ログイン", subtitle: "1週間 連続で がんばった！",
    check: (d) => d.daily.consecutiveDays >= 7 },
  { id: "first_gacha", emoji: "🎁", name: "はじめてのガチャ", subtitle: "はじめて ガチャを ひいた！",
    check: (d) => (d.gachaPullCount || 0) >= 1 },
  { id: "ssr_get", emoji: "💎", name: "SSRゲット！", subtitle: "きらめく SSRの そうびを てにいれた！",
    check: (d) => d.inventory.some((id) => { const it = getItem(id); return it && it.rarity === "SSR"; }) },
  { id: "ur_get", emoji: "🐉", name: "URゲット！でんせつ級", subtitle: "でんせつの URそうびを てにいれた！",
    check: (d) => d.inventory.some((id) => { const it = getItem(id); return it && it.rarity === "UR"; }) },
  { id: "weak_master", emoji: "🧠", name: "苦手克服マスター", subtitle: "5つの にがて問題を こくふくした！",
    check: (d) => Object.values(d.weakPoints).filter((w) => w.mastered).length >= 5 },
  { id: "sessions10", emoji: "📚", name: "べんきょう 10かい", subtitle: "べんきょうを 10かい かんりょうした！",
    check: (d) => d.history.totalSessions >= 10 },
  { id: "sessions50", emoji: "📖", name: "べんきょう 50かい", subtitle: "べんきょうを 50かい かんりょうした！すごい！",
    check: (d) => d.history.totalSessions >= 50 }
];

function checkBadges() {
  const data = Storage.get();
  const newly = [];
  for (const b of BADGES) {
    if (!data.badges.includes(b.id) && b.check(data)) {
      Storage.addBadge(b.id);
      newly.push({ emoji: b.emoji, title: b.name, subtitle: b.subtitle });
    }
  }
  return newly;
}

const App = {
  select: { subject: "add", difficulty: "normal", count: 10 },
  quiz: null,
  parentGateAnswer: null,

  init() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
    this.bindNav();
    this.bindHome();
    this.bindSelect();
    this.bindQuiz();
    this.bindResult();
    this.bindCharacter();
    this.bindGacha();
    this.bindParentGate();

    const loginInfo = Storage.checkDailyLogin();
    this.renderHome();
    if (loginInfo.isNewDay && loginInfo.consecutiveDays > 1) {
      setTimeout(() => UI.toast(`${loginInfo.consecutiveDays}にちれんぞく ログインボーナス！`, "🔥"), 400);
    }
    const badgeQueue = checkBadges();
    if (badgeQueue.length) setTimeout(() => UI.queueAchievements(badgeQueue), 700);
  },

  showView(id) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    document.querySelectorAll(".nav-item").forEach((n) => {
      n.classList.toggle("active", n.dataset.nav === id);
    });
    window.scrollTo(0, 0);
  },

  bindNav() {
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.nav;
        this.refreshView(target);
        this.showView(target);
      });
    });
    document.querySelectorAll("[data-back]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.back;
        this.refreshView(target);
        this.showView(target);
      });
    });
  },

  refreshView(id) {
    if (id === "view-home") this.renderHome();
    if (id === "view-character") this.renderCharacterScreen();
    if (id === "view-gacha") this.renderGachaScreen();
    if (id === "view-history") this.renderHistoryScreen();
  },

  /* ===================== HOME ===================== */
  bindHome() {
    document.getElementById("btn-start-study").addEventListener("click", () => {
      this.renderSelect();
      this.showView("view-select");
    });
    document.getElementById("btn-goto-character").addEventListener("click", () => {
      this.renderCharacterScreen();
      this.showView("view-character");
    });
    document.getElementById("btn-goto-gacha").addEventListener("click", () => {
      this.renderGachaScreen();
      this.showView("view-gacha");
    });
    document.getElementById("btn-goto-history").addEventListener("click", () => {
      this.renderHistoryScreen();
      this.showView("view-history");
    });
    document.getElementById("btn-goto-parent").addEventListener("click", () => {
      this.setupParentGate();
      this.showView("view-parent-gate");
    });
  },

  renderHome() {
    const data = Storage.get();
    document.getElementById("home-coins").textContent = `🪙 ${data.character.coins}`;
    document.getElementById("home-charname").textContent = data.character.name;
    document.getElementById("home-level").textContent = `Lv.${data.character.level}`;
    const need = Storage.xpToNextLevel(data.character.level);
    document.getElementById("home-xpfill").style.width = `${Math.min(100, (data.character.xp / need) * 100)}%`;
    document.getElementById("home-xplabel").textContent = `${data.character.xp} / ${need} XP`;
    document.getElementById("home-mascot").innerHTML = UI.mascotSVG(data.character.level, data.character.equipped, 150);
    document.getElementById("daily-streak").textContent = data.daily.consecutiveDays;

    const c = data.daily.challenge;
    const box = document.getElementById("daily-challenge-box");
    if (c) {
      box.innerHTML = c.done
        ? `<span class="done">✅ ${c.label}（達成！+${c.reward}🪙）</span>`
        : `<span>🎯 ${c.label}</span><div class="daily-progress-track"><div class="daily-progress-fill" style="width:${Math.min(100, (c.progress / c.target) * 100)}%"></div></div><span>${c.progress}/${c.target}</span>`;
    } else {
      box.innerHTML = "";
    }
  },

  /* ===================== SELECT ===================== */
  bindSelect() {
    const grid = document.getElementById("subject-grid");
    grid.innerHTML = Object.entries(SUBJECTS).map(([key, s]) => `
      <button class="subject-btn ${key === this.select.subject ? "selected" : ""}" data-subject="${key}">
        <span class="emoji">${s.emoji}</span>${s.label}
      </button>`).join("");
    grid.querySelectorAll(".subject-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.select.subject = btn.dataset.subject;
        grid.querySelectorAll(".subject-btn").forEach((b) => b.classList.toggle("selected", b === btn));
        UI.sound("tap");
      });
    });

    const diffGroup = document.getElementById("difficulty-group");
    diffGroup.innerHTML = Object.entries(DIFFICULTIES).map(([key, d]) => `
      <button class="segment-btn ${key === this.select.difficulty ? "selected" : ""}" data-diff="${key}">${d.label}</button>
    `).join("");
    diffGroup.querySelectorAll(".segment-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.select.difficulty = btn.dataset.diff;
        diffGroup.querySelectorAll(".segment-btn").forEach((b) => b.classList.toggle("selected", b === btn));
        UI.sound("tap");
      });
    });

    const countGroup = document.getElementById("count-group");
    const counts = [{ v: 10, l: "10もん" }, { v: 20, l: "20もん" }, { v: 999, l: "エンドレス" }];
    countGroup.innerHTML = counts.map((c) => `
      <button class="segment-btn ${c.v === this.select.count ? "selected" : ""}" data-count="${c.v}">${c.l}</button>
    `).join("");
    countGroup.querySelectorAll(".segment-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.select.count = Number(btn.dataset.count);
        countGroup.querySelectorAll(".segment-btn").forEach((b) => b.classList.toggle("selected", b === btn));
        UI.sound("tap");
      });
    });

    document.getElementById("btn-begin-quiz").addEventListener("click", () => {
      this.startQuiz();
    });
  },

  renderSelect() {
    // re-apply selection state visuals in case navigated back
    document.querySelectorAll(".subject-btn").forEach((b) => b.classList.toggle("selected", b.dataset.subject === this.select.subject));
    document.querySelectorAll("#difficulty-group .segment-btn").forEach((b) => b.classList.toggle("selected", b.dataset.diff === this.select.difficulty));
    document.querySelectorAll("#count-group .segment-btn").forEach((b) => b.classList.toggle("selected", Number(b.dataset.count) === this.select.count));
  },

  /* ===================== QUIZ ===================== */
  startQuiz() {
    const isEndless = this.select.count === 999;
    // エンドレスは大きめのバッファを用意し、終了ボタンでいつでも切り上げられるようにする
    const count = isEndless ? 200 : this.select.count;
    const problems = generateQuizSet(this.select.subject, this.select.difficulty, count);
    this.quiz = {
      subject: this.select.subject,
      difficulty: this.select.difficulty,
      isEndless,
      problems,
      index: 0,
      correctCount: 0,
      times: [],
      mistakes: [],
      correctedReviews: [],
      currentStreak: 0,
      maxStreak: 0,
      currentAnswer: "",
      startedAt: Date.now(),
      questionStartedAt: Date.now()
    };
    this.showView("view-quiz");
    this.renderQuizProblem();
  },

  bindQuiz() {
    document.getElementById("numpad").addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      if (btn.dataset.action === "del") {
        this.quiz.currentAnswer = this.quiz.currentAnswer.slice(0, -1);
        this.updateAnswerDisplay();
        UI.sound("tap");
      } else if (btn.dataset.action === "ok") {
        this.submitAnswer();
      } else if (btn.dataset.num !== undefined) {
        if (this.quiz.currentAnswer.length < 5) {
          this.quiz.currentAnswer += btn.dataset.num;
          this.updateAnswerDisplay();
          UI.sound("tap");
        }
      }
    });

    document.getElementById("btn-quit-quiz").addEventListener("click", () => {
      const q = this.quiz;
      if (q.isEndless) {
        // エンドレスモードはここまでの結果をそのまま集計する
        if (q.times.length === 0) {
          this.showView("view-home");
          this.renderHome();
          return;
        }
        q.problems = q.problems.slice(0, q.times.length);
        this.finishQuiz();
      } else if (confirm("べんきょうを やめますか？ここまでの きろくは ほぞんされません。")) {
        this.showView("view-home");
        this.renderHome();
      }
    });
  },

  updateAnswerDisplay() {
    document.getElementById("quiz-answer-display").textContent = this.quiz.currentAnswer || "\u00A0";
  },

  renderQuizProblem() {
    const q = this.quiz;
    const problem = q.problems[q.index];
    q.currentAnswer = "";
    q.questionStartedAt = Date.now();
    this.updateAnswerDisplay();
    document.getElementById("quiz-problem-text").textContent = problem.text;
    document.getElementById("quiz-review-tag").style.display = problem.isReview ? "inline-block" : "none";
    if (q.isEndless) {
      document.getElementById("quiz-progress-label").textContent = `${q.index + 1}もんめ`;
      document.getElementById("quiz-progress-fill").style.width = `100%`;
    } else {
      document.getElementById("quiz-progress-label").textContent = `${q.index + 1}/${q.problems.length}`;
      document.getElementById("quiz-progress-fill").style.width = `${(q.index / q.problems.length) * 100}%`;
    }
  },

  submitAnswer() {
    const q = this.quiz;
    if (q.currentAnswer === "") return;
    const problem = q.problems[q.index];
    const userAnswer = Number(q.currentAnswer);
    const timeSec = (Date.now() - q.questionStartedAt) / 1000;
    q.times.push(timeSec);
    const isCorrect = userAnswer === problem.answer;
    const card = document.getElementById("quiz-problem-card");
    const feedback = document.getElementById("quiz-feedback");

    if (isCorrect) {
      q.correctCount++;
      q.currentStreak++;
      q.maxStreak = Math.max(q.maxStreak, q.currentStreak);
      card.classList.add("pop");
      feedback.textContent = "⭕";
      feedback.className = "quiz-feedback show-correct";
      UI.sound("correct");
      if (problem.isReview) q.correctedReviews.push(problem);
    } else {
      q.currentStreak = 0;
      q.mistakes.push(problem);
      card.classList.add("shake");
      feedback.textContent = "❌";
      feedback.className = "quiz-feedback show-wrong";
      UI.sound("wrong");
    }

    setTimeout(() => {
      card.classList.remove("pop", "shake");
      feedback.className = "quiz-feedback";
    }, 500);

    setTimeout(() => {
      q.index++;
      if (q.index >= q.problems.length) {
        this.finishQuiz();
      } else {
        this.renderQuizProblem();
      }
    }, 550);
  },

  finishQuiz() {
    const q = this.quiz;
    const total = q.problems.length;
    const avgTime = q.times.reduce((a, b) => a + b, 0) / total;
    const targetSec = DIFFICULTIES[q.difficulty].targetSec;
    const score = computeScore(q.correctCount, total, avgTime, targetSec);
    const durationSec = Math.round((Date.now() - q.startedAt) / 1000);

    // 苦手記録の更新
    const mistakeKeys = new Set();
    q.mistakes.forEach((p) => {
      Storage.recordMistake(p.subject, p.difficulty, p.a, p.b, p.op);
      mistakeKeys.add(`${p.a}_${p.b}`);
    });
    q.correctedReviews.forEach((p) => {
      if (!mistakeKeys.has(`${p.a}_${p.b}`)) {
        Storage.recordCorrectForWeakPoint(p.subject, p.a, p.b, p.op);
      }
    });

    // 初回クリア判定（このきょうか＋なんきゅうの組み合わせが初めてか）
    const dataBefore = Storage.get();
    const isFirstClear = !dataBefore.history.sessions.some(
      (s) => s.subject === q.subject && s.difficulty === q.difficulty
    );

    const bonuses = getEquippedBonuses();
    let xpEarned = Math.round(score * 0.5) + Math.floor(q.maxStreak / 5) * 5 + (isFirstClear ? 20 : 0);
    xpEarned = Math.round(xpEarned * (1 + bonuses.xpPercent / 100));
    let coinsEarned = 10 + Math.round(score / 10);
    coinsEarned = Math.round(coinsEarned * (1 + bonuses.coinPercent / 100));

    Storage.recordSession({
      date: new Date().toISOString(),
      subject: q.subject,
      difficulty: q.difficulty,
      count: total,
      correct: q.correctCount,
      total,
      avgTimeSec: avgTime,
      score,
      durationSec
    });

    const levelUps = Storage.addXp(xpEarned);
    Storage.addCoins(coinsEarned);

    Storage.updateChallengeProgress("questions", total);
    if (score === 100) Storage.updateChallengeProgress("perfectScore", true);
    if (q.maxStreak >= 5) Storage.updateChallengeProgress("streak5", true);
    const dataAfter = Storage.get();
    const challengeJustDone = dataAfter.daily.challenge && dataAfter.daily.challenge.done && !this._challengeAwarded;
    if (dataAfter.daily.challenge && dataAfter.daily.challenge.done) {
      // 報酬は一度だけ付与
      const key = "challengeAwarded_" + dataAfter.daily.todayDate;
      if (!sessionStorage.getItem(key)) {
        Storage.addCoins(dataAfter.daily.challenge.reward);
        sessionStorage.setItem(key, "1");
      }
    }

    const badgeQueue = checkBadges();

    this.renderResult(score, q.correctCount, total, avgTime, xpEarned, coinsEarned);
    this.showView("view-result");

    const achievements = [];
    levelUps.forEach((lv) => achievements.push({ emoji: "🎉", title: `レベルアップ！ Lv.${lv}`, subtitle: "キャラクターが せいちょうした！" }));
    badgeQueue.forEach((b) => achievements.push(b));
    if (dataAfter.daily.challenge && dataAfter.daily.challenge.done) {
      achievements.push({ emoji: "🎯", title: "デイリーミッション たっせい！", subtitle: `+${dataAfter.daily.challenge.reward} コイン げっと！` });
    }
    if (achievements.length) setTimeout(() => UI.queueAchievements(achievements), 500);
  },

  /* ===================== RESULT ===================== */
  bindResult() {
    document.getElementById("btn-result-home").addEventListener("click", () => {
      this.renderHome();
      this.showView("view-home");
    });
    document.getElementById("btn-result-again").addEventListener("click", () => {
      this.renderSelect();
      this.showView("view-select");
    });
  },

  renderResult(score, correct, total, avgTime, xp, coins) {
    document.getElementById("result-score-num").textContent = score;
    document.getElementById("result-correct").textContent = `${correct}/${total}`;
    document.getElementById("result-time").textContent = `${avgTime.toFixed(1)}びょう`;
    document.getElementById("result-xp").textContent = xp;
    document.getElementById("result-coins").textContent = coins;
    const ring = document.getElementById("result-score-ring");
    const deg = Math.round((score / 100) * 360);
    const color = score >= 80 ? "#3DAA6B" : score >= 50 ? "#FFC94D" : "#FF7A5C";
    ring.style.background = `conic-gradient(${color} ${deg}deg, #EAF6FF 0deg)`;
  },

  /* ===================== CHARACTER / EQUIP ===================== */
  pickingSlot: null,

  bindCharacter() {
    document.getElementById("equip-slots").addEventListener("click", (e) => {
      const slotEl = e.target.closest(".equip-slot");
      if (!slotEl) return;
      this.pickingSlot = slotEl.dataset.slot;
      this.renderCharacterScreen();
    });
  },

  renderCharacterScreen() {
    const data = Storage.get();
    document.getElementById("char-mascot").innerHTML = UI.mascotSVG(data.character.level, data.character.equipped, 170);

    const slotMeta = {
      weapon: { label: "ぶき", emptyEmoji: "✏️" },
      hat: { label: "ぼうし", emptyEmoji: "🚫" },
      clothes: { label: "ふく", emptyEmoji: "👕" }
    };
    const slotsEl = document.getElementById("equip-slots");
    slotsEl.innerHTML = Object.keys(slotMeta).map((slot) => {
      const item = getItem(data.character.equipped[slot]);
      return `
        <div class="equip-slot ${this.pickingSlot === slot ? "active-picking" : ""}" data-slot="${slot}">
          <div class="equip-slot-emoji">${item ? item.emoji : slotMeta[slot].emptyEmoji}</div>
          <div class="equip-slot-name">${item ? item.name : "なし"}</div>
          <div class="equip-slot-label">${slotMeta[slot].label}</div>
        </div>`;
    }).join("");

    if (!this.pickingSlot) this.pickingSlot = "weapon";
    document.getElementById("inventory-slot-label").textContent = `もちもの（${slotMeta[this.pickingSlot].label}）`;

    const owned = data.inventory
      .map((id) => getItem(id))
      .filter((it) => it && it.slot === this.pickingSlot);

    const grid = document.getElementById("inventory-grid");
    grid.innerHTML = owned.map((it) => `
      <div class="inv-item ${data.character.equipped[this.pickingSlot] === it.id ? "equipped" : ""}" data-item="${it.id}">
        <div class="inv-item-rarity" style="background:${RARITY_INFO[it.rarity].color}">${it.rarity}</div>
        <div class="inv-item-emoji">${it.emoji}</div>
        <div class="inv-item-name">${it.name}</div>
      </div>
    `).join("");
    grid.querySelectorAll(".inv-item").forEach((el) => {
      el.addEventListener("click", () => {
        Storage.equip(this.pickingSlot, el.dataset.item);
        UI.sound("coin");
        UI.toast("そうびを 変更したよ！", "🧝");
        this.renderCharacterScreen();
      });
    });
  },

  /* ===================== GACHA ===================== */
  bindGacha() {
    document.getElementById("btn-pull-gacha").addEventListener("click", () => {
      const data = Storage.get();
      if (data.character.coins < GACHA_COST) {
        UI.toast("コインが たりないよ！べんきょうして ためよう", "😢");
        return;
      }
      const result = performGacha();
      if (!result) return;
      const d = Storage.get();
      d.gachaPullCount = (d.gachaPullCount || 0) + 1;
      Storage.save();

      this.renderGachaScreen();
      const info = RARITY_INFO[result.item.rarity];
      const reveal = document.getElementById("gacha-reveal");
      reveal.innerHTML = `
        <div class="gacha-reveal-card">
          <div class="gacha-reveal-emoji">${result.item.emoji}</div>
          <div class="gacha-reveal-rarity" style="background:${info.color}">${result.item.rarity}</div>
          <div class="gacha-reveal-name">${result.item.name}</div>
          <div class="gacha-reveal-note">${result.isNew ? "あたらしい そうび！" : `もっていた… +${result.duplicateBonus}🪙 かえってきた`}</div>
        </div>
      `;
      UI.sound(result.item.rarity === "SSR" || result.item.rarity === "UR" ? "levelup" : "coin");
      if (result.item.rarity === "SSR" || result.item.rarity === "UR") {
        UI.confetti(reveal);
      }
      const badgeQueue = checkBadges();
      if (badgeQueue.length) setTimeout(() => UI.queueAchievements(badgeQueue), 400);
    });
  },

  renderGachaScreen() {
    const data = Storage.get();
    document.getElementById("gacha-coins").textContent = `🪙 ${data.character.coins}`;
  },

  /* ===================== HISTORY ===================== */
  renderHistoryScreen() {
    const data = Storage.get();
    const h = data.history;
    const accuracy = h.totalQuestions > 0 ? Math.round((h.totalCorrect / h.totalQuestions) * 100) : 0;
    const avgTimeAll = h.sessions.length
      ? (h.sessions.reduce((s, x) => s + x.avgTimeSec, 0) / h.sessions.length).toFixed(1)
      : "0.0";

    document.getElementById("history-summary-grid").innerHTML = `
      <div class="history-summary-item"><div class="history-summary-value">${h.totalSessions}</div><div class="history-summary-label">総プレイ回数</div></div>
      <div class="history-summary-item"><div class="history-summary-value">${accuracy}%</div><div class="history-summary-label">正答率</div></div>
      <div class="history-summary-item"><div class="history-summary-value">${avgTimeAll}秒</div><div class="history-summary-label">平均回答時間</div></div>
      <div class="history-summary-item"><div class="history-summary-value">${UI.formatMinutes(h.totalStudySeconds)}</div><div class="history-summary-label">合計勉強時間</div></div>
    `;

    const recent = [...h.sessions].reverse().slice(0, 15);
    document.getElementById("history-list").innerHTML = recent.map((s) => {
      const d = new Date(s.date);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      return `
        <div class="history-item">
          <div>
            <div class="history-item-main">${SUBJECTS[s.subject].emoji} ${SUBJECTS[s.subject].label}（${DIFFICULTIES[s.difficulty].label}）</div>
            <div class="history-item-sub">${dateStr} ・ ${s.correct}/${s.total}問 正解</div>
          </div>
          <div class="history-item-score">${s.score}点</div>
        </div>`;
    }).join("") || `<div class="history-item-sub">まだ きろくが ないよ</div>`;

    document.getElementById("badge-grid").innerHTML = BADGES.map((b) => `
      <div class="badge-item ${data.badges.includes(b.id) ? "earned" : ""}">
        <div class="badge-item-emoji">${b.emoji}</div>
        <div class="badge-item-name">${b.name}</div>
      </div>
    `).join("");
  },

  /* ===================== PARENT GATE / DASHBOARD ===================== */
  setupParentGate() {
    const a = 6 + Math.floor(Math.random() * 4);
    const b = 6 + Math.floor(Math.random() * 4);
    this.parentGateAnswer = a * b;
    document.getElementById("parent-gate-question").textContent = `${a} × ${b} = ?`;
    document.getElementById("parent-gate-input").value = "";
    document.getElementById("parent-gate-error").style.display = "none";
  },

  bindParentGate() {
    document.getElementById("btn-parent-gate-submit").addEventListener("click", () => {
      const val = Number(document.getElementById("parent-gate-input").value);
      if (val === this.parentGateAnswer) {
        this.renderParentScreen();
        this.showView("view-parent");
      } else {
        document.getElementById("parent-gate-error").style.display = "block";
      }
    });
  },

  renderParentScreen() {
    const data = Storage.get();
    const h = data.history;
    const accuracy = h.totalQuestions > 0 ? Math.round((h.totalCorrect / h.totalQuestions) * 100) : 0;

    document.getElementById("parent-grid").innerHTML = `
      <div class="parent-stat"><div class="parent-stat-value">${UI.formatMinutes(data.daily.todayStudySeconds)}</div><div class="parent-stat-label">きょうの勉強時間</div></div>
      <div class="parent-stat"><div class="parent-stat-value">${accuracy}%</div><div class="parent-stat-label">全体正答率</div></div>
      <div class="parent-stat"><div class="parent-stat-value">Lv.${data.character.level}</div><div class="parent-stat-label">キャラクターレベル</div></div>
      <div class="parent-stat"><div class="parent-stat-value">${data.daily.consecutiveDays}日</div><div class="parent-stat-label">連続ログイン</div></div>
    `;

    const recentSessions = h.sessions.slice(-8);
    const values = recentSessions.map((s) => s.score);
    const labels = recentSessions.map((s) => {
      const d = new Date(s.date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    document.getElementById("parent-chart").innerHTML = values.length
      ? UI.barChart(values, labels)
      : `<p style="text-align:center;color:var(--gray);font-size:13px;">まだ データが ありません</p>`;

    const bySubject = {};
    Object.keys(SUBJECTS).forEach((s) => { bySubject[s] = { correct: 0, total: 0 }; });
    h.sessions.forEach((s) => {
      bySubject[s.subject].correct += s.correct;
      bySubject[s.subject].total += s.total;
    });
    document.getElementById("parent-subject-list").innerHTML = Object.entries(bySubject).map(([key, v]) => {
      const pct = v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0;
      const color = pct >= 80 ? "#3DAA6B" : pct >= 50 ? "#FFC94D" : "#FF7A5C";
      return `
        <div class="parent-subject-row">
          <div class="parent-subject-name">${SUBJECTS[key].emoji} ${SUBJECTS[key].label}</div>
          <div class="parent-subject-track"><div class="parent-subject-fill" style="width:${pct}%;background:${color}"></div></div>
          <div class="parent-subject-pct">${pct}%</div>
        </div>`;
    }).join("");
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());
