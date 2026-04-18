const SETTINGS_PASSWORD = 'Math'; // ← сюда свой пароль

// ===== STATE =====
const state = {
  selectedNums: [2, 3, 4, 5],
  mode: 'both',         // 'mul' | 'div' | 'both'
  score: 0,
  total: 0,
  correct: 0,
  questions: [],
  currentIdx: 0,
  answered: false,
  bestScore: JSON.parse(localStorage.getItem('bestScore') || '0'),
};

const TOTAL_QUESTIONS = 25;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  spawnStars();
  buildNumberGrid();
  syncModeUI();
  updateMenuBadge();
});

// ===== STARS =====
function spawnStars() {
  const container = document.getElementById('stars');
  for (let i = 0; i < 60; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.left = Math.random() * 100 + '%';
    s.style.top  = Math.random() * 100 + '%';
    s.style.setProperty('--dur', (2 + Math.random() * 4).toFixed(1) + 's');
    s.style.setProperty('--del', (-Math.random() * 4).toFixed(1) + 's');
    container.appendChild(s);
  }
}

// ===== SCREEN NAVIGATION =====
function goTo(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'screen-menu') updateMenuBadge();
}

// 'Start' from menu — check if numbers are selected
function goTo_start() {
  if (state.selectedNums.length < 2) {
    alert('Выбери хотя бы 2 цифры в настройках!');
    goTo('screen-settings');
    return;
  }
  startGame();
}

// called when pressing Start from menu
document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.querySelector('.btn-start');
  if (startBtn) {
    // handled inline in HTML
  }
});

// ===== SETTINGS =====
function buildNumberGrid() {
  const grid = document.getElementById('numbers-grid');
  grid.innerHTML = '';
  for (let n = 1; n <= 10; n++) {
    const btn = document.createElement('button');
    btn.className = 'num-btn' + (state.selectedNums.includes(n) ? ' selected' : '');
    btn.textContent = n;
    btn.onclick = () => toggleNum(n, btn);
    grid.appendChild(btn);
  }
}

function toggleNum(n, btn) {
  const idx = state.selectedNums.indexOf(n);
  if (idx === -1) {
    state.selectedNums.push(n);
    btn.classList.add('selected');
  } else {
    if (state.selectedNums.length <= 1) return; // keep at least 1
    state.selectedNums.splice(idx, 1);
    btn.classList.remove('selected');
  }
}

function setMode(m) {
  state.mode = m;
  syncModeUI();
}

function syncModeUI() {
  ['mul', 'div', 'both'].forEach(m => {
    document.getElementById('mode-' + m).classList.toggle('active', state.mode === m);
  });
}

function saveSettings() {
  goTo('screen-menu');
}

// ===== GENERATE QUESTIONS =====
function generateQuestions() {
  const nums = state.selectedNums;
  const questions = [];
  const pool = [];

  // Build pool of possible pairs
  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < nums.length; j++) {
      pool.push([nums[i], nums[j]]);
    }
  }

  // Shuffle pool
  pool.sort(() => Math.random() - 0.5);

  for (let i = 0; i < TOTAL_QUESTIONS; i++) {
    const [a, b] = pool[i % pool.length];
    let type = state.mode;
    if (type === 'both') type = Math.random() < 0.5 ? 'mul' : 'div';

    let q, answer;
    if (type === 'mul') {
      q = `${a} × ${b}`;
      answer = a * b;
    } else {
      // division: a*b ÷ b = a  (avoid ÷0)
      const product = a * b;
      const divisor = b === 0 ? a : b;
      q = `${product} ÷ ${divisor === 0 ? 1 : divisor}`;
      answer = divisor === 0 ? product : a;
    }
    questions.push({ q, answer });
  }
  return questions;
}

function generateChoices(correct) {
  const choices = new Set([correct]);
  const attempts = 200;
  let i = 0;
  while (choices.size < 4 && i++ < attempts) {
    const delta = Math.floor(Math.random() * 20) - 10;
    const candidate = correct + delta;
    if (candidate > 0 && candidate !== correct) choices.add(candidate);
  }
  return [...choices].sort(() => Math.random() - 0.5);
}

// ===== START GAME =====
function startGame() {
  if (state.selectedNums.length < 1) {
    goTo('screen-settings');
    return;
  }
  state.score = 0;
  state.correct = 0;
  state.total = 0;
  state.questions = generateQuestions();
  state.currentIdx = 0;
  state.answered = false;

  goTo('screen-game');
  showQuestion();
}

// ===== SHOW QUESTION =====
const emojis = ['🤔','🦊','🐱','🦄','🐸','🐧','🦁','🐯','🦋','🌟'];

function showQuestion() {
  const q = state.questions[state.currentIdx];
  state.answered = false;

  // UI reset
  document.getElementById('feedback').textContent = '';
  document.getElementById('feedback').className = 'feedback';
  document.getElementById('answer-input').value = '';
  document.getElementById('answer-input').disabled = false;

  // Question
  document.getElementById('question-emoji').textContent = emojis[state.currentIdx % emojis.length];
  document.getElementById('question-box').textContent = q.q + ' = ?';

  // Progress
  const pct = (state.currentIdx / TOTAL_QUESTIONS) * 100;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = `${state.currentIdx} / ${TOTAL_QUESTIONS}`;
  document.getElementById('score-pill').textContent = `⭐ ${state.score}`;

  // Choices
  const choices = generateChoices(q.answer);
  const grid = document.getElementById('choices-grid');
  grid.innerHTML = '';
  choices.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = c;
    btn.onclick = () => selectChoice(c, btn, q.answer);
    grid.appendChild(btn);
  });

  // Focus input
  setTimeout(() => document.getElementById('answer-input').focus(), 100);
}

// ===== CHECK ANSWER (input) =====
function checkAnswer() {
  if (state.answered) return;
  const val = parseInt(document.getElementById('answer-input').value);
  if (isNaN(val)) return;
  const q = state.questions[state.currentIdx];
  processAnswer(val === q.answer, q.answer);
}

// ===== SELECT CHOICE =====
function selectChoice(value, btn, correct) {
  if (state.answered) return;
  const isCorrect = value === correct;

  document.querySelectorAll('.choice-btn').forEach(b => {
    const num = parseInt(b.textContent);
    if (num === correct) b.classList.add('correct-ans');
    if (b === btn && !isCorrect) b.classList.add('wrong-ans');
    b.disabled = true;
  });

  processAnswer(isCorrect, correct);
}

// ===== PROCESS ANSWER =====
const correctMsgs = ['🎉 Верно!', '⭐ Отлично!', '🔥 Супер!', '🌟 Молодец!', '✅ Правильно!', '🦄 Браво!'];
const wrongMsgs   = ['❌ Упс!', '😅 Не то!', '💪 В следующий раз!', '🙈 Ошибка!'];

function processAnswer(isCorrect, correctVal) {
  state.answered = true;
  state.total++;
  document.getElementById('answer-input').disabled = true;

  const fb = document.getElementById('feedback');
  if (isCorrect) {
    state.score += 10;
    state.correct++;
    fb.textContent = correctMsgs[Math.floor(Math.random() * correctMsgs.length)];
    fb.className = 'feedback correct';
  } else {
    fb.textContent = wrongMsgs[Math.floor(Math.random() * wrongMsgs.length)] + ' Ответ: ' + correctVal;
    fb.className = 'feedback wrong';
  }

  document.getElementById('score-pill').textContent = `⭐ ${state.score}`;

  // Advance
  setTimeout(() => {
    state.currentIdx++;
    if (state.currentIdx >= TOTAL_QUESTIONS) {
      showResult();
    } else {
      showQuestion();
    }
  }, 1400);
}

// ===== RESULT =====
function showResult() {
  const pct = state.correct / TOTAL_QUESTIONS;
  let emoji, title;

  if (pct === 1)        { emoji = '🏆'; title = 'Идеально!'; }
  else if (pct >= 0.8)  { emoji = '🎉'; title = 'Молодец!'; }
  else if (pct >= 0.5)  { emoji = '👍'; title = 'Хорошо!'; }
  else                  { emoji = '💪'; title = 'Тренируйся!'; }

  const stars = pct === 1 ? 3 : pct >= 0.6 ? 2 : 1;

  document.getElementById('result-emoji').textContent = emoji;
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-desc').textContent =
    `Правильных ответов: ${state.correct} из ${TOTAL_QUESTIONS} • Очков: ${state.score}`;
  document.getElementById('stars-row').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);

  // Save best
  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    localStorage.setItem('bestScore', state.bestScore);
  }

  goTo('screen-result');
}

// ===== MENU BADGE =====
function updateMenuBadge() {
  const badge = document.getElementById('menu-score-badge');
  if (state.bestScore > 0) {
    badge.style.display = 'inline-block';
    badge.textContent = '🏆 Рекорд: ' + state.bestScore + ' очков';
  }
}

// ===== HANDLE START FROM MENU =====
// Override the goTo call in HTML for the start button
window.goTo = function(id) {
  if (id === 'screen-settings-check') {
    // Start was pressed from menu
    if (state.selectedNums.length < 1) {
      goTo('screen-settings');
      return;
    }
    startGame();
    return;
  }
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'screen-menu') updateMenuBadge();
};
