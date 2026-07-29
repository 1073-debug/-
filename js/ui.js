/* ui.js
 * 画面の描画・演出まわりの共通処理。
 */
const UI = {
  toastTimer: null,

  toast(message, emoji = "✨") {
    const el = document.getElementById("toast");
    el.innerHTML = `<span class="toast-emoji">${emoji}</span><span>${message}</span>`;
    el.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  },

  sound(kind) {
    const data = Storage.get();
    if (!data.settings.sound) return;
    // 短いビープ音をWeb Audio APIで鳴らす（外部音源不要・オフライン対応）
    try {
      const ctx = UI._audioCtx || (UI._audioCtx = new (window.AudioContext || window.webkitAudioContext)());
      const freqMap = { correct: 880, wrong: 220, levelup: 1046, coin: 660, tap: 440 };
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freqMap[kind] || 440;
      g.gain.value = 0.06;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      o.stop(ctx.currentTime + 0.36);
    } catch (e) { /* audio unsupported, ignore */ }
  },

  confetti(container) {
    const colors = ["#3DAA6B", "#FFC94D", "#FF7A5C", "#4C9AFF", "#9D6FFF"];
    for (let i = 0; i < 24; i++) {
      const p = document.createElement("div");
      p.className = "confetti-piece";
      p.style.left = Math.random() * 100 + "%";
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = (Math.random() * 0.4) + "s";
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      container.appendChild(p);
      setTimeout(() => p.remove(), 2200);
    }
  },

  /** レベルアップ・バッジ獲得などの達成演出を全画面オーバーレイで出す */
  showAchievement({ title, subtitle, emoji }) {
    const overlay = document.getElementById("achievement-overlay");
    overlay.innerHTML = `
      <div class="achievement-card">
        <div class="achievement-emoji">${emoji}</div>
        <div class="achievement-title">${title}</div>
        <div class="achievement-subtitle">${subtitle}</div>
        <button class="btn btn-primary" id="achievement-close">やったー！</button>
      </div>
    `;
    overlay.classList.add("show");
    this.confetti(overlay);
    this.sound("levelup");
    document.getElementById("achievement-close").onclick = () => {
      overlay.classList.remove("show");
      overlay.innerHTML = "";
    };
  },

  /** 達成演出を複数キューで順番に出す */
  queueAchievements(items) {
    if (!items.length) return;
    let i = 0;
    const showNext = () => {
      if (i >= items.length) return;
      const item = items[i++];
      const overlay = document.getElementById("achievement-overlay");
      overlay.innerHTML = `
        <div class="achievement-card">
          <div class="achievement-emoji">${item.emoji}</div>
          <div class="achievement-title">${item.title}</div>
          <div class="achievement-subtitle">${item.subtitle}</div>
          <button class="btn btn-primary" id="achievement-close">${i < items.length ? "つぎへ" : "やったー！"}</button>
        </div>
      `;
      overlay.classList.add("show");
      this.confetti(overlay);
      this.sound("levelup");
      document.getElementById("achievement-close").onclick = () => {
        overlay.classList.remove("show");
        overlay.innerHTML = "";
        setTimeout(showNext, 200);
      };
    };
    showNext();
  },

  /** マスコットキャラクターをSVGで描画。レベル帯で色が育つ・装備を重ねる */
  mascotSVG(level, equipped, size = 160) {
    const tier = level >= 30 ? 3 : level >= 15 ? 2 : level >= 5 ? 1 : 0;
    const bodyColors = ["#3DAA6B", "#2E9CD6", "#9D6FFF", "#FF7A5C"];
    const bodyColor = bodyColors[tier];
    const clothes = getItem(equipped.clothes);
    const hat = getItem(equipped.hat);
    const weapon = getItem(equipped.weapon);

    const clothesOverlay = clothes && clothes.id !== "c_none"
      ? `<ellipse cx="80" cy="96" rx="46" ry="34" fill="${clothesTint(clothes.id)}" opacity="0.55"/>` : "";

    return `
      <svg viewBox="0 0 160 160" width="${size}" height="${size}" class="mascot-svg">
        <ellipse cx="80" cy="140" rx="42" ry="8" fill="#2E3A55" opacity="0.12"/>
        <ellipse cx="80" cy="86" rx="52" ry="46" fill="${bodyColor}"/>
        ${clothesOverlay}
        <ellipse cx="80" cy="96" rx="30" ry="22" fill="#ffffff" opacity="0.35"/>
        <circle cx="62" cy="76" r="8" fill="#2E3A55"/>
        <circle cx="98" cy="76" r="8" fill="#2E3A55"/>
        <circle cx="59" cy="73" r="2.6" fill="#fff"/>
        <circle cx="95" cy="73" r="2.6" fill="#fff"/>
        <path d="M 66 96 Q 80 108 94 96" stroke="#2E3A55" stroke-width="3" fill="none" stroke-linecap="round"/>
        <circle cx="44" cy="92" r="6" fill="#FF7A5C" opacity="0.5"/>
        <circle cx="116" cy="92" r="6" fill="#FF7A5C" opacity="0.5"/>
      </svg>
      <div class="mascot-emoji-layer">
        ${hat && hat.id !== "h_none" ? `<span class="mascot-hat">${hat.emoji}</span>` : ""}
        ${weapon && weapon.id !== "w_none" ? `<span class="mascot-weapon">${weapon.emoji}</span>` : ""}
      </div>
    `;
  },

  /** シンプルな棒グラフ（正答率推移）をSVGで描画 */
  barChart(values, labels, maxValue = 100) {
    const w = 300, h = 120, barW = w / values.length - 8;
    let bars = "";
    values.forEach((v, i) => {
      const bh = Math.max(4, (v / maxValue) * (h - 24));
      const x = i * (w / values.length) + 4;
      const y = h - bh - 16;
      const color = v >= 80 ? "#3DAA6B" : v >= 50 ? "#FFC94D" : "#FF7A5C";
      bars += `<rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="6" fill="${color}"/>`;
      bars += `<text x="${x + barW / 2}" y="${h - 2}" font-size="9" fill="#2E3A55" text-anchor="middle">${labels[i]}</text>`;
      bars += `<text x="${x + barW / 2}" y="${y - 4}" font-size="10" fill="#2E3A55" text-anchor="middle">${Math.round(v)}</text>`;
    });
    return `<svg viewBox="0 0 ${w} ${h}" class="bar-chart">${bars}</svg>`;
  },

  formatMinutes(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}ふん${s}びょう` : `${s}びょう`;
  }
};

function clothesTint(id) {
  const map = {
    c_red: "#FF7A5C", c_blue: "#4C9AFF", c_gold: "#FFC94D",
    c_rainbow: "#9D6FFF", c_star: "#FFFFFF"
  };
  return map[id] || "#ffffff";
}
