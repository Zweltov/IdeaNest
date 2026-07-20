// ===== КОНФИГУРАЦИЯ SUPABASE =====
const SUPABASE_URL = 'https://hhwndrynnozllrqtcdct.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhod25kcnlubm96bGxycXRjZGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MTkyOTIsImV4cCI6MjA5OTQ5NTI5Mn0.Gq2PNYIiZzKIaUNOY1AfF-8yVnAjPCf2HRGMX11Av14';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== ДАННЫЕ ИДЕЙ =====
const ideas = [
  { id: 1, name: "AI-помощник для бизнеса", category: "IT", capital: 25000, complexity: "Средняя", potential: "Высокий", rating: 4.8, desc: "Чат-боты и аналитика для малого бизнеса.", why: "Автоматизация продаж.", pros: "Быстрая окупаемость.", cons: "Конкуренция.", how: "Соберите MVP за 3 мес.", risks: "Технические сбои." },
  { id: 2, name: "Доставка здоровой еды", category: "Еда", capital: 18000, complexity: "Средняя", potential: "Средний", rating: 4.2, desc: "Готовые рационы для офисов.", why: "Рост ЗОЖ.", pros: "Постоянные клиенты.", cons: "Логистика.", how: "Начните с кухни.", risks: "Срок годности." },
  { id: 3, name: "Клининг 2.0", category: "Услуги", capital: 8000, complexity: "Низкая", potential: "Высокий", rating: 4.5, desc: "Уборка с эко-средствами.", why: "Спрос на чистоту.", pros: "Низкий порог.", cons: "Много ручного труда.", how: "Закупите инвентарь.", risks: "Травмы." },
  { id: 4, name: "Коворкинг для фрилансеров", category: "Недвижимость", capital: 120000, complexity: "Высокая", potential: "Средний", rating: 3.9, desc: "Пространство с переговорными.", why: "Рост удаленки.", pros: "Долгосрочная аренда.", cons: "Высокая аренда.", how: "Найдите помещение.", risks: "Низкая заполняемость." },
  { id: 5, name: "Производство деревянных игрушек", category: "Производство", capital: 30000, complexity: "Средняя", potential: "Средний", rating: 4.0, desc: "Эко-игрушки ручной работы.", why: "Тренд на натуральное.", pros: "Уникальность.", cons: "Масштабирование.", how: "Мастерская + станки.", risks: "Сезонность." },
  { id: 6, name: "Онлайн-школа английского", category: "Онлайн-бизнес", capital: 15000, complexity: "Низкая", potential: "Высокий", rating: 4.7, desc: "Интерактивные уроки с носителями.", why: "Образование онлайн.", pros: "Масштабируемость.", cons: "Конкуренция.", how: "Платформа Zoom.", risks: "Отток учеников." },
  { id: 7, name: "Франшиза кофейни", category: "Еда", capital: 90000, complexity: "Высокая", potential: "Средний", rating: 3.8, desc: "Готовая бизнес-модель.", why: "Популярность кофе.", pros: "Поддержка.", cons: "Роялти.", how: "Купите франшизу.", risks: "Зависимость." },
  { id: 8, name: "Сервис по ремонту гаджетов", category: "Услуги", capital: 12000, complexity: "Средняя", potential: "Высокий", rating: 4.3, desc: "Ремонт с выездом на дом.", why: "Дорогие устройства.", pros: "Низкий вход.", cons: "Навыки.", how: "Инструменты + реклама.", risks: "Повреждения." },
  { id: 9, name: "Аренда эксклюзивных авто", category: "Услуги", capital: 150000, complexity: "Высокая", potential: "Средний", rating: 3.5, desc: "Прокат премиум-класса.", why: "Статус.", pros: "Высокая маржа.", cons: "Обслуживание.", how: "Парк из 3 авто.", risks: "ДТП." },
  { id: 10, name: "Платформа для наставников", category: "IT", capital: 40000, complexity: "Средняя", potential: "Высокий", rating: 4.6, desc: "Связь менторов и учеников.", why: "Образование.", pros: "Комиссия.", cons: "Доверие.", how: "Сайт + модерация.", risks: "Мошенники." },
  { id: 11, name: "Фудтрак с азиатской кухней", category: "Еда", capital: 22000, complexity: "Средняя", potential: "Средний", rating: 4.1, desc: "Уличная еда в стиле стрит-фуд.", why: "Мобильность.", pros: "Гибкость.", cons: "Погода.", how: "Купите фудтрак.", risks: "Разрешения." },
  { id: 12, name: "Агентство по продвижению в соцсетях", category: "Онлайн-бизнес", capital: 5000, complexity: "Низкая", potential: "Высокий", rating: 4.4, desc: "SMM для малого бизнеса.", why: "Рост соцсетей.", pros: "Низкий старт.", cons: "Креатив.", how: "Портфолио.", risks: "Отток клиентов." },
  { id: 13, name: "Умный дом под ключ", category: "IT", capital: 35000, complexity: "Средняя", potential: "Средний", rating: 3.7, desc: "Интеграция систем умного дома.", why: "Автоматизация.", pros: "Дорого.", cons: "Сложность монтажа.", how: "Обучение.", risks: "Совместимость." },
  { id: 14, name: "Бистро здорового питания", category: "Еда", capital: 28000, complexity: "Средняя", potential: "Высокий", rating: 4.3, desc: "Блюда без глютена и сахара.", why: "Здоровье.", pros: "Целевая аудитория.", cons: "Цены.", how: "Аренда помещения.", risks: "Продукты." },
  { id: 15, name: "Консалтинг для стартапов", category: "Услуги", capital: 2000, complexity: "Низкая", potential: "Средний", rating: 3.9, desc: "Помощь в запуске.", why: "Много стартапов.", pros: "Экспертность.", cons: "Репутация.", how: "Сайт.", risks: "Нестабильность." },
  { id: 16, name: "Студия 3D-печати", category: "Производство", capital: 45000, complexity: "Средняя", potential: "Средний", rating: 4.0, desc: "Печать прототипов и сувениров.", why: "Технологии.", pros: "Индивидуальные заказы.", cons: "Материалы.", how: "Принтеры.", risks: "Поломка." },
  { id: 17, name: "Психологическая онлайн-платформа", category: "Онлайн-бизнес", capital: 20000, complexity: "Средняя", potential: "Высокий", rating: 4.8, desc: "Сессии с психологами.", why: "Рост тревожности.", pros: "Масштаб.", cons: "Сложность подбора.", how: "CRM.", risks: "Этика." },
  { id: 18, name: "Аренда спортивного инвентаря", category: "Услуги", capital: 10000, complexity: "Низкая", potential: "Средний", rating: 3.6, desc: "Велосипеды, лыжи, скейты.", why: "Активный отдых.", pros: "Сезонность.", cons: "Износ.", how: "Закупка.", risks: "Кражи." },
  { id: 19, name: "Мини-пекарня", category: "Еда", capital: 32000, complexity: "Средняя", potential: "Средний", rating: 4.2, desc: "Выпечка на заказ.", why: "Домашний уют.", pros: "Высокая маржа.", cons: "Ранний подъем.", how: "Оборудование.", risks: "Рецепты." },
  { id: 20, name: "Аренда коворкинга для творцов", category: "Недвижимость", capital: 80000, complexity: "Высокая", potential: "Средний", rating: 3.8, desc: "Студии для художников, музыкантов.", why: "Креативная экономика.", pros: "Сообщество.", cons: "Шум.", how: "Ремонт.", risks: "Низкий спрос." }
];

// ===== СОСТОЯНИЕ =====
let favorites = JSON.parse(localStorage.getItem('ideahub_favs')) || [];
let likes = JSON.parse(localStorage.getItem('ideahub_likes')) || {};
let currentCategory = 'all';
let currentSidebarTab = 'all';
let searchTerm = '';
let currentUser = null;
let currentIdeaComments = [];
let isModalOpen = false;
let currentCardElement = null;
let isRegisterMode = false;
let articles = [];

// ===== ХРАНИЛИЩЕ АККАУНТОВ =====
function getStoredAccounts() {
  return JSON.parse(localStorage.getItem('ideahub_accounts')) || [];
}
function saveStoredAccounts(accs) {
  localStorage.setItem('ideahub_accounts', JSON.stringify(accs));
}
function addStoredAccount(user) {
  const accs = getStoredAccounts();
  if (!accs.find(a => a.id === user.id)) {
    accs.push({
      id: user.id, email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'Пользователь',
      avatar: user.user_metadata?.avatar || ''
    });
    saveStoredAccounts(accs);
  }
}
function removeStoredAccount(userId) {
  saveStoredAccounts(getStoredAccounts().filter(a => a.id !== userId));
}

// ===== ТЕМЫ ОФОРМЛЕНИЯ =====
const presetThemes = [
  { id: 'default', name: 'Тёмная (по умолчанию)', bg: '#0b0d10', accent: '#00ffcc', interface: '#14181e', isDark: true },
  { id: 'midnight', name: 'Полночь', bg: '#0a0a1a', accent: '#6366f1', interface: '#12121f', isDark: true },
  { id: 'forest', name: 'Лес', bg: '#0a1410', accent: '#22c55e', interface: '#0f1f18', isDark: true },
  { id: 'sunset', name: 'Закат', bg: '#1a0a0f', accent: '#f97316', interface: '#1f1015', isDark: true },
  { id: 'ocean', name: 'Океан', bg: '#0a1015', accent: '#0ea5e9', interface: '#0f1820', isDark: true },
  { id: 'rose', name: 'Роза', bg: '#150a10', accent: '#f43f5e', interface: '#1c0f15', isDark: true },
  { id: 'light', name: 'Светлая', bg: '#f5f5f7', accent: '#00a896', interface: '#ffffff', isDark: false },
  { id: 'light-blue', name: 'Светлая голубая', bg: '#f0f5ff', accent: '#2563eb', interface: '#ffffff', isDark: false },
  { id: 'light-warm', name: 'Светлая тёплая', bg: '#fff8f0', accent: '#ea580c', interface: '#ffffff', isDark: false },
];

function getCustomThemes() {
  return JSON.parse(localStorage.getItem('ideahub_custom_themes')) || [];
}
function saveCustomThemes(themes) {
  localStorage.setItem('ideahub_custom_themes', JSON.stringify(themes));
}

function getCurrentTheme() {
  const id = localStorage.getItem('ideahub_active_theme') || 'default';
  const all = [...presetThemes, ...getCustomThemes()];
  return all.find(t => t.id === id) || presetThemes[0];
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty('--bg-color', theme.bg);
  root.style.setProperty('--accent-color', theme.accent);
  root.style.setProperty('--interface-color', theme.interface);
  root.style.setProperty('--modal-bg', theme.isDark
    ? `${theme.interface}d9`
    : `${theme.interface}f0`);
  root.style.setProperty('--card-bg', theme.isDark
    ? 'rgba(255,255,255,0.03)'
    : 'rgba(0,0,0,0.04)');
  root.style.setProperty('--card-border', theme.isDark
    ? 'rgba(255,255,255,0.05)'
    : 'rgba(0,0,0,0.08)');
  root.style.setProperty('--nav-bg', theme.isDark
    ? 'rgba(255,255,255,0.03)'
    : 'rgba(0,0,0,0.04)');
  root.style.setProperty('--nav-border', theme.isDark
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(0,0,0,0.1)');
  root.style.setProperty('--nav-text', theme.isDark
    ? 'rgba(255,255,255,0.6)'
    : 'rgba(0,0,0,0.5)');
  root.style.setProperty('--text-color', theme.isDark ? '#f0f2f5' : '#1a1a2e');

  // Орбы фона — цвета на основе акцента и фона темы
  root.style.setProperty('--orb1-color', theme.isDark ? shiftColor(theme.accent, -40) : shiftColor(theme.accent, 20));
  root.style.setProperty('--orb2-color', theme.accent);
  root.style.setProperty('--orb3-color', theme.isDark ? shiftColor(theme.interface, 30) : shiftColor(theme.accent, -20));
  root.style.setProperty('--orb1-opacity', theme.isDark ? '0.22' : '0.15');
  root.style.setProperty('--orb2-opacity', theme.isDark ? '0.22' : '0.12');
  root.style.setProperty('--orb3-opacity', theme.isDark ? '0.20' : '0.10');

  localStorage.setItem('ideahub_active_theme', theme.id);
}

function shiftColor(hex, amount) {
  let r = parseInt(hex.slice(1,3), 16) + amount;
  let g = parseInt(hex.slice(3,5), 16) + amount;
  let b = parseInt(hex.slice(5,7), 16) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
}

function renderThemes() {
  const grid = document.getElementById('themeGrid');
  if (!grid) return;
  const currentId = localStorage.getItem('ideahub_active_theme') || 'default';
  const custom = getCustomThemes();
  const all = [...presetThemes, ...custom];

  grid.innerHTML = all.map(t => {
    const isActive = t.id === currentId;
    const isCustom = custom.find(c => c.id === t.id);
    const textColor = t.isDark ? '#f0f2f5' : '#1a1a2e';
    const subText = t.isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
    return `
      <div class="theme-card ${isActive ? 'active' : ''}" data-theme-id="${t.id}">
        ${isCustom ? `<button class="theme-delete-btn" data-delete-theme="${t.id}"><i data-lucide="x" style="width:12px;height:12px;"></i></button>` : ''}
        <div class="theme-check"><i data-lucide="check" style="width:14px;height:14px;"></i></div>
        <div class="theme-preview" style="background:${t.bg}; color:${textColor};">
          <div class="theme-preview-accent-dot" style="background:${t.accent};"></div>
          <div class="theme-preview-bg" style="background:${t.interface};">
            <div class="theme-preview-mini-nav" style="background:${t.accent}; opacity:0.3;"></div>
            <div class="theme-preview-mini-card" style="background:${textColor}; opacity:0.15;"></div>
            <div class="theme-preview-mini-card" style="background:${textColor}; opacity:0.1; width:50%;"></div>
          </div>
          <div class="theme-name" style="color:${textColor};">${t.name}</div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();

  grid.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.theme-delete-btn')) return;
      const id = card.dataset.themeId;
      const theme = all.find(t => t.id === id);
      if (theme) {
        applyTheme(theme);
        renderThemes();
        showNotification(`Тема "${theme.name}" применена`);
      }
    });
  });

  grid.querySelectorAll('.theme-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.deleteTheme;
      saveCustomThemes(getCustomThemes().filter(t => t.id !== id));
      if (localStorage.getItem('ideahub_active_theme') === id) {
        applyTheme(presetThemes[0]);
      }
      renderThemes();
      showNotification('Тема удалена');
    });
  });
}

// ===== УВЕДОМЛЕНИЯ =====
function showNotification(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  let iconName = type === 'error' ? 'alert-circle' : 'check-circle';
  let iconColor = type === 'error' ? '#ff4d4d' : 'var(--accent-color)';
  toast.innerHTML = `
    <i data-lucide="${iconName}" style="color: ${iconColor};"></i>
    <div class="toast-content">${message}</div>
    <button class="toast-close"><i data-lucide="x" style="width:18px;height:18px;"></i></button>
    <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
  `;
  container.appendChild(toast);
  if(window.lucide) lucide.createIcons({root: toast});
  setTimeout(() => toast.classList.add('show'), 10);
  let timeout = setTimeout(() => closeToast(toast), duration);
  toast.querySelector('.toast-close').onclick = () => { clearTimeout(timeout); closeToast(toast); };
}
function closeToast(toast) { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }

function translateError(msg) {
  const t = {
    "Invalid login credentials": "Неверный логин или пароль",
    "Email not confirmed": "Подтвердите электронную почту",
    "User already registered": "Пользователь с таким email уже существует",
    "Password should be at least 6 characters": "Пароль должен быть не менее 6 символов"
  };
  return t[msg] || msg;
}

async function recordView(type, itemId) {
  if (!currentUser) return;
  const key = `ideahub_views_${currentUser.id}`;
  let views = JSON.parse(localStorage.getItem(key)) || { ideas: 0, articles: 0 };
  views[type] = (views[type] || 0) + 1;
  localStorage.setItem(key, JSON.stringify(views));

  const profileId = await getCurrentProfileId();
  if (!profileId) return;
  try {
    if (type === 'ideas') await supabaseClient.from('views_ideas').insert({ id_profile: profileId, id_idea: itemId });
    else if (type === 'articles') await supabaseClient.from('views_articles').insert({ id_profile: profileId, id_article: itemId });
  } catch (e) { console.error('Ошибка записи просмотра:', e); }
}

// =======================================================================
// ВКЛАДКИ ВЕРХНЕЙ ПАНЕЛИ
// =======================================================================
const navTabs = document.querySelectorAll('.nav-tab');
const navIndicator = document.getElementById('navIndicator');
const tabContents = document.querySelectorAll('.tab-content');
let lastIndicatorX = 0;

function moveIndicator(tabEl) {
  if (!tabEl || !navIndicator) return;
  const isInitial = navIndicator.style.width === '0px' || !navIndicator.style.width;
  if (!isInitial) {
    const targetX = tabEl.offsetLeft;
    const direction = targetX > lastIndicatorX ? 1 : -1;
    navIndicator.classList.add('is-moving');
    navIndicator.dataset.dir = direction > 0 ? '1' : '-1';
    navIndicator.style.width = `${tabEl.offsetWidth + 4}px`;
    navIndicator.style.transform = `translateX(${tabEl.offsetLeft - 2}px)`;
    clearTimeout(navIndicator.moveTimeout);
    navIndicator.moveTimeout = setTimeout(() => {
      navIndicator.style.width = `${tabEl.offsetWidth}px`;
      navIndicator.style.transform = `translateX(${tabEl.offsetLeft}px)`;
      navIndicator.classList.remove('is-moving');
      lastIndicatorX = tabEl.offsetLeft;
    }, 180);
  } else {
    navIndicator.style.width = `${tabEl.offsetWidth}px`;
    navIndicator.style.transform = `translateX(${tabEl.offsetLeft}px)`;
    lastIndicatorX = tabEl.offsetLeft;
  }
}

function switchTab(tabName) {
  navTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  tabContents.forEach(c => { c.style.display = c.id === `${tabName}-tab` ? '' : 'none'; });
  const activeTab = Array.from(navTabs).find(t => t.dataset.tab === tabName);
  moveIndicator(activeTab);
  // Меняем фон в зависимости от вкладки
  document.body.className = document.body.className.replace(/\bbg-\w+/g, '').trim();
  document.body.classList.add(`bg-${tabName}`);
  if (tabName === 'articles') renderArticles();
  if (tabName === 'ideas') { renderCards(); moveSidebarIndicator(); }
}

navTabs.forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));

window.addEventListener('resize', () => {
  const active = document.querySelector('.nav-tab.active');
  if (active) moveIndicator(active);
  moveSidebarIndicator();
  moveSettingsIndicator();
});

// =======================================================================
// ВЕРТИКАЛЬНЫЙ САЙДБАР (ВКЛАДКА "ИДЕИ")
// =======================================================================
const sidebarTabs = document.querySelectorAll('.sidebar-tab');
const sidebarIndicator = document.getElementById('sidebarIndicator');
let lastSidebarY = 0;

function moveSidebarIndicator(tabEl) {
  if (!tabEl) {
    tabEl = document.querySelector('.sidebar-tab.active');
  }
  if (!tabEl || !sidebarIndicator) return;

  const sidebarTabsEl = document.getElementById('sidebarTabs');
  const isRow = sidebarTabsEl && getComputedStyle(sidebarTabsEl).flexDirection === 'row';

  if (isRow) {
    // Горизонтальный режим (мобильная капсула): двигаем по X, ширина = ширине кнопки
    const targetX = tabEl.offsetLeft;
    const direction = targetX > lastSidebarY ? 1 : -1;
    const isInitial = sidebarIndicator.style.width === '0px' || !sidebarIndicator.style.width;
    sidebarIndicator.style.height = '';
    if (!isInitial) {
      sidebarIndicator.classList.add('is-moving');
      sidebarIndicator.dataset.dir = direction > 0 ? '1' : '-1';
      sidebarIndicator.style.width = `${tabEl.offsetWidth + 4}px`;
      sidebarIndicator.style.transform = `translateX(${tabEl.offsetLeft - 2}px)`;
      clearTimeout(sidebarIndicator.moveTimeout);
      sidebarIndicator.moveTimeout = setTimeout(() => {
        sidebarIndicator.style.width = `${tabEl.offsetWidth}px`;
        sidebarIndicator.style.transform = `translateX(${tabEl.offsetLeft}px)`;
        sidebarIndicator.classList.remove('is-moving');
        lastSidebarY = tabEl.offsetLeft;
      }, 180);
    } else {
      sidebarIndicator.style.width = `${tabEl.offsetWidth}px`;
      sidebarIndicator.style.transform = `translateX(${tabEl.offsetLeft}px)`;
      lastSidebarY = tabEl.offsetLeft;
    }
    return;
  }

  // Вертикальный режим (десктоп)
  const isInitial = sidebarIndicator.style.height === '0px' || !sidebarIndicator.style.height;
  sidebarIndicator.style.width = '';
  if (!isInitial) {
    const targetY = tabEl.offsetTop;
    const direction = targetY > lastSidebarY ? 1 : -1;
    sidebarIndicator.classList.add('is-moving');
    sidebarIndicator.dataset.dir = direction > 0 ? '1' : '-1';
    sidebarIndicator.style.height = `${tabEl.offsetHeight + 4}px`;
    sidebarIndicator.style.transform = `translateY(${tabEl.offsetTop - 2}px)`;
    clearTimeout(sidebarIndicator.moveTimeout);
    sidebarIndicator.moveTimeout = setTimeout(() => {
      sidebarIndicator.style.height = `${tabEl.offsetHeight}px`;
      sidebarIndicator.style.transform = `translateY(${tabEl.offsetTop}px)`;
      sidebarIndicator.classList.remove('is-moving');
      lastSidebarY = tabEl.offsetTop;
    }, 180);
  } else {
    sidebarIndicator.style.height = `${tabEl.offsetHeight}px`;
    sidebarIndicator.style.transform = `translateY(${tabEl.offsetTop}px)`;
    lastSidebarY = tabEl.offsetTop;
  }
}

window.addEventListener('resize', () => {
  const active = document.querySelector('.sidebar-tab.active');
  if (active) {
    sidebarIndicator.style.width = '';
    sidebarIndicator.style.height = '';
    moveSidebarIndicator(active);
  }
});

function switchSidebarTab(tabName) {
  sidebarTabs.forEach(t => t.classList.toggle('active', t.dataset.sideTab === tabName));
  currentSidebarTab = tabName;
  const active = Array.from(sidebarTabs).find(t => t.dataset.sideTab === tabName);
  moveSidebarIndicator(active);
  renderCards();
}

sidebarTabs.forEach(tab => tab.addEventListener('click', () => switchSidebarTab(tab.dataset.sideTab)));

// =======================================================================
// АВТОРИЗАЦИЯ
// =======================================================================
const authModal = document.getElementById('authModal');
const authBtn = document.getElementById('authBtn');
const navAvatarBtn = document.getElementById('navAvatarBtn');
const closeAuthBtn = document.getElementById('closeAuth');
const authForm = document.getElementById('authForm');
const authErrorMsg = document.getElementById('authErrorMsg');
const modalTitle = document.getElementById('modalTitle');
const modalSub = document.getElementById('modalSub');
const nameFieldGroup = document.getElementById('nameFieldGroup');
const authNameInput = document.getElementById('authName');
const authEmailInput = document.getElementById('authEmail');
const authPasswordInput = document.getElementById('authPassword');
const submitAuthBtn = document.getElementById('submitAuthBtn');
const toggleAuthText = document.getElementById('toggleAuthText');
const toggleAuthLink = document.getElementById('toggleAuthLink');

function openAuthModal() { authErrorMsg.style.display = 'none'; authModal.classList.add('active'); }
function closeAuthModal() {
  authModal.classList.remove('active');
  setTimeout(() => { authForm?.reset(); authErrorMsg.style.display = 'none'; }, 300);
}
function setAuthMode(registerMode) {
  isRegisterMode = registerMode;
  authErrorMsg.style.display = 'none';
  if (registerMode) {
    modalTitle.textContent = 'Регистрация';
    modalSub.textContent = 'Создайте аккаунт, чтобы сохранять идеи и оставлять комментарии';
    nameFieldGroup.style.display = 'block';
    submitAuthBtn.textContent = 'Создать аккаунт';
    toggleAuthText.textContent = 'Уже есть аккаунт?';
    toggleAuthLink.textContent = 'Войти';
  } else {
    modalTitle.textContent = 'Вход в систему';
    modalSub.textContent = 'Введите данные для доступа к IdeaHub';
    nameFieldGroup.style.display = 'none';
    submitAuthBtn.textContent = 'Войти';
    toggleAuthText.textContent = 'Ещё нет аккаунта?';
    toggleAuthLink.textContent = 'Создать';
  }
}

function updateAuthButton() {
  const mobileAvatar = document.getElementById('mobileProfileAvatar');
  if (currentUser) {
    authBtn.style.display = 'none';
    navAvatarBtn.style.display = 'block';
    const name = currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'User';
    const avatarUrl = currentUser.user_metadata?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00ffcc&color=0b0d10&bold=true`;
    navAvatarBtn.src = avatarUrl;
    if (mobileAvatar) mobileAvatar.src = avatarUrl;
  } else {
    authBtn.style.display = 'block';
    navAvatarBtn.style.display = 'none';
    if (mobileAvatar) mobileAvatar.src = 'https://ui-avatars.com/api/?name=User&background=00ffcc&color=0b0d10&bold=true';
  }
}

authBtn?.addEventListener('click', () => { setAuthMode(false); openAuthModal(); });
closeAuthBtn?.addEventListener('click', closeAuthModal);
authModal?.addEventListener('click', (e) => { if (e.target === authModal) closeAuthModal(); });
toggleAuthLink?.addEventListener('click', (e) => { e.preventDefault(); setAuthMode(!isRegisterMode); });

authForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  authErrorMsg.style.display = 'none';
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  if (!email || !email.includes('@') || !email.includes('.')) {
    showNotification('Пожалуйста, введите корректный email-адрес', 'error'); authEmailInput.focus(); return;
  }
  if (!password || password.length < 6) {
    showNotification('Пароль должен быть не менее 6 символов', 'error'); authPasswordInput.focus(); return;
  }
  if (isRegisterMode) {
    const name = authNameInput.value;
    const result = await signUp(email, password, name);
    if (result) closeAuthModal();
  } else {
    const result = await signIn(email, password);
    if (result) closeAuthModal();
  }
});

async function signUp(email, password, name) {
  try {
    const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { data: { name } } });
    if (error) throw error;
    showNotification('Аккаунт создан! Проверьте почту для подтверждения.');
    return data;
  } catch (error) { showNotification(translateError(error.message), 'error'); return null; }
}

async function signIn(email, password) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    showNotification('Добро пожаловать!');
    await updateUserUI(); renderCards();
    // Сохраняем refresh_token для быстрого переключения
    if (data.session?.refresh_token && currentUser) {
      localStorage.setItem(`ideahub_refresh_${currentUser.id}`, data.session.refresh_token);
    }
    return data;
  } catch (error) { showNotification(translateError(error.message), 'error'); return null; }
}

async function signOut() {
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    currentUser = null; currentProfileId = null; await updateUserUI(); renderCards();
    showNotification('Вы вышли из аккаунта');
  } catch (error) { showNotification(translateError(error.message), 'error'); }
}

let currentProfileId = null;

async function ensureProfile(user) {
  if (!user) return;
  const { data: existing } = await supabaseClient
    .from('profiles').select('id').eq('auth_id', user.id).maybeSingle();
  if (existing) { currentProfileId = existing.id; return; }
  const { data: newProfile, error } = await supabaseClient
    .from('profiles')
    .insert({ auth_id: user.id, username: user.user_metadata?.name || user.email?.split('@')[0] || 'User' })
    .select().single();
  if (!error && newProfile) {
    currentProfileId = newProfile.id;
    await supabaseClient.from('profiles_statistic').insert({
      id_profile: newProfile.id, stat_up: 0, stat_comments: 0, stat_old: 0,
      stat_views_ideas: 0, stat_views_articles: 0
    });
  }
}

async function getCurrentProfileId() {
  if (currentProfileId) return currentProfileId;
  await ensureProfile(currentUser);
  return currentProfileId;
}

async function updateUserUI() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  currentUser = user;
  await ensureProfile(user);
  updateAuthButton();
  if (user) addStoredAccount(user);
}

// =======================================================================
// ПРОФИЛЬ
// =======================================================================
const userProfileModal = document.getElementById('userProfileModal');
const profileLogoutBtn = document.getElementById('profileLogoutBtn');
const accSwitchBtn = document.getElementById('accSwitchBtn');
const accSwitchMenu = document.getElementById('accSwitchMenu');
const accSwitchIcon = document.getElementById('accSwitchIcon');
const accDropdownList = document.getElementById('accDropdownList');
const addAccountBtn = document.getElementById('addAccountBtn');
const openSettingsBtn = document.getElementById('openSettingsBtn');

async function loadProfileStats() {
  if (!currentUser) return;
  const created = new Date(currentUser.created_at);
  const diffDays = Math.max(1, Math.ceil(Math.abs(Date.now() - created) / (1000 * 60 * 60 * 24)));
  document.getElementById('statAge').textContent = `${diffDays} дн.`;
  const views = JSON.parse(localStorage.getItem(`ideahub_views_${currentUser.id}`)) || { ideas: 0, articles: 0 };
  document.getElementById('statIdeas').textContent = views.ideas;
  document.getElementById('statArticles').textContent = views.articles;
  try {
    const { count: upvotesCount } = await supabaseClient.from('likes').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id);
    const { count: commentsCount } = await supabaseClient.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id);
    document.getElementById('statUpvotes').textContent = upvotesCount || 0;
    document.getElementById('statComments').textContent = commentsCount || 0;
  } catch (err) { console.error("Ошибка загрузки статистики БД:", err); }
}

function renderAccountsDropdown() {
  if (!accDropdownList) return;
  const accs = getStoredAccounts();
  if (!currentUser) { accDropdownList.innerHTML = '<div class="acc-dropdown-empty">Войдите в аккаунт</div>'; return; }
  const otherAccs = accs.filter(a => a.id !== currentUser.id);
  let html = '';
  const curName = currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Пользователь';
  const curAvatar = currentUser.user_metadata?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(curName)}&background=00ffcc&color=0b0d10&bold=true`;
  html += `<div class="acc-dropdown-item active-account" data-acc-id="${currentUser.id}"><img src="${curAvatar}" alt=""><div class="acc-item-info"><span class="acc-item-name">${curName}</span><span class="acc-item-email">${currentUser.email}</span></div><i data-lucide="check" style="width:18px;height:18px;color:var(--accent-color);flex-shrink:0;"></i></div>`;
  otherAccs.forEach(a => {
    const avatar = a.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name)}&background=00ffcc&color=0b0d10&bold=true`;
    html += `<div class="acc-dropdown-item" data-acc-id="${a.id}"><img src="${avatar}" alt=""><div class="acc-item-info"><span class="acc-item-name">${a.name}</span><span class="acc-item-email">${a.email}</span></div><button class="acc-remove-btn" data-remove-id="${a.id}" title="Убрать"><i data-lucide="x"></i></button></div>`;
  });
  accDropdownList.innerHTML = html;
  if (window.lucide) lucide.createIcons();
  accDropdownList.querySelectorAll('.acc-dropdown-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      if (e.target.closest('.acc-remove-btn')) return;
      const accId = item.dataset.accId;
      if (accId === currentUser.id) return;
      const acc = accs.find(a => a.id === accId);
      if (!acc) return;
      // Быстрый переход: пробуем войти без пароля через сохранённую сессию
      await quickSwitchAccount(acc);
    });
  });
  accDropdownList.querySelectorAll('.acc-remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeStoredAccount(btn.dataset.removeId);
      renderAccountsDropdown();
      showNotification('Аккаунт убран из списка');
    });
  });
}

function openAccDropdown() { renderAccountsDropdown(); accSwitchMenu.classList.add('open'); if (accSwitchIcon) accSwitchIcon.style.transform = 'rotate(180deg)'; }
function closeAccDropdown() { accSwitchMenu?.classList.remove('open'); if (accSwitchIcon) accSwitchIcon.style.transform = 'rotate(0deg)'; }

async function quickSwitchAccount(acc) {
  // Пробуем восстановить сессию через setSession с сохранённым refresh_token
  const tokenKey = `ideahub_refresh_${acc.id}`;
  const refreshToken = localStorage.getItem(tokenKey);
  if (refreshToken) {
    try {
      const { data, error } = await supabaseClient.auth.setSession({ refresh_token: refreshToken });
      if (!error && data.user) {
        currentUser = data.user;
        currentProfileId = null;
        addStoredAccount(currentUser);
        await updateUserUI();
        await loadUserData();
        renderCards();
        showNotification(`Переключились на ${acc.name}`);
        userProfileModal.classList.remove('active');
        closeAccDropdown();
        return;
      }
    } catch (e) { /* fall through to login */ }
  }
  // Нет сохранённой сессии — открываем окно входа с предзаполненным email
  showNotification(`Войдите в аккаунт ${acc.email}`, 'error');
  userProfileModal.classList.remove('active'); closeAccDropdown();
  setAuthMode(false); openAuthModal();
  if (authEmailInput) authEmailInput.value = acc.email;
}

function openUserProfileModal() {
  if (!currentUser) { openAuthModal(); return; }
  const name = currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Пользователь';
  const avatarUrl = currentUser.user_metadata?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00ffcc&color=0b0d10&bold=true`;
  document.getElementById('profileModalName').textContent = name;
  document.getElementById('profileModalEmail').textContent = currentUser.email;
  document.getElementById('profileModalAvatar').src = avatarUrl;
  userProfileModal.classList.add('active'); closeAccDropdown();
  if (window.lucide) lucide.createIcons();
  loadProfileStats();
}

navAvatarBtn?.addEventListener('click', openUserProfileModal);

document.getElementById('userProfileClose')?.addEventListener('click', () => { userProfileModal.classList.remove('active'); closeAccDropdown(); });
document.getElementById('userProfileBackdrop')?.addEventListener('click', () => { userProfileModal.classList.remove('active'); closeAccDropdown(); });

accSwitchBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (accSwitchMenu.classList.contains('open')) closeAccDropdown(); else openAccDropdown();
});

document.addEventListener('click', (e) => {
  if (!accSwitchMenu?.classList.contains('open')) return;
  if (!e.target.closest('.account-switch-wrapper')) closeAccDropdown();
});

addAccountBtn?.addEventListener('click', () => {
  userProfileModal.classList.remove('active'); closeAccDropdown();
  setAuthMode(false); openAuthModal();
});

profileLogoutBtn?.addEventListener('click', () => {
  userProfileModal.classList.remove('active'); closeAccDropdown(); signOut();
});

// =======================================================================
// ОКНО НАСТРОЕК
// =======================================================================
const settingsModal = document.getElementById('settingsModal');
const settingsCloseBtn = document.getElementById('settingsCloseBtn');
const settingsBackdrop = document.getElementById('settingsBackdrop');
const settingsTabs = document.querySelectorAll('[data-settings-tab]');
const settingsIndicator = document.getElementById('settingsIndicator');
let lastSettingsX = 0;

function moveSettingsIndicator(tabEl) {
  if (!tabEl || !settingsIndicator) return;
  const isInitial = settingsIndicator.style.width === '0px' || !settingsIndicator.style.width;
  if (!isInitial) {
    const targetX = tabEl.offsetLeft;
    const direction = targetX > lastSettingsX ? 1 : -1;
    settingsIndicator.classList.add('is-moving');
    settingsIndicator.dataset.dir = direction > 0 ? '1' : '-1';
    settingsIndicator.style.width = `${tabEl.offsetWidth + 4}px`;
    settingsIndicator.style.transform = `translateX(${tabEl.offsetLeft - 2}px)`;
    clearTimeout(settingsIndicator.moveTimeout);
    settingsIndicator.moveTimeout = setTimeout(() => {
      settingsIndicator.style.width = `${tabEl.offsetWidth}px`;
      settingsIndicator.style.transform = `translateX(${tabEl.offsetLeft}px)`;
      settingsIndicator.classList.remove('is-moving');
      lastSettingsX = tabEl.offsetLeft;
    }, 180);
  } else {
    settingsIndicator.style.width = `${tabEl.offsetWidth}px`;
    settingsIndicator.style.transform = `translateX(${tabEl.offsetLeft}px)`;
    lastSettingsX = tabEl.offsetLeft;
  }
}

function switchSettingsTab(tabName) {
  settingsTabs.forEach(t => t.classList.toggle('active', t.dataset.settingsTab === tabName));
  document.querySelectorAll('.settings-panel').forEach(p => {
    p.style.display = p.id === `settings-${tabName}` ? 'block' : 'none';
  });
  const active = Array.from(settingsTabs).find(t => t.dataset.settingsTab === tabName);
  moveSettingsIndicator(active);
  if (tabName === 'personalization') renderThemes();
}

settingsTabs.forEach(tab => tab.addEventListener('click', () => switchSettingsTab(tab.dataset.settingsTab)));

openSettingsBtn?.addEventListener('click', () => {
  userProfileModal.classList.remove('active');
  settingsModal.classList.add('active');
  switchSettingsTab('general');
  if (window.lucide) lucide.createIcons();
  // Заполняем поля
  if (currentUser) {
    const name = currentUser.user_metadata?.name || '';
    document.getElementById('settingsNameInput').value = name;
    document.getElementById('settingsEmailInput').value = currentUser.email || '';
  }
});

settingsCloseBtn?.addEventListener('click', () => settingsModal.classList.remove('active'));
settingsBackdrop?.addEventListener('click', () => settingsModal.classList.remove('active'));

// Save name
document.getElementById('settingsNameInput')?.addEventListener('change', async (e) => {
  if (!currentUser) return;
  try {
    const { data, error } = await supabaseClient.auth.updateUser({ data: { name: e.target.value } });
    if (error) throw error;
    currentUser = data.user;
    updateAuthButton();
    addStoredAccount(currentUser);
    showNotification('Имя обновлено');
  } catch (err) { showNotification('Ошибка обновления имени', 'error'); }
});

// Clear cache
document.getElementById('clearCacheBtn')?.addEventListener('click', () => {
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith('ideahub_views_')) localStorage.removeItem(k);
  });
  showNotification('Кэш очищен');
});

// Custom theme builder — sync color pickers with text inputs
function syncColorPicker(pickerId, textId) {
  const picker = document.getElementById(pickerId);
  const text = document.getElementById(textId);
  if (!picker || !text) return;
  picker.addEventListener('input', () => text.value = picker.value);
  text.addEventListener('input', () => {
    if (/^#[0-9a-fA-F]{6}$/.test(text.value)) picker.value = text.value;
  });
}
syncColorPicker('customBgColor', 'customBgText');
syncColorPicker('customAccentColor', 'customAccentText');
syncColorPicker('customInterfaceColor', 'customInterfaceText');

document.getElementById('saveCustomThemeBtn')?.addEventListener('click', () => {
  const bg = document.getElementById('customBgText').value;
  const accent = document.getElementById('customAccentText').value;
  const interfaceC = document.getElementById('customInterfaceText').value;
  const name = document.getElementById('customThemeName').value.trim() || 'Своя тема';
  if (!/^#[0-9a-fA-F]{6}$/.test(bg) || !/^#[0-9a-fA-F]{6}$/.test(accent) || !/^#[0-9a-fA-F]{6}$/.test(interfaceC)) {
    showNotification('Неверный формат цвета', 'error'); return;
  }
  const isDark = !isLightColor(bg);
  const id = 'custom_' + Date.now();
  const theme = { id, name, bg, accent, interface: interfaceC, isDark };
  const custom = getCustomThemes();
  custom.push(theme);
  saveCustomThemes(custom);
  applyTheme(theme);
  renderThemes();
  showNotification(`Тема "${name}" сохранена и применена`);
  document.getElementById('customThemeName').value = '';
});

function isLightColor(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 128;
}

// =======================================================================
// CROP АВАТАРКИ
// =======================================================================
const cropModal = document.getElementById('cropModal');
const avatarUpload = document.getElementById('avatarUpload');
const cropCanvas = document.getElementById('cropCanvas');
const ctx = cropCanvas?.getContext('2d');
const applyCropBtn = document.getElementById('applyCropBtn');
const cropZoom = document.getElementById('cropZoom');
let currentUploadImage = null;
let cropOffsetX = 0, cropOffsetY = 0, isDraggingCrop = false, startDragX = 0, startDragY = 0;

document.getElementById('changeAvatarBtn')?.addEventListener('click', () => avatarUpload.click());

avatarUpload?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      currentUploadImage = new Image();
      currentUploadImage.onload = () => {
        cropZoom.value = 1; cropOffsetX = 0; cropOffsetY = 0;
        cropModal.classList.add('active'); drawCrop();
      };
      currentUploadImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});

function handleDragStart(x, y) { isDraggingCrop = true; startDragX = x - cropOffsetX; startDragY = y - cropOffsetY; }
function handleDragMove(x, y) { if (!isDraggingCrop) return; cropOffsetX = x - startDragX; cropOffsetY = y - startDragY; drawCrop(); }
function handleDragEnd() { isDraggingCrop = false; }

cropCanvas?.addEventListener('mousedown', (e) => handleDragStart(e.clientX, e.clientY));
cropCanvas?.addEventListener('mousemove', (e) => handleDragMove(e.clientX, e.clientY));
window.addEventListener('mouseup', handleDragEnd);
cropCanvas?.addEventListener('touchstart', (e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY));
cropCanvas?.addEventListener('touchmove', (e) => { e.preventDefault(); handleDragMove(e.touches[0].clientX, e.touches[0].clientY); });
window.addEventListener('touchend', handleDragEnd);

function drawCrop() {
  if (!currentUploadImage || !ctx) return;
  const zoom = parseFloat(cropZoom.value);
  const size = 300;
  cropCanvas.width = size; cropCanvas.height = size;
  const sw = currentUploadImage.width * zoom, sh = currentUploadImage.height * zoom;
  ctx.clearRect(0,0,size,size);
  ctx.drawImage(currentUploadImage, 0, 0, currentUploadImage.width, currentUploadImage.height, (size-sw)/2+cropOffsetX, (size-sh)/2+cropOffsetY, sw, sh);
}

cropZoom?.addEventListener('input', drawCrop);
document.getElementById('cancelCropBtn')?.addEventListener('click', () => { cropModal.classList.remove('active'); avatarUpload.value = ''; });

applyCropBtn?.addEventListener('click', async () => {
  if (!currentUser) return;
  const base64Avatar = cropCanvas.toDataURL('image/jpeg', 0.8);
  applyCropBtn.textContent = 'Сохранение...';
  try {
    const { data, error } = await supabaseClient.auth.updateUser({ data: { avatar: base64Avatar } });
    if (error) throw error;
    showNotification("Аватар успешно обновлён!");
    currentUser = data.user; updateAuthButton();
    addStoredAccount(currentUser);
    const accs = getStoredAccounts();
    const idx = accs.findIndex(a => a.id === currentUser.id);
    if (idx >= 0) { accs[idx].avatar = base64Avatar; saveStoredAccounts(accs); }
    document.getElementById('profileModalAvatar').src = base64Avatar;
    cropModal.classList.remove('active');
  } catch (err) { showNotification("Ошибка обновления аватара", "error"); }
  finally { applyCropBtn.textContent = 'Применить'; avatarUpload.value = ''; }
});

// =======================================================================
// КОММЕНТАРИИ
// =======================================================================
async function loadComments(targetId, type = 'idea') {
  try {
    const column = type === 'article' ? 'id_article' : 'id_idea';
    const { data, error } = await supabaseClient
      .from('comments')
      .select('*, profiles(username)')
      .eq(column, targetId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    currentIdeaComments = data || [];
    return currentIdeaComments;
  } catch (error) { console.error('Ошибка загрузки комментариев:', error); return []; }
}

async function addComment(targetId, text, type = 'idea') {
  if (!currentUser) { showNotification('Войдите, чтобы оставить комментарий', 'error'); return null; }
  const profileId = await getCurrentProfileId();
  if (!profileId) { showNotification('Ошибка профиля, перезайдите в аккаунт', 'error'); return null; }
  try {
    const payload = { id_profile: profileId, text };
    if (type === 'article') payload.id_article = targetId; else payload.id_idea = targetId;
    const { data, error } = await supabaseClient.from('comments').insert(payload).select();
    if (error) throw error;
    showNotification('Комментарий добавлен');
    return data;
  } catch (error) { showNotification(translateError(error.message), 'error'); return null; }
}

// =======================================================================
// ЛАЙКИ И ИЗБРАННОЕ
// =======================================================================
let myUpvotedIdeas = new Set();

async function toggleLikeSupabase(ideaId) {
  if (!currentUser) { showNotification('Войдите, чтобы оценить идею', 'error'); return false; }
  const profileId = await getCurrentProfileId();
  if (!profileId) return false;
  try {
    const { data: existing } = await supabaseClient.from('upvotes_ideas')
      .select('id').eq('id_idea', ideaId).eq('id_profile', profileId).maybeSingle();
    if (existing) {
      await supabaseClient.from('upvotes_ideas').delete().eq('id', existing.id);
      myUpvotedIdeas.delete(ideaId);
      likes[ideaId] = Math.max((likes[ideaId] || 1) - 1, 0);
    } else {
      await supabaseClient.from('upvotes_ideas').insert({ id_idea: ideaId, id_profile: profileId });
      myUpvotedIdeas.add(ideaId);
      likes[ideaId] = (likes[ideaId] || 0) + 1;
    }
    localStorage.setItem('ideahub_likes', JSON.stringify(likes));
    renderCards();
    return true;
  } catch (error) { console.error('Ошибка с лайком:', error); showNotification('Ошибка при оценке', 'error'); return false; }
}

async function toggleFavSupabase(ideaId) {
  if (!currentUser) { showNotification('Войдите, чтобы добавить в избранное', 'error'); return false; }
  const profileId = await getCurrentProfileId();
  if (!profileId) return false;
  try {
    const { data: existing } = await supabaseClient.from('favorites_ideas')
      .select('id').eq('id_idea', ideaId).eq('id_profile', profileId).maybeSingle();
    if (existing) {
      await supabaseClient.from('favorites_ideas').delete().eq('id', existing.id);
      favorites = favorites.filter(id => id !== ideaId);
    } else {
      await supabaseClient.from('favorites_ideas').insert({ id_idea: ideaId, id_profile: profileId });
      if (!favorites.includes(ideaId)) favorites.push(ideaId);
    }
    localStorage.setItem('ideahub_favs', JSON.stringify(favorites));
    renderCards();
    return true;
  } catch (error) { console.error('Ошибка с избранным:', error); showNotification('Ошибка при сохранении', 'error'); return false; }
}

async function loadLikeCounts() {
  try {
    const { data } = await supabaseClient.from('upvotes_ideas').select('id_idea');
    const counts = {};
    (data || []).forEach(r => { counts[r.id_idea] = (counts[r.id_idea] || 0) + 1; });
    likes = counts;
    localStorage.setItem('ideahub_likes', JSON.stringify(likes));
  } catch (e) { console.error('Ошибка загрузки лайков:', e); }
}

let myUpvotedArticles = new Set();
let favoriteArticles = [];

async function toggleLikeArticleSupabase(articleId) {
  if (!currentUser) { showNotification('Войдите, чтобы оценить статью', 'error'); return false; }
  const profileId = await getCurrentProfileId();
  if (!profileId) return false;
  try {
    const { data: existing } = await supabaseClient.from('upvotes_articles')
      .select('id').eq('id_article', articleId).eq('id_profile', profileId).maybeSingle();
    if (existing) {
      await supabaseClient.from('upvotes_articles').delete().eq('id', existing.id);
      myUpvotedArticles.delete(articleId);
    } else {
      await supabaseClient.from('upvotes_articles').insert({ id_article: articleId, id_profile: profileId });
      myUpvotedArticles.add(articleId);
    }
    return true;
  } catch (error) { console.error('Ошибка с лайком статьи:', error); showNotification('Ошибка при оценке', 'error'); return false; }
}

async function toggleFavArticleSupabase(articleId) {
  if (!currentUser) { showNotification('Войдите, чтобы добавить в избранное', 'error'); return false; }
  const profileId = await getCurrentProfileId();
  if (!profileId) return false;
  try {
    const { data: existing } = await supabaseClient.from('favorites_articles')
      .select('id').eq('id_article', articleId).eq('id_profile', profileId).maybeSingle();
    if (existing) {
      await supabaseClient.from('favorites_articles').delete().eq('id', existing.id);
      favoriteArticles = favoriteArticles.filter(id => id !== articleId);
    } else {
      await supabaseClient.from('favorites_articles').insert({ id_article: articleId, id_profile: profileId });
      if (!favoriteArticles.includes(articleId)) favoriteArticles.push(articleId);
    }
    return true;
  } catch (error) { console.error('Ошибка с избранным статьи:', error); showNotification('Ошибка при сохранении', 'error'); return false; }
}

async function loadUserData() {
  try {
    await loadLikeCounts();
    if (!currentUser) return;
    const profileId = await getCurrentProfileId();
    if (!profileId) return;
    const { data: favData } = await supabaseClient.from('favorites_ideas').select('id_idea').eq('id_profile', profileId);
    favorites = (favData || []).map(f => f.id_idea);
    localStorage.setItem('ideahub_favs', JSON.stringify(favorites));
    const { data: likeData } = await supabaseClient.from('upvotes_ideas').select('id_idea').eq('id_profile', profileId);
    myUpvotedIdeas = new Set((likeData || []).map(l => l.id_idea));
    const { data: favArtData } = await supabaseClient.from('favorites_articles').select('id_article').eq('id_profile', profileId);
    favoriteArticles = (favArtData || []).map(f => f.id_article);
    const { data: likeArtData } = await supabaseClient.from('upvotes_articles').select('id_article').eq('id_profile', profileId);
    myUpvotedArticles = new Set((likeArtData || []).map(l => l.id_article));
  } catch (error) { console.error('Ошибка загрузки данных:', error); }
}

// =======================================================================
// КАТАЛОГ ИДЕЙ
// =======================================================================
const cardsGrid = document.getElementById('cardsGrid');
const ideasSearchInput = document.getElementById('ideasSearch');
const searchClearBtn = document.getElementById('searchClear');
const filterToggleBtn = document.getElementById('filterToggleBtn');
const filterPanel = document.getElementById('filterPanel');
const categoryFilters = document.getElementById('categoryFilters');
let filterPanelOpen = false;

function renderIdeaCard(idea, rank) {
  const isFav = favorites.includes(idea.id);
  const likeCount = likes[idea.id] || 0;
  const hasLiked = myUpvotedIdeas.has(idea.id);

  const rankBadge = rank ? `<div class="card-rank rank-${rank}">${rank}</div>` : '';
  return `
    <div class="glass-card" data-id="${idea.id}">
      ${rankBadge}
      <span class="card-badge">${idea.category}</span>
      
      <div style="position: absolute; top: 1rem; right: 1rem; display: flex; gap: 8px; flex-direction: column;">
          <button class="card-favorite ${isFav ? 'active' : ''}" data-fav="${idea.id}" aria-label="В избранное" style="position: static; width: 32px; height: 32px;">
             <i data-lucide="bookmark"></i>
          </button>
          <button class="card-favorite ${hasLiked ? 'active' : ''}" data-upvote="${idea.id}" aria-label="Апвоут" style="position: static; width: 32px; height: 32px;">
             <i data-lucide="arrow-up"></i>
          </button>
      </div>

      <h3 class="card-title">${idea.name}</h3>
      <p class="card-desc">${idea.desc}</p>
      <div class="card-meta">
        <span class="meta-item"><i data-lucide="wallet"></i> от ${idea.capital.toLocaleString('ru-RU')} ₽</span>
        <span class="meta-item"><i data-lucide="star"></i> ${idea.rating.toFixed(1)}</span>
        <span class="meta-item"><i data-lucide="arrow-up"></i> ${likeCount}</span>
      </div>
    </div>`;
}

function renderTopListItem(idea, rank) {
  const isFav = favorites.includes(idea.id);
  const likeCount = likes[idea.id] || 0;
  const rankClass = rank <= 3 ? `rank-${rank}` : '';
  return `
    <div class="top-list-item" data-id="${idea.id}">
      <div class="top-list-rank ${rankClass}">${rank}</div>
      <div class="top-list-body">
        <h3>${idea.name}</h3>
        <p>${idea.desc}</p>
      </div>
      <div class="top-list-meta">
        <span class="meta-item"><i data-lucide="star"></i> ${idea.rating.toFixed(1)}</span>
        <span class="meta-item"><i data-lucide="wallet"></i> ${idea.capital.toLocaleString('ru-RU')} ₽</span>
      </div>
      <button class="top-list-fav ${isFav ? 'active' : ''}" data-fav="${idea.id}" aria-label="В избранное"><i data-lucide="arrow-up"></i></button>
    </div>`;
}

function renderCards() {
  if (!cardsGrid) return;
  let filtered = ideas.filter(idea => {
    const matchesCategory = currentCategory === 'all' || idea.category === currentCategory;
    const matchesSearch = idea.name.toLowerCase().includes(searchTerm.toLowerCase()) || idea.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesComplexity = currentComplexityFilter === 'all' || idea.complexity === currentComplexityFilter;
    const matchesRating = idea.rating >= currentMinRating;
    let matchesBudget = true;
    if (currentBudgetFilter !== 'all') {
      const [min, max] = currentBudgetFilter.split('-').map(Number);
      matchesBudget = idea.capital >= min && idea.capital <= max;
    }
    return matchesCategory && matchesSearch && matchesComplexity && matchesRating && matchesBudget;
  });
  if (currentSidebarTab === 'top') {
    filtered = filtered.slice().sort((a, b) => b.rating - a.rating);
    cardsGrid.classList.add('top-mode');
    cardsGrid.innerHTML = filtered.length
      ? filtered.map((idea, i) => renderTopListItem(idea, i + 1)).join('')
      : '<p style="opacity:0.6;">Ничего не найдено</p>';
  } else {
    cardsGrid.classList.remove('top-mode');
    cardsGrid.innerHTML = filtered.length
      ? filtered.map((idea) => renderIdeaCard(idea, null)).join('')
      : '<p style="opacity:0.6;">Ничего не найдено</p>';
  }
  if (window.lucide) lucide.createIcons();
  cardsGrid.querySelectorAll('[data-fav]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); toggleFavSupabase(parseInt(btn.dataset.fav, 10)); });
  });
  cardsGrid.querySelectorAll('[data-upvote]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.upvote, 10);
      await toggleLikeSupabase(id);
    });
  });
  cardsGrid.querySelectorAll('[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      const idea = ideas.find(i => i.id === parseInt(card.dataset.id, 10));
      if (idea) openIdeaModal(idea, card);
    });
  });
  updateFilterCounts();
}

let searchDebounceTimer = null;
const searchBox = document.querySelector('.search-box');

ideasSearchInput?.addEventListener('input', (e) => {
  const val = e.target.value;
  if (searchClearBtn) searchClearBtn.style.display = val ? 'flex' : 'none';
  // Показываем спиннер загрузки
  if (searchBox) searchBox.classList.add('is-loading');
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    searchTerm = val;
    renderCards();
    if (searchBox) searchBox.classList.remove('is-loading');
  }, 700);
});

searchClearBtn?.addEventListener('click', () => {
  searchTerm = ''; if (ideasSearchInput) ideasSearchInput.value = '';
  searchClearBtn.style.display = 'none';
  if (searchBox) searchBox.classList.remove('is-loading');
  clearTimeout(searchDebounceTimer);
  renderCards();
});

filterToggleBtn?.addEventListener('click', () => {
  filterPanelOpen = !filterPanelOpen;
  if (!filterPanel) return;
  if (filterPanelOpen) {
    filterPanel.style.display = 'block';
    filterPanel.classList.remove('is-closed');
    requestAnimationFrame(() => {
      filterPanel.classList.add('is-open');
      filterPanel.style.height = 'auto';
    });
  } else {
    filterPanel.classList.remove('is-open');
    filterPanel.classList.add('is-closed');
    setTimeout(() => { filterPanel.style.display = 'none'; }, 400);
  }
});

categoryFilters?.querySelectorAll('.filter-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    categoryFilters.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active'); currentCategory = pill.dataset.category; renderCards();
  });
});

// =======================================================================
// ФИЛЬТРЫ: бюджет, сложность, рейтинг
// =======================================================================
let currentBudgetFilter = 'all';
let currentComplexityFilter = 'all';
let currentMinRating = 0;

function injectExtraFilters() {
  if (!filterPanel || document.getElementById('budgetFilters')) return;
  const extra = document.createElement('div');
  extra.innerHTML = `
    <div class="filter-group">
      <h4>Бюджет</h4>
      <div class="filter-pills" id="budgetFilters">
        <button class="filter-pill active" data-budget="all">Любой</button>
        <button class="filter-pill" data-budget="0-15000">До 15 000 ₽</button>
        <button class="filter-pill" data-budget="15000-50000">15 000 – 50 000 ₽</button>
        <button class="filter-pill" data-budget="50000-999999999">От 50 000 ₽</button>
      </div>
    </div>
    <div class="filter-group">
      <h4>Сложность</h4>
      <div class="filter-pills" id="complexityFilters">
        <button class="filter-pill active" data-complexity="all">Любая</button>
        <button class="filter-pill" data-complexity="Низкая">Низкая</button>
        <button class="filter-pill" data-complexity="Средняя">Средняя</button>
        <button class="filter-pill" data-complexity="Высокая">Высокая</button>
      </div>
    </div>
    <div class="filter-group">
      <h4>Минимальный рейтинг: <span id="minRatingValue">0</span></h4>
      <input type="range" id="minRatingSlider" min="0" max="5" step="0.5" value="0" style="width:100%;">
    </div>
  `;
  filterPanel.appendChild(extra);

  document.getElementById('budgetFilters').querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.getElementById('budgetFilters').querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentBudgetFilter = pill.dataset.budget;
      renderCards();
    });
  });

  document.getElementById('complexityFilters').querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.getElementById('complexityFilters').querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentComplexityFilter = pill.dataset.complexity;
      renderCards();
    });
  });

  const minRatingSlider = document.getElementById('minRatingSlider');
  minRatingSlider?.addEventListener('input', () => {
    currentMinRating = parseFloat(minRatingSlider.value);
    document.getElementById('minRatingValue').textContent = currentMinRating;
    renderCards();
  });
}
injectExtraFilters();

function updateFilterCounts() {
  const pills = categoryFilters?.querySelectorAll('.filter-pill');
  if (!pills) return;
  pills.forEach(pill => {
    const cat = pill.dataset.category;
    const count = ideas.filter(idea => cat === 'all' || idea.category === cat).length;
    let countEl = pill.querySelector('.filter-pill-count');
    if (!countEl) {
      countEl = document.createElement('span');
      countEl.className = 'filter-pill-count';
      pill.appendChild(countEl);
    }
    countEl.textContent = count;
  });
}

// =======================================================================
// МОДАЛЬНОЕ ОКНО ДЕТАЛЕЙ
// =======================================================================
const detailsModal = document.getElementById('detailsModal');
const detailsBackdrop = document.getElementById('detailsBackdrop');
const detailsCloseBtn = document.getElementById('detailsCloseBtn');
const modalDynamicContent = document.getElementById('modalDynamicContent');

function openIdeaModal(idea, cardEl) {
  recordView('ideas', idea.id);
  currentCardElement = cardEl;
  const isFav = favorites.includes(idea.id);
  modalDynamicContent.innerHTML = `
    <span class="modal-badge">${idea.category}</span>
    <h2>${idea.name}</h2>
    <div class="modal-grid-info">
      <div><strong>Капитал:</strong> от ${idea.capital.toLocaleString('ru-RU')} ₽</div>
      <div><strong>Сложность:</strong> ${idea.complexity}</div>
      <div><strong>Потенциал:</strong> ${idea.potential}</div>
      <div><strong>Рейтинг:</strong> ${idea.rating.toFixed(1)} ★</div>
    </div>
    <div class="modal-blocks">
      <h3><i data-lucide="file-text"></i> Описание</h3><p>${idea.desc}</p>
      <h3><i data-lucide="lightbulb"></i> Почему это работает</h3><p>${idea.why}</p>
      <h3><i data-lucide="thumbs-up"></i> Плюсы</h3><p>${idea.pros}</p>
      <h3><i data-lucide="thumbs-down"></i> Минусы</h3><p>${idea.cons}</p>
      <h3><i data-lucide="rocket"></i> Как начать</h3><p>${idea.how}</p>
      <h3><i data-lucide="alert-triangle"></i> Риски</h3><p>${idea.risks}</p>
    </div>
    <button class="btn-glow" id="favToggleBtn" style="margin-top:1rem;">${isFav ? 'В избранном' : 'Добавить в избранное'}</button>
    <div class="comments-section" id="commentsSection">Загрузка комментариев...</div>
  `;
  if (window.lucide) lucide.createIcons();
  document.getElementById('favToggleBtn')?.addEventListener('click', async () => {
    await toggleFavSupabase(idea.id);
    openIdeaModal(idea, currentCardElement);
  });
  detailsModal.classList.add('active'); isModalOpen = true;
  loadCommentsUI(idea.id, 'idea');
}

async function loadCommentsUI(targetId, type = 'idea') {
  const commentsSection = document.getElementById('commentsSection');
  if (!commentsSection) return;
  const comments = await loadComments(targetId, type);
  const renderComment = (c, i) => {
    const name = c.profiles?.username || 'Пользователь';
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00ffcc&color=0b0d10&bold=true`;
    return `<div class="comment-item" style="animation-delay:${Math.min(i, 8) * 0.05}s">
      <img class="comment-avatar" src="${avatar}" alt="">
      <div class="comment-bubble">
        <div class="comment-header">
          <span class="comment-author">${name}</span>
          <span class="comment-time">${new Date(c.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="comment-text">${c.text}</div>
      </div>
    </div>`;
  };
  commentsSection.innerHTML = `
    <h3><i data-lucide="message-square"></i> Комментарии (${comments.length})</h3>
    <div class="comment-list">
      ${comments.length ? comments.map(renderComment).join('') : '<div class="comments-empty">Пока нет комментариев — станьте первым</div>'}
    </div>
    <div class="comment-input-group">
      <input type="text" id="newCommentInput" placeholder="${currentUser ? 'Написать комментарий...' : 'Войдите, чтобы комментировать'}" ${currentUser ? '' : 'disabled'} />
      <button id="submitCommentBtn" ${currentUser ? '' : 'disabled'}><i data-lucide="send"></i></button>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
  const input = document.getElementById('newCommentInput');
  const submitBtn = document.getElementById('submitCommentBtn');
  submitBtn?.addEventListener('click', async () => {
    const text = input.value.trim();
    if (text) { await addComment(targetId, text, type); input.value = ''; loadCommentsUI(targetId, type); }
  });
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitBtn?.click(); });
}

function closeDetailsModal() { detailsModal.classList.remove('active'); isModalOpen = false; currentCardElement = null; }
detailsBackdrop?.addEventListener('click', closeDetailsModal);
detailsCloseBtn?.addEventListener('click', closeDetailsModal);

// =======================================================================
// СТАТЬИ
// =======================================================================
let articlesLoaded = false;

async function loadArticlesData() {
  if (articlesLoaded) return;
  articles = typeof IDEAHUB_ARTICLES !== 'undefined' ? IDEAHUB_ARTICLES : [];
  articlesLoaded = true;
}

function renderArticleCard(article) {
  const likeCount = (articleLikeCounts[article.id]) || 0;
  return `
    <div class="glass-card" style="min-height: auto;" data-article-id="${article.id}">
      <span class="card-badge">${article.category}</span>
      <h3 class="card-title">${article.title}</h3>
      <p class="card-desc" style="margin-bottom: 1rem;">${article.description}</p>
      <div class="card-meta" style="margin-bottom: 1rem;">
        <span class="meta-item"><i data-lucide="user"></i> ${article.author}</span>
        <span class="meta-item"><i data-lucide="clock"></i> ${article.readTime} мин</span>
        <span class="meta-item"><i data-lucide="arrow-up"></i> ${likeCount}</span>
      </div>
      <button class="btn-read" onclick="window.location.href='article.html?id=${article.id}'; event.stopPropagation();">Читать статью</button>
    </div>`;
}

let articleLikeCounts = {};
async function loadArticleLikeCounts() {
  try {
    const { data } = await supabaseClient.from('upvotes_articles').select('id_article');
    const counts = {};
    (data || []).forEach(r => { counts[r.id_article] = (counts[r.id_article] || 0) + 1; });
    articleLikeCounts = counts;
  } catch (e) { console.error('Ошибка загрузки лайков статей:', e); }
}

async function renderArticles() {
  const articlesGrid = document.getElementById('articlesGrid');
  if (!articlesGrid) return;
  await loadArticlesData();
  await loadArticleLikeCounts();
  articlesGrid.innerHTML = articles.length ? articles.map(renderArticleCard).join('') : '<p style="opacity:0.6;">Статьи не найдены</p>';
  if (window.lucide) lucide.createIcons();
  articlesGrid.querySelectorAll('.glass-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `article.html?id=${card.dataset.articleId}`;
    });
  });
}

// Статьи теперь открываются отдельной страницей article.html?id=N —
// см. renderArticleCard выше и article.html.

// =======================================================================
// ИНИЦИАЛИЗАЦИЯ
// =======================================================================
document.addEventListener('DOMContentLoaded', async () => {
  applyTheme(getCurrentTheme());
  await updateUserUI();
  await loadUserData();
  renderCards();
  const active = document.querySelector('.nav-tab.active') || navTabs[0];
  if (active) moveIndicator(active);
  if (window.lucide) lucide.createIcons();
  if (window.gsap) {
    gsap.from('.hero-title', { opacity: 0, y: 50, duration: 1, ease: 'power2.out' });
    gsap.from('.hero-subtitle', { opacity: 0, y: 30, duration: 1, delay: 0.2, ease: 'power2.out' });
  }
});


// Theme Slider Logic
const themeStyleTabs = document.querySelectorAll('#themeStyleTabs .nav-tab');
const themeStyleIndicator = document.getElementById('themeStyleIndicator');
let lastThemeStyleX = 0;
if (themeStyleTabs.length) {
    themeStyleTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            themeStyleTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const targetX = tab.offsetLeft;
            const direction = targetX > lastThemeStyleX ? 1 : -1;
            themeStyleIndicator.classList.add('is-moving');
            themeStyleIndicator.dataset.dir = direction > 0 ? '1' : '-1';
            themeStyleIndicator.style.width = `${tab.offsetWidth + 4}px`;
            themeStyleIndicator.style.transform = `translateX(${tab.offsetLeft - 2}px)`;
            
            setTimeout(() => {
              themeStyleIndicator.style.width = `${tab.offsetWidth}px`;
              themeStyleIndicator.style.transform = `translateX(${tab.offsetLeft}px)`;
              themeStyleIndicator.classList.remove('is-moving');
              lastThemeStyleX = tab.offsetLeft;
            }, 180);
        });
    });
}

// FAB Logic
const fabToggleBtn = document.getElementById('fabToggleBtn');
const fabPopup = document.getElementById('fabPopup');
const fabTabs = document.querySelectorAll('#fabTabs .nav-tab');
const fabIndicator = document.getElementById('fabIndicator');
const fabContentList = document.getElementById('fabContentList');
let lastFabX = 0;

fabToggleBtn?.addEventListener('click', () => {
    fabPopup.classList.toggle('active');
    if(fabPopup.classList.contains('active')) {
        updateFabContent('fav-ideas');
        requestAnimationFrame(() => {
            const activeTab = document.querySelector('#fabTabs .nav-tab.active') || fabTabs[0];
            if (activeTab && fabIndicator) {
                fabIndicator.style.width = `${activeTab.offsetWidth}px`;
                fabIndicator.style.transform = `translateX(${activeTab.offsetLeft}px)`;
            }
        });
    }
});

fabTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        fabTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        if (fabIndicator) {
            fabIndicator.classList.add('is-moving'); 
            fabIndicator.style.width = `${tab.offsetWidth}px`;
            fabIndicator.style.transform = `translateX(${tab.offsetLeft}px)`;
            setTimeout(() => fabIndicator.classList.remove('is-moving'), 180);
        }
        
        updateFabContent(tab.dataset.fabTab);
    });
});

function updateFabContent(type) {
    let contentHtml = '';
    if (type === 'fav-ideas') {
        const favs = ideas.filter(i => favorites.includes(i.id));
        contentHtml = favs.length ? favs.map(i => `<div class="fab-item"><span>${i.name}</span><i data-lucide="lightbulb" style="width:16px;"></i></div>`).join('') : '<p style="opacity:0.6; text-align:center;">Пусто</p>';
    } else if (type === 'up-ideas') {
        const liked = ideas.filter(i => myUpvotedIdeas.has(i.id));
        contentHtml = liked.length ? liked.map(i => `<div class="fab-item"><span>${i.name}</span><i data-lucide="arrow-up" style="width:16px;"></i></div>`).join('') : '<p style="opacity:0.6; text-align:center;">Пусто</p>';
    } else if (type === 'fav-articles') {
        contentHtml = '<p style="opacity:0.6; text-align:center;">Нет сохраненных статей</p>';
    }
    fabContentList.innerHTML = contentHtml;
    if (window.lucide) lucide.createIcons();
}


document.getElementById('mobileProfileBtn')?.addEventListener('click', openUserProfileModal);