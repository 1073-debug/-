/* problems.js
 * 四則演算の問題生成、および「苦手克服システム」用のロジック。
 */
const SUBJECTS = {
  add: { label: "たしざん", symbol: "+", emoji: "➕" },
  sub: { label: "ひきざん", symbol: "-", emoji: "➖" },
  mul: { label: "かけざん", symbol: "×", emoji: "✖️" },
  div: { label: "わりざん", symbol: "÷", emoji: "➗" }
};

const DIFFICULTIES = {
  easy: { label: "しょきゅう", targetSec: 8 },
  normal: { label: "ちゅうきゅう", targetSec: 6 },
  hard: { label: "じょうきゅう", targetSec: 5 }
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeProblem(subject, difficulty, a, b) {
  const op = SUBJECTS[subject].symbol;
  let answer;
  switch (subject) {
    case "add": answer = a + b; break;
    case "sub": answer = a - b; break;
    case "mul": answer = a * b; break;
    case "div": answer = a / b; break;
  }
  return {
    subject, difficulty, a, b, op,
    text: `${a} ${op} ${b}`,
    answer
  };
}

function generateNewProblem(subject, difficulty) {
  let a, b;
  if (subject === "add") {
    if (difficulty === "easy") { a = randInt(1, 10); b = randInt(1, 10); }
    else if (difficulty === "normal") { a = randInt(10, 50); b = randInt(10, 50); }
    else { a = randInt(50, 200); b = randInt(50, 200); }
  } else if (subject === "sub") {
    if (difficulty === "easy") { a = randInt(1, 10); b = randInt(0, a); }
    else if (difficulty === "normal") { a = randInt(10, 60); b = randInt(0, a); }
    else { a = randInt(50, 200); b = randInt(0, a); }
  } else if (subject === "mul") {
    if (difficulty === "easy") { a = randInt(1, 5); b = randInt(1, 5); }
    else if (difficulty === "normal") { a = randInt(1, 9); b = randInt(1, 9); }
    else { a = randInt(2, 12); b = randInt(2, 12); }
  } else if (subject === "div") {
    if (difficulty === "easy") { b = randInt(1, 5); a = b * randInt(1, 5); }
    else if (difficulty === "normal") { b = randInt(1, 9); a = b * randInt(1, 9); }
    else { b = randInt(2, 12); a = b * randInt(2, 12); }
  }
  return makeProblem(subject, difficulty, a, b);
}

/**
 * 苦手復習を混ぜた問題セットを作る。
 * count問中、最大30%までを「間違えたことのある問題」から優先出題する。
 */
function generateQuizSet(subject, difficulty, count) {
  const weakPoints = Storage.getWeakPoints(subject, Math.ceil(count * 0.3));
  const reviewProblems = weakPoints.map((wp) => ({
    ...makeProblem(wp.subject, wp.difficulty, wp.a, wp.b),
    isReview: true
  }));

  const problems = [...reviewProblems];
  const seen = new Set(reviewProblems.map((p) => `${p.a}_${p.b}`));
  let guard = 0;
  while (problems.length < count && guard < count * 20) {
    guard++;
    const p = generateNewProblem(subject, difficulty);
    const sig = `${p.a}_${p.b}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    problems.push(p);
  }
  // shuffle
  for (let i = problems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [problems[i], problems[j]] = [problems[j], problems[i]];
  }
  return problems.slice(0, count);
}

/**
 * 正答率と回答速度から100点満点のスコアを計算。
 */
function computeScore(correctCount, total, avgTimeSec, targetSec) {
  const accuracy = total > 0 ? correctCount / total : 0;
  const speedRatio = Math.max(0, Math.min(1, targetSec / Math.max(avgTimeSec, 0.5)));
  const score = accuracy * 70 + speedRatio * 30;
  return Math.round(Math.max(0, Math.min(100, score)));
}
