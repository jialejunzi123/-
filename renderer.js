// ============================================================
//  咕咕嘎嘎 - 桌面宠物核心逻辑
// ============================================================

const pet = document.getElementById('pet-container');
const penguinImg = document.getElementById('penguin-img');
const penguinCss = document.getElementById('penguin-css');
const speechBubble = document.getElementById('speech-bubble');
const heartEffect = document.getElementById('heart-effect');
const noteEffect = document.getElementById('note-effect');

// ============ 状态管理 ============
const State = {
  idle: 'idle',
  walking: 'walking',
  sleeping: 'sleeping',
  clicked: 'clicked',
  wiggle: 'wiggle'
};

let currentState = State.idle;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let followMode = false;
let walkMode = false;
let idleTimer = null;
let sleepTimer = null;
let walkInterval = null;
let followInterval = null;
let lastInteractionTime = Date.now();
let mouseX = 0, mouseY = 0;
let petBounds = null;

// ============ 初始化 ============
async function init() {
  // 尝试加载图片
  try {
    const assetPath = await window.petAPI.getAssetPath();
    // 尝试加载图片
    penguinImg.onload = () => {
      penguinImg.classList.remove('hidden');
      penguinCss.classList.add('hidden');
      console.log('🐧 使用自定义图片');
    };
    penguinImg.onerror = () => {
      // 图片不存在，使用CSS绘制版
      penguinImg.classList.add('hidden');
      penguinCss.classList.remove('hidden');
      console.log('🐧 使用CSS绘制企鹅（默认）');
    };
    penguinImg.src = assetPath;
  } catch (e) {
    // preload API不可用时使用CSS版
    penguinImg.classList.add('hidden');
    penguinCss.classList.remove('hidden');
    console.log('🐧 使用CSS绘制企鹅');
  }
  
  // 获取窗口尺寸
  try {
    petBounds = window.petAPI.getBounds();
  } catch(e) {}
  
  // 监听来自主进程的模式切换
  try {
    window.petAPI.onToggleFollow((enabled) => {
      followMode = enabled;
      if (enabled) { walkMode = false; stopWalkMode(); startFollowMode(); }
      else stopFollowMode();
    });
    
    window.petAPI.onToggleWalk((enabled) => {
      walkMode = enabled;
      if (enabled) { followMode = false; stopFollowMode(); startWalkMode(); }
      else stopWalkMode();
    });
  } catch(e) {}
  
  // 启动空闲计时器
  resetIdleTimer();
  
  // 绑定事件
  bindEvents();
  
  console.log('🐧 咕咕嘎嘎 已就绪！');
  showSpeech('咕咕嘎嘎！');
}

// ============ 事件绑定 ============
function bindEvents() {
  pet.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  pet.addEventListener('click', onClick);
  // 右键：由主进程弹出菜单（main.js 里绑定了 context-menu 事件）
  pet.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    // contextmenu 事件会触发 webContents 的 context-menu，在 main.js 中处理
  });
  
  // 中键：隐藏
  pet.addEventListener('mousedown', (e) => {
    if (e.button === 1) {
      e.preventDefault();
      showSpeech('拜拜～👋');
      setTimeout(() => {
        try { window.petAPI.hidePet(); } catch(ex) {}
      }, 600);
    }
  });
  pet.addEventListener('dblclick', onDoubleClick);
  document.addEventListener('mousemove', trackMouse);
  document.addEventListener('animationend', onAnimationEnd);
  document.addEventListener('keydown', onKeyDown);
}

let mouseDownMoved = false;

function onMouseDown(e) {
  if (e.button !== 0) return;
  isDragging = true;
  mouseDownMoved = false;
  pet.classList.add('dragging');
  dragStartX = e.screenX;
  dragStartY = e.screenY;
  wakeUp();
}

function onMouseMove(e) {
  if (!isDragging) return;
  const deltaX = e.screenX - dragStartX;
  const deltaY = e.screenY - dragStartY;
  if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
    mouseDownMoved = true;
  }
  dragStartX = e.screenX;
  dragStartY = e.screenY;
  window.petAPI.movePet(deltaX, deltaY);
  resetIdleTimer();
}

function onMouseUp() {
  isDragging = false;
  pet.classList.remove('dragging');
}

function trackMouse(e) {
  mouseX = e.screenX;
  mouseY = e.screenY;
}

// ============ 点击互动 ============
function onClick(e) {
  if (mouseDownMoved) return;
  
  wakeUp();
  
  const reactions = [
    () => doClickBounce(),
    () => { doWiggle(); showSpeech(getRandomPhrase()); },
    () => showSpeech(getRandomPhrase()),
    () => { showHeart(); doClickBounce(); },
    () => { showNote(); doWiggle(); },
    () => showSpeech(getRandomPhrase()),
    () => doClickBounce(),
    () => showHeart(),
  ];
  
  reactions[Math.floor(Math.random() * reactions.length)]();
  resetIdleTimer();
}

function onDoubleClick(e) {
  showHeart();
  showSpeech('好痒好痒～嘎！');
  doWiggle();
}

// ============ 动画结束处理 ============
function onAnimationEnd(e) {
  const target = e.target;
  // 仅处理宠物动画
  if (target === penguinImg || target === penguinCss) {
    pet.classList.remove('pet-clicked', 'pet-wiggle');
    setState(currentState);
  }
}

// ============ 状态切换 ============
function setState(state) {
  pet.className = '';
  currentState = state;
  
  switch (state) {
    case State.idle: pet.classList.add('pet-idle'); break;
    case State.walking: pet.classList.add('pet-walking'); break;
    case State.sleeping: pet.classList.add('pet-sleeping'); break;
    case State.clicked: pet.classList.add('pet-clicked'); break;
    case State.wiggle: pet.classList.add('pet-wiggle'); break;
  }
}

// ============ 交互动作 ============
function doClickBounce() {
  setState(State.clicked);
}

function doWiggle() {
  setState(State.wiggle);
}

function showHeart() {
  heartEffect.classList.remove('hidden');
  void heartEffect.offsetWidth;
  heartEffect.classList.add('show');
  setTimeout(() => { heartEffect.classList.add('hidden'); heartEffect.classList.remove('show'); }, 1600);
}

function showNote() {
  noteEffect.classList.remove('hidden');
  void noteEffect.offsetWidth;
  noteEffect.classList.add('show');
  setTimeout(() => { noteEffect.classList.add('hidden'); noteEffect.classList.remove('show'); }, 1300);
}

function showSpeech(text) {
  speechBubble.textContent = text;
  speechBubble.classList.remove('hidden');
  void speechBubble.offsetWidth;
  speechBubble.classList.add('show');
  
  clearTimeout(speechBubble._hideTimer);
  speechBubble._hideTimer = setTimeout(() => {
    speechBubble.classList.remove('show');
    speechBubble.classList.add('hidden');
  }, 3000);
}

// ============ 随机话语 ============
const phrases = {
  happy: [
    '咕咕嘎嘎！',
    '今天天气真好~',
    '嘿嘿',
    '好开心呀',
    '嘎！',
    '咕咕～',
    '哟吼！',
    '🎵～',
    '咕嘎咕嘎！',
    '嘻嘻',
  ],
  idle: [
    '有点无聊呢...',
    '唔...',
    '嘎嘎？',
    '你在干嘛呀？',
    '好安静...',
    '🤔',
    '咕...嘎？',
    '发发呆...',
  ],
  sleep: [
    '💤 zzz...',
    '呼...呼...',
    '好困...',
    '💤',
    'zzZ...',
  ],
  click: [
    '哎呀！',
    '好痒！',
    '嘻嘻~',
    '嘎嘎嘎！',
    '别戳啦！',
    '喵？哦不对，嘎！',
    '嘿嘿嘿',
    '干嘛啦～',
  ]
};

function getRandomPhrase() {
  if (currentState === State.sleeping) {
    return phrases.sleep[Math.floor(Math.random() * phrases.sleep.length)];
  }
  
  const elapsed = Date.now() - lastInteractionTime;
  if (elapsed > 60000) {
    return phrases.idle[Math.floor(Math.random() * phrases.idle.length)];
  }
  
  const pool = [...phrases.happy, ...phrases.click];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ============ 空闲计时器 ============
function resetIdleTimer() {
  lastInteractionTime = Date.now();
  
  clearTimeout(idleTimer);
  clearTimeout(sleepTimer);
  
  if (currentState === State.sleeping) wakeUp();
  
  // 30-60秒不说话 → 偶尔自言自语
  idleTimer = setTimeout(() => {
    if (currentState === State.idle && !isDragging && !walkMode) {
      const chance = Math.random();
      if (chance < 0.25) showSpeech(getRandomPhrase());
      else if (chance < 0.40) doWiggle();
      else if (chance < 0.45) showHeart();
    }
    resetIdleTimer();
  }, 30000 + Math.random() * 30000);
  
  // 5分钟无互动 → 睡觉
  sleepTimer = setTimeout(() => {
    if (!isDragging && !walkMode && !followMode) {
      setState(State.sleeping);
      showSpeech('💤 zzz...');
    }
  }, 5 * 60 * 1000);
}

function wakeUp() {
  if (currentState === State.sleeping) {
    speechBubble.classList.add('hidden');
    speechBubble.classList.remove('show');
    setState(State.idle);
    setTimeout(() => showSpeech('啊！醒了～'), 500);
  }
}

// ============ 散步模式 ============
function startWalkMode() {
  stopWalkMode();
  setState(State.walking);
  
  const directions = [
    { x: 1, y: 0 }, { x: -1, y: 0 },
    { x: 0, y: 1 }, { x: 0, y: -1 },
    { x: 1, y: -1 }, { x: -1, y: -1 },
    { x: 1, y: 1 }, { x: -1, y: 1 },
  ];
  
  walkInterval = setInterval(() => {
    if (!walkMode) return;
    const dir = directions[Math.floor(Math.random() * directions.length)];
    const speed = 2 + Math.random() * 4;
    window.petAPI.movePet(dir.x * speed, dir.y * speed);
  }, 80);
  
  showSpeech('出去走走～🚶');
}

function stopWalkMode() {
  walkMode = false;
  if (walkInterval) { clearInterval(walkInterval); walkInterval = null; }
  if (currentState === State.walking) setState(State.idle);
}

// ============ 跟随模式 ============
function startFollowMode() {
  stopFollowMode();
  setState(State.walking);
  showSpeech('跟着你！🏃');
  
  followInterval = setInterval(() => {
    if (!followMode) return;
    // 向鼠标位置移动
    try {
      const bounds = window.petAPI.getBounds();
      if (!bounds) return;
      const petCenterX = bounds.x + bounds.width / 2;
      const petCenterY = bounds.y + bounds.height / 2;
      
      const dx = mouseX - petCenterX;
      const dy = mouseY - petCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 50 && dist < 1000) {
        const speed = Math.min(8, dist / 20);
        window.petAPI.movePet(
          (dx / dist) * speed,
          (dy / dist) * speed
        );
      }
    } catch(e) {}
  }, 40);
}

function stopFollowMode() {
  followMode = false;
  if (followInterval) { clearInterval(followInterval); followInterval = null; }
  if (currentState === State.walking) setState(State.idle);
}

// ============ 键盘快捷键 ============
function onKeyDown(e) {
  if (e.ctrlKey && e.shiftKey && e.key === 'W') {
    if (!walkMode) { walkMode = true; startWalkMode(); }
    else { stopWalkMode(); }
  }
  if (e.ctrlKey && e.shiftKey && e.key === 'F') {
    if (!followMode) { followMode = true; startFollowMode(); }
    else { stopFollowMode(); }
  }
  // Ctrl+Shift+Q 退出
  if (e.ctrlKey && e.shiftKey && e.key === 'Q') {
    try { window.petAPI.quitApp(); } catch(ex) {}
  }
  // Ctrl+Shift+H 隐藏
  if (e.ctrlKey && e.shiftKey && e.key === 'H') {
    try { window.petAPI.hidePet(); } catch(ex) {}
  }
}

// ============ 启动 ============
window.addEventListener('DOMContentLoaded', init);
