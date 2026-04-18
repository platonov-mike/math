// ===== ПАРОЛЬ =====
const SETTINGS_PASSWORD = 'math'; // ← смените на свой

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
  currentSessionLog: [], // лог текущей игры
  bestScore: Number(localStorage.getItem('mm_best') || 0),
};

const TOTAL_QUESTIONS = 20;

// ===== ИСТОРИЯ (localStorage) =====
const HISTORY_KEY = 'mm_history';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function saveHistory(history) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }
  catch (e) { console.warn('Не удалось сохранить историю:', e); }
}

function pushSession(session) {
  const history = loadHistory();
  history.unshift(session); // новые сверху
  if (history.length > 200) history.length = 200;
  saveHistory(history);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  spawnStars();
  buildNumberGrid();
  syncModeUI();
  updateMenuBadge();
});

// ===== ЗВЁЗДЫ =====
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

// ===== НАВИГАЦИЯ =====
function _showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

window.goTo = function(id) {
  if (id === 'screen-settings-check') {
    if (state.selectedNums.length < 1) { _showScreen('screen-settings'); return; }
    startGame();
    return;
  }
  _showScreen(id);
  if (id === 'screen-menu') updateMenuBadge();
};

// ===== ПАРОЛЬ =====
function askPassword() {
  const entered = prompt('🔐 Введите пароль для настроек:');
  if (entered === null) return;
  if (entered === SETTINGS_PASSWORD) {
    switchTab('main');
    _showScreen('screen-settings');
  } else {
    alert('❌ Неверный пароль!');
  }
}

// ===== ТАБЫ НАСТРОЕК =====
function switchTab(tab) {
  document.getElementById('tab-main').classList.toggle('hidden', tab !== 'main');
  document.getElementById('tab-history').classList.toggle('hidden', tab !== 'history');
  document.getElementById('stab-main').classList.toggle('active', tab === 'main');
  document.getElementById('stab-history').classList.toggle('active', tab === 'history');
  if (tab === 'history') renderHistory();
}

// ===== НАСТРОЙКИ =====
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
    if (state.selectedNums.length <= 1) return;
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
  _showScreen('screen-menu');
  updateMenuBadge();
}

// ===== ИСТОРИЯ — РЕНДЕР =====
function formatDateTime(ts) {
  const d = new Date(ts);
  const days = ['вс','пн','вт','ср','чт','пт','сб'];
  const day   = String(d.getDate()).padStart(2,'0');
  const month = String(d.getMonth()+1).padStart(2,'0');
  const year  = d.getFullYear();
  const hh    = String(d.getHours()).padStart(2,'0');
  const mm    = String(d.getMinutes()).padStart(2,'0');
  return `${days[d.getDay()]} ${day}.${month}.${year}, ${hh}:${mm}`;
}

function renderHistory() {
  const list = document.getElementById('history-list');
  const history = loadHistory();

  if (!history.length) {
    list.innerHTML = '<p class="history-empty">Пока нет записей 🙈</p>';
    return;
  }

  list.innerHTML = '';

  history.forEach(session => {
    const pct   = Math.round((session.correct / session.total) * 100);
    const medal = pct === 100 ? '🏆' : pct >= 80 ? '🌟' : pct >= 50 ? '👍' : '💪';

    const wrap = document.createElement('div');
    wrap.className = 'hsession';

    // Шапка — нажимаемая
    const header = document.createElement('div');
    header.className = 'hsession-header';
    header.innerHTML = `
      <span class="hsession-date">${medal} ${formatDateTime(session.ts)}</span>
      <span class="hsession-summary">${session.correct}/${session.total}&nbsp;·&nbsp;${session.score}⭐</span>
      <span class="hsession-arrow">▼</span>
    `;
    header.onclick = () => wrap.classList.toggle('open');

    // Тело с примерами
    const body = document.createElement('div');
    body.className = 'hsession-body';

    let rowsHTML = '';
    (session.items || []).forEach(item => {
      const icon    = item.isCorrect ? '✅' : '❌';
      const cls     = item.isCorrect ? 'correct' : 'wrong';
      const wrongHint = !item.isCorrect
        ? `<span class="hrow-given">(дал: ${item.given}, верно: ${item.answer})</span>`
        : '';
      rowsHTML += `
        <div class="hrow ${cls}">
          <span class="hrow-icon">${icon}</span>
          <span class="hrow-expr">${item.expr} = ${item.answer}</span>
          ${wrongHint}
        </div>`;
    });

    const modeLabel = session.mode === 'mul' ? 'Умножение' : session.mode === 'div' ? 'Деление' : 'Оба';
    const numsLabel = (session.nums || []).join(', ');

    body.innerHTML = rowsHTML + `
      <div class="hsession-total">
        Цифры: ${numsLabel} &nbsp;·&nbsp; ${modeLabel} &nbsp;·&nbsp; ${session.score} очков
      </div>`;

    wrap.appendChild(header);
    wrap.appendChild(body);
    list.appendChild(wrap);
  });
}

function clearHistory() {
  if (!confirm('Удалить всю историю? Это нельзя отменить.')) return;
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

// ===== ГЕНЕРАЦИЯ ВОПРОСОВ =====
function generateQuestions() {
  const nums = state.selectedNums;
  const mulPool = [];
  const divPool = [];
  const usedMul = new Set();
  const usedDiv = new Set();

  // Генерируем умножение: выбранное × 1..10 и 1..10 × выбранное
  for (const n of nums) {
    for (let m = 1; m <= 10; m++) {
      // n × m
      const key1 = `${n}×${m}`;
      if (!usedMul.has(key1)) {
        usedMul.add(key1);
        mulPool.push({ a: n, b: m, answer: n * m });
      }
      // m × n
      const key2 = `${m}×${n}`;
      if (!usedMul.has(key2)) {
        usedMul.add(key2);
        mulPool.push({ a: m, b: n, answer: m * n });
      }

      // Деление: (n×m) ÷ n = m  или  (n×m) ÷ m = n
      // Вариант 1: делитель из выбранных
      const divKey1 = `${n*m}÷${n}`;
      if (!usedDiv.has(divKey1)) {
        usedDiv.add(divKey1);
        divPool.push({ a: n * m, b: n, answer: m });
      }
      // Вариант 2: результат из выбранных
      const divKey2 = `${n*m}÷${m}`;
      if (!usedDiv.has(divKey2)) {
        usedDiv.add(divKey2);
        divPool.push({ a: n * m, b: m, answer: n });
      }
    }
  }

  // Перемешиваем
  mulPool.sort(() => Math.random() - 0.5);
  divPool.sort(() => Math.random() - 0.5);

  const questions = [];
  for (let i = 0; i < TOTAL_QUESTIONS; i++) {
    let type = state.mode;
    if (type === 'both') type = Math.random() < 0.5 ? 'mul' : 'div';

    let expr, answer;
    if (type === 'mul') {
      const item = mulPool[i % mulPool.length];
      expr = `${item.a} × ${item.b}`;
      answer = item.answer;
    } else {
      const item = divPool[i % divPool.length];
      expr = `${item.a} ÷ ${item.b}`;
      answer = item.answer;
    }
    questions.push({ expr, answer, type });
  }
  return questions;
}

function generateChoices(correct) {
  const choices = new Set([correct]);
  let i = 0;
  while (choices.size < 4 && i++ < 300) {
    const delta = Math.floor(Math.random() * 20) - 10;
    const c = correct + delta;
    if (c > 0 && c !== correct) choices.add(c);
  }
  return [...choices].sort(() => Math.random() - 0.5);
}

// ===== ИГРА: СТАРТ =====
function startGame() {
  state.score             = 0;
  state.correct           = 0;
  state.total             = 0;
  state.questions         = generateQuestions();
  state.currentIdx        = 0;
  state.answered          = false;
  state.currentSessionLog = [];

  _showScreen('screen-game');
  showQuestion();
}

// ===== ПОКАЗАТЬ ВОПРОС =====
const emojis = ['🤔','🦊','🐱','🦄','🐸','🐧','🦁','🐯','🦋','🌟',
                 '🐼','🦅','🐬','🦊','🍀','🚀','⚡','🎯','🎲','🔮'];

function showQuestion() {
  const q = state.questions[state.currentIdx];
  state.answered = false;

  document.getElementById('feedback').textContent  = '';
  document.getElementById('feedback').className    = 'feedback';
  document.getElementById('answer-input').value    = '';
  document.getElementById('answer-input').disabled = false;

  document.getElementById('question-emoji').textContent = emojis[state.currentIdx % emojis.length];
  document.getElementById('question-box').textContent   = q.expr + ' = ?';

  const pct = (state.currentIdx / TOTAL_QUESTIONS) * 100;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = `${state.currentIdx} / ${TOTAL_QUESTIONS}`;
  document.getElementById('score-pill').textContent    = `⭐ ${state.score}`;

  const choices = generateChoices(q.answer);
  const grid = document.getElementById('choices-grid');
  grid.innerHTML = '';
  choices.forEach(c => {
    const btn = document.createElement('button');
    btn.className   = 'choice-btn';
    btn.textContent = c;
    btn.onclick     = () => selectChoice(c, btn, q.answer);
    grid.appendChild(btn);
  });

  setTimeout(() => document.getElementById('answer-input').focus(), 100);
}

// ===== ВВОД С КЛАВИАТУРЫ =====
function checkAnswer() {
  if (state.answered) return;
  const val = parseInt(document.getElementById('answer-input').value);
  if (isNaN(val)) return;
  const q = state.questions[state.currentIdx];
  processAnswer(val === q.answer, q.answer, val);
}

// ===== ВЫБОР ВАРИАНТА =====
function selectChoice(value, btn, correct) {
  if (state.answered) return;
  const isCorrect = value === correct;
  document.querySelectorAll('.choice-btn').forEach(b => {
    if (parseInt(b.textContent) === correct) b.classList.add('correct-ans');
    if (b === btn && !isCorrect)             b.classList.add('wrong-ans');
    b.disabled = true;
  });
  processAnswer(isCorrect, correct, value);
}

// ===== ОБРАБОТКА ОТВЕТА =====
const correctMsgs = ['🎉 Верно!','⭐ Отлично!','🔥 Супер!','🌟 Молодец!','✅ Правильно!','🦄 Браво!'];
const wrongMsgs   = ['❌ Упс!','😅 Не то!','💪 В следующий раз!','🙈 Ошибка!'];

function processAnswer(isCorrect, correctVal, givenVal) {
  state.answered = true;
  state.total++;
  document.getElementById('answer-input').disabled = true;

  const q  = state.questions[state.currentIdx];
  const fb = document.getElementById('feedback');

  if (isCorrect) {
    state.score++;
    state.score += 9; // итого +10
    state.correct++;
    fb.textContent = correctMsgs[Math.floor(Math.random() * correctMsgs.length)];
    fb.className   = 'feedback correct';
  } else {
    fb.textContent = wrongMsgs[Math.floor(Math.random() * wrongMsgs.length)] + ' Ответ: ' + correctVal;
    fb.className   = 'feedback wrong';
  }

  // Логируем пример
  state.currentSessionLog.push({
    expr:      q.expr,
    answer:    correctVal,
    given:     givenVal,
    isCorrect,
  });

  document.getElementById('score-pill').textContent = `⭐ ${state.score}`;

  setTimeout(() => {
    state.currentIdx++;
    if (state.currentIdx >= TOTAL_QUESTIONS) showResult();
    else showQuestion();
  }, 1400);
}

// ===== РЕЗУЛЬТАТ =====
function showResult() {
  const pct = state.correct / TOTAL_QUESTIONS;
  let emoji, title;

  if (pct === 1)       { emoji = '🏆'; title = 'Идеально!'; }
  else if (pct >= 0.8) { emoji = '🎉'; title = 'Молодец!'; }
  else if (pct >= 0.5) { emoji = '👍'; title = 'Хорошо!'; }
  else                 { emoji = '💪'; title = 'Тренируйся!'; }

  const stars = pct === 1 ? 3 : pct >= 0.6 ? 2 : 1;

  document.getElementById('result-emoji').textContent = emoji;
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-desc').textContent  =
    `Правильных: ${state.correct} из ${TOTAL_QUESTIONS} · Очков: ${state.score}`;
  document.getElementById('stars-row').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);

  // Рекорд
  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    localStorage.setItem('mm_best', state.bestScore);
  }

  // Сохраняем сессию в историю
  pushSession({
    ts:      Date.now(),
    score:   state.score,
    correct: state.correct,
    total:   TOTAL_QUESTIONS,
    mode:    state.mode,
    nums:    [...state.selectedNums].sort((a, b) => a - b),
    items:   state.currentSessionLog,
  });

  _showScreen('screen-result');
}

// ===== МЕНЮ БЕЙДЖ =====
function updateMenuBadge() {
  const badge = document.getElementById('menu-score-badge');
  if (state.bestScore > 0) {
    badge.style.display = 'inline-block';
    badge.textContent   = '🏆 Рекорд: ' + state.bestScore + ' очков';
  }
}
