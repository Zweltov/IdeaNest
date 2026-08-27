// ==========================================================================
//  IdeaNest — script.js (общий для index.html и всех страниц ideas/idea.html)
//  Подключено: аутентификация (регистрация/вход/выход), каталог идей и статей
//  из таблиц ideas/articles в Supabase, окна предпросмотра со всеми полями,
//  отдельные страницы идеи/статьи с избранным/апвоутом/учётом просмотра.
// ==========================================================================

const SUPABASE_URL = 'https://hhwndrynnozllrqtcdct.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhod25kcnlubm96bGxycXRjZGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MTkyOTIsImV4cCI6MjA5OTQ5NTI5Mn0.Gq2PNYIiZzKIaUNOY1AfF-8yVnAjPCf2HRGMX11Av14';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// "../" если текущая страница уже внутри ideas/, articles/ или settings/, иначе ""
function siteRootPrefix() {
  return /\/(ideas|articles|settings|profile)\//.test(window.location.pathname) ? '../' : '';
}

function isFileProtocol() {
  return window.location.protocol === 'file:';
}

// Красивые ссылки (Vercel rewrite → article.html / idea.html).
// На file:// — обычные query-URL, чтобы локально тоже открывалось.
function articleHref(article) {
  if (!article) return '#';
  const id = article.id;
  const slug = article.slug;
  if (isFileProtocol()) {
    const root = siteRootPrefix();
    if (slug) return root + 'articles/article.html?slug=' + encodeURIComponent(slug);
    return root + 'articles/article.html?id=' + id;
  }
  if (slug) return '/articles/' + encodeURIComponent(slug);
  return '/articles/article.html?id=' + id;
}

function ideaHref(idea) {
  const id = idea && (idea.id_idea != null ? idea.id_idea : idea.id);
  if (id == null || id === '') return '#';
  if (isFileProtocol()) return siteRootPrefix() + 'ideas/idea.html?id=' + id;
  return '/ideas/' + id;
}

let currentUser = null;   // объект пользователя из supabase.auth
let currentProfile = null; // строка из таблицы profiles (id, username, auth_id, created_at)

  /** Уникальный дефолт-аватар (градиент по нику), без внешних сервисов */
  const AVATAR_GRADIENTS = [
    ['#6366f1', '#ec4899'], ['#0ea5e9', '#6366f1'], ['#10b981', '#0ea5e9'],
    ['#f59e0b', '#ef4444'], ['#8b5cf6', '#d946ef'], ['#14b8a6', '#22c55e'],
    ['#f43f5e', '#fb923c'], ['#3b82f6', '#06b6d4'], ['#a855f7', '#6366f1'],
    ['#e11d48', '#7c3aed'], ['#059669', '#0ea5e9'], ['#ca8a04', '#ea580c']
  ];
  function hashStr(s) {
    let h = 2166136261;
    const str = String(s || 'U');
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function initialsFromName(name) {
    const s = String(name || 'U').trim();
    if (!s) return 'U';
    const parts = s.replace(/[@._-]+/g, ' ').split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return s.slice(0, 2).toUpperCase();
  }
  function defaultAvatarUrl(name, size) {
    size = size || 128;
    const h = hashStr(name);
    const [c1, c2] = AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
    const letters = initialsFromName(name);
    const rot = h % 360;
    const gid = 'ag' + h.toString(36);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${rot} 64 64)">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c2}"/>
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r="64" fill="url(#${gid})"/>
      <circle cx="40" cy="36" r="28" fill="rgba(255,255,255,0.12)"/>
      <text x="64" y="72" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="44" font-weight="700" fill="#fff">${letters}</text>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /** Готовые аватарки галереи (абстрактные градиенты) */
  function galleryAvatarDataUrl(index, size) {
    size = size || 128;
    const presets = [
      ['#111827', '#4f46e5', '✦'], ['#0f172a', '#06b6d4', '◇'],
      ['#1e1b4b', '#c026d3', '◈'], ['#14532d', '#22c55e', '◆'],
      ['#7c2d12', '#f97316', '●'], ['#1e3a5f', '#38bdf8', '▲'],
      ['#4c0519', '#fb7185', '★'], ['#022c22', '#2dd4bf', '◎'],
      ['#3b0764', '#a78bfa', '▣'], ['#172554', '#60a5fa', '○'],
      ['#431407', '#fdba74', '◐'], ['#083344', '#67e8f9', '◑']
    ];
    const p = presets[index % presets.length];
    const gid = 'gal' + index;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
      <defs><linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${p[0]}"/><stop offset="100%" stop-color="${p[1]}"/>
      </linearGradient></defs>
      <circle cx="64" cy="64" r="64" fill="url(#${gid})"/>
      <text x="64" y="78" text-anchor="middle" font-size="42" fill="rgba(255,255,255,0.9)">${p[2]}</text>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }


document.addEventListener("DOMContentLoaded", () => {
  // Инициализация иконок Lucide
  lucide.createIcons();

  (function syncBrandLogo() {
    const apply = () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      document.querySelectorAll('img.brand-logo').forEach(img => {
        const src = img.getAttribute('src') || '';
        if (!img.dataset.orig && (src.includes('logo-dark') || src.includes('logo-light'))) {
          img.dataset.orig = src.includes('logo-light')
            ? src.replace('logo-light.svg', 'logo-dark.png').replace('logo-light.png', 'logo-dark.png')
            : src;
        }
        const orig = img.dataset.orig || src;
        if (dark) {
          const light = orig.replace('logo-dark.png', 'logo-light.svg').replace('logo-dark.svg', 'logo-light.svg');
          if (img.getAttribute('src') !== light) img.setAttribute('src', light);
          img.style.filter = '';
          img.style.opacity = '';
        } else {
          if (orig && img.getAttribute('src') !== orig) img.setAttribute('src', orig);
          img.style.filter = '';
          img.style.opacity = '';
        }
      });
    };
    apply();
    new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  })();

  // ================= Navbar: поиск + тема =================
  (function injectNavbarTools() {
    const actions = document.querySelector('.navbar-actions');
    if (!actions || document.getElementById('navSearchBtn')) return;
    const tools = document.createElement('div');
    tools.className = 'navbar-tools';
    tools.innerHTML = `
      <button type="button" class="nav-icon-btn" id="navSearchBtn" aria-label="Поиск" title="Поиск">
        <i data-lucide="search"></i>
      </button>
      <button type="button" class="nav-icon-btn" id="navThemeBtn" aria-label="Тема" title="Тема">
        <i data-lucide="sun-moon"></i>
      </button>`;
    actions.insertBefore(tools, actions.firstChild);
    if (window.lucide) lucide.createIcons();

    document.getElementById('navSearchBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openNavSearchPop(e.currentTarget);
    });
    document.getElementById('navThemeBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openNavThemePop(e.currentTarget);
    });
  })();

  function openNavSearchPop(anchor) {
    document.getElementById('navSearchBackdrop')?.remove();
    const bd = document.createElement('div');
    bd.id = 'navSearchBackdrop';
    bd.className = 'profile-hub-backdrop active';
    const pop = document.createElement('div');
    pop.className = 'profile-hub-pop profile-dropdown nav-search-pop';
    pop.style.cssText = 'opacity:1;visibility:visible;pointer-events:auto;transform:none;position:fixed;';
    pop.innerHTML = `
      <div class="profile-hub-title">Поиск</div>
      <input type="search" id="navSearchInput" class="nav-search-input" placeholder="Идеи или статьи…" autocomplete="off" />
      <div class="nav-search-actions">
        <button type="button" class="dropdown-item" data-go="ideas"><i data-lucide="lightbulb"></i> Искать в идеях</button>
        <button type="button" class="dropdown-item" data-go="articles"><i data-lucide="book-open"></i> Искать в статьях</button>
      </div>`;
    bd.appendChild(pop);
    document.body.appendChild(bd);
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const w = 300;
      let left = r.right - w;
      left = Math.max(12, Math.min(left, window.innerWidth - w - 12));
      pop.style.left = left + 'px';
      pop.style.top = (r.bottom + 8) + 'px';
      pop.style.width = w + 'px';
    };
    place();
    if (window.lucide) lucide.createIcons();
    const input = document.getElementById('navSearchInput');
    input?.focus();
    const go = (kind) => {
      const q = (input?.value || '').trim();
      const root = siteRootPrefix();
      if (kind === 'ideas') location.href = root + 'ideas/all.html' + (q ? '?q=' + encodeURIComponent(q) : '');
      else location.href = root + 'articles/index.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    };
    pop.querySelectorAll('[data-go]').forEach(btn => {
      btn.addEventListener('click', () => go(btn.dataset.go));
    });
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') go('ideas');
    });
    bd.addEventListener('click', (e) => { if (e.target === bd) bd.remove(); });
  }

  function openNavThemePop(anchor) {
    document.getElementById('navThemeBackdrop')?.remove();
    const bd = document.createElement('div');
    bd.id = 'navThemeBackdrop';
    bd.className = 'profile-hub-backdrop active';
    const pop = document.createElement('div');
    pop.className = 'profile-hub-pop profile-dropdown';
    pop.style.cssText = 'opacity:1;visibility:visible;pointer-events:auto;transform:none;position:fixed;';
    const current = (() => {
      try { return JSON.parse(localStorage.getItem('ideanest_theme') || '{}').key || 'light'; }
      catch { return 'light'; }
    })();
    const themes = [
      { key: 'light', label: 'Светлая', icon: 'sun' },
      { key: 'dark', label: 'Тёмная', icon: 'moon' },
      { key: 'colorful', label: 'Цветная', icon: 'palette' }
    ];
    pop.innerHTML = `<div class="profile-hub-title">Тема</div>` + themes.map(th =>
      `<button type="button" class="dropdown-item${current === th.key ? ' active-account' : ''}" data-theme-pick="${th.key}"><i data-lucide="${th.icon}"></i> ${th.label}</button>`
    ).join('') + `<a class="dropdown-item" href="${siteRootPrefix()}settings/settings.html"><i data-lucide="settings"></i> Все настройки</a>`;
    bd.appendChild(pop);
    document.body.appendChild(bd);
    const r = anchor.getBoundingClientRect();
    const w = 240;
    let left = r.right - w;
    left = Math.max(12, Math.min(left, window.innerWidth - w - 12));
    pop.style.left = left + 'px';
    pop.style.top = (r.bottom + 8) + 'px';
    pop.style.width = w + 'px';
    if (window.lucide) lucide.createIcons();
    pop.querySelectorAll('[data-theme-pick]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.themePick;
        const preset = (typeof BUILTIN_THEMES !== 'undefined' && BUILTIN_THEMES[key])
          ? BUILTIN_THEMES[key]
          : null;
        const colors = preset && (preset.colors || preset);
        if (colors && typeof applyThemeColors === 'function') {
          applyThemeColors(colors, key);
          saveThemeLocally(key, colors);
        } else {
          // fallback
          const map = {
            light: { 'bg-color': '#ffffff', 'bg-muted': '#f9fafb', 'surface-color': '#ffffff', 'text-main': '#111827', 'text-muted': '#6b7280', 'border-color': '#e5e7eb', 'accent-primary': '#4f46e5', 'accent-hover': '#4338ca', 'accent-light': '#eef2ff' },
            dark: { 'bg-color': '#0f0f12', 'bg-muted': '#18181c', 'surface-color': '#1c1c22', 'text-main': '#f3f4f6', 'text-muted': '#9ca3af', 'border-color': '#2e2e36', 'accent-primary': '#818cf8', 'accent-hover': '#a5b4fc', 'accent-light': '#27272a' },
            colorful: { 'bg-color': '#f8fdff', 'bg-muted': '#eafaff', 'surface-color': '#ffffff', 'text-main': '#0c2733', 'text-muted': '#4b7a89', 'border-color': '#cdeef7', 'accent-primary': '#0891b2', 'accent-hover': '#0e7490', 'accent-light': '#ecfeff' },
            ink: { 'bg-color': '#f7f5f0', 'bg-muted': '#efece6', 'surface-color': '#fffcf7', 'text-main': '#14110f', 'text-muted': '#6a635c', 'border-color': '#d4cdc3', 'accent-primary': '#14110f', 'accent-hover': '#000000', 'accent-light': '#e8e4dc' },
            clay: { 'bg-color': '#faf6f1', 'bg-muted': '#f3ebe3', 'surface-color': '#ffffff', 'text-main': '#3d2c29', 'text-muted': '#8a736c', 'border-color': '#eadfd6', 'accent-primary': '#c45c26', 'accent-hover': '#a34a1c', 'accent-light': '#fce8dc' },
            neon: { 'bg-color': '#070b10', 'bg-muted': '#0d1219', 'surface-color': '#0a1018', 'text-main': '#e6f7ff', 'text-muted': '#6b8a9e', 'border-color': '#1a3344', 'accent-primary': '#00f0ff', 'accent-hover': '#7dffff', 'accent-light': '#0a2a33' }
          };
          const c = map[key] || map.light;
          if (typeof applyThemeColors === 'function') {
            applyThemeColors(c, key);
            saveThemeLocally(key, c);
          } else {
            Object.entries(c).forEach(([k, v]) => document.documentElement.style.setProperty('--' + k, v));
            document.documentElement.setAttribute('data-theme', key === 'dark' || key === 'neon' ? 'dark' : (key === 'colorful' ? 'colorful' : 'light'));
            if (['ink','clay','neon'].includes(key)) document.documentElement.setAttribute('data-skin', key);
            else document.documentElement.removeAttribute('data-skin');
            localStorage.setItem('ideanest_theme', JSON.stringify({ key, colors: c }));
          }
        }
        bd.remove();
        showToast('Тема: ' + ({ light:'светлая', dark:'тёмная', colorful:'океан', ink:'Ink Editorial', clay:'Clay Soft', neon:'Neon Terminal' }[key] || key));
      });
    });
    bd.addEventListener('click', (e) => { if (e.target === bd) bd.remove(); });
  }



  // ================= 1. Логика Меню Профиля (Dropdown) =================
  const profileWrapper = document.getElementById('profileWrapper');
  const profileDropdown = document.getElementById('profileDropdown');
  const profileBlurOverlay = document.getElementById('profileBlurOverlay');
  const topAvatar = document.getElementById('topAvatar');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  // На мобилке dropdown переносим в <body>: иначе position:fixed ломается
  // из‑за backdrop-filter у .navbar (создаёт containing block).
  const profileDropdownHome = profileDropdown ? profileDropdown.parentElement : null;
  function isMobileNav() {
    return window.matchMedia('(max-width: 760px)').matches;
  }

  // Свайп вниз по полоске / листу → закрыть bottom sheet
  let sheetDragY = 0;
  let sheetDragging = false;
  function resetSheetTransform() {
    if (!profileDropdown) return;
    profileDropdown.style.transition = '';
    profileDropdown.style.transform = '';
  }
  function wireProfileSheetGestures() {
    if (!profileDropdown || profileDropdown.dataset.gesturesWired) return;
    profileDropdown.dataset.gesturesWired = '1';

    // Реальная полоска-ручка (удобнее ловить touch, чем ::before)
    if (!profileDropdown.querySelector('.sheet-handle')) {
      const handle = document.createElement('div');
      handle.className = 'sheet-handle';
      handle.setAttribute('aria-hidden', 'true');
      profileDropdown.insertBefore(handle, profileDropdown.firstChild);
    }

    const onStart = (clientY) => {
      if (!isMobileNav() || !profileDropdown.classList.contains('active')) return;
      sheetDragging = true;
      sheetDragY = clientY;
      profileDropdown.style.transition = 'none';
    };
    const onMove = (clientY) => {
      if (!sheetDragging) return;
      const dy = Math.max(0, clientY - sheetDragY);
      profileDropdown.style.transform = `translateY(${dy}px)`;
      if (profileBlurOverlay) profileBlurOverlay.style.opacity = String(Math.max(0.15, 1 - dy / 320));
    };
    const onEnd = (clientY) => {
      if (!sheetDragging) return;
      sheetDragging = false;
      const dy = Math.max(0, clientY - sheetDragY);
      profileDropdown.style.transition = '';
      if (profileBlurOverlay) profileBlurOverlay.style.opacity = '';
      if (dy > 100) {
        closeProfileDropdown();
      } else {
        profileDropdown.style.transform = '';
      }
    };

    const handleEl = () => profileDropdown.querySelector('.sheet-handle');
    profileDropdown.addEventListener('touchstart', (e) => {
      // тянем только за ручку или если скролл листа в самом верху
      const t = e.touches[0];
      const fromHandle = e.target.closest('.sheet-handle');
      if (fromHandle || profileDropdown.scrollTop <= 0) onStart(t.clientY);
    }, { passive: true });
    profileDropdown.addEventListener('touchmove', (e) => {
      if (!sheetDragging) return;
      onMove(e.touches[0].clientY);
    }, { passive: true });
    profileDropdown.addEventListener('touchend', (e) => {
      if (!sheetDragging) return;
      onEnd(e.changedTouches[0].clientY);
    });
  }
  wireProfileSheetGestures();

  // На всякий случай — меню закрыто при загрузке страницы
  if (profileDropdown) {
    profileDropdown.classList.remove('active');
    profileDropdown.setAttribute('aria-hidden', 'true');
  }
  profileBlurOverlay?.classList.remove('active');

  function openProfileDropdown() {
    if (!profileDropdown) return;
    // Всегда в <body>: иначе z-index меню ограничивается .navbar (blur ложится поверх)
    if (profileDropdown.parentElement !== document.body) {
      document.body.appendChild(profileDropdown);
    }
    resetSheetTransform();
    void profileDropdown.offsetWidth;
    profileDropdown.classList.add('active');
    profileDropdown.setAttribute('aria-hidden', 'false');
    // Фон страницы не трогаем. На мобилке — невидимый оверлей только чтобы ловить тап снаружи.
    if (isMobileNav()) profileBlurOverlay?.classList.add('active');
    document.getElementById('bottomNav')?.classList.add('behind-sheet');
  }
  function closeProfileDropdown() {
    if (!profileDropdown) return;
    profileDropdown.classList.remove('active');
    profileDropdown.setAttribute('aria-hidden', 'true');
    profileBlurOverlay?.classList.remove('active');
    document.getElementById('bottomNav')?.classList.remove('behind-sheet');
    resetSheetTransform();
    if (profileDropdown.parentElement === document.body && profileDropdownHome) {
      setTimeout(() => {
        if (!profileDropdown.classList.contains('active') && profileDropdownHome) {
          profileDropdownHome.appendChild(profileDropdown);
        }
      }, 320);
    }
  }

  topAvatar?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (profileDropdown.classList.contains('active')) closeProfileDropdown();
    else openProfileDropdown();
  });

  profileBlurOverlay?.addEventListener('click', () => closeProfileDropdown());

  document.addEventListener('click', (e) => {
    if (!profileDropdown?.classList.contains('active')) return;
    if (
      !profileWrapper?.contains(e.target) &&
      !e.target.closest('#bottomNavMenuBtn') &&
      !profileDropdown.contains(e.target)
    ) {
      closeProfileDropdown();
    }
  });

  // ================= Мобильный bottom nav =================
  // Вставляется на все страницы; на десктопе скрыт CSS. Пути через siteRootPrefix().
  (function initBottomNav() {
    if (document.getElementById('bottomNav')) return;
    const root = siteRootPrefix();
    const path = window.location.pathname;
    const isHome = /\/(index\.html)?$/.test(path) || path.endsWith('/') && !/\/(ideas|articles|settings)\//.test(path);
    const isIdeas = /\/ideas\//.test(path);
    const isArticles = /\/articles\//.test(path);
    const isSettings = /\/(settings|profile)\//.test(path);

    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.id = 'bottomNav';
    nav.setAttribute('aria-label', 'Основная навигация');
    nav.innerHTML = `
      <a href="${root}index.html" class="bottom-nav-item${isHome ? ' active' : ''}" data-nav="home">
        <i data-lucide="home"></i><span>Главная</span>
      </a>
      <a href="${root}ideas/all.html" class="bottom-nav-item${isIdeas ? ' active' : ''}" data-nav="ideas">
        <i data-lucide="lightbulb"></i><span>Идеи</span>
      </a>
      <a href="${root}articles/index.html" class="bottom-nav-item${isArticles ? ' active' : ''}" data-nav="articles">
        <i data-lucide="book-open"></i><span>Статьи</span>
      </a>
      <button type="button" class="bottom-nav-item" id="bottomNavMenuBtn" data-nav="menu">
        <i data-lucide="menu"></i><span>Меню</span>
      </button>`;
    document.body.appendChild(nav);
    if (window.lucide) lucide.createIcons();

    document.getElementById('bottomNavMenuBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openMobileMenu();
    });
  })();

  function ensureMobileMenu() {
    if (document.getElementById('mobileMenuBackdrop')) return;
    const root = siteRootPrefix();
    const backdrop = document.createElement('div');
    backdrop.id = 'mobileMenuBackdrop';
    backdrop.className = 'mobile-menu-backdrop';
    backdrop.innerHTML = `
      <div class="mobile-menu-sheet" id="mobileMenuSheet" role="dialog" aria-label="Меню">
        <div class="sheet-handle" aria-hidden="true"></div>
        <div class="mobile-menu-title">Меню</div>
        <nav class="mobile-menu-nav">
          <a class="mobile-menu-link" href="${root}index.html"><i data-lucide="home"></i> Главная</a>
          <a class="mobile-menu-link" href="${root}ideas/all.html"><i data-lucide="lightbulb"></i> Идеи</a>
          <a class="mobile-menu-link" href="${root}articles/index.html"><i data-lucide="book-open"></i> Статьи</a>
          <a class="mobile-menu-link" href="${root}settings/settings.html"><i data-lucide="settings"></i> Настройки</a>
          <button type="button" class="mobile-menu-link" id="mobileMenuProfileBtn"><i data-lucide="user"></i> Профиль</button>
        </nav>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeMobileMenu(); });
    document.getElementById('mobileMenuProfileBtn')?.addEventListener('click', () => {
      closeMobileMenu();
      if (!currentUser) { loginBtn?.click(); return; }
      openProfileWindow();
    });
  }
  function openMobileMenu() {
    ensureMobileMenu();
    document.getElementById('mobileMenuBackdrop')?.classList.add('active');
    document.getElementById('mobileMenuSheet')?.classList.add('active');
    document.getElementById('bottomNav')?.classList.add('behind-sheet');
    if (window.lucide) lucide.createIcons();
  }
  function closeMobileMenu() {
    document.getElementById('mobileMenuBackdrop')?.classList.remove('active');
    document.getElementById('mobileMenuSheet')?.classList.remove('active');
    document.getElementById('bottomNav')?.classList.remove('behind-sheet');
  }

  (function initSiteFooter() {
    if (document.getElementById('siteFooter')) return;
    const root = siteRootPrefix();
    const footer = document.createElement('footer');
    footer.id = 'siteFooter';
    footer.className = 'site-footer';
    footer.innerHTML = `
      <div class="site-footer-inner">
        <div class="site-footer-brand">
          <div class="site-footer-logo">IdeaNest</div>
          <p class="site-footer-tagline">Идеи и статьи для запуска бизнеса</p>
        </div>
        <div class="site-footer-cols">
          <div class="site-footer-col">
            <div class="site-footer-heading">Разделы</div>
            <a href="${root}index.html">Главная</a>
            <a href="${root}ideas/all.html">Идеи</a>
            <a href="${root}articles/index.html">Статьи</a>
          </div>
          <div class="site-footer-col">
            <div class="site-footer-heading">О проекте</div>
            <a href="${root}about.html">Об авторе</a>
            <a href="#" data-footer-soon="contacts">Контакты</a>
          </div>
          <div class="site-footer-col">
            <div class="site-footer-heading">Правовая информация</div>
            <a href="${root}privacy.html">Политика обработки персональных данных</a>
            <a href="${root}terms.html">Пользовательское соглашение</a>
            <a href="${root}disclaimer.html">Дисклеймер</a>
          </div>
          <div class="site-footer-col">
            <div class="site-footer-heading">Ссылки</div>
            <a href="https://t.me/" target="_blank" rel="noopener noreferrer">Telegram</a>
            <a href="https://github.com/" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
        </div>
      </div>
      <div class="site-footer-bottom"><span>© ${new Date().getFullYear()} IdeaNest</span></div>`;
    document.body.appendChild(footer);
    footer.querySelectorAll('[data-footer-soon]').forEach(a => {
      a.addEventListener('click', (e) => { e.preventDefault(); showToast('Раздел скоро появится'); });
    });
  })();





  (function homeJumpBar() {
    if (!document.getElementById('ideas') || !document.querySelector('.hero')) return;
    const bar = document.createElement('div');
    bar.className = 'home-jump-bar';
    bar.innerHTML = `<a href="#ideas"><i data-lucide="arrow-down"></i> К идеям</a>`;
    document.body.appendChild(bar);
    if (window.lucide) lucide.createIcons();
    const hero = document.querySelector('.hero');
    const onScroll = () => {
      const past = window.scrollY > (hero.offsetHeight * 0.55);
      bar.classList.toggle('visible', past && window.scrollY < (document.getElementById('ideas')?.offsetTop || 0) - 80);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();

  // Hero CTA на главной
  document.getElementById('heroStartBtn')?.addEventListener('click', () => {
    location.href = siteRootPrefix() + 'ideas/match.html';
  });
  document.getElementById('heroHowBtn')?.addEventListener('click', () => {
    openHowItWorksWindow();
  });

  function openHowItWorksWindow() {
    document.getElementById('howItWorksBackdrop')?.remove();
    const bd = document.createElement('div');
    bd.id = 'howItWorksBackdrop';
    bd.className = 'how-it-works-backdrop';
    const win = document.createElement('div');
    win.className = 'how-it-works-window';
    win.innerHTML = `
      <button type="button" class="how-it-works-close" aria-label="Закрыть"><i data-lucide="x"></i></button>
      <h2>Как это работает</h2>
      <p class="how-lead">IdeaNest помогает выбрать бизнес-идею и разобраться в ней через статьи.</p>
      <div class="how-steps">
        <div class="how-step"><div class="how-step-num">1</div><div><strong>Задай критерии</strong><span>Бюджет, категория, сложность — в подборке идей.</span></div></div>
        <div class="how-step"><div class="how-step-num">2</div><div><strong>Смотри идеи</strong><span>Рейтинг, риски, плюсы и минусы в карточках.</span></div></div>
        <div class="how-step"><div class="how-step-num">3</div><div><strong>Читай статьи</strong><span>Гайды, калькуляторы и разборы по темам.</span></div></div>
        <div class="how-step"><div class="how-step-num">4</div><div><strong>Сохраняй своё</strong><span>Профиль, избранное и настройки под тебя.</span></div></div>
      </div>
      <button type="button" class="btn btn-primary" id="howGoMatch" style="width:100%;margin-top:18px;">Открыть подборку</button>`;
    bd.appendChild(win);
    document.body.appendChild(bd);
    requestAnimationFrame(() => {
      bd.classList.add('active');
      win.classList.add('active');
    });
    if (window.lucide) lucide.createIcons();
    const close = () => {
      win.classList.remove('active');
      bd.classList.remove('active');
      setTimeout(() => bd.remove(), 250);
    };
    bd.addEventListener('click', (e) => { if (e.target === bd) close(); });
    win.querySelector('.how-it-works-close')?.addEventListener('click', close);
    document.getElementById('howGoMatch')?.addEventListener('click', () => {
      location.href = siteRootPrefix() + 'ideas/match.html';
    });
  }


  // ================= Мультиаккаунт (локально в браузере) =================
  const ACCOUNTS_KEY = 'ideanest_saved_accounts';

  function loadSavedAccounts() {
    try {
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch { return []; }
  }

  function persistSavedAccounts(list) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list.slice(0, 8)));
  }

  async function rememberCurrentAccount() {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.user) return;
      const u = session.user;
      const username = u.user_metadata?.username || (u.email || '').split('@')[0] || 'user';
      const fullName = (u.user_metadata?.full_name || '').trim();
      let avatar = (currentProfile && currentProfile.avatar_url) || u.user_metadata?.avatar_url || '';
      if (!avatar) {
        const label = fullName || username;
        avatar = defaultAvatarUrl(label);
      }
      const entry = {
        id: u.id,
        email: u.email || '',
        username,
        full_name: fullName || '',
        avatar_url: avatar,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        updated_at: Date.now()
      };
      let list = loadSavedAccounts().filter(a => a.id !== entry.id);
      list.unshift(entry);
      persistSavedAccounts(list);
    } catch (e) { console.warn('remember account', e); }
  }

  
  
  function accountAvatarUrl(acc) {
    if (!acc) return defaultAvatarUrl('U');
    if (acc.avatar_url) return acc.avatar_url;
    const label = acc.full_name || acc.username || 'U';
    return defaultAvatarUrl(label);
  }


  function playAccountSwitchCinematic(fromAcc, toAcc) {
    return new Promise((resolve) => {
      document.getElementById('accCineOverlay')?.remove();
      const fromUrl = accountAvatarUrl(fromAcc);
      const toUrl = accountAvatarUrl(toAcc);

      // ТОЛЬКО аватарка в навбаре справа сверху (#topAvatar) — не dropdown
      const avatarEl = document.getElementById('topAvatar');
      if (!avatarEl) {
        resolve();
        return;
      }
      const rect = avatarEl.getBoundingClientRect();
      // если элемент скрыт/нулевой — не рисуем «левый» круг
      if (rect.width < 8 || rect.height < 8) {
        resolve();
        return;
      }
      const size = Math.max(rect.width, rect.height);

      // прячем только навбарную аву
      avatarEl.style.opacity = '0';

      const overlay = document.createElement('div');
      overlay.id = 'accCineOverlay';
      overlay.className = 'acc-cine acc-cine--inline';
      overlay.innerHTML = `
        <div class="acc-cine-inline-wrap" id="accCineWrap"
          style="position:fixed;width:${size}px;height:${size}px;left:${rect.left}px;top:${rect.top}px;margin:0;">
          <div class="acc-cine-inline-blob">
            <img class="acc-cine-face acc-cine-face--from" src="${fromUrl.replace(/"/g, '&quot;')}" alt="" />
            <img class="acc-cine-face acc-cine-face--to" src="${toUrl.replace(/"/g, '&quot;')}" alt="" />
          </div>
          <div class="acc-cine-ring"></div>
        </div>`;
      document.body.appendChild(overlay);

      // на всякий случай пересчитать после layout (dropdown мог сдвигать)
      requestAnimationFrame(() => {
        const r2 = avatarEl.getBoundingClientRect();
        const wrap = document.getElementById('accCineWrap');
        if (wrap && r2.width >= 8) {
          wrap.style.left = r2.left + 'px';
          wrap.style.top = r2.top + 'px';
          wrap.style.width = Math.max(r2.width, r2.height) + 'px';
          wrap.style.height = Math.max(r2.width, r2.height) + 'px';
        }
        overlay.classList.add('is-in');
      });
      setTimeout(() => overlay.classList.add('is-swap'), 100);
      setTimeout(() => overlay.classList.add('is-pulse'), 180);
      setTimeout(() => {
        overlay.classList.add('is-out');
        avatarEl.src = toUrl + (toUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
        avatarEl.style.opacity = '';
        const drop = document.getElementById('dropdownAvatar');
        if (drop) drop.src = avatarEl.src;
        setTimeout(() => {
          overlay.remove();
          resolve();
        }, 260);
      }, 850);
    });
  }

  async function switchToSavedAccount(accountId) {
    const acc = loadSavedAccounts().find(a => a.id === accountId);
    if (!acc) {
      showToast('Аккаунт не найден в списке', true);
      return;
    }
    if (!acc.refresh_token) {
      persistSavedAccounts(loadSavedAccounts().filter(a => a.id !== accountId));
      showToast('Сессия не сохранена — войдите в этот аккаунт снова', true);
      return;
    }

    const fromAcc = {
      id: currentUser && currentUser.id,
      username: (currentProfile && currentProfile.username) || (currentUser && currentUser.user_metadata && currentUser.user_metadata.username) || (currentUser && currentUser.email) || 'user',
      full_name: (currentProfile && currentProfile.full_name) || (currentUser && currentUser.user_metadata && currentUser.user_metadata.full_name) || '',
      avatar_url: (currentProfile && currentProfile.avatar_url) || (currentUser && currentUser.user_metadata && currentUser.user_metadata.avatar_url) || ''
    };

    closeAccountSwitcher();
    closeProfileDropdown();

    // Анимация и смена сессии параллельно (сессия успеет к концу)
    const cinePromise = playAccountSwitchCinematic(fromAcc, acc);

    let session = null;
    let error = null;
    try {
      {
        const res = await supabaseClient.auth.refreshSession({ refresh_token: acc.refresh_token });
        error = res.error;
        session = res.data && res.data.session;
      }
      if (!session) {
        const res2 = await supabaseClient.auth.setSession({
          access_token: acc.access_token || '',
          refresh_token: acc.refresh_token
        });
        error = res2.error;
        session = res2.data && res2.data.session;
      }
    } catch (e) {
      error = e;
    }

    await cinePromise;

    if (!session) {
      persistSavedAccounts(loadSavedAccounts().filter(a => a.id !== accountId));
      showToast('Сессия истекла — войдите снова' + (error && error.message ? (': ' + error.message) : ''), true);
      return;
    }
    await rememberCurrentAccount();
    location.reload();
  }

function closeAccountSwitcher() {
    const bd = document.getElementById('accountSwitchBackdrop');
    if (!bd) return;
    bd.classList.remove('active');
    setTimeout(() => bd.remove(), 220);
  }

  function openAccountSwitcher(anchorEl) {
    const list = loadSavedAccounts();
    const currentId = currentUser && currentUser.id;
    if (!list.length) {
      showToast('Сохранённых аккаунтов пока нет. Нажмите «Добавить аккаунт».');
      return;
    }
    document.getElementById('accountSwitchBackdrop')?.remove();
    const bd = document.createElement('div');
    bd.id = 'accountSwitchBackdrop';
    bd.className = 'float-pop-backdrop';
    const pop = document.createElement('div');
    pop.className = 'float-pop float-pop--acc';
    pop.setAttribute('role', 'dialog');
    pop.innerHTML = `
      <div class="float-pop-title">Аккаунты</div>
      <div class="float-pop-list">
        ${list.map(a => {
          const label = a.full_name || a.username || 'user';
          const av = a.avatar_url || (defaultAvatarUrl(label));
          return `
          <button type="button" class="float-pop-item${a.id === currentId ? ' is-current' : ''}" data-acc-id="${a.id}">
            <img class="float-pop-avatar" src="${av.replace(/"/g, '&quot;')}" alt="" />
            <span class="float-pop-item-text">
              <span class="float-pop-item-main">@${a.username || 'user'}</span>
              <span class="float-pop-item-sub">${a.email || ''}</span>
            </span>
          </button>`;
        }).join('')}
      </div>`;
    bd.appendChild(pop);
    document.body.appendChild(bd);

    // позиция: вверх-влево от якоря (меню профиля)
    const place = () => {
      const r = (anchorEl || document.getElementById('profileBtn') || document.body).getBoundingClientRect();
      const w = 280;
      let left = r.left - w + r.width;
      let top = r.top - 8;
      left = Math.max(12, Math.min(left, window.innerWidth - w - 12));
      // открываем вверх — pop снизу привязан к top
      pop.style.width = w + 'px';
      pop.style.left = left + 'px';
      pop.style.top = 'auto';
      pop.style.bottom = (window.innerHeight - r.top + 8) + 'px';
      pop.style.transformOrigin = 'bottom right';
    };
    place();
    requestAnimationFrame(() => bd.classList.add('active'));

    bd.addEventListener('click', (e) => { if (e.target === bd) closeAccountSwitcher(); });
    pop.querySelectorAll('[data-acc-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.accId;
        if (id === currentId) { showToast('Уже этот аккаунт'); return; }
        closeAccountSwitcher();
        switchToSavedAccount(id);
      });
    });
  }

  function closeProfileHub() {
    const bd = document.getElementById('profileHubBackdrop');
    if (!bd) return;
    bd.classList.remove('active');
    setTimeout(() => bd.remove(), 200);
  }

  function openProfileHub(anchorEl, title, items) {
    closeProfileHub();
    const bd = document.createElement('div');
    bd.id = 'profileHubBackdrop';
    bd.className = 'profile-hub-backdrop';
    const pop = document.createElement('div');
    pop.className = 'profile-hub-pop profile-dropdown';
    pop.style.opacity = '1';
    pop.style.visibility = 'visible';
    pop.style.pointerEvents = 'auto';
    pop.style.transform = 'none';
    pop.style.position = 'fixed';

    pop.innerHTML = `<div class="profile-hub-title">${title}</div>` + items.map((it, i) => {
      if (it.href) {
        return `<a class="dropdown-item${it.danger ? ' danger' : ''}" href="${it.href}" data-hub-i="${i}"><i data-lucide="${it.icon}"></i> ${it.label}</a>`;
      }
      return `<button type="button" class="dropdown-item${it.danger ? ' danger' : ''}" data-hub-i="${i}"><i data-lucide="${it.icon}"></i> ${it.label}</button>`;
    }).join('');
    bd.appendChild(pop);
    document.body.appendChild(bd);

    const place = () => {
      const r = (anchorEl || document.getElementById('topAvatar') || document.body).getBoundingClientRect();
      const w = 260;
      let left = r.right - w;
      left = Math.max(12, Math.min(left, window.innerWidth - w - 12));
      let top = r.bottom + 8;
      pop.style.left = left + 'px';
      pop.style.top = top + 'px';
      pop.style.width = w + 'px';
    };
    place();
    requestAnimationFrame(() => bd.classList.add('active'));
    if (window.lucide) lucide.createIcons();

    bd.addEventListener('click', (e) => { if (e.target === bd) closeProfileHub(); });
    pop.querySelectorAll('[data-hub-i]').forEach(el => {
      el.addEventListener('click', (e) => {
        const it = items[parseInt(el.dataset.hubI, 10)];
        if (!it) return;
        if (it.href) {
          closeProfileHub();
          closeProfileDropdown();
          return;
        }
        e.preventDefault();
        closeProfileHub();
        if (it.action) it.action();
      });
    });
  }

  async function openMyIdeasHub() {
    closeProfileDropdown();
    const pId = await getProfileId();
    if (!pId) { openAuthModal('signin'); return; }
    location.href = siteRootPrefix() + 'ideas/all.html?mine=1';
  }

  async function openMyArticlesHub() {
    closeProfileDropdown();
    const pId = await getProfileId();
    if (!pId) { openAuthModal('signin'); return; }
    location.href = siteRootPrefix() + 'articles/index.html?mine=1';
  }

  function openNotificationsWindow() {
    closeProfileDropdown();
    document.getElementById('notifBackdrop')?.remove();
    const bd = document.createElement('div');
    bd.id = 'notifBackdrop';
    bd.className = 'how-it-works-backdrop';
    const win = document.createElement('div');
    win.className = 'how-it-works-window';
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem('ideanest_notifications') || '[]');
      if (!Array.isArray(list)) list = [];
    } catch { list = []; }
    if (!list.length) {
      list = [{
        title: 'Добро пожаловать в IdeaNest',
        body: 'Здесь будут апвоуты, ответы и системные сообщения. Пока можете открыть подборку идей.'
      }];
    }

    win.innerHTML = `
      <button type="button" class="how-it-works-close" aria-label="Закрыть"><i data-lucide="x"></i></button>
      <h2>Уведомления</h2>
      <p class="how-lead">Ответы, апвоуты и важные события по аккаунту.</p>
      <div id="notifList"></div>`;
    bd.appendChild(win);
    document.body.appendChild(bd);
    const box = win.querySelector('#notifList');
    if (false) {
      box.innerHTML = `<div class="notif-empty">Пока тихо.</div>`;
    } else {
      box.innerHTML = list.map(n => `
        <div class="notif-item">
          <strong>${n.title || 'Уведомление'}</strong>
          <span>${n.body || ''}</span>
        </div>`).join('');
    }
    requestAnimationFrame(() => {
      bd.classList.add('active');
      win.classList.add('active');
    });
    if (window.lucide) lucide.createIcons();
    const close = () => {
      win.classList.remove('active');
      bd.classList.remove('active');
      setTimeout(() => bd.remove(), 250);
    };
    bd.addEventListener('click', (e) => { if (e.target === bd) close(); });
    win.querySelector('.how-it-works-close')?.addEventListener('click', close);
  }

  async function addAnotherAccount() {
    await rememberCurrentAccount();
    closeProfileDropdown();
    await supabaseClient.auth.signOut({ scope: 'local' });
    currentUser = null;
    currentProfile = null;
    if (loginBtn) loginBtn.style.display = '';
    if (profileWrapper) profileWrapper.style.display = 'none';
    openAuthModal('signin');
    showToast('Войдите в другой аккаунт');
  }

  async function doLogout() {
    closeProfileDropdown();
    await supabaseClient.auth.signOut();
    currentUser = null;
    currentProfile = null;
    if (loginBtn) loginBtn.style.display = '';
    if (profileWrapper) profileWrapper.style.display = 'none';
    showToast('Вы вышли');
  }

  function wireAccountMenuButtons() {
    document.querySelectorAll('.profile-dropdown .dropdown-item').forEach(el => {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text.includes('Текущий аккаунт')) {
        el.style.display = 'none';
        return;
      }
      if (text.includes('Добавить аккаунт') && !el.dataset.accWired) {
        el.dataset.accWired = '1';
        el.addEventListener('click', async (e) => {
          e.preventDefault();
          await addAnotherAccount();
        });
      }
      if (text.includes('Переключить аккаунт') && !el.dataset.accWired) {
        el.dataset.accWired = '1';
        el.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openAccountSwitcher(el);
        });
      }
    });

    const contentBtn = document.getElementById('hubContentBtn');
    if (contentBtn && !contentBtn.dataset.hubWired) {
      contentBtn.dataset.hubWired = '1';
      contentBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openProfileHub(contentBtn, 'Мой контент', [
          { label: 'Мои идеи', icon: 'lightbulb', action: () => openMyIdeasHub() },
          { label: 'Мои статьи', icon: 'book-open', action: () => openMyArticlesHub() },
          { label: 'Подборка идей', icon: 'sparkles', href: siteRootPrefix() + 'ideas/match.html' },
          { label: 'Все идеи', icon: 'grid-2x2', href: siteRootPrefix() + 'ideas/all.html' },
          { label: 'Все статьи', icon: 'library', href: siteRootPrefix() + 'articles/index.html' }
        ]);
      });
    }

    const accBtn = document.getElementById('hubAccountBtn');
    if (accBtn && !accBtn.dataset.hubWired) {
      accBtn.dataset.hubWired = '1';
      accBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openProfileHub(accBtn, 'Аккаунт', [
          { label: 'Уведомления', icon: 'bell', action: () => openNotificationsWindow() },
          { label: 'Добавить аккаунт', icon: 'plus', action: () => addAnotherAccount() },
          { label: 'Переключить аккаунт', icon: 'refresh-cw', action: () => openAccountSwitcher(accBtn) },
          { label: 'Выйти', icon: 'log-out', danger: true, action: () => doLogout() }
        ]);
      });
    }
  }

  wireAccountMenuButtons();

  // ================= Навбар: конфиг + мегаменю =================
  const NAVBAR_LS_KEY = 'ideanest_navbar_desktop';

  const NAV_CATALOG = [
    { id: 'home', kind: 'link', label: 'Главная', path: 'index.html', icon: 'home' },
    { id: 'ideas', kind: 'mega-ideas', label: 'Идеи', path: 'ideas/all.html', icon: 'lightbulb' },
    { id: 'articles', kind: 'mega-articles', label: 'Статьи', path: 'articles/index.html', icon: 'book-open' },
    { id: 'ideas-all', kind: 'link', label: 'Все идеи', path: 'ideas/all.html', icon: 'layout-grid', group: 'ideas' },
    { id: 'ideas-it', kind: 'link', label: 'IT & Tech', path: 'ideas/all.html?category=it', icon: 'cpu', group: 'ideas' },
    { id: 'ideas-offline', kind: 'link', label: 'Офлайн бизнес', path: 'ideas/all.html?category=offline', icon: 'store', group: 'ideas' },
    { id: 'ideas-crypto', kind: 'link', label: 'Крипто', path: 'ideas/all.html?category=crypto', icon: 'coins', group: 'ideas' },
    { id: 'articles-all', kind: 'link', label: 'Все статьи', path: 'articles/index.html', icon: 'book-open', group: 'articles' },
  ];

  const DEFAULT_NAVBAR = [
    { id: 'home', kind: 'link', label: 'Главная', path: 'index.html', icon: 'home' },
    { id: 'ideas', kind: 'mega-ideas', label: 'Идеи', path: 'ideas/all.html', icon: 'lightbulb' },
    { id: 'articles', kind: 'mega-articles', label: 'Статьи', path: 'articles/index.html', icon: 'book-open' },
  ];

  const NAV_STYLE_KEY = 'ideanest_navbar_style'; // '0' | '1'  кнопки вкл/выкл


  function loadNavbarConfig() {
    try {
      const raw = localStorage.getItem(NAVBAR_LS_KEY);
      if (!raw) return DEFAULT_NAVBAR.map(x => ({ ...x }));
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_NAVBAR.map(x => ({ ...x }));
      let items = parsed.map(item => {
        const cat = NAV_CATALOG.find(c => c.id === item.id);
        return cat ? { ...cat } : item;
      }).filter(Boolean);
      // миграция: если нет «Главная» — добавим в начало
      if (!items.some(i => i.id === 'home')) {
        const home = NAV_CATALOG.find(c => c.id === 'home');
        if (home) items = [{ ...home }, ...items];
      }
      return items;
    } catch {
      return DEFAULT_NAVBAR.map(x => ({ ...x }));
    }
  }

  function saveNavbarConfig(items) {
    localStorage.setItem(NAVBAR_LS_KEY, JSON.stringify(items));
  }

  function loadNavbarStyle() {
    // 0 = ссылки (по умолчанию), 1 = кнопки
    const v = localStorage.getItem(NAV_STYLE_KEY);
    return v === '1' || v === 'true' ? 1 : 0;
  }
  function saveNavbarStyle(v) {
    localStorage.setItem(NAV_STYLE_KEY, v ? '1' : '0');
    applyNavbarStyle(v ? 1 : 0);
  }
  function applyNavbarStyle(v) {
    const on = v === 1 || v === true || v === '1';
    document.documentElement.classList.toggle('nav-as-buttons', on);
  }

  function navHref(path) {
    if (!path) return '#';
    if (/^https?:\/\//.test(path)) return path;
    return siteRootPrefix() + path;
  }

  function isNavItemActive(item) {
    const path = window.location.pathname || '';
    const curCat = new URLSearchParams(window.location.search).get('category');
    const href = item.path || '';

    // Главная — только корень
    if (item.id === 'home') {
      return /\/(index\.html)?$/.test(path) || (path.endsWith('/') && !/\/(ideas|articles|settings|profile)\//.test(path));
    }

    // Конкретная категория идей — только при совпадении ?category=
    if (href.includes('category=')) {
      const cat = new URLSearchParams(href.split('?')[1] || '').get('category');
      return /\/ideas\//.test(path) && !!cat && cat === curCat;
    }

    // «Все идеи» / меню Идеи — идеи без category (или category отсутствует)
    if (item.kind === 'mega-ideas' || item.id === 'ideas-all') {
      return /\/ideas\//.test(path) && !curCat;
    }

    // Статьи
    if (item.kind === 'mega-articles' || item.id === 'articles-all') {
      return /\/articles\//.test(path);
    }

    if (href.includes('ideas/')) return /\/ideas\//.test(path) && !curCat;
    if (href.includes('articles/')) return /\/articles\//.test(path);
    return false;
  }

  function rebuildNavbarFromConfig() {
    const nav = document.querySelector('.nav-links');
    if (!nav) return;
    const items = loadNavbarConfig();
    nav.innerHTML = '';
    nav.dataset.megaReady = '';
    items.forEach(item => {
      const cat = NAV_CATALOG.find(c => c.id === item.id) || item;
      const a = document.createElement('a');
      a.className = 'nav-link';
      a.dataset.navId = cat.id;
      let href = cat.path || '#';
      if (cat.kind === 'mega-ideas') href = 'ideas/all.html';
      if (cat.kind === 'mega-articles') href = 'articles/index.html';
      a.href = navHref(href);
      const icon = cat.icon || 'circle';
      const group = cat.group || (cat.kind === 'mega-ideas' ? 'ideas' : cat.kind === 'mega-articles' ? 'articles' : cat.id === 'home' ? 'home' : 'link');
      a.dataset.navGroup = group;
      a.innerHTML = `<i data-lucide="${icon}" class="nav-link-icon"></i><span class="nav-link-text">${cat.label}</span>`;
      if (isNavItemActive(cat)) a.classList.add('active');
      nav.appendChild(a);
    });
    if (window.lucide) lucide.createIcons();
    applyNavbarStyle(loadNavbarStyle());
    initNavMegaMenus();
  }

  function pinToNavbar(catalogId) {
    const cat = NAV_CATALOG.find(c => c.id === catalogId);
    if (!cat) return;
    const items = loadNavbarConfig();
    if (items.some(i => i.id === cat.id)) {
      showToast('Уже есть в навбаре');
      return;
    }
    items.push({ ...cat });
    saveNavbarConfig(items);
    rebuildNavbarFromConfig();
    showToast('Добавлено в навбар: ' + cat.label);
    renderNavbarConfigSettings();
  }

  function unpinFromNavbar(catalogId) {
    let items = loadNavbarConfig().filter(i => i.id !== catalogId);
    if (!items.length) items = DEFAULT_NAVBAR.map(x => ({ ...x }));
    saveNavbarConfig(items);
    rebuildNavbarFromConfig();
    renderNavbarConfigSettings();
  }

  function initNavMegaMenus() {
    const nav = document.querySelector('.nav-links');
    if (!nav || nav.dataset.megaReady) return;
    nav.dataset.megaReady = '1';
    const root = siteRootPrefix();
    const ideasHref = root + 'ideas/all.html';
    const articlesHref = root + 'articles/index.html';
    const links = [...nav.querySelectorAll('a.nav-link')];
    links.forEach(link => {
      const id = link.dataset.navId;
      const cfg = id ? NAV_CATALOG.find(c => c.id === id) : null;
      const text = (link.textContent || '').trim().toLowerCase();
      const isIdeas = (cfg && cfg.kind === 'mega-ideas') || text.includes('идеи') || (link.getAttribute('href') || '').includes('ideas/all');
      const isArticles = (cfg && cfg.kind === 'mega-articles') || text.includes('стат') || (link.getAttribute('href') || '').includes('articles');
      // только mega-типы получают выпадашку
      const wantsMega = (cfg && (cfg.kind === 'mega-ideas' || cfg.kind === 'mega-articles')) || (!cfg && (isIdeas || isArticles));
      if (!wantsMega) return;
      if (cfg && cfg.kind === 'link') return;

      const wrap = document.createElement('div');
      wrap.className = 'nav-item';
      link.parentNode.insertBefore(wrap, link);
      wrap.appendChild(link);
      link.classList.add('nav-link--mega');

      const panel = document.createElement('div');
      panel.className = 'mega-menu';
      panel.setAttribute('role', 'menu');

      if (isIdeas || (cfg && cfg.kind === 'mega-ideas')) {
        panel.innerHTML = `
          <div class="mega-menu-inner">
            <div class="mega-menu-col">
              <div class="mega-menu-label">Каталог</div>
              <a class="mega-menu-item" href="${ideasHref}" role="menuitem">
                <i data-lucide="layout-grid"></i>
                <span><strong>Все идеи</strong><small>Полный каталог</small></span>
              </a>
              <a class="mega-menu-item" href="${ideasHref}?category=it" role="menuitem">
                <i data-lucide="cpu"></i>
                <span><strong>IT & Tech</strong><small>Цифровые продукты</small></span>
              </a>
              <a class="mega-menu-item" href="${ideasHref}?category=offline" role="menuitem">
                <i data-lucide="store"></i>
                <span><strong>Офлайн бизнес</strong><small>Локальные проекты</small></span>
              </a>
              <a class="mega-menu-item" href="${ideasHref}?category=crypto" role="menuitem">
                <i data-lucide="coins"></i>
                <span><strong>Крипто</strong><small>Web3 и токены</small></span>
              </a>
            </div>
            <div class="mega-menu-col mega-menu-col--side" data-mega-side="ideas">
              <div class="mega-menu-label">Свежие</div>
              <p class="mega-menu-loading">Загрузка…</p>
            </div>
          </div>`;
      } else {
        panel.innerHTML = `
          <div class="mega-menu-inner">
            <div class="mega-menu-col">
              <div class="mega-menu-label">Каталог</div>
              <a class="mega-menu-item" href="${articlesHref}" role="menuitem">
                <i data-lucide="book-open"></i>
                <span><strong>Все статьи</strong><small>Полный список</small></span>
              </a>
              <a class="mega-menu-item" href="${articlesHref}" role="menuitem">
                <i data-lucide="sparkles"></i>
                <span><strong>Новые</strong><small>Сначала свежие</small></span>
              </a>
              <a class="mega-menu-item" href="${articlesHref}" role="menuitem">
                <i data-lucide="flame"></i>
                <span><strong>Популярные</strong><small>По просмотрам</small></span>
              </a>
            </div>
            <div class="mega-menu-col mega-menu-col--side" data-mega-side="articles">
              <div class="mega-menu-label">По идеям</div>
              <p class="mega-menu-loading">Загрузка…</p>
            </div>
          </div>`;
      }

      wrap.appendChild(panel);

      let closeTimer = null;
      const open = () => {
        clearTimeout(closeTimer);
        document.querySelectorAll('.nav-item.open').forEach(el => {
          if (el !== wrap) el.classList.remove('open');
        });
        wrap.classList.add('open');
      };
      const scheduleClose = () => {
        // длиннее задержка + «мост» сверху у меню, чтобы курсор успел доехать
        closeTimer = setTimeout(() => wrap.classList.remove('open'), 320);
      };
      wrap.addEventListener('mouseenter', open);
      wrap.addEventListener('mouseleave', scheduleClose);
      link.addEventListener('focus', open);
      panel.addEventListener('mouseenter', () => clearTimeout(closeTimer));
      link.addEventListener('click', (e) => {
        if (window.matchMedia('(max-width: 760px)').matches) return;
        if (!wrap.classList.contains('open')) {
          e.preventDefault();
          open();
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-item')) {
        document.querySelectorAll('.nav-item.open').forEach(el => el.classList.remove('open'));
      }
    });

    if (window.lucide) lucide.createIcons();

    (async () => {
      try {
        const sides = document.querySelectorAll('[data-mega-side="ideas"]');
        if (sides.length) {
          const { data } = await supabaseClient
            .from('ideas')
            .select('id_idea, title, category, rating')
            .order('created_at', { ascending: false })
            .limit(4);
          const list = data || [];
          const html = list.length
            ? '<div class="mega-menu-label">Свежие</div>' + list.map(i => {
                const title = (i.title && i.title.trim()) ? i.title : ('Идея №' + i.id_idea);
                return `<a class="mega-menu-item mega-menu-item--compact" href="${ideaHref(i)}">
                  <span><strong>${title}</strong><small>${i.category || ''}${i.rating != null ? ' · ★ ' + Number(i.rating).toFixed(1) : ''}</small></span>
                </a>`;
              }).join('')
            : '<div class="mega-menu-label">Свежие</div><p class="mega-menu-empty">Пока пусто</p>';
          sides.forEach(side => { side.innerHTML = html; });
        }
      } catch (e) { console.warn(e); }

      try {
        const sides = document.querySelectorAll('[data-mega-side="articles"]');
        if (sides.length) {
          const { data } = await supabaseClient
            .from('ideas')
            .select('id_idea, title')
            .order('rating', { ascending: false, nullsFirst: false })
            .limit(4);
          const list = data || [];
          const html = list.length
            ? '<div class="mega-menu-label">По идеям</div>' + list.map(i => {
                const title = (i.title && i.title.trim()) ? i.title : ('Идея №' + i.id_idea);
                return `<a class="mega-menu-item mega-menu-item--compact" href="${root}articles/index.html?idea_id=${i.id_idea}">
                  <span><strong>${title}</strong><small>Статьи по этой идее</small></span>
                </a>`;
              }).join('')
            : '<div class="mega-menu-label">По идеям</div><p class="mega-menu-empty">Пока пусто</p>';
          sides.forEach(side => { side.innerHTML = html; });
        }
      } catch (e) { console.warn(e); }

      if (window.lucide) lucide.createIcons();
    })();
  }

  // Применить сохранённый навбар (вместо дефолтных ссылок в HTML)
  rebuildNavbarFromConfig();

  function renderNavbarConfigSettings() {
    const listEl = document.getElementById('navbarConfigList');
    const addEl = document.getElementById('navbarConfigAdd');
    if (!listEl || !addEl) return;

    const items = loadNavbarConfig();
    listEl.innerHTML = items.map((item, idx) => `
      <div class="navbar-config-item" draggable="true" data-idx="${idx}" data-id="${item.id}">
        <span class="nav-cfg-handle"><i data-lucide="grip-vertical"></i></span>
        <span class="nav-cfg-label">${item.label}</span>
        <span class="nav-cfg-kind">${item.group === 'ideas' ? 'идеи' : item.group === 'articles' ? 'статьи' : item.kind === 'link' ? 'ссылка' : 'меню'}</span>
        <button type="button" class="nav-cfg-remove" data-remove="${item.id}" title="Убрать" aria-label="Убрать">
          <i data-lucide="x"></i>
        </button>
      </div>
    `).join('');

    const present = new Set(items.map(i => i.id));
    addEl.innerHTML = NAV_CATALOG.map(c => `
      <button type="button" class="navbar-config-add-btn" data-add="${c.id}" ${present.has(c.id) ? 'disabled' : ''}>
        + ${c.label}
      </button>
    `).join('');

    if (window.lucide) lucide.createIcons();

    addEl.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', () => pinToNavbar(btn.dataset.add));
    });
    listEl.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => unpinFromNavbar(btn.dataset.remove));
    });

    // drag reorder
    let dragIdx = null;
    listEl.querySelectorAll('.navbar-config-item').forEach(row => {
      row.addEventListener('dragstart', () => {
        dragIdx = Number(row.dataset.idx);
        row.classList.add('dragging');
      });
      row.addEventListener('dragend', () => row.classList.remove('dragging'));
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        const overIdx = Number(row.dataset.idx);
        if (dragIdx === null || overIdx === dragIdx) return;
        const arr = loadNavbarConfig();
        const [moved] = arr.splice(dragIdx, 1);
        arr.splice(overIdx, 0, moved);
        saveNavbarConfig(arr);
        dragIdx = overIdx;
        rebuildNavbarFromConfig();
        renderNavbarConfigSettings();
      });
    });
  }


  // ================= 2. Модальное окно авторизации =================
  const authBackdrop = document.getElementById('authBackdrop');
  const authForm = document.getElementById('authForm');
  const authTabsWrapper = document.getElementById('authTabs');
  const authTabs = document.querySelectorAll('.auth-tab');
  const authResetBack = document.getElementById('authResetBack');
  const usernameGroup = document.getElementById('usernameGroup');
  const authFullName = document.getElementById('authFullName');
  const authUsername = document.getElementById('authUsername');
  const nicknameStatus = document.getElementById('nicknameStatus');
  const nicknameHint = document.getElementById('nicknameHint');
  const identifierGroup = document.getElementById('identifierGroup');
  const authEmail = document.getElementById('authEmail');
  const authEmailLabel = document.getElementById('authEmailLabel');
  const passwordGroup = document.getElementById('passwordGroup');
  const authPassword = document.getElementById('authPassword');
  const passwordToggleBtn = document.getElementById('passwordToggleBtn');
  const authForgotRow = document.getElementById('authForgotRow');
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  const recoveryPasswordGroup = document.getElementById('recoveryPasswordGroup');
  const recoveryPassword = document.getElementById('recoveryPassword');
  const recoveryPasswordToggleBtn = document.getElementById('recoveryPasswordToggleBtn');
  const authError = document.getElementById('authError');

  const authSubmitBtn = document.getElementById('authSubmitBtn');

  // ---- Юридические согласия при регистрации (два независимых checkbox) ----
  function ensureAuthConsentUI() {
    const form = document.getElementById('authForm');
    if (!form || document.getElementById('authConsentGroup')) return;
    const root = (typeof siteRootPrefix === 'function') ? siteRootPrefix() : '';
    const group = document.createElement('div');
    group.id = 'authConsentGroup';
    group.className = 'auth-consent-group';
    group.hidden = true;
    group.innerHTML =
      '<label class="auth-consent-item">' +
        '<input type="checkbox" id="authAcceptTerms" class="auth-consent-input" autocomplete="off" />' +
        '<span class="auth-consent-box" aria-hidden="true"><span class="auth-consent-fill"></span><svg class="auth-consent-check" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.2L6.6 11.2L12.5 4.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
        '<span class="auth-consent-text">Я ознакомился и принимаю <a href="' + root + 'terms.html" target="_blank" rel="noopener noreferrer">Пользовательское соглашение</a>.</span>' +
      '</label>' +
      '<label class="auth-consent-item">' +
        '<input type="checkbox" id="authAcceptPrivacy" class="auth-consent-input" autocomplete="off" />' +
        '<span class="auth-consent-box" aria-hidden="true"><span class="auth-consent-fill"></span><svg class="auth-consent-check" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.2L6.6 11.2L12.5 4.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
        '<span class="auth-consent-text">Я даю согласие на обработку моих персональных данных в соответствии с <a href="' + root + 'privacy.html" target="_blank" rel="noopener noreferrer">Политикой обработки персональных данных</a>.</span>' +
      '</label>';
    const errEl = document.getElementById('authError');
    if (errEl) form.insertBefore(group, errEl);
    else form.insertBefore(group, authSubmitBtn);
    group.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', (e) => e.stopPropagation());
    });
    group.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', syncAuthConsentState);
    });
  }

  function resetAuthConsent() {
    const t = document.getElementById('authAcceptTerms');
    const p = document.getElementById('authAcceptPrivacy');
    if (t) t.checked = false;
    if (p) p.checked = false;
  }

  function bothConsentsAccepted() {
    const t = document.getElementById('authAcceptTerms');
    const p = document.getElementById('authAcceptPrivacy');
    return !!(t && p && t.checked && p.checked);
  }

  function syncAuthConsentState() {
    if (!authSubmitBtn) return;
    const group = document.getElementById('authConsentGroup');
    const isSignup = (typeof authMode !== 'undefined' && authMode === 'signup');
    if (group) group.hidden = !isSignup;
    if (isSignup) {
      authSubmitBtn.disabled = !bothConsentsAccepted();
    }
  }

  ensureAuthConsentUI();

  const authCloseBtn = document.getElementById('authCloseBtn');
  let authMode = 'signin'; // 'signin' | 'signup' | 'reset' | 'recovery'
  let nicknameCheckTimer = null;
  let nicknameState = 'empty'; // 'empty' | 'invalid' | 'checking' | 'available' | 'taken'

  const NICKNAME_MIN = 5;
  const NICKNAME_MAX = 15;
  const NICKNAME_RE = /^[a-z0-9_]+$/;

  // Общая логика для кнопки-глаза (используется и для входа, и для восстановления):
  // меняет type поля, иконку (с анимацией через свежий <i>) и на секунду подсвечивает поле.
  function wirePasswordToggle(inputEl, btnEl) {
    if (!btnEl) return;
    btnEl.addEventListener('click', () => {
      const showing = inputEl.type === 'text';
      inputEl.type = showing ? 'password' : 'text';
      btnEl.innerHTML = `<i data-lucide="${showing ? 'eye' : 'eye-off'}"></i>`;
      btnEl.setAttribute('aria-label', showing ? 'Показать пароль' : 'Скрыть пароль');
      if (window.lucide) lucide.createIcons();
      inputEl.classList.add('flash');
      setTimeout(() => inputEl.classList.remove('flash'), 300);
    });
  }
  function resetPasswordToggle(inputEl, btnEl) {
    if (!btnEl) return;
    inputEl.type = 'password';
    btnEl.innerHTML = '<i data-lucide="eye"></i>';
    btnEl.setAttribute('aria-label', 'Показать пароль');
    if (window.lucide) lucide.createIcons();
  }
  wirePasswordToggle(authPassword, passwordToggleBtn);
  wirePasswordToggle(recoveryPassword, recoveryPasswordToggleBtn);

  function setNicknameStatus(state, hintText, isError) {
    nicknameState = state;
    nicknameStatus.className = 'nickname-status' + (state !== 'empty' ? ' ' + state : '');
    const icons = { checking: 'loader-2', available: 'check', taken: 'x', invalid: 'x' };
    nicknameStatus.innerHTML = icons[state] ? `<i data-lucide="${icons[state]}"></i>` : '';
    if (window.lucide) lucide.createIcons();
    if (hintText !== undefined) {
      nicknameHint.textContent = hintText;
      nicknameHint.classList.toggle('error', !!isError);
    }
  }

  const DEFAULT_NICKNAME_HINT = `От ${NICKNAME_MIN} до ${NICKNAME_MAX} символов: латиница в нижнем регистре, цифры, _`;

  async function checkNicknameAvailability(value) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('username', value)
        .maybeSingle();
      if (error) throw error;
      if (data) setNicknameStatus('taken', 'Этот никнейм уже занят.', true);
      else setNicknameStatus('available', DEFAULT_NICKNAME_HINT, false);
    } catch (err) {
      console.error('Ошибка проверки никнейма:', err);
      setNicknameStatus('empty', DEFAULT_NICKNAME_HINT, false);
    }
  }

  authUsername.addEventListener('input', () => {
    const cleaned = authUsername.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleaned !== authUsername.value) authUsername.value = cleaned;
    clearTimeout(nicknameCheckTimer);

    if (!cleaned) { setNicknameStatus('empty', DEFAULT_NICKNAME_HINT, false); return; }
    if (cleaned.length < NICKNAME_MIN || cleaned.length > NICKNAME_MAX) {
      setNicknameStatus('invalid', `Длина должна быть от ${NICKNAME_MIN} до ${NICKNAME_MAX} символов.`, true);
      return;
    }
    setNicknameStatus('checking', DEFAULT_NICKNAME_HINT, false);
    nicknameCheckTimer = setTimeout(() => checkNicknameAvailability(cleaned), 450);
  });

  function openAuthModal(mode) {
    authMode = mode || 'signin';
    const isReset = authMode === 'reset';
    const isRecovery = authMode === 'recovery';

    authTabsWrapper.style.display = (isReset || isRecovery) ? 'none' : 'flex';
    authResetBack.style.display = isReset ? 'flex' : 'none';
    authTabs.forEach(t => t.classList.toggle('active', t.dataset.authTab === authMode));

    usernameGroup.classList.toggle('expanded', authMode === 'signup');
    /* phone registration removed — no verification */
    identifierGroup.style.display = isRecovery ? 'none' : '';
    authEmail.required = !isRecovery;
    passwordGroup.style.display = (isReset || isRecovery) ? 'none' : '';
    authPassword.required = !(isReset || isRecovery);
    recoveryPasswordGroup.style.display = isRecovery ? 'flex' : 'none';
    authForgotRow.style.display = (authMode === 'signin') ? 'block' : 'none';

    if (isRecovery) authSubmitBtn.textContent = 'Сохранить новый пароль';
    else if (isReset) authSubmitBtn.textContent = 'Отправить письмо';
    else authSubmitBtn.textContent = authMode === 'signup' ? 'Создать аккаунт' : 'Войти';
    ensureAuthConsentUI();
    if (authMode === 'signup') {
      /* не сбрасываем галочки при каждом открытии вкладки только если уже signup? сбрасываем всегда для чистоты */
      resetAuthConsent();
    } else {
      resetAuthConsent();
    }
    syncAuthConsentState();
    if (authMode !== 'signup' && authMode !== 'reset' && authMode !== 'recovery') {
      authSubmitBtn.disabled = false;
    }


    if (authMode === 'signup') {
      authEmailLabel.textContent = 'Email';
      authEmail.placeholder = 'you@example.com';
    } else {
      authEmailLabel.textContent = 'Email или никнейм';
      authEmail.placeholder = 'you@example.com или nickname';
    }
    setNicknameStatus('empty', DEFAULT_NICKNAME_HINT, false);
    authError.textContent = '';
    if (!isRecovery) authForm.reset();
    resetPasswordToggle(authPassword, passwordToggleBtn);
    resetPasswordToggle(recoveryPassword, recoveryPasswordToggleBtn);
    authBackdrop.classList.add('active');
  }
  function closeAuthModal() { authBackdrop.classList.remove('active'); }

  loginBtn.addEventListener('click', () => openAuthModal('signin'));
  authCloseBtn.addEventListener('click', closeAuthModal);
  authBackdrop.addEventListener('click', (e) => { if (e.target === authBackdrop) closeAuthModal(); });

  authTabs.forEach(tab => {
    tab.addEventListener('click', () => openAuthModal(tab.dataset.authTab));
  });

  forgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); openAuthModal('reset'); });
  authResetBack.addEventListener('click', () => openAuthModal('signin'));

  // По введённой строке определяем, похоже это на email или на никнейм
  function looksLikeEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  // Превращает email-или-никнейм в настоящий email через RPC-функцию в базе
  async function resolveEmail(identifier) {
    if (looksLikeEmail(identifier)) return identifier;
    const nickname = identifier.replace(/^@/, '').toLowerCase();
    const { data: resolvedEmail, error } = await supabaseClient.rpc('get_email_by_username', { uname: nickname });
    if (error) throw error;
    return resolvedEmail || null;
  }

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.textContent = '';

    // ---- Восстановление: письмо со ссылкой на сброс пароля ----
    if (authMode === 'reset') {
      const identifier = authEmail.value.trim();
      if (!identifier) { authError.textContent = 'Введите email или никнейм.'; return; }
      authSubmitBtn.disabled = true;
      authSubmitBtn.textContent = 'Отправляем...';
      try {
        const email = await resolveEmail(identifier);
        if (!email) { authError.textContent = 'Пользователь с таким никнеймом не найден.'; return; }
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
        if (error) throw error;
        showToast('Письмо для сброса пароля отправлено на почту.');
        closeAuthModal();
      } catch (err) {
        authError.textContent = translateAuthError(err.message);
      } finally {
        authSubmitBtn.disabled = false;
        authSubmitBtn.textContent = 'Отправить письмо';
      }
      return;
    }

    // ---- Сохранение нового пароля после перехода по ссылке из письма ----
    if (authMode === 'recovery') {
      const newPass = recoveryPassword.value;
      if (!newPass || newPass.length < 6) { authError.textContent = 'Пароль должен быть не короче 6 символов.'; return; }
      authSubmitBtn.disabled = true;
      authSubmitBtn.textContent = 'Сохраняем...';
      try {
        const { error } = await supabaseClient.auth.updateUser({ password: newPass });
        if (error) throw error;
        showToast('Пароль обновлён.');
        closeAuthModal();
      } catch (err) {
        authError.textContent = translateAuthError(err.message);
      } finally {
        authSubmitBtn.disabled = false;
        authSubmitBtn.textContent = 'Сохранить новый пароль';
      }
      return;
    }

    // ---- Обычный вход / регистрация ----
    const identifier = authEmail.value.trim();
    const password = authPassword.value;
    if (!identifier || !password) { authError.textContent = 'Заполните все поля.'; return; }

    if (authMode === 'signup') {
      const fullName = authFullName.value.trim();
      const username = authUsername.value.trim();
      if (!fullName) { authError.textContent = 'Введите имя.'; return; }
      if (!username) { authError.textContent = 'Придумайте никнейм.'; return; }
      if (username.length < NICKNAME_MIN || username.length > NICKNAME_MAX || !NICKNAME_RE.test(username)) {
        authError.textContent = `Никнейм должен быть от ${NICKNAME_MIN} до ${NICKNAME_MAX} символов (латиница, цифры, _).`;
        return;
      }
      if (nicknameState === 'taken') { authError.textContent = 'Этот никнейм уже занят.'; return; }
      if (nicknameState === 'checking') { authError.textContent = 'Подождите, проверяем никнейм...'; return; }
      if (!looksLikeEmail(identifier)) { authError.textContent = 'Введите корректный email.'; return; }
      if (password.length < 6) { authError.textContent = 'Пароль должен быть не короче 6 символов.'; return; }
      if (!bothConsentsAccepted()) {
        authError.textContent = 'Примите Пользовательское соглашение и Политику обработки персональных данных.';
        return;
      }
    }

    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = authMode === 'signup' ? 'Создаём аккаунт...' : 'Входим...';

    try {
      if (authMode === 'signup') {
        const fullName = authFullName.value.trim();
        const username = authUsername.value.trim();
        // full_name хранится в Auth user_metadata, не в таблице profiles
        const acceptedAt = new Date().toISOString();
        const consentMeta = {
          full_name: fullName,
          username,
          accepted_terms: true,
          accepted_privacy: true,
          terms_accepted_at: acceptedAt,
          privacy_accepted_at: acceptedAt
        };
        const { data, error } = await supabaseClient.auth.signUp({
          email: identifier,
          password,
          options: { data: consentMeta }
        });
        if (error) throw error;
        // Согласия сохраняем только после успешного signUp (не при ошибке).
        if (data.user) {
          await ensureProfile(data.user, username, {
            accepted_terms: true,
            accepted_privacy: true,
            terms_accepted_at: acceptedAt,
            privacy_accepted_at: acceptedAt
          });
        }
        if (!data.session) {
          showToast('Проверьте почту — нужно подтвердить регистрацию.');
          closeAuthModal();
          return;
        }
      } else {
        const email = await resolveEmail(identifier);
        if (!email) { authError.textContent = 'Пользователь с таким никнеймом не найден.'; return; }
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      closeAuthModal();
    } catch (err) {
      authError.textContent = translateAuthError(err.message);
    } finally {
      authSubmitBtn.textContent = authMode === 'signup' ? 'Создать аккаунт' : 'Войти';
      if (authMode === 'signup') syncAuthConsentState();
      else authSubmitBtn.disabled = false;
    }
  });

  function translateAuthError(msg) {
    if (/already registered/i.test(msg)) return 'Пользователь с таким email уже зарегистрирован.';
    if (/invalid login credentials/i.test(msg)) return 'Неверный email/никнейм или пароль.';
    if (/password/i.test(msg) && /6/.test(msg)) return 'Пароль должен быть не короче 6 символов.';
    return msg;
  }

  // ================= 3. Состояние авторизации =================
  // Находит (или создаёт) запись в таблице profiles для текущего пользователя.
  // Схема: profiles(id, created_at, username, auth_id -> auth.users.id)
  // Имя (full_name) — только в Auth user_metadata, в profiles его нет.
  async function ensureProfile(user, usernameForNew, consentFields) {
    try {
      const username = usernameForNew
        || user.user_metadata?.username
        || (user.email ? user.email.split('@')[0] : 'user');
      const fullName = (user.user_metadata?.full_name || '').trim() || null;
      const firstName = (user.user_metadata?.first_name || '').trim() || null;
      const lastName = (user.user_metadata?.last_name || '').trim() || null;
      const meta = user.user_metadata || {};
      const consent = consentFields || {};
      if (consent.accepted_terms == null && meta.accepted_terms) {
        consent.accepted_terms = !!meta.accepted_terms;
        consent.accepted_privacy = !!meta.accepted_privacy;
        consent.terms_accepted_at = meta.terms_accepted_at || null;
        consent.privacy_accepted_at = meta.privacy_accepted_at || null;
      }

      const { data: existing, error: selErr } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('auth_id', user.id)
        .maybeSingle();
      if (selErr) throw selErr;

      if (existing) {
        // Синхронизируем имя из Auth → profiles, чтобы на статьях было видно ФИО
        const patch = {};
        if (fullName && existing.full_name !== fullName) patch.full_name = fullName;
        if (firstName && existing.first_name !== firstName) patch.first_name = firstName;
        if (lastName && existing.last_name !== lastName) patch.last_name = lastName;
        if (username && !existing.username) patch.username = username;
        const phone = (user.user_metadata?.phone || '').trim();
        if (phone && existing.phone !== phone) patch.phone = phone;
        // согласия: пишем только если ещё не зафиксированы и пришли с регистрации
        if (consent.accepted_terms && !existing.accepted_terms) {
          patch.accepted_terms = true;
          if (consent.terms_accepted_at) patch.terms_accepted_at = consent.terms_accepted_at;
        }
        if (consent.accepted_privacy && !existing.accepted_privacy) {
          patch.accepted_privacy = true;
          if (consent.privacy_accepted_at) patch.privacy_accepted_at = consent.privacy_accepted_at;
        }
        if (Object.keys(patch).length) {
          const { data: updated, error: upErr } = await supabaseClient
            .from('profiles')
            .update(patch)
            .eq('id', existing.id)
            .select()
            .maybeSingle();
          if (upErr) {
            // колонок согласий может ещё не быть — пробуем без них
            const safe = { ...patch };
            delete safe.accepted_terms; delete safe.accepted_privacy;
            delete safe.terms_accepted_at; delete safe.privacy_accepted_at;
            if (Object.keys(safe).length) {
              const { data: updated2 } = await supabaseClient.from('profiles').update(safe).eq('id', existing.id).select().maybeSingle();
              return updated2 || { ...existing, ...safe };
            }
            return existing;
          }
          return updated || { ...existing, ...patch };
        }
        return existing;
      }

      const row = { auth_id: user.id, username };
      if (fullName) row.full_name = fullName;
      if (firstName) row.first_name = firstName;
      if (lastName) row.last_name = lastName;
      const phoneNew = (user.user_metadata?.phone || '').trim();
      if (phoneNew) row.phone = phoneNew;
      if (consent.accepted_terms) {
        row.accepted_terms = true;
        if (consent.terms_accepted_at) row.terms_accepted_at = consent.terms_accepted_at;
      }
      if (consent.accepted_privacy) {
        row.accepted_privacy = true;
        if (consent.privacy_accepted_at) row.privacy_accepted_at = consent.privacy_accepted_at;
      }

      const { data: created, error: insErr } = await supabaseClient
        .from('profiles')
        .insert(row)
        .select()
        .maybeSingle();
      if (insErr) {
        // если колонок согласий/full_name ещё нет — пробуем только username
        const { data: created2, error: insErr2 } = await supabaseClient
          .from('profiles')
          .insert({ auth_id: user.id, username })
          .select()
          .maybeSingle();
        if (insErr2) throw insErr2;
        return created2;
      }
      return created;
    } catch (e) {
      console.error('Ошибка получения/создания профиля:', e);
      return null;
    }
  }

  async function updateUserUI() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    currentUser = session?.user || null;

    if (!currentUser) {
      currentProfile = null;
      if (loginBtn) loginBtn.style.display = '';
      if (profileWrapper) profileWrapper.style.display = 'none';
      closeProfileDropdown();
      return;
    }

    // Сразу показываем аватар (не ждём сеть) — иначе 5–10 сек пусто
    const quickName = currentUser.user_metadata?.username
      || currentUser.user_metadata?.full_name
      || (currentUser.email ? currentUser.email.split('@')[0] : 'U');
    const quickAvatar = defaultAvatarUrl(quickName);
    const topAv = document.getElementById('topAvatar');
    const dropAv = document.getElementById('dropdownAvatar');
    if (topAv) topAv.src = quickAvatar;
    if (dropAv) dropAv.src = quickAvatar;
    const nameEl = document.getElementById('userName');
    const emailEl = document.getElementById('userEmail');
    if (nameEl) nameEl.textContent = quickName;
    if (emailEl) emailEl.textContent = currentUser.email || '';
    if (loginBtn) loginBtn.style.display = 'none';
    if (profileWrapper) profileWrapper.style.display = '';

    // Профиль из БД — догружаем в фоне и обновляем подпись/аватар
    currentProfile = await ensureProfile(currentUser);
    if (!currentUser) return; // разлогинились пока ждали
    const displayName = currentProfile?.username || quickName;
    const avatarUrl = currentProfile?.avatar_url
      || defaultAvatarUrl(displayName);
    if (topAv) topAv.src = avatarUrl;
    if (dropAv) dropAv.src = avatarUrl;
    if (nameEl) nameEl.textContent = displayName;
  }

  // Реагируем на любые изменения сессии: вход, выход, обновление токена
  const initialUserUIPromise = updateUserUI();

  supabaseClient.auth.onAuthStateChange((event) => {
    updateUserUI();
    if (event === 'SIGNED_IN') {
      showToast('Вы вошли в аккаунт');
      rememberCurrentAccount();
    }
    if (event === 'PASSWORD_RECOVERY') openAuthModal('recovery');
  });
  // если уже в сессии — запомнить
  initialUserUIPromise.then(() => { if (currentUser) rememberCurrentAccount(); });

  // ================= 4. Тосты (уведомления) =================
  window.showToast = function (message, isError) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast' + (isError ? ' error' : '');
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  };

  // ================= 5. Кастомный Ползунок Рейтинга =================
  const ratingSlider = document.getElementById('ratingSlider');
  const sliderFill = document.getElementById('sliderFill');
  const ratingValue = document.getElementById('ratingValue');

  if (ratingSlider && sliderFill && ratingValue) {
    const updateSliderFill = () => {
      const min = ratingSlider.min || 0;
      const max = ratingSlider.max || 5;
      const val = ratingSlider.value;
      const percentage = ((val - min) / (max - min)) * 100;
      sliderFill.style.width = `${percentage}%`;
      ratingValue.textContent = Number(val).toFixed(1);
    };
    updateSliderFill();
    ratingSlider.addEventListener('input', updateSliderFill);
  }

  // ================= 6. Фильтры (категория + рейтинг, работают вместе) =================
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyIdeaFilters();
      // синхронизируем URL
      const cat = btn.dataset.filter;
      const url = new URL(window.location.href);
      if (cat && cat !== 'all') url.searchParams.set('category', cat);
      else url.searchParams.delete('category');
      history.replaceState(null, '', url);
    });
  });

  // ?category=it|offline|crypto
  const catFromUrl = new URLSearchParams(window.location.search).get('category');
  if (catFromUrl) {
    let matched = false;
    filterBtns.forEach(b => {
      const on = b.dataset.filter === catFromUrl;
      b.classList.toggle('active', on);
      if (on) matched = true;
    });
    if (!matched) filterBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
  }

  if (ratingSlider) {
    ratingSlider.addEventListener('input', () => applyIdeaFilters());
  }

  const ideaSearchInput = document.getElementById('ideaSearchInput');
  let searchDebounceTimer;
  if (ideaSearchInput) {
    ideaSearchInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(applyIdeaFilters, 200);
    });
  }

  // Кнопка "Фильтры" на мобильном — сворачивает/разворачивает боковую панель
  const mobileFilterToggle = document.getElementById('mobileFilterToggle');
  const ideasFilterSidebar = document.getElementById('ideasFilterSidebar');
  if (mobileFilterToggle && ideasFilterSidebar) {
    mobileFilterToggle.addEventListener('click', () => {
      const isOpen = ideasFilterSidebar.classList.toggle('mobile-expanded');
      mobileFilterToggle.classList.toggle('open', isOpen);
    });
  }

  const IDEA_SORT_LABELS = {
    new: 'Сначала новые', old: 'Сначала старые', cheap: 'Сначала дешевле', expensive: 'Сначала дороже',
    popular: 'По популярности', az: 'По алфавиту (А → Я)', za: 'По алфавиту (Я → А)'
  };
  const ideaUrlParams = new URLSearchParams(window.location.search);
  let currentIdeaSort = ideaUrlParams.get('sort') || localStorage.getItem('ideanest_idea_sort') || 'new';
  if (!IDEA_SORT_LABELS[currentIdeaSort]) currentIdeaSort = 'new';

  // Обратный фильтр: ?article_id=N → идеи, связанные со статьёй
  let filterArticleId = parseInt(ideaUrlParams.get('article_id'), 10) || null;
  let filterArticleTitle = null;
  let relatedIdeaIds = new Set();      // из idea_articles
  let mainIdeaIdForArticle = null;     // articles.main_idea_id этой статьи

  function updateIdeaUrlParams() {
    const params = new URLSearchParams(window.location.search);
    params.set('sort', currentIdeaSort);
    if (filterArticleId) params.set('article_id', String(filterArticleId));
    else params.delete('article_id');
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }

  function renderIdeaArticleFilterChip() {
    const chipBox = document.getElementById('ideaArticleFilterChip');
    if (!chipBox) return;
    if (!filterArticleId) {
      chipBox.style.display = 'none';
      chipBox.innerHTML = '';
      return;
    }
    const name = filterArticleTitle || ('Статья №' + filterArticleId);
    chipBox.style.display = 'flex';
    chipBox.innerHTML = `
      <span class="filter-chip">
        <span class="filter-chip-label">Фильтр:</span>
        <span class="filter-chip-name">${name}</span>
        <button type="button" class="filter-chip-clear" id="clearArticleFilterBtn" aria-label="Сбросить фильтр">
          <i data-lucide="x"></i>
        </button>
      </span>`;
    if (window.lucide) lucide.createIcons();
    document.getElementById('clearArticleFilterBtn')?.addEventListener('click', () => {
      filterArticleId = null;
      filterArticleTitle = null;
      relatedIdeaIds = new Set();
      mainIdeaIdForArticle = null;
      updateIdeaUrlParams();
      renderIdeaArticleFilterChip();
      applyIdeaFilters();
    });
  }

  async function resolveFilterArticle() {
    if (!filterArticleId) return;
    try {
      const [{ data: article }, { data: rel }] = await Promise.all([
        supabaseClient.from('articles').select('id, title, main_idea_id').eq('id', filterArticleId).maybeSingle(),
        supabaseClient.from('idea_articles').select('id_idea').eq('id_article', filterArticleId)
      ]);
      if (article) {
        filterArticleTitle = (article.title && article.title.trim()) ? article.title : ('Статья №' + article.id);
        mainIdeaIdForArticle = article.main_idea_id ? Number(article.main_idea_id) : null;
        renderIdeaArticleFilterChip();
      }
      relatedIdeaIds = new Set((rel || []).map(r => Number(r.id_idea)));
      if (mainIdeaIdForArticle) relatedIdeaIds.add(mainIdeaIdForArticle);
      applyIdeaFilters();
    } catch (e) { console.warn('Не удалось загрузить данные фильтра по статье:', e); }
  }

  function sortIdeas(list) {
    const sorted = [...list];
    sorted.sort((a, b) => {
      // Главная идея статьи — выше остальных связанных
      if (filterArticleId && mainIdeaIdForArticle) {
        const fa = Number(a.id_idea) === mainIdeaIdForArticle ? 1 : 0;
        const fb = Number(b.id_idea) === mainIdeaIdForArticle ? 1 : 0;
        if (fa !== fb) return fb - fa;
      }
      if (currentIdeaSort === 'new') return new Date(b.created_at) - new Date(a.created_at);
      if (currentIdeaSort === 'old') return new Date(a.created_at) - new Date(b.created_at);
      if (currentIdeaSort === 'cheap') return (a.budget ?? Infinity) - (b.budget ?? Infinity);
      if (currentIdeaSort === 'expensive') return (b.budget ?? -Infinity) - (a.budget ?? -Infinity);
      if (currentIdeaSort === 'popular') return (b._popularity || 0) - (a._popularity || 0);
      if (currentIdeaSort === 'az') return ideaTitle(a).localeCompare(ideaTitle(b), 'ru');
      if (currentIdeaSort === 'za') return ideaTitle(b).localeCompare(ideaTitle(a), 'ru');
      return 0;
    });
    return sorted;
  }

  function initIdeaSortDropdown() {
    const dropdown = document.getElementById('ideaSortDropdown');
    if (!dropdown) return;
    const btn = document.getElementById('ideaSortBtn');
    const btnLabel = document.getElementById('ideaSortBtnLabel');
    const menu = document.getElementById('ideaSortMenu');

    function setActive() {
      menu.querySelectorAll('.sort-dropdown-item').forEach(el => el.classList.toggle('active', el.dataset.sort === currentIdeaSort));
      if (btnLabel) btnLabel.textContent = IDEA_SORT_LABELS[currentIdeaSort];
    }
    setActive();
    if (window.lucide) lucide.createIcons();

    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.sort-dropdown.open').forEach(el => { if (el !== dropdown) el.classList.remove('open'); });
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', (e) => { if (!dropdown.contains(e.target)) dropdown.classList.remove('open'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dropdown.classList.remove('open'); });

    menu?.querySelectorAll('.sort-dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        currentIdeaSort = item.dataset.sort;
        localStorage.setItem('ideanest_idea_sort', currentIdeaSort);
        updateIdeaUrlParams();
        setActive();
        dropdown.classList.remove('open');
        applyIdeaFilters();
      });
    });
  }
  initIdeaSortDropdown();
  renderIdeaArticleFilterChip();
  if (filterArticleId) resolveFilterArticle();

  // UI-выбор статьи для фильтра на странице идей
  (async function initIdeaArticleFilterDropdown() {
    const dd = document.getElementById('ideaArticleFilterDropdown');
    const fBtn = document.getElementById('ideaArticleFilterBtn');
    const fMenu = document.getElementById('ideaArticleFilterMenu');
    const fLabel = document.getElementById('ideaArticleFilterLabel');
    if (!dd || !fBtn || !fMenu) return;

    fBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.sort-dropdown.open').forEach(el => { if (el !== dd) el.classList.remove('open'); });
      dd.classList.toggle('open');
    });
    document.addEventListener('click', (e) => { if (!dd.contains(e.target)) dd.classList.remove('open'); });

    try {
      const { data: articles } = await supabaseClient
        .from('articles')
        .select('id, title')
        .order('created_at', { ascending: false });
      const list = articles || [];
      fMenu.innerHTML = [
        `<button type="button" class="sort-dropdown-item${!filterArticleId ? ' active' : ''}" data-article-id="">Все статьи</button>`,
        ...list.map(a => {
          const title = a.title || ('Статья №' + a.id);
          const active = filterArticleId === Number(a.id) ? ' active' : '';
          return `<button type="button" class="sort-dropdown-item${active}" data-article-id="${a.id}">${title}</button>`;
        })
      ].join('');
      if (filterArticleId) {
        const found = list.find(a => Number(a.id) === filterArticleId);
        if (found && fLabel) fLabel.textContent = found.title || ('Статья №' + found.id);
      }
      fMenu.querySelectorAll('[data-article-id]').forEach(el => {
        el.addEventListener('click', async () => {
          const raw = el.dataset.articleId;
          filterArticleId = raw ? parseInt(raw, 10) : null;
          filterArticleTitle = filterArticleId ? el.textContent.trim() : null;
          relatedIdeaIds = new Set();
          mainIdeaIdForArticle = null;
          updateIdeaUrlParams();
          renderIdeaArticleFilterChip();
          fMenu.querySelectorAll('.sort-dropdown-item').forEach(x => x.classList.toggle('active', x === el));
          if (fLabel) fLabel.textContent = filterArticleId ? el.textContent.trim() : 'Статья';
          dd.classList.remove('open');
          if (filterArticleId) await resolveFilterArticle();
          else applyIdeaFilters();
        });
      });
    } catch (e) {
      console.warn(e);
      fMenu.innerHTML = '<p class="sort-dropdown-empty">Не удалось загрузить</p>';
    }
    if (window.lucide) lucide.createIcons();
  })();



  function renderActiveIdeaFilterChips() {
    let bar = document.getElementById('activeIdeaFilters');
    const host = document.querySelector('.filters-container') || document.getElementById('ideasGrid')?.previousElementSibling;
    if (!host && !document.getElementById('ideasGrid')) return;
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'activeIdeaFilters';
      bar.className = 'active-filters-bar';
      const grid = document.getElementById('ideasGrid');
      if (grid) grid.parentNode.insertBefore(bar, grid);
      else return;
    }
    const chips = [];
    const cat = document.querySelector('.filter-btn.active')?.dataset.filter;
    if (cat && cat !== 'all') chips.push({ key: 'cat', label: 'Категория: ' + cat });
    const ratingSlider = document.getElementById('ratingSlider');
    if (ratingSlider && parseFloat(ratingSlider.value) > 0) chips.push({ key: 'rating', label: 'Рейтинг ≥ ' + ratingSlider.value });
    const q = document.getElementById('ideaSearch')?.value?.trim();
    if (q) chips.push({ key: 'q', label: 'Поиск: ' + q });
    if (filterArticleId) chips.push({ key: 'article', label: 'Связь со статьёй' });
    if (new URLSearchParams(location.search).get('mine') === '1') chips.push({ key: 'mine', label: 'Только мои' });
    bar.innerHTML = chips.map(c => `<span class="filter-chip-active">${c.label} <button type="button" data-chip="${c.key}" aria-label="Убрать">×</button></span>`).join('');
    bar.querySelectorAll('[data-chip]').forEach(btn => {
      btn.addEventListener('click', () => {
        const k = btn.dataset.chip;
        if (k === 'cat') document.querySelector('.filter-btn[data-filter="all"]')?.click();
        if (k === 'rating' && ratingSlider) { ratingSlider.value = 0; ratingSlider.dispatchEvent(new Event('input')); }
        if (k === 'q') { const s = document.getElementById('ideaSearch'); if (s) { s.value = ''; s.dispatchEvent(new Event('input')); } }
        if (k === 'article' || k === 'mine') location.href = siteRootPrefix() + 'ideas/all.html';
        applyIdeaFilters();
        renderActiveIdeaFilterChips();
      });
    });
  }

  function applyIdeaFilters() {
    const activeBtn = document.querySelector('.filter-btn.active');
    const category = activeBtn ? activeBtn.dataset.filter : 'all';
    const minRating = ratingSlider ? parseFloat(ratingSlider.value) : 0;
    const searchQuery = ideaSearchInput ? ideaSearchInput.value.trim().toLowerCase() : '';
    const urlMine = new URLSearchParams(location.search).get('mine') === '1';

    const filtered = ideasCache.filter(idea => {
      const matchesArticle = !filterArticleId || relatedIdeaIds.has(Number(idea.id_idea));
      const matchesCategory = category === 'all' || idea.category === category;
      const matchesRating = idea.rating == null ? minRating === 0 : Number(idea.rating) >= minRating;
      const matchesMine = !urlMine || (currentProfile && Number(idea.id_profile) === Number(currentProfile.id));
      const matchesSearch = !searchQuery || [idea.title, idea.pluses, idea.minuses, idea.risks, idea.potential]
        .some(field => (field || '').toLowerCase().includes(searchQuery));
      return matchesArticle && matchesCategory && matchesRating && matchesMine && matchesSearch;
    });

    renderIdeasList(sortIdeas(filtered));
    renderActiveIdeaFilterChips();
  }

  // ================= 7. Идеи из Supabase (карточки + окно предпросмотра) =================
  // Схема таблицы ideas: id_idea, budget, risks, potential, complexity, rating,
  // pluses, minuses, id_profile, created_at. Названия/описания у идей пока нет —
  // как временное решение подписываем карточки как "Идея №N".
  const ideasGrid = document.getElementById('ideasGrid');
  const ideaBackdrop = document.getElementById('ideaBackdrop');
  const ideaModalBody = document.getElementById('ideaModalBody');
  const ideaCloseBtn = document.getElementById('ideaCloseBtn');
  let ideasCache = [];

  function closeIdeaModal() { if (ideaBackdrop) ideaBackdrop.classList.remove('active'); }
  if (ideaCloseBtn) ideaCloseBtn.addEventListener('click', closeIdeaModal);
  if (ideaBackdrop) ideaBackdrop.addEventListener('click', (e) => { if (e.target === ideaBackdrop) closeIdeaModal(); });

  function formatBudget(budget) {
    if (budget === null || budget === undefined) return 'не указан';
    return `от ${Number(budget).toLocaleString('ru-RU')} ₽`;
  }

  // Название идеи: используем столбец title, если он заполнен,
  // иначе (для старых строк без названия) — запасной вариант "Идея №N".
  function ideaTitle(idea) {
    return idea.title && idea.title.trim() ? idea.title : `Идея №${idea.id_idea}`;
  }

  /** Обложка: cover_url | image_url | banner_url | thumbnail_url */
  function mediaCoverUrl(row) {
    if (!row) return '';
    const u = row.cover_url || row.image_url || row.banner_url || row.thumbnail_url || '';
    return (typeof u === 'string' && u.trim()) ? u.trim() : '';
  }

  function escapeAttr(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function renderCardCover(url, fallbackClass) {
    if (url) {
      return `<div class="card-cover" style="background-image:url('${escapeAttr(url)}')"></div>`;
    }
    return `<div class="card-cover card-cover--fallback ${fallbackClass || ''}"></div>`;
  }

  function renderIdeaCard(idea, { featured } = {}) {
    const len = featured ? 180 : 110;
    const shortText = (idea.pluses || idea.risks || 'Описание пока не заполнено.').slice(0, len);
    const cls = featured ? 'card card--has-cover card--featured' : 'card card--has-cover';
    const badge = featured
      ? `<span class="card-featured-badge"><i data-lucide="star"></i> Главная идея статьи</span>`
      : '';
    const cat = (idea.category || 'default').toLowerCase();
    const cover = renderCardCover(mediaCoverUrl(idea), 'card-cover--idea-' + cat);
    return `
      <div class="${cls}" data-idea-id="${idea.id_idea}">
        ${cover}
        <div class="card-body">
          ${badge}
          <span class="card-tag">${idea.complexity || idea.category || 'Идея'}</span>
          <h3 class="card-title">${ideaTitle(idea)}</h3>
          <p class="card-desc">${shortText}${shortText.length >= len ? '…' : ''}</p>
          <div class="card-footer">
            <span>${formatBudget(idea.budget)}</span>
            <div class="card-rating">
              <i data-lucide="star" style="width:14px; height:14px; fill: currentColor;"></i> ${idea.rating != null ? Number(idea.rating).toFixed(1) : '—'}
            </div>
          </div>
        </div>
      </div>`;
  }

  function openIdeaPreview(idea) {
    if (!ideaBackdrop || !ideaModalBody) return;
    ideaModalBody.innerHTML = `
      <span class="card-tag">${idea.complexity || 'Сложность не указана'}</span>
      <h2 class="idea-modal-title">${ideaTitle(idea)}</h2>
      <div class="idea-pill-row">
        <span class="idea-pill"><i data-lucide="wallet"></i> ${formatBudget(idea.budget)}</span>
        <span class="idea-pill"><i data-lucide="bar-chart-2"></i> ${idea.complexity || '—'}</span>
        <span class="idea-pill"><i data-lucide="trending-up"></i> ${idea.potential || '—'}</span>
        <span class="idea-pill"><i data-lucide="star"></i> ${idea.rating != null ? Number(idea.rating).toFixed(1) : '—'}</span>
      </div>
      <div id="ideaPaybackMount">${renderPaybackCalcHTML(idea.budget || 0, 0)}</div>
      <div class="idea-field-block">
        <h4><i data-lucide="thumbs-up"></i> Плюсы</h4>
        <p>${idea.pluses || 'Не заполнено.'}</p>
      </div>
      <div class="idea-field-block">
        <h4><i data-lucide="thumbs-down"></i> Минусы</h4>
        <p>${idea.minuses || 'Не заполнено.'}</p>
      </div>
      <div class="idea-field-block">
        <h4><i data-lucide="alert-triangle"></i> Риски</h4>
        <p>${idea.risks || 'Не заполнено.'}</p>
      </div>
      <a class="btn btn-primary idea-open-btn" href="${ideaHref(idea)}">
        <i data-lucide="maximize-2"></i> Открыть
      </a>
    `;
    if (window.lucide) lucide.createIcons();
    ideaBackdrop.classList.add('active');
  }

  const isHomePage = !!(
    document.getElementById('ideasGrid') &&
    document.getElementById('articlesGrid') &&
    !document.getElementById('ideaSearchInput')
  );
  const HOME_ROW_LIMIT = 6; // ~2 ряда при 3 колонках

  function renderIdeasList(list) {
    if (!ideasGrid) return;
    const shown = isHomePage ? list.slice(0, HOME_ROW_LIMIT) : list;
    ideasGrid.classList.add('grid-fade');
    setTimeout(() => {
      const urlMine = new URLSearchParams(location.search).get('mine') === '1';
      if (!shown.length) {
        ideasGrid.innerHTML = urlMine
          ? `<div class="empty-state"><h3>Пока нет ваших идей</h3><p>Когда опубликуете идею — она появится здесь.</p>
             <a class="btn btn-primary" href="${siteRootPrefix()}ideas/match.html">Подобрать идеи</a></div>`
          : `<div class="empty-state"><h3>Ничего не найдено</h3><p>Попробуйте сбросить фильтры или изменить запрос.</p>
             <button type="button" class="btn btn-secondary" id="resetIdeaFiltersBtn">Сбросить фильтры</button></div>`;
      } else {
        ideasGrid.innerHTML = shown.map(idea => renderIdeaCard(idea, {
            featured: !!(filterArticleId && mainIdeaIdForArticle && Number(idea.id_idea) === mainIdeaIdForArticle)
          })).join('');
      }
      document.getElementById('resetIdeaFiltersBtn')?.addEventListener('click', () => {
        location.href = siteRootPrefix() + 'ideas/all.html';
      });
      if (window.lucide) lucide.createIcons();
      ideasGrid.querySelectorAll('[data-idea-id]').forEach(card => {
        card.addEventListener('click', () => {
          const idea = ideasCache.find(i => i.id_idea === parseInt(card.dataset.ideaId, 10));
          if (idea) openIdeaPreview(idea);
        });
      });
      ideasGrid.classList.remove('grid-fade');
    }, 190);
  }

  async function loadIdeasFromSupabase() {
    if (!ideasGrid) return;
    ideasGrid.innerHTML = '<div class="skeleton-grid">' + Array(6).fill('<div class="skeleton-card"></div>').join('') + '</div>';
    try {
      const { data, error } = await supabaseClient
        .from('ideas')
        .select('id_idea, title, category, budget, complexity, rating, potential, pluses, minuses, risks, cover_url, image_url, banner_url')
        .order('id_idea', { ascending: true });
      if (error) throw error;
      ideasCache = data || [];
      try {
        const { data: upvotes } = await supabaseClient.from('upvotes_ideas').select('id_idea');
        const counts = {};
        (upvotes || []).forEach(r => { counts[r.id_idea] = (counts[r.id_idea] || 0) + 1; });
        ideasCache.forEach(i => { i._popularity = counts[i.id_idea] || 0; });
      } catch (e) { ideasCache.forEach(i => { i._popularity = 0; }); }
      applyIdeaFilters();
    } catch (e) {
      console.error('Ошибка загрузки идей:', e);
      ideasGrid.innerHTML = '<p style="opacity:0.6;">Не удалось загрузить идеи.</p>';
    }
  }

  loadIdeasFromSupabase();


  // ================= Подборка идей (ideas/match.html) =================
  async function initIdeaMatchPage() {
    const form = document.getElementById('ideaMatchForm');
    const grid = document.getElementById('matchResultsGrid');
    if (!form || !grid) return;

    const status = document.getElementById('matchStatus');
    status.textContent = 'Загрузка идей…';

    let ideas = [];
    try {
      const { data, error } = await supabaseClient
        .from('ideas')
        .select('*')
        .order('rating', { ascending: false });
      if (error) throw error;
      ideas = data || [];
      status.textContent = ideas.length ? `В базе ${ideas.length} идей. Задай критерии и нажми «Подобрать».` : 'Идей пока нет.';
    } catch (e) {
      console.error(e);
      status.textContent = 'Не удалось загрузить идеи.';
      return;
    }

    function normComplexity(v) {
      const s = String(v || '').toLowerCase();
      if (/низк|low|лёгк|легк|просто/.test(s)) return 'low';
      if (/средн|medium|сред/.test(s)) return 'medium';
      if (/высок|high|сложн/.test(s)) return 'high';
      return s;
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const budgetRaw = document.getElementById('matchBudget').value;
      const budgetMax = budgetRaw === '' ? null : Number(budgetRaw);
      const category = document.getElementById('matchCategory').value;
      const complexity = document.getElementById('matchComplexity').value;
      const minRating = Number(document.getElementById('matchRating').value) || 0;

      let list = ideas.slice();
      if (budgetMax != null && !Number.isNaN(budgetMax)) {
        list = list.filter(i => i.budget == null || Number(i.budget) <= budgetMax);
      }
      if (category !== 'all') {
        list = list.filter(i => (i.category || '').toLowerCase() === category);
      }
      if (complexity !== 'all') {
        list = list.filter(i => normComplexity(i.complexity) === complexity || normComplexity(i.complexity).includes(complexity));
      }
      if (minRating > 0) {
        list = list.filter(i => i.rating != null && Number(i.rating) >= minRating);
      }

      status.textContent = list.length
        ? `Найдено: ${list.length}`
        : 'Ничего не подошло — ослабь фильтры.';
      grid.innerHTML = list.length
        ? list.map(i => renderIdeaCard(i)).join('')
        : '';
      if (window.lucide) lucide.createIcons();
      grid.querySelectorAll('[data-idea-id]').forEach(card => {
        card.addEventListener('click', () => {
          const idea = list.find(x => String(x.id_idea) === String(card.dataset.ideaId));
          if (idea && typeof openIdeaPreview === 'function') openIdeaPreview(idea);
        });
      });
    });
  }
  initIdeaMatchPage();

  (function injectMatchLink() {
    const header = document.querySelector('.section-header, main .section-title');
    if (!header) return;
    if (document.getElementById('ideaMatchCta')) return;
    const path = (location.pathname || '').toLowerCase();
    if (!path.includes('/ideas/')) return;
    const root = siteRootPrefix();
    const a = document.createElement('a');
    a.id = 'ideaMatchCta';
    a.href = root + 'ideas/match.html';
    a.className = 'btn btn-secondary';
    a.style.marginLeft = '12px';
    a.innerHTML = '<i data-lucide="sparkles"></i> Подборка';
    if (header.classList && header.classList.contains('section-header')) {
      header.appendChild(a);
    } else {
      header.parentNode?.insertBefore(a, header.nextSibling);
    }
    if (window.lucide) lucide.createIcons();
  })();



  // ================= 7б. Статьи из Supabase (карточки + окно предпросмотра) =================
  // Схема таблицы articles: id, id_profile, title, text, created_at.
  // Автора подтягиваем через связь articles.id_profile -> profiles.id (username).
  const articlesGrid = document.getElementById('articlesGrid');
  const articleBackdrop = document.getElementById('articleBackdrop');
  const articleModalBody = document.getElementById('articleModalBody');
  const articleCloseBtn = document.getElementById('articleCloseBtn');
  let articlesCache = [];

  function closeArticleModal() { if (articleBackdrop) articleBackdrop.classList.remove('active'); }
  if (articleCloseBtn) articleCloseBtn.addEventListener('click', closeArticleModal);
  if (articleBackdrop) articleBackdrop.addEventListener('click', (e) => { if (e.target === articleBackdrop) closeArticleModal(); });

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return ''; }
  }

  function authorProfile(article) {
    return article?.profiles || null;
  }

  /** Имя для показа: full_name (или имя+фамилия) → иначе @username */
  function articleAuthorName(article) {
    const p = authorProfile(article);
    if (!p) return 'Автор не указан';
    const full = (p.full_name || '').trim();
    if (full) return full;
    const composed = [p.last_name, p.first_name].filter(Boolean).join(' ').trim()
      || [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
    if (composed) return composed;
    if (p.username) return p.username;
    return 'Автор не указан';
  }

  function articleAuthor(article) {
    return articleAuthorName(article);
  }

  function authorAvatarUrl(profile, displayName) {
    if (profile?.avatar_url) return profile.avatar_url;
    const n = displayName || profile?.username || 'U';
    return defaultAvatarUrl(n);
  }

  
  function ensureAuthorCardModal() {
    if (document.getElementById('authorCardBackdrop')) return;
    const el = document.createElement('div');
    el.id = 'authorCardBackdrop';
    el.className = 'float-pop-backdrop';
    el.innerHTML = `<div class="float-pop float-pop--author" id="authorCardModal" role="dialog" aria-label="Профиль автора"><div id="authorCardBody"></div></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (e) => { if (e.target === el) closeAuthorCard(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && el.classList.contains('active')) closeAuthorCard();
    });
  }

  function closeAuthorCard() {
    const bd = document.getElementById('authorCardBackdrop');
    if (!bd) return;
    bd.classList.remove('active');
  }

  function placeFloatFromAnchor(pop, anchorEl, mode) {
    // mode: 'down-right' | used for author
    const r = anchorEl.getBoundingClientRect();
    const gap = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    pop.style.position = 'fixed';
    pop.style.right = 'auto';
    pop.style.bottom = 'auto';
    let left = r.left;
    let top = r.bottom + gap;
    // measure after visible
    const pw = pop.offsetWidth || 320;
    const ph = pop.offsetHeight || 280;
    if (left + pw > vw - 12) left = Math.max(12, vw - pw - 12);
    if (top + ph > vh - 12) top = Math.max(12, r.top - ph - gap);
    left = Math.max(12, left);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    pop.style.transformOrigin = 'top left';
  }

  async function openAuthorCard(profileOrId, fallbackArticle, anchorEl) {
    ensureAuthorCardModal();
    const backdrop = document.getElementById('authorCardBackdrop');
    const modal = document.getElementById('authorCardModal');
    const body = document.getElementById('authorCardBody');
    if (!backdrop || !modal || !body) return;

    let profile = typeof profileOrId === 'object' && profileOrId ? { ...profileOrId } : null;
    let profileId = profile?.id || (typeof profileOrId === 'number' ? profileOrId : null)
      || fallbackArticle?.id_profile || null;

    body.innerHTML = '<p class="author-card-loading">Загрузка…</p>';
    if (anchorEl) placeFloatFromAnchor(modal, anchorEl, 'down-right');
    else {
      modal.style.left = '50%';
      modal.style.top = '20%';
      modal.style.transformOrigin = 'top center';
    }
    backdrop.classList.add('active');

    try {
      if (profileId) {
        const { data } = await supabaseClient.from('profiles').select('*').eq('id', profileId).maybeSingle();
        if (data) profile = { ...profile, ...data };
      }
      if (!profile) {
        body.innerHTML = '<p class="author-card-loading">Автор не найден.</p>';
        return;
      }
      profileId = profile.id;

      let articles = [];
      if (profileId) {
        const { data: arts } = await supabaseClient
          .from('articles')
          .select('*')
          .eq('id_profile', profileId)
          .order('created_at', { ascending: false })
          .limit(12);
        articles = arts || [];
      }

      const displayName = articleAuthorName({ profiles: profile });
      const nick = profile.username ? '@' + profile.username : '';
      const av = authorAvatarUrl(profile, displayName);
      const count = articles.length;
      const countWord = count === 1 ? 'статья' : (count >= 2 && count <= 4 ? 'статьи' : 'статей');

      body.innerHTML = `
        <div class="author-card-head">
          <img class="author-card-avatar" src="${escapeAttr(av)}" alt="" />
          <div class="author-card-identity">
            <div class="author-card-name">${displayName}</div>
            ${nick ? `<div class="author-card-nick">${nick}</div>` : ''}
          </div>
        </div>
        <div class="author-card-section-title">Статьи автора · ${count} ${countWord}</div>
        <div class="author-card-articles">
          ${articles.length ? articles.map(a => `
            <a class="author-mini-card" href="${articleHref(a)}">
              ${mediaCoverUrl(a) ? `<span class="author-mini-cover"><img src="${escapeAttr(mediaCoverUrl(a))}" alt="" /></span>` : `<span class="author-mini-cover author-mini-cover--empty"></span>`}
              <span class="author-mini-body">
                <span class="author-mini-title">${a.title || 'Без названия'}</span>
                <span class="author-mini-date">${formatDate(a.created_at) || ''}</span>
              </span>
            </a>`).join('') : '<p class="author-card-empty">Пока нет статей.</p>'}
        </div>`;
      if (anchorEl) placeFloatFromAnchor(modal, anchorEl, 'down-right');
    } catch (e) {
      console.error(e);
      body.innerHTML = '<p class="author-card-loading">Не удалось загрузить профиль.</p>';
    }
  }

function wireAuthorTagClicks(root) {
    (root || document).querySelectorAll('.author-tag').forEach(tag => {
      if (tag.dataset.authorWired) return;
      tag.dataset.authorWired = '1';
      tag.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = tag.dataset.profileId ? parseInt(tag.dataset.profileId, 10) : null;
        const articleId = tag.dataset.articleId ? parseInt(tag.dataset.articleId, 10) : null;
        const art = articleId && typeof articlesCache !== 'undefined'
          ? articlesCache.find(a => Number(a.id) === articleId)
          : null;
        openAuthorCard(art?.profiles || id, art, tag);
      });
    });
  }

  function authorTagHtml(article) {
    const name = articleAuthorName(article);
    const pid = article?.id_profile || article?.profiles?.id || '';
    const uname = article?.profiles?.username || '';
    const aid = article?.id || '';
    const pub = uname ? ` data-public-profile="${uname}"` : '';
    return `<span class="card-tag author-tag" data-profile-id="${pid}" data-article-id="${aid}"${pub} title="Открыть профиль">${name}</span>`;
  }

  function articleExcerpt(article, len) {
    // description для списков (лёгкий), text — только если description пустой
    const raw = (article.description || article.text || '').replace(/[#*`>_~\-]/g, '').replace(/\s+/g, ' ').trim();
    if (!raw) return 'Текст пока не заполнен.';
    return raw.length > len ? raw.slice(0, len) + '…' : raw;
  }

  // Markdown -> безопасный HTML. marked.js делает разбор (**bold**, # заголовки и т.д.),
  // DOMPurify чистит результат перед вставкой в страницу. Если библиотеки почему-то
  // не подгрузились — просто показываем текст как есть, с переносами строк.
  const INFO_BLOCK_TYPES = {
    tip: { icon: 'lightbulb', label: 'Совет' },
    warning: { icon: 'triangle-alert', label: 'Важно' },
    note: { icon: 'pin', label: 'Запомните' },
    success: { icon: 'check-circle-2', label: 'Итог' },
    danger: { icon: 'x-circle', label: 'Частая ошибка' }
  };

  // Вырезает :::tip ... ::: (и другие типы) из текста статьи, рендерит их
  // в готовый HTML-блок, а на их место подставляет плейсхолдер — чтобы
  // остальной текст спокойно прошёл через обычный Markdown-рендер.
  function extractInfoBlocks(text) {
    const blocks = [];
    // Интерактив: spoiler / accordion / tabs + старые типы
    const cleaned = text.replace(/:::(tip|warning|note|success|danger|pros|cons|checklist|spoiler|accordion|tabs|steps)\s*(?:\[([^\]]*)\])?\s*\n([\s\S]*?)\n:::/g, (m, type, titleArg, body) => {
      const idx = blocks.length;
      const title = (titleArg || '').trim();
      if (type === 'pros' || type === 'cons') {
        const isPros = type === 'pros';
        const items = body.split('\n').map(l => l.trim()).filter(Boolean)
          .map(l => `<li><i data-lucide="${isPros ? 'check' : 'x'}"></i> ${l}</li>`).join('');
        blocks.push(`<ul class="proscons-list ${type}">${items}</ul>`);
      } else if (type === 'checklist') {
        const items = body.split('\n').map(l => l.trim()).filter(Boolean)
          .map(l => {
            const checked = /^\[x\]/i.test(l);
            const text = l.replace(/^\[[ xX]\]\s*/, '');
            return `<li class="checklist-item${checked ? ' is-checked' : ''}" data-check><span class="checklist-box" aria-hidden="true"></span><span class="checklist-text">${text}</span></li>`;
          }).join('');
        blocks.push(`<ul class="checklist-list is-interactive">${items}</ul>`);
      } else if (type === 'spoiler') {
        const label = title || 'Показать подробности';
        const bodyHtml = window.marked ? marked.parse(body.trim(), { breaks: true }) : `<p>${body.trim()}</p>`;
        blocks.push(`<details class="md-spoiler"><summary class="md-spoiler-summary"><i data-lucide="chevron-right"></i><span>${label}</span></summary><div class="md-spoiler-body">${bodyHtml}</div></details>`);
      } else if (type === 'accordion') {
        // секции: ### Заголовок\nтекст
        const parts = body.split(/\n(?=###\s)/);
        let itemsHtml = '';
        parts.forEach(part => {
          const lines = part.trim().split('\n');
          if (!lines.length) return;
          let head = lines[0].replace(/^###\s*/, '').trim();
          if (!head) return;
          const rest = lines.slice(1).join('\n').trim();
          const bodyHtml = window.marked ? marked.parse(rest, { breaks: true }) : `<p>${rest}</p>`;
          itemsHtml += `<div class="md-acc-item"><button type="button" class="md-acc-head"><i data-lucide="chevron-right"></i><span>${head}</span></button><div class="md-acc-body">${bodyHtml}</div></div>`;
        });
        blocks.push(`<div class="md-accordion">${itemsHtml}</div>`);
      } else if (type === 'tabs') {
        // секции: ### Вкладка\nтекст
        const parts = body.split(/\n(?=###\s)/);
        const tabs = [];
        parts.forEach(part => {
          const lines = part.trim().split('\n');
          if (!lines.length) return;
          let head = lines[0].replace(/^###\s*/, '').trim();
          if (!head) return;
          const rest = lines.slice(1).join('\n').trim();
          const bodyHtml = window.marked ? marked.parse(rest, { breaks: true }) : `<p>${rest}</p>`;
          tabs.push({ head, bodyHtml });
        });
        if (!tabs.length) {
          blocks.push('');
        } else {
          const btns = tabs.map((tab, i) => `<button type="button" class="md-tab-btn${i === 0 ? ' active' : ''}" data-tab="${i}">${tab.head}</button>`).join('');
          const panes = tabs.map((tab, i) => `<div class="md-tab-pane${i === 0 ? ' active' : ''}" data-tab-pane="${i}">${tab.bodyHtml}</div>`).join('');
          blocks.push(`<div class="md-tabs"><div class="md-tab-list">${btns}</div><div class="md-tab-panes">${panes}</div></div>`);
        }

      } else if (type === 'steps') {
        const parts = body.split(/\n(?=###\s)/);
        const steps = [];
        parts.forEach(part => {
          const lines = part.trim().split('\n');
          if (!lines.length) return;
          let head = lines[0].replace(/^###\s*/, '').trim();
          if (!head) return;
          const rest = lines.slice(1).join('\n').trim();
          const bodyHtml = window.marked ? marked.parse(rest, { breaks: true }) : `<p>${rest}</p>`;
          steps.push({ head, bodyHtml });
        });
        if (!steps.length) {
          blocks.push('');
        } else {
          const nav = steps.map((s, i) =>
            `<button type="button" class="md-step-dot${i === 0 ? ' active' : ''}" data-step="${i}" aria-label="Шаг ${i + 1}">${i + 1}</button>`
          ).join('');
          const panes = steps.map((s, i) =>
            `<div class="md-step-pane${i === 0 ? ' active' : ''}" data-step-pane="${i}"><h4 class="md-step-title">${s.head}</h4><div class="md-step-body">${s.bodyHtml}</div></div>`
          ).join('');
          blocks.push(
            `<div class="md-steps" data-step-total="${steps.length}">` +
            `<div class="md-steps-header"><span class="md-steps-label">${title || 'Пошагово'}</span>` +
            `<span class="md-steps-counter"><span data-step-current>1</span> / ${steps.length}</span></div>` +
            `<div class="md-steps-dots">${nav}</div>` +
            `<div class="md-steps-panes">${panes}</div>` +
            `<div class="md-steps-actions">` +
            `<button type="button" class="btn btn-secondary md-step-prev" disabled>Назад</button>` +
            `<button type="button" class="btn btn-primary md-step-next">Далее</button>` +
            `</div></div>`
          );
        }
      } else {
        const meta = INFO_BLOCK_TYPES[type];
        const bodyHtml = window.marked ? marked.parse(body.trim(), { breaks: true }) : `<p>${body.trim()}</p>`;
        blocks.push(`<div class="infobox infobox-${type}"><div class="infobox-title"><i data-lucide="${meta.icon}"></i> ${meta.label}</div><div class="infobox-body">${bodyHtml}</div></div>`);
      }
      return `\n@@INFOBLOCK${idx}@@\n`;
    });
    return { cleaned, blocks };
  }

  function extractYoutubeId(url) {
    if (!url) return null;
    const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    return m ? m[1] : null;
  }

  function preprocessMediaMarkdown(text) {
    let s = text.replace(/:::youtube\s+(\S+)\s*:::/gi, (_, idOrUrl) => {
      const id = extractYoutubeId(idOrUrl) || idOrUrl.replace(/[^\w-]/g, '');
      return id && id.length >= 6 ? ('\n\n@@YOUTUBE:' + id + '@@\n\n') : '';
    });
    s = s.replace(/^(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[\w-]+|youtu\.be\/[\w-]+|youtube\.com\/shorts\/[\w-]+)\S*)\s*$/gim, (line) => {
      const id = extractYoutubeId(line.trim());
      return id ? ('\n\n@@YOUTUBE:' + id + '@@\n\n') : line;
    });
    return s;
  }


  function renderCalcHTML(opts) {
    opts = opts || {};
    const inv = Math.max(0, Number(opts.invest) || 0);
    const profit = Number(opts.monthly_profit) || 0;
    const price = Number(opts.price) || 0;
    const cost = Number(opts.cost) || 0;
    const fixed = Number(opts.fixed) || 0;
    const cac = Number(opts.cac) || 0;
    const ltv = Number(opts.ltv) || 0;
    const margin = Number(opts.margin) || 0; // %
    const mode = (opts.mode || 'payback').toLowerCase();
    const id = 'calc-' + Math.random().toString(36).slice(2, 9);

    function tab(name, label) {
      const on = mode === name ? ' is-active' : '';
      return '<button type="button" class="biz-calc-tab' + on + '" data-calc-tab="' + name + '">' + label + '</button>';
    }

    return (
      '<div class="biz-calc" data-calc-id="' + id + '" data-calc-mode="' + mode + '">' +
        '<div class="biz-calc-header">' +
          '<i data-lucide="calculator"></i>' +
          '<div>' +
            '<div class="biz-calc-title">Бизнес-калькулятор</div>' +
            '<div class="biz-calc-sub">Окупаемость · безубыточность · unit-экономика</div>' +
          '</div>' +
        '</div>' +
        '<div class="biz-calc-tabs">' +
          tab('payback', 'Окупаемость') +
          tab('breakeven', 'Безубыточность') +
          tab('unit', 'Unit-экономика') +
          tab('budget', 'Бюджет') +
        '</div>' +

        // PAYBACK
        '<div class="biz-calc-panel" data-panel="payback">' +
          '<div class="biz-calc-fields">' +
            '<label class="biz-calc-field"><span>Стартовые вложения, ₽</span>' +
              '<input type="number" min="0" step="1000" data-f="invest" value="' + (inv || '') + '" placeholder="300000" /></label>' +
            '<label class="biz-calc-field"><span>Чистая прибыль / мес, ₽</span>' +
              '<input type="number" step="1000" data-f="monthly_profit" value="' + (profit || '') + '" placeholder="40000" /></label>' +
          '</div>' +
          '<div class="biz-calc-result">' +
            '<div class="biz-calc-result-main"><span class="biz-calc-result-label">Окупаемость</span><span class="biz-calc-result-value" data-out="payback-months">—</span></div>' +
            '<div class="biz-calc-result-side">' +
              '<div><span class="biz-calc-result-label">Прибыль за год</span><span data-out="payback-year">—</span></div>' +
              '<div><span class="biz-calc-result-label">Доходность</span><span data-out="payback-roi">—</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // BREAKEVEN
        '<div class="biz-calc-panel" data-panel="breakeven">' +
          '<div class="biz-calc-fields biz-calc-fields--3">' +
            '<label class="biz-calc-field"><span>Постоянные расходы / мес, ₽</span>' +
              '<input type="number" min="0" step="1000" data-f="fixed" value="' + (fixed || '') + '" placeholder="80000" /></label>' +
            '<label class="biz-calc-field"><span>Цена продажи, ₽</span>' +
              '<input type="number" min="0" step="10" data-f="price" value="' + (price || '') + '" placeholder="1500" /></label>' +
            '<label class="biz-calc-field"><span>Себестоимость ед., ₽</span>' +
              '<input type="number" min="0" step="10" data-f="cost" value="' + (cost || '') + '" placeholder="600" /></label>' +
          '</div>' +
          '<div class="biz-calc-result">' +
            '<div class="biz-calc-result-main"><span class="biz-calc-result-label">Нужно продаж / мес</span><span class="biz-calc-result-value" data-out="be-units">—</span></div>' +
            '<div class="biz-calc-result-side">' +
              '<div><span class="biz-calc-result-label">Маржа с ед.</span><span data-out="be-margin">—</span></div>' +
              '<div><span class="biz-calc-result-label">Выручка в точке</span><span data-out="be-revenue">—</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // UNIT
        '<div class="biz-calc-panel" data-panel="unit">' +
          '<div class="biz-calc-fields biz-calc-fields--3">' +
            '<label class="biz-calc-field"><span>CAC (стоимость клиента), ₽</span>' +
              '<input type="number" min="0" step="10" data-f="cac" value="' + (cac || '') + '" placeholder="500" /></label>' +
            '<label class="biz-calc-field"><span>LTV (доход с клиента), ₽</span>' +
              '<input type="number" min="0" step="10" data-f="ltv" value="' + (ltv || '') + '" placeholder="3000" /></label>' +
            '<label class="biz-calc-field"><span>Маржа, %</span>' +
              '<input type="number" min="0" max="100" step="1" data-f="margin" value="' + (margin || '') + '" placeholder="60" /></label>' +
          '</div>' +
          '<div class="biz-calc-result">' +
            '<div class="biz-calc-result-main"><span class="biz-calc-result-label">LTV / CAC</span><span class="biz-calc-result-value" data-out="unit-ratio">—</span></div>' +
            '<div class="biz-calc-result-side">' +
              '<div><span class="biz-calc-result-label">Чистый LTV</span><span data-out="unit-net">—</span></div>' +
              '<div><span class="biz-calc-result-label">Вердикт</span><span data-out="unit-verdict">—</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // BUDGET
        '<div class="biz-calc-panel" data-panel="budget">' +
          '<div class="biz-calc-fields biz-calc-fields--3">' +
            '<label class="biz-calc-field"><span>Оборудование / закуп, ₽</span>' +
              '<input type="number" min="0" step="1000" data-f="eq" value="' + (Number(opts.eq) || '') + '" placeholder="100000" /></label>' +
            '<label class="biz-calc-field"><span>Аренда (первый период), ₽</span>' +
              '<input type="number" min="0" step="1000" data-f="rent" value="' + (Number(opts.rent) || '') + '" placeholder="50000" /></label>' +
            '<label class="biz-calc-field"><span>Реклама на старт, ₽</span>' +
              '<input type="number" min="0" step="1000" data-f="ads" value="' + (Number(opts.ads) || '') + '" placeholder="30000" /></label>' +
            '<label class="biz-calc-field"><span>Фонд зарплат, ₽</span>' +
              '<input type="number" min="0" step="1000" data-f="payroll" value="' + (Number(opts.payroll) || '') + '" placeholder="80000" /></label>' +
            '<label class="biz-calc-field"><span>Прочее / подушка, ₽</span>' +
              '<input type="number" min="0" step="1000" data-f="other" value="' + (Number(opts.other) || '') + '" placeholder="40000" /></label>' +
          '</div>' +
          '<div class="biz-calc-result">' +
            '<div class="biz-calc-result-main"><span class="biz-calc-result-label">Итого на запуск</span><span class="biz-calc-result-value" data-out="budget-total">—</span></div>' +
            '<div class="biz-calc-result-side">' +
              '<div><span class="biz-calc-result-label">Доля рекламы</span><span data-out="budget-ads-pct">—</span></div>' +
              '<div><span class="biz-calc-result-label">Доля подушки</span><span data-out="budget-other-pct">—</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<p class="biz-calc-hint">Цифры можно менять — пересчёт сразу. Это оценка, не финансовый совет.</p>' +
      '</div>'
    );
  }

  // backward-compatible alias
  function renderPaybackCalcHTML(invest, monthlyProfit) {
    return renderCalcHTML({ invest: invest, monthly_profit: monthlyProfit, mode: 'payback' });
  }

  function extractCalcBlocks(text) {
    const blocks = [];
    // new unified :::calc  and old :::calc-payback
    const re = /:::(calc-payback|calc)\s*\n?([\s\S]*?)\n?:::/gi;
    const cleaned = text.replace(re, (_, tag, body) => {
      const params = {};
      String(body || '').split('\n').forEach(line => {
        const m = line.match(/^\s*([\w_]+)\s*:\s*(.+?)\s*$/);
        if (m) params[m[1].toLowerCase()] = m[2].trim();
      });
      const num = (k) => parseFloat(String(params[k] || '0').replace(/\s/g, '').replace(',', '.')) || 0;
      const opts = {
        mode: (params.mode || (tag === 'calc-payback' ? 'payback' : 'payback')).toLowerCase(),
        invest: num('invest') || num('budget'),
        monthly_profit: num('monthly_profit') || num('profit') || num('monthly'),
        price: num('price'),
        cost: num('cost') || num('cogs'),
        fixed: num('fixed') || num('fixed_costs'),
        cac: num('cac'),
        ltv: num('ltv'),
        margin: num('margin'),
        eq: num('eq') || num('equipment'),
        rent: num('rent'),
        ads: num('ads') || num('marketing'),
        payroll: num('payroll') || num('salary'),
        other: num('other') || num('buffer')
      };
      const idx = blocks.length;
      blocks.push(renderCalcHTML(opts));
      return '\n@@CALCBLOCK' + idx + '@@\n';
    });
    return { cleaned, blocks };
  }

  function fmtMoney(n) {
    return Number(n || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽';
  }
  function fmtNum(n, d) {
    return Number(n || 0).toLocaleString('ru-RU', { maximumFractionDigits: d == null ? 1 : d });
  }

  function updateBizCalc(root) {
    if (!root) return;
    const val = (name) => parseFloat(root.querySelector('[data-f="' + name + '"]') && root.querySelector('[data-f="' + name + '"]').value) || 0;
    const set = (key, text) => {
      const el = root.querySelector('[data-out="' + key + '"]');
      if (el) el.textContent = text;
    };

    // payback
    const inv = val('invest');
    const profit = val('monthly_profit');
    set('payback-year', fmtMoney(profit * 12));
    if (profit <= 0) {
      set('payback-months', profit < 0 ? 'убыток' : '—');
      set('payback-roi', '—');
    } else {
      const months = inv > 0 ? inv / profit : 0;
      set('payback-months', months < 0.1 ? 'сразу' : (fmtNum(months) + ' мес.'));
      set('payback-roi', inv > 0 ? (fmtNum((profit * 12 / inv) * 100) + '% / год') : '—');
    }

    // breakeven
    const price = val('price');
    const cost = val('cost');
    const fixed = val('fixed');
    const unitMargin = price - cost;
    set('be-margin', unitMargin > 0 ? fmtMoney(unitMargin) : '—');
    if (unitMargin <= 0) {
      set('be-units', 'нет маржи');
      set('be-revenue', '—');
    } else {
      const units = Math.ceil(fixed / unitMargin);
      set('be-units', units.toLocaleString('ru-RU') + ' шт.');
      set('be-revenue', fmtMoney(units * price));
    }

    // unit
    const cac = val('cac');
    const ltv = val('ltv');
    const marginPct = val('margin');
    const netLtv = marginPct > 0 ? ltv * (marginPct / 100) : ltv;
    set('unit-net', netLtv > 0 ? fmtMoney(netLtv) : '—');
    if (cac <= 0) {
      set('unit-ratio', '—');
      set('unit-verdict', '—');
    } else {
      const ratio = netLtv / cac;
      set('unit-ratio', fmtNum(ratio, 2) + '×');
      let verdict = 'слабо';
      if (ratio >= 3) verdict = 'отлично';
      else if (ratio >= 2) verdict = 'норма';
      else if (ratio >= 1) verdict = 'на грани';
      set('unit-verdict', verdict);
    }

    // budget
    const total = val('eq') + val('rent') + val('ads') + val('payroll') + val('other');
    set('budget-total', fmtMoney(total));
    set('budget-ads-pct', total > 0 ? (fmtNum(val('ads') / total * 100, 0) + '%') : '—');
    set('budget-other-pct', total > 0 ? (fmtNum(val('other') / total * 100, 0) + '%') : '—');

    // status coloring on main value of active panel
    const mode = root.dataset.calcMode || 'payback';
    root.classList.remove('is-good', 'is-bad');
    if (mode === 'payback' && profit > 0 && inv > 0) {
      const m = inv / profit;
      if (m <= 18) root.classList.add('is-good');
      if (m > 36) root.classList.add('is-bad');
    }
    if (mode === 'unit' && cac > 0) {
      const ratio = netLtv / cac;
      if (ratio >= 3) root.classList.add('is-good');
      if (ratio < 1) root.classList.add('is-bad');
    }
  }

  function wirePaybackCalcs(container) {
    const root = container || document;
    root.querySelectorAll('.biz-calc, .payback-calc').forEach(calc => {
      if (calc.dataset.wired) return;
      calc.dataset.wired = '1';
      // migrate old class
      if (calc.classList.contains('payback-calc') && !calc.classList.contains('biz-calc')) {
        calc.classList.add('biz-calc');
      }
      const setMode = (mode) => {
        calc.dataset.calcMode = mode;
        calc.querySelectorAll('.biz-calc-tab').forEach(t => {
          t.classList.toggle('is-active', t.dataset.calcTab === mode);
        });
        calc.querySelectorAll('.biz-calc-panel').forEach(p => {
          p.classList.toggle('is-active', p.dataset.panel === mode);
        });
        updateBizCalc(calc);
      };
      calc.querySelectorAll('.biz-calc-tab').forEach(tab => {
        tab.addEventListener('click', () => setMode(tab.dataset.calcTab));
      });
      calc.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', () => updateBizCalc(calc));
        inp.addEventListener('change', () => updateBizCalc(calc));
      });
      setMode(calc.dataset.calcMode || 'payback');
    });
    if (window.lucide) lucide.createIcons();
  }


  function wireArticleBodyInteractivity(root) {
    if (!root || root.dataset.interactiveWired === '1') return;
    root.dataset.interactiveWired = '1';

    // Checklist
    root.querySelectorAll('.checklist-list.is-interactive .checklist-item').forEach(li => {
      li.addEventListener('click', () => {
        li.classList.toggle('is-checked');
      });
    });

    // Accordion
    root.querySelectorAll('.md-acc-head').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.md-acc-item');
        const acc = btn.closest('.md-accordion');
        const open = item.classList.contains('open');
        acc.querySelectorAll('.md-acc-item.open').forEach(i => i.classList.remove('open'));
        if (!open) item.classList.add('open');
      });
    });


    // Steps wizard
    root.querySelectorAll('.md-steps').forEach(box => {
      const total = Number(box.dataset.stepTotal || 1);
      let cur = 0;
      const setStep = (n) => {
        cur = Math.max(0, Math.min(total - 1, n));
        box.querySelectorAll('.md-step-dot').forEach((d, i) => d.classList.toggle('active', i === cur));
        box.querySelectorAll('.md-step-pane').forEach((p, i) => p.classList.toggle('active', i === cur));
        const counter = box.querySelector('[data-step-current]');
        if (counter) counter.textContent = String(cur + 1);
        const prev = box.querySelector('.md-step-prev');
        const next = box.querySelector('.md-step-next');
        if (prev) prev.disabled = cur === 0;
        if (next) {
          next.textContent = cur >= total - 1 ? 'Готово' : 'Далее';
          next.disabled = false;
        }
      };
      box.querySelectorAll('.md-step-dot').forEach(d => {
        d.addEventListener('click', () => setStep(Number(d.dataset.step)));
      });
      box.querySelector('.md-step-prev')?.addEventListener('click', () => setStep(cur - 1));
      box.querySelector('.md-step-next')?.addEventListener('click', () => {
        if (cur >= total - 1) setStep(0);
        else setStep(cur + 1);
      });
    });

    // Tabs
    root.querySelectorAll('.md-tabs').forEach(tabs => {
      tabs.querySelectorAll('.md-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = btn.dataset.tab;
          tabs.querySelectorAll('.md-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
          tabs.querySelectorAll('.md-tab-pane').forEach(p => p.classList.toggle('active', p.dataset.tabPane === i));
        });
      });
    });

    // Sortable tables
    root.querySelectorAll('table').forEach(table => {
      if (table.dataset.sortable === '0') return;
      table.classList.add('md-sortable-table');
      const thead = table.querySelector('thead');
      const headers = thead ? thead.querySelectorAll('th') : table.querySelectorAll('tr:first-child th, tr:first-child td');
      headers.forEach((th, colIdx) => {
        th.classList.add('md-sortable-th');
        th.tabIndex = 0;
        th.addEventListener('click', () => {
          const tbody = table.tBodies[0] || table;
          const rows = Array.from(tbody.querySelectorAll('tr')).filter(r => !r.querySelector('th'));
          const asc = th.dataset.sortDir !== 'asc';
          headers.forEach(h => { delete h.dataset.sortDir; h.classList.remove('sort-asc', 'sort-desc'); });
          th.dataset.sortDir = asc ? 'asc' : 'desc';
          th.classList.add(asc ? 'sort-asc' : 'sort-desc');
          rows.sort((a, b) => {
            const ta = (a.children[colIdx]?.textContent || '').trim();
            const tb = (b.children[colIdx]?.textContent || '').trim();
            const na = parseFloat(ta.replace(/\s/g, '').replace(',', '.'));
            const nb = parseFloat(tb.replace(/\s/g, '').replace(',', '.'));
            let cmp;
            if (!isNaN(na) && !isNaN(nb)) cmp = na - nb;
            else cmp = ta.localeCompare(tb, 'ru', { sensitivity: 'base' });
            return asc ? cmp : -cmp;
          });
          rows.forEach(r => tbody.appendChild(r));
        });
      });
    });

    if (window.lucide) lucide.createIcons();
  }



  function renderBreadcrumbs(items) {
    if (!items || !items.length) return '';
    const parts = items.map((it, i) => {
      if (i === items.length - 1 || !it.href) {
        return `<span class="bc-current">${it.label}</span>`;
      }
      return `<a href="${it.href}">${it.label}</a><span class="bc-sep">/</span>`;
    });
    return `<nav class="breadcrumbs" aria-label="Навигация">${parts.join('')}</nav>`;
  }

  function renderMarkdown(text) {
    if (!text) return '<p>Текст пока не заполнен.</p>';
    const withMedia = preprocessMediaMarkdown(text);
    const calc = extractCalcBlocks(withMedia);
    const extracted = extractInfoBlocks(calc.cleaned);
    const cleaned = extracted.cleaned;
    const blocks = extracted.blocks;
    let html;
    if (window.marked && window.DOMPurify) {
      html = marked.parse(cleaned, { breaks: true });
    } else {
      html = '<p style="white-space: pre-line;">' + cleaned.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>';
    }
    calc.blocks.forEach((b, i) => {
      const token = '@@CALCBLOCK' + i + '@@';
      html = html.split('<p>' + token + '</p>').join(b).split(token).join(b);
    });
    blocks.forEach((b, i) => {
      const token = '@@INFOBLOCK' + i + '@@';
      html = html.split('<p>' + token + '</p>').join(b).split(token).join(b);
    });
    // youtube placeholders
    html = html.replace(/@@YOUTUBE:([\w-]{6,})@@/g, function (_, id) {
      return '<div class="video-embed"><iframe src="https://www.youtube.com/embed/' + id + '" title="YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>';
    });
    html = html.replace(/<p>\s*<div class="video-embed">/g, '<div class="video-embed">');
    html = html.replace(/<\/iframe><\/div>\s*<\/p>/g, '</iframe></div>');
    html = html.replace(/<img /g, '<img class="article-md-img" loading="lazy" ');
    const purifyCfg = {
      ADD_TAGS: ['iframe', 'input', 'label', 'details', 'summary', 'button'],
      ADD_ATTR: [
        'allow', 'allowfullscreen', 'frameborder', 'src', 'title', 'loading',
        'type', 'min', 'max', 'step', 'value', 'placeholder', 'class', 'id',
        'data-payback-id', 'data-payback-months', 'data-payback-year', 'data-payback-roi',
        'data-check', 'data-tab', 'data-tab-pane', 'data-step', 'data-step-pane', 'data-step-total', 'data-step-current', 'open', 'disabled'
      ]
    };
    return window.DOMPurify ? DOMPurify.sanitize(html, purifyCfg) : html;
  }

  function setMetaTag(attr, key, content) {
    if (!content) return;
    const sel = attr === 'property'
      ? `meta[property="${key}"]`
      : `meta[name="${key}"]`;
    let meta = document.querySelector(sel);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(attr, key);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', String(content).trim().slice(0, attr === 'property' && key === 'og:image' ? 500 : 160));
  }

  function setMetaDescription(text) {
    if (!text) return;
    const clipped = text.trim().replace(/\s+/g, ' ').slice(0, 160);
    setMetaTag('name', 'description', clipped);
    setMetaTag('property', 'og:description', clipped);
    setMetaTag('name', 'twitter:description', clipped);
  }

  function setPageMeta({ title, description, url, image }) {
    if (title) {
      document.title = title;
      setMetaTag('property', 'og:title', title);
      setMetaTag('name', 'twitter:title', title);
    }
    if (description) setMetaDescription(description);
    if (url) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', url);
      setMetaTag('property', 'og:url', url);
    }
    if (image) {
      setMetaTag('property', 'og:image', image);
    }
  }

  function excerptFromArticle(article) {
    if (article?.description && String(article.description).trim()) {
      return String(article.description).trim();
    }
    const raw = String(article?.text || '')
      .replace(/:::.*?:::/gs, ' ')
      .replace(/[#>*_`\[\]()]/g, ' ')
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return raw.slice(0, 160);
  }

  // ---------- FAQ: единая плашка-аккордеон (article.faq — jsonb [{question, answer}]) ----------
  function renderFaqCard(faqItems) {
    if (!Array.isArray(faqItems) || !faqItems.length) return '';
    const rows = faqItems.map((item, idx) => `
      <div class="faq-item" data-faq-index="${idx}">
        <button type="button" class="faq-question">
          <span>${item.question || ''}</span>
          <i data-lucide="chevron-down"></i>
        </button>
        <div class="faq-answer"><p>${item.answer || ''}</p></div>
      </div>`).join('');
    return `<div class="faq-card"><div class="faq-card-title">Частые вопросы</div>${rows}</div>`;
  }

  function wireFaqCard(container) {
    if (!container) return;
    container.querySelectorAll('.faq-item').forEach(item => {
      item.querySelector('.faq-question').addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        container.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });
    });
  }

  // ---------- Похожие статьи: карточки в конце страницы ----------
  async function loadRelatedArticles(currentArticle, container) {
    if (!container) return;
    try {
      const { data, error } = await supabaseClient
        .from('articles')
        .select('*, profiles(id, username, full_name, first_name, last_name, avatar_url)')
        .neq('id', currentArticle.id)
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      const list = data || [];
      if (!list.length) { container.innerHTML = ''; return; }
      container.innerHTML = `
        <div class="related-articles">
          <h3 class="related-articles-title">Похожие статьи</h3>
          <div class="related-articles-grid">
            ${list.map(a => `
              <div class="related-article-card" data-article-id="${a.id}"${a.slug ? ` data-article-slug="${a.slug}"` : ''}>
                ${authorTagHtml(a)}
                <h4>${a.title || 'Без названия'}</h4>
                <p>${articleExcerpt(a, 90)}</p>
              </div>`).join('')}
          </div>
        </div>`;
      if (window.lucide) lucide.createIcons();
      container.querySelectorAll('.related-article-card').forEach(card => {
        card.addEventListener('click', () => {
          const article = { id: card.dataset.articleId, slug: card.dataset.articleSlug || null };
          window.location.href = articleHref(article);
        });
      });
    } catch (e) {
      console.error('Ошибка загрузки похожих статей:', e);
      container.innerHTML = '';
    }
  }

  function renderArticleCard(article, { featured } = {}) {
    const cls = featured ? 'card card--has-cover card--featured' : 'card card--has-cover';
    const badge = featured
      ? `<span class="card-featured-badge"><i data-lucide="star"></i> Главная по идее</span>`
      : '';
    const cover = renderCardCover(mediaCoverUrl(article), 'card-cover--article');
    return `
      <div class="${cls}" data-article-id="${article.id}">
        ${cover}
        <div class="card-body">
          ${badge}
          ${authorTagHtml(article)}
          <h3 class="card-title">${article.title || 'Без названия'}</h3>
          <p class="card-desc">${articleExcerpt(article, featured ? 180 : 130)}</p>
          <div class="card-footer">
            <span>${formatDate(article.created_at)}</span>
          </div>
        </div>
      </div>`;
  }

  function openArticlePreview(article) {
    if (!articleBackdrop || !articleModalBody) return;
    articleModalBody.innerHTML = `
      ${authorTagHtml(article)}
      <h2 class="idea-modal-title">${article.title || 'Без названия'}</h2>
      <div class="idea-pill-row">
        <span class="idea-pill"><i data-lucide="calendar"></i> ${formatDate(article.created_at) || 'дата не указана'}</span>
      </div>
      <div class="idea-field-block">
        <p style="white-space: pre-line;">${articleExcerpt(article, 400)}</p>
      </div>
      <a class="btn btn-primary idea-open-btn" href="${articleHref(article)}">
        <i data-lucide="book-open"></i> Читать
      </a>
    `;
    if (window.lucide) lucide.createIcons();
    articleBackdrop.classList.add('active');
  }

  function paintArticlesGrid(grid, list) {
    if (!grid) return;
    try {
      const urlMine = new URLSearchParams(location.search).get('mine') === '1';
      if (!list.length) {
        grid.innerHTML = urlMine
          ? `<div class="empty-state"><h3>Пока нет ваших статей</h3><p>Когда напишете статью — она появится здесь.</p>
             <a class="btn btn-primary" href="${siteRootPrefix()}articles/index.html">Смотреть все статьи</a></div>`
          : `<div class="empty-state"><h3>Статей не найдено</h3><p>Измените фильтры или загляните позже.</p></div>`;
      } else {
        grid.innerHTML = list.map(a => renderArticleCard(a)).join('');
      }
      if (window.lucide) lucide.createIcons();
      wireArticleCardClicks(grid);
      wireAuthorTagClicks(grid);
    } catch (err) {
      console.error('Ошибка отрисовки статей:', err);
      grid.innerHTML = '<p style="opacity:0.6;">Не удалось отобразить статьи.</p>';
    }
  }

  async function loadArticlesFromSupabase() {
    const articlesPageGrid = document.getElementById('articlesPageGrid');
    const targetGrid = document.getElementById('articlesGrid') || articlesPageGrid;
    if (!targetGrid) return;
    targetGrid.innerHTML = '<div class="skeleton-grid">' + Array(6).fill('<div class="skeleton-card"></div>').join('') + '</div>';
    try {
      // Лёгкий select: без полного text (он огромный) — для карточек хватает description
      const LIST_COLS = 'id, title, slug, description, cover_url, image_url, banner_url, thumbnail_url, created_at, id_profile, main_idea_id';
      let data = null;
      let error = null;
      {
        const res = await supabaseClient
          .from('articles')
          .select(LIST_COLS)
          .order('created_at', { ascending: false });
        data = res.data;
        error = res.error;
      }
      if (error) throw error;

      articlesCache = data || [];

      // Авторы: join или пакетный select profiles по id_profile
      try {
        const { data: withAuthors, error: joinErr } = await supabaseClient
          .from('articles')
          .select('id, id_profile, profiles(id, username, full_name, first_name, last_name, avatar_url)')
          .order('created_at', { ascending: false });
        if (!joinErr && withAuthors && withAuthors.length) {
          const map = {};
          withAuthors.forEach(r => { if (r.profiles) map[r.id] = r.profiles; });
          articlesCache.forEach(a => {
            if (map[a.id]) a.profiles = map[a.id];
          });
        } else {
          // fallback: тянем profiles пачкой
          const ids = [...new Set(articlesCache.map(a => a.id_profile).filter(Boolean))];
          if (ids.length) {
            const { data: profs } = await supabaseClient
              .from('profiles')
              .select('id, username, full_name, first_name, last_name, avatar_url')
              .in('id', ids);
            const pmap = {};
            (profs || []).forEach(p => { pmap[p.id] = p; });
            articlesCache.forEach(a => {
              if (a.id_profile && pmap[a.id_profile]) a.profiles = pmap[a.id_profile];
            });
          }
        }
      } catch (e) {
        console.warn('Авторы статей:', e);
        try {
          const ids = [...new Set(articlesCache.map(a => a.id_profile).filter(Boolean))];
          if (ids.length) {
            const { data: profs } = await supabaseClient
              .from('profiles')
              .select('id, username, full_name, first_name, last_name, avatar_url')
              .in('id', ids);
            const pmap = {};
            (profs || []).forEach(p => { pmap[p.id] = p; });
            articlesCache.forEach(a => {
              if (a.id_profile && pmap[a.id_profile]) a.profiles = pmap[a.id_profile];
            });
          }
        } catch (_) {}
      }

      if (articlesPageGrid) {
        try {
          const { data: upvotes } = await supabaseClient.from('upvotes_articles').select('id_article');
          const counts = {};
          (upvotes || []).forEach(r => { counts[r.id_article] = (counts[r.id_article] || 0) + 1; });
          articlesCache.forEach(a => { a._popularity = counts[a.id] || 0; });
        } catch (e) {
          articlesCache.forEach(a => { a._popularity = 0; });
        }
        try {
          initArticleListControls();
        } catch (e) {
          console.error('initArticleListControls:', e);
          paintArticlesGrid(articlesPageGrid, articlesCache);
        }
      } else {
        const homeArts = (typeof isHomePage !== 'undefined' && isHomePage)
          ? articlesCache.slice(0, (typeof HOME_ROW_LIMIT !== 'undefined' ? HOME_ROW_LIMIT : 6))
          : articlesCache;
        paintArticlesGrid(targetGrid, homeArts);
      }
    } catch (e) {
      console.error('Ошибка загрузки статей:', e);
      targetGrid.innerHTML = '<p style="opacity:0.6;">Не удалось загрузить статьи. Проверь RLS и таблицу articles.</p>';
    }
  }

  function wireArticleCardClicks(grid) {
    if (!grid) return;
    grid.querySelectorAll('.card[data-article-id]').forEach(card => {
      if (card.dataset.clickWired) return;
      card.dataset.clickWired = '1';
      card.addEventListener('click', () => {
        const article = articlesCache.find(a => a.id === parseInt(card.dataset.articleId, 10));
        if (article) openArticlePreview(article);
      });
    });
  }

  // ---------- Каталог статей: поиск + сортировка (страница "Все статьи") ----------
  const ARTICLE_SORT_LABELS = {
    new: 'Сначала новые', old: 'Сначала старые', popular: 'По популярности',
    az: 'По алфавиту (А → Я)', za: 'По алфавиту (Я → А)'
  };

  function initArticleListControls() {
    const grid = document.getElementById('articlesPageGrid');
    const dropdown = document.getElementById('articleSortDropdown');
    const btn = document.getElementById('articleSortBtn');
    const btnLabel = document.getElementById('articleSortBtnLabel');
    const menu = document.getElementById('articleSortMenu');
    const searchInput = document.getElementById('articleSearchInput');
    const chipBox = document.getElementById('articleIdeaFilterChip');
    if (!grid || !dropdown) return;

    const urlParams = new URLSearchParams(window.location.search);
    let currentSort = urlParams.get('sort') || localStorage.getItem('ideanest_article_sort') || 'new';
    if (!ARTICLE_SORT_LABELS[currentSort]) currentSort = 'new';

    // Фильтр по идее (?idea_id=N):
    // — статьи с main_idea_id = N → увеличенная «главная» карточка
    // — статьи, связанные через idea_articles → обычные карточки
    let filterIdeaId = parseInt(urlParams.get('idea_id'), 10) || null;
    let filterIdeaTitle = null;
    let relatedArticleIds = new Set(); // id статей из idea_articles для выбранной идеи

    function updateUrlParams() {
      const params = new URLSearchParams(window.location.search);
      params.set('sort', currentSort);
      if (filterIdeaId) params.set('idea_id', String(filterIdeaId));
      else params.delete('idea_id');
      const qs = params.toString();
      window.history.replaceState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    }

    function renderFilterChip() {
      if (!chipBox) return;
      if (!filterIdeaId) {
        chipBox.style.display = 'none';
        chipBox.innerHTML = '';
        return;
      }
      const name = filterIdeaTitle || ('Идея №' + filterIdeaId);
      chipBox.style.display = 'flex';
      chipBox.innerHTML = `
        <span class="filter-chip">
          <span class="filter-chip-label">Фильтр:</span>
          <span class="filter-chip-name">${name}</span>
          <button type="button" class="filter-chip-clear" id="clearIdeaFilterBtn" aria-label="Сбросить фильтр">
            <i data-lucide="x"></i>
          </button>
        </span>`;
      if (window.lucide) lucide.createIcons();
      document.getElementById('clearIdeaFilterBtn')?.addEventListener('click', () => {
        filterIdeaId = null;
        filterIdeaTitle = null;
        relatedArticleIds = new Set();
        updateUrlParams();
        renderFilterChip();
        sortAndRender();
      });
    }

    async function resolveFilterIdea() {
      if (!filterIdeaId) return;
      try {
        const [{ data: idea }, { data: rel }] = await Promise.all([
          supabaseClient.from('ideas').select('id_idea, title').eq('id_idea', filterIdeaId).maybeSingle(),
          supabaseClient.from('idea_articles').select('id_article').eq('id_idea', filterIdeaId)
        ]);
        if (idea) {
          filterIdeaTitle = (idea.title && idea.title.trim()) ? idea.title : ('Идея №' + idea.id_idea);
          renderFilterChip();
        }
        relatedArticleIds = new Set((rel || []).map(r => Number(r.id_article)));
        sortAndRender();
      } catch (e) { console.warn('Не удалось загрузить данные фильтра по идее:', e); }
    }

    function setActiveMenuItem() {
      menu.querySelectorAll('.sort-dropdown-item').forEach(el => el.classList.toggle('active', el.dataset.sort === currentSort));
      btnLabel.textContent = ARTICLE_SORT_LABELS[currentSort];
    }

    function isMainForFilter(a) {
      return filterIdeaId && Number(a.main_idea_id) === filterIdeaId;
    }

    function sortAndRender() {
      try {
      const query = (searchInput?.value || '').trim().toLowerCase();
      let list = [...articlesCache];
      const urlMine = new URLSearchParams(location.search).get('mine') === '1';
      if (urlMine && currentProfile) {
        list = list.filter(a => Number(a.id_profile) === Number(currentProfile.id));
      }

      if (filterIdeaId) {
        list = list.filter(a =>
          Number(a.main_idea_id) === filterIdeaId || relatedArticleIds.has(Number(a.id)));
      }
      if (query) {
        list = list.filter(a =>
          (a.title || '').toLowerCase().includes(query) || (a.description || '').toLowerCase().includes(query));
      }

      list.sort((a, b) => {
        // Главные по идее — всегда выше связанных
        if (filterIdeaId) {
          const fa = isMainForFilter(a) ? 1 : 0;
          const fb = isMainForFilter(b) ? 1 : 0;
          if (fa !== fb) return fb - fa;
        }
        if (currentSort === 'new') return new Date(b.created_at) - new Date(a.created_at);
        if (currentSort === 'old') return new Date(a.created_at) - new Date(b.created_at);
        if (currentSort === 'popular') return (b._popularity || 0) - (a._popularity || 0);
        if (currentSort === 'az') return (a.title || '').localeCompare(b.title || '', 'ru');
        if (currentSort === 'za') return (b.title || '').localeCompare(a.title || '', 'ru');
        return 0;
      });

      grid.classList.add('grid-fade');
      setTimeout(() => {
        try {
          grid.innerHTML = list.length
            ? list.map(a => renderArticleCard(a, { featured: isMainForFilter(a) })).join('')
            : '<p style="opacity:0.6;">Ничего не найдено.</p>';
          if (window.lucide) lucide.createIcons();
          wireArticleCardClicks(grid);
      wireAuthorTagClicks(grid);
        } catch (err) {
          console.error(err);
          grid.innerHTML = '<p style="opacity:0.6;">Ошибка отображения статей.</p>';
        }
        grid.classList.remove('grid-fade');
      }, 190);
      } catch (err) {
        console.error('sortAndRender:', err);
        grid.innerHTML = '<p style="opacity:0.6;">Ошибка фильтрации статей.</p>';
      }
    }

    // UI-выбор идеи для фильтра
    async function initArticleIdeaFilterDropdown() {
      const dd = document.getElementById('articleIdeaFilterDropdown');
      const fBtn = document.getElementById('articleIdeaFilterBtn');
      const fMenu = document.getElementById('articleIdeaFilterMenu');
      const fLabel = document.getElementById('articleIdeaFilterLabel');
      if (!dd || !fBtn || !fMenu) return;

      fBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.sort-dropdown.open').forEach(el => { if (el !== dd) el.classList.remove('open'); });
        dd.classList.toggle('open');
      });
      document.addEventListener('click', (e) => { if (!dd.contains(e.target)) dd.classList.remove('open'); });

      try {
        const { data: ideas } = await supabaseClient
          .from('ideas')
          .select('id_idea, title')
          .order('id_idea', { ascending: true });
        const list = ideas || [];
        const items = [
          `<button type="button" class="sort-dropdown-item${!filterIdeaId ? ' active' : ''}" data-idea-id="">Все идеи</button>`,
          ...list.map(i => {
            const title = (i.title && i.title.trim()) ? i.title : ('Идея №' + i.id_idea);
            const active = filterIdeaId === Number(i.id_idea) ? ' active' : '';
            return `<button type="button" class="sort-dropdown-item${active}" data-idea-id="${i.id_idea}">${title}</button>`;
          })
        ];
        fMenu.innerHTML = items.join('');
        if (filterIdeaId) {
          const found = list.find(i => Number(i.id_idea) === filterIdeaId);
          if (found && fLabel) fLabel.textContent = (found.title && found.title.trim()) ? found.title : ('Идея №' + found.id_idea);
        }
        fMenu.querySelectorAll('[data-idea-id]').forEach(el => {
          el.addEventListener('click', async () => {
            const raw = el.dataset.ideaId;
            filterIdeaId = raw ? parseInt(raw, 10) : null;
            filterIdeaTitle = filterIdeaId ? el.textContent.trim() : null;
            relatedArticleIds = new Set();
            updateUrlParams();
            renderFilterChip();
            fMenu.querySelectorAll('.sort-dropdown-item').forEach(x => x.classList.toggle('active', x === el));
            if (fLabel) fLabel.textContent = filterIdeaId ? el.textContent.trim() : 'Идея';
            dd.classList.remove('open');
            if (filterIdeaId) await resolveFilterIdea();
            else sortAndRender();
          });
        });
      } catch (e) {
        console.warn(e);
        fMenu.innerHTML = '<p class="sort-dropdown-empty">Не удалось загрузить</p>';
      }
      if (window.lucide) lucide.createIcons();
    }
    initArticleIdeaFilterDropdown();

    setActiveMenuItem();
    renderFilterChip();
    if (filterIdeaId) resolveFilterIdea();
    else sortAndRender();

    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.sort-dropdown.open').forEach(el => { if (el !== dropdown) el.classList.remove('open'); });
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', (e) => { if (!dropdown.contains(e.target)) dropdown.classList.remove('open'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dropdown.classList.remove('open'); });

    menu?.querySelectorAll('.sort-dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        currentSort = item.dataset.sort;
        localStorage.setItem('ideanest_article_sort', currentSort);
        updateUrlParams();
        setActiveMenuItem();
        dropdown.classList.remove('open');
        sortAndRender();
      });
    });

    let searchDebounce;
    searchInput?.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(sortAndRender, 200);
    });
  }

  loadArticlesFromSupabase();

  // ================= 8. Страница отдельной идеи (ideas/idea.html?id=N) =================
  // Один общий шаблон для всех идей: сама идея достаётся из Supabase по id_idea
  // из строки запроса. Работает на этой же странице только если есть контейнер.
  const ideaDetailContainer = document.getElementById('ideaDetailContainer');
  if (ideaDetailContainer) {
    initIdeaDetailPage(ideaDetailContainer);
  }

  const articleDetailContainer = document.getElementById('articleDetailContainer');
  if (articleDetailContainer) {
    initArticleDetailPage(articleDetailContainer);
  }

  async function initArticleDetailPage(container) {
    const params = new URLSearchParams(window.location.search);
    let slug = params.get('slug');
    const legacyId = parseInt(params.get('id'), 10);
    const onLegacyFile = /\/article\.html$/.test(window.location.pathname);

    // Красивый путь вида /articles/moya-statya — достаём slug прямо из адреса
    if (!slug && !legacyId && !onLegacyFile) {
      const match = window.location.pathname.match(/\/articles\/([^/?#]+)\/?$/);
      if (match && match[1]) slug = decodeURIComponent(match[1]);
    }
    if (!slug && !legacyId) { container.innerHTML = '<p>Статья не найдена.</p>'; return; }

    let article;
    try {
      const query = supabaseClient.from('articles').select('*, profiles(id, username, full_name, first_name, last_name, avatar_url)');
      const { data, error } = slug
        ? await query.eq('slug', slug).maybeSingle()
        : await query.eq('id', legacyId).maybeSingle();
      if (error) throw error;
      if (!data) { container.innerHTML = '<p>Статья не найдена.</p>'; return; }
      article = data;
    } catch (e) {
      console.error('Ошибка загрузки статьи:', e);
      container.innerHTML = '<p>Не удалось загрузить статью. Попробуйте обновить страницу.</p>';
      return;
    }

    // Если статью открыли по старому адресу (article.html?id=... или ?slug=...),
    // на хостинге тихо подменяем адресную строку на красивый /articles/slug.
    // На file:// красивые пути не работают — там просто заменяем id на slug.
    if (onLegacyFile && article.slug) {
      const isFile = window.location.protocol === 'file:';
      const cleanUrl = isFile ? `article.html?slug=${article.slug}` : `/articles/${article.slug}`;
      window.history.replaceState(null, '', cleanUrl);
    }

    const articleId = article.id;

    document.title = `${article.title || 'Статья'} — IdeaNest`;
    setPageMeta({
      title: document.title,
      description: excerptFromArticle(article),
      url: (typeof location !== 'undefined' && location.origin ? location.origin : 'https://ideanest.ru') + (article.slug ? ('/articles/' + article.slug) : location.pathname),
      image: article.cover_url || article.image_url || 'https://ideanest.ru/assets/logo-dark.png'
    });
    setMetaDescription(article.description || (article.text ? article.text.replace(/[#*`>_-]/g, '').slice(0, 160) : ''));

    let isFav = false;
    let isUpvoted = false;
    const profileId = await getProfileId();
    if (profileId) {
      const [{ data: favRow }, { data: upRow }] = await Promise.all([
        supabaseClient.from('favorites_articles').select('id').eq('id_profile', profileId).eq('id_article', articleId).maybeSingle(),
        supabaseClient.from('upvotes_articles').select('id').eq('id_profile', profileId).eq('id_article', articleId).maybeSingle()
      ]);
      isFav = !!favRow;
      isUpvoted = !!upRow;
    }

    const rootBc = siteRootPrefix();
    const bc = renderBreadcrumbs([
      { label: 'Главная', href: rootBc + 'index.html' },
      { label: 'Статьи', href: rootBc + 'articles/index.html' },
      { label: article.title || 'Статья' }
    ]);
    container.innerHTML = `
      ${bc}
      ${mediaCoverUrl(article) ? `
      <div class="article-hero" style="background-image:url('${escapeAttr(mediaCoverUrl(article))}')">
        <div class="article-hero-overlay">
          ${authorTagHtml(article).replace("card-tag", "card-tag idea-hero-tag")}
          <h1 class="idea-hero-title">${article.title || 'Без названия'}</h1>
        </div>
      </div>` : `
      ${authorTagHtml(article)}
      <h1 class="idea-modal-title">${article.title || 'Без названия'}</h1>
      `}
      <div class="idea-pill-row">
        <span class="idea-pill"><i data-lucide="calendar"></i> ${formatDate(article.created_at) || 'дата не указана'}</span>
      </div>
      <div class="idea-field-block">
        <div class="article-body">${renderMarkdown(article.text)}</div>
      </div>
      <div class="hero-actions" style="justify-content:flex-start; margin-top: 24px;">
        <button class="btn ${isUpvoted ? 'btn-primary' : 'btn-secondary'}" id="articleUpvoteBtn">
          <i data-lucide="arrow-up"></i> ${isUpvoted ? 'Апвоут поставлен' : 'Апвоут'}
        </button>
        <button class="btn ${isFav ? 'btn-primary' : 'btn-secondary'}" id="articleFavBtn">
          <i data-lucide="bookmark"></i> ${isFav ? 'В избранном' : 'В избранное'}
        </button>
      </div>
      <div id="articleFaqContainer">${renderFaqCard(article.faq)}</div>
      <div id="articleRelatedIdeasContainer"></div>
      <div id="articleRelatedContainer"></div>
    `;
    if (window.lucide) lucide.createIcons();
    wireAuthorTagClicks(container);
    wireFaqCard(document.getElementById('articleFaqContainer'));
    const articleBodyEl = container.querySelector('.article-body');
    if (articleBodyEl) wireArticleBodyInteractivity(articleBodyEl);
    wirePaybackCalcs(document.getElementById('articleBody') || container || document);
    loadRelatedArticles(article, document.getElementById('articleRelatedContainer'));
    loadRelatedIdeas(articleId, document.getElementById('articleRelatedIdeasContainer'));

    document.getElementById('articleUpvoteBtn').addEventListener('click', async (e) => {
      const pId = await getProfileId();
      if (!pId) { document.getElementById('loginBtn')?.click(); return; }
      const btn = e.currentTarget;
      try {
        const { data: existing } = await supabaseClient.from('upvotes_articles').select('id').eq('id_profile', pId).eq('id_article', articleId).maybeSingle();
        if (existing) {
          await supabaseClient.from('upvotes_articles').delete().eq('id', existing.id);
          btn.classList.remove('btn-primary'); btn.classList.add('btn-secondary');
          btn.innerHTML = '<i data-lucide="arrow-up"></i> Апвоут';
          showToast('Апвоут убран');
        } else {
          await supabaseClient.from('upvotes_articles').insert({ id_profile: pId, id_article: articleId });
          btn.classList.remove('btn-secondary'); btn.classList.add('btn-primary');
          btn.innerHTML = '<i data-lucide="arrow-up"></i> Апвоут поставлен';
          showToast('Апвоут поставлен');
        }
        if (window.lucide) lucide.createIcons();
      } catch (err) { console.error(err); showToast('Ошибка. Попробуйте снова.', true); }
    });

    document.getElementById('articleFavBtn').addEventListener('click', async (e) => {
      const pId = await getProfileId();
      if (!pId) { document.getElementById('loginBtn')?.click(); return; }
      const btn = e.currentTarget;
      try {
        const { data: existing } = await supabaseClient.from('favorites_articles').select('id').eq('id_profile', pId).eq('id_article', articleId).maybeSingle();
        if (existing) {
          await supabaseClient.from('favorites_articles').delete().eq('id', existing.id);
          btn.classList.remove('btn-primary'); btn.classList.add('btn-secondary');
          btn.innerHTML = '<i data-lucide="bookmark"></i> В избранное';
          showToast('Убрано из избранного');
        } else {
          await supabaseClient.from('favorites_articles').insert({ id_profile: pId, id_article: articleId });
          btn.classList.remove('btn-secondary'); btn.classList.add('btn-primary');
          btn.innerHTML = '<i data-lucide="bookmark"></i> В избранном';
          showToast('Добавлено в избранное');
        }
        if (window.lucide) lucide.createIcons();
      } catch (err) { console.error(err); showToast('Ошибка. Попробуйте снова.', true); }
    });

    // Учитываем просмотр, только если пользователь авторизован (id_profile обязателен в схеме)
    if (profileId) {
      try { await supabaseClient.from('views_articles').insert({ id_profile: profileId, id_article: articleId }); }
      catch (e) { console.warn('Не удалось записать просмотр:', e); }
    }
  }

  async function loadRelatedIdeas(articleId, box) {
    if (!box) return;
    try {
      const { data: rel } = await supabaseClient
        .from('idea_articles')
        .select('ideas(id_idea, title)')
        .eq('id_article', articleId);
      const list = (rel || []).filter(r => r.ideas);
      if (!list.length) return;
      box.innerHTML = `
        <div class="idea-field-block" style="margin-top:20px;">
          <h4><i data-lucide="lightbulb"></i> Идеи из статьи</h4>
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
            ${list.map(r => `<a class="btn btn-secondary idea-open-btn" href="${ideaHref(r.ideas)}">${r.ideas.title || 'Идея №' + r.ideas.id_idea}</a>`).join('')}
          </div>
        </div>`;
      if (window.lucide) lucide.createIcons();
    } catch (e) { console.warn('Не удалось загрузить связанные идеи:', e); }
  }

  async function getProfileId() {
    if (!currentUser) return null;
    if (currentProfile) return currentProfile.id;
    currentProfile = await ensureProfile(currentUser);
    return currentProfile?.id || null;
  }

  async function initIdeaDetailPage(container) {
    const params = new URLSearchParams(window.location.search);
    let ideaId = parseInt(params.get('id'), 10);
    const onLegacyFile = /\/idea\.html$/.test(window.location.pathname);

    // Красивый путь /ideas/123 (Vercel rewrite) — берём id из pathname
    if (!ideaId) {
      const match = window.location.pathname.match(/\/ideas\/([^/?#]+)\/?$/);
      if (match && match[1] && match[1] !== 'all.html' && match[1] !== 'match.html' && match[1] !== 'idea.html') {
        ideaId = parseInt(match[1], 10);
      }
    }
    if (!ideaId) { container.innerHTML = '<p>Идея не найдена — не указан id.</p>'; return; }

    let idea;
    try {
      const { data, error } = await supabaseClient
        .from('ideas')
        .select('*')
        .eq('id_idea', ideaId)
        .maybeSingle();
      if (error) throw error;
      if (!data) { container.innerHTML = '<p>Идея не найдена.</p>'; return; }
      idea = data;
    } catch (e) {
      console.error('Ошибка загрузки идеи:', e);
      container.innerHTML = '<p>Не удалось загрузить идею. Попробуйте обновить страницу.</p>';
      return;
    }

    // Старый URL idea.html?id=... → красивый /ideas/ID (на хостинге)
    if (onLegacyFile && window.location.protocol !== 'file:') {
      window.history.replaceState(null, '', '/ideas/' + ideaId);
    }

    document.title = `${ideaTitle(idea)} — IdeaNest`;
    setPageMeta({
      title: document.title,
      description: (idea.potential || idea.pluses || idea.risks || 'Бизнес-идея на IdeaNest').toString().replace(/\s+/g, ' ').trim().slice(0, 160),
      url: (typeof location !== 'undefined' && location.origin ? location.origin : 'https://ideanest.ru') + '/ideas/' + idea.id_idea,
      image: idea.cover_url || idea.image_url || 'https://ideanest.ru/assets/logo-dark.png'
    });

    let isFav = false;
    let isUpvoted = false;
    const profileId = await getProfileId();
    if (profileId) {
      const [{ data: favRow }, { data: upRow }] = await Promise.all([
        supabaseClient.from('favorites_ideas').select('id').eq('id_profile', profileId).eq('id_idea', ideaId).maybeSingle(),
        supabaseClient.from('upvotes_ideas').select('id').eq('id_profile', profileId).eq('id_idea', ideaId).maybeSingle()
      ]);
      isFav = !!favRow;
      isUpvoted = !!upRow;
    }

    const coverUrl = idea.cover_url || idea.image_url || idea.banner_url || '';
    const cat = (idea.category || '').toLowerCase();
    const coverClass = coverUrl ? '' : (' idea-hero--' + (cat || 'default'));
    const coverStyle = coverUrl
      ? (' style="background-image:url(\'' + String(coverUrl).replace(/'/g, '%27') + '\');"')
      : '';

    const rootIdea = siteRootPrefix();
    container.innerHTML = `
      ${renderBreadcrumbs([
        { label: 'Главная', href: rootIdea + 'index.html' },
        { label: 'Идеи', href: rootIdea + 'ideas/all.html' },
        { label: ideaTitle(idea) }
      ])}
      <div class="idea-hero${coverClass}"${coverStyle}>
        <div class="idea-hero-overlay">
          <span class="card-tag idea-hero-tag">${idea.complexity || idea.category || 'Идея'}</span>
          <h1 class="idea-hero-title">${ideaTitle(idea)}</h1>
        </div>
      </div>
      <div class="idea-pill-row">
        <span class="idea-pill"><i data-lucide="wallet"></i> ${formatBudget(idea.budget)}</span>
        <span class="idea-pill"><i data-lucide="bar-chart-2"></i> ${idea.complexity || '—'}</span>
        <span class="idea-pill"><i data-lucide="trending-up"></i> ${idea.potential || '—'}</span>
        <span class="idea-pill"><i data-lucide="star"></i> ${idea.rating != null ? Number(idea.rating).toFixed(1) : '—'}</span>
      </div>
      <div id="ideaPaybackMount">${renderPaybackCalcHTML(idea.budget || 0, 0)}</div>
      <div class="idea-field-block">
        <h4><i data-lucide="thumbs-up"></i> Плюсы</h4>
        <p>${idea.pluses || 'Не заполнено.'}</p>
      </div>
      <div class="idea-field-block">
        <h4><i data-lucide="thumbs-down"></i> Минусы</h4>
        <p>${idea.minuses || 'Не заполнено.'}</p>
      </div>
      <div class="idea-field-block">
        <h4><i data-lucide="alert-triangle"></i> Риски</h4>
        <p>${idea.risks || 'Не заполнено.'}</p>
      </div>
      <div class="hero-actions" style="justify-content:flex-start; margin-top: 24px;">
        <button class="btn ${isUpvoted ? 'btn-primary' : 'btn-secondary'}" id="ideaUpvoteBtn">
          <i data-lucide="arrow-up"></i> ${isUpvoted ? 'Апвоут поставлен' : 'Апвоут'}
        </button>
        <button class="btn ${isFav ? 'btn-primary' : 'btn-secondary'}" id="ideaFavBtn">
          <i data-lucide="bookmark"></i> ${isFav ? 'В избранном' : 'В избранное'}
        </button>
      </div>
      <div id="ideaMainArticleBlock"></div>
      <div id="ideaRelatedArticles"></div>
    `;
    if (window.lucide) lucide.createIcons();
    wirePaybackCalcs(container);

    // Главная статья идеи (articles.main_idea_id = эта идея) + остальные связанные
    try {
      const [{ data: mainArticles }, { data: rel }] = await Promise.all([
        supabaseClient
          .from('articles')
          .select('id, title, slug, text, description, created_at, profiles(username)')
          .eq('main_idea_id', ideaId)
          .order('created_at', { ascending: false }),
        supabaseClient
          .from('idea_articles')
          .select('articles(id, title, slug)')
          .eq('id_idea', ideaId)
      ]);

      const mainList = mainArticles || [];
      const mainBox = document.getElementById('ideaMainArticleBlock');

      // Шаг 5: ровно одна главная статья → крупный блок
      if (mainBox && mainList.length === 1) {
        const a = mainList[0];
        const excerpt = articleExcerpt(a, 220);
        mainBox.innerHTML = `
          <div class="main-article-block">
            <div class="main-article-block-label">
              <i data-lucide="book-open"></i> Главная статья по этой идее
            </div>
            <h3 class="main-article-block-title">${a.title || 'Без названия'}</h3>
            <p class="main-article-block-meta">
              ${articleAuthor(a)}${a.created_at ? ' · ' + formatDate(a.created_at) : ''}
            </p>
            <p class="main-article-block-excerpt">${excerpt}</p>
            <a class="btn btn-primary" href="${articleHref(a)}" style="align-self:flex-start; text-decoration:none;">
              <i data-lucide="book-open"></i> Читать статью
            </a>
          </div>`;
        if (window.lucide) lucide.createIcons();
      } else if (mainBox && mainList.length > 1) {
        // Несколько главных — просто список ссылок, без крупного блока
        mainBox.innerHTML = `
          <div class="idea-field-block" style="margin-top:28px;">
            <h4><i data-lucide="star"></i> Главные статьи</h4>
            <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
              ${mainList.map(a => `<a class="btn btn-secondary idea-open-btn" href="${articleHref(a)}">${a.title || 'Без названия'}</a>`).join('')}
            </div>
          </div>`;
        if (window.lucide) lucide.createIcons();
      }

      // Остальные связанные (idea_articles), без дублей главных
      const mainIds = new Set(mainList.map(a => Number(a.id)));
      const relList = (rel || []).filter(r => r.articles && !mainIds.has(Number(r.articles.id)));
      const relBox = document.getElementById('ideaRelatedArticles');
      if (relBox && relList.length) {
        relBox.innerHTML = `
          <div class="idea-field-block" style="margin-top:28px;">
            <h4><i data-lucide="book-open"></i> Ещё статьи по теме</h4>
            <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
              ${relList.map(r => `<a class="btn btn-secondary idea-open-btn" href="${articleHref(r.articles)}">${r.articles.title || 'Без названия'}</a>`).join('')}
            </div>
          </div>`;
        if (window.lucide) lucide.createIcons();
      }
    } catch (e) { console.warn('Не удалось загрузить связанные статьи:', e); }
    if (window.lucide) lucide.createIcons();

    document.getElementById('ideaUpvoteBtn').addEventListener('click', async (e) => {
      const pId = await getProfileId();
      if (!pId) { document.getElementById('loginBtn')?.click(); return; }
      const btn = e.currentTarget;
      try {
        const { data: existing } = await supabaseClient.from('upvotes_ideas').select('id').eq('id_profile', pId).eq('id_idea', ideaId).maybeSingle();
        if (existing) {
          await supabaseClient.from('upvotes_ideas').delete().eq('id', existing.id);
          btn.classList.remove('btn-primary'); btn.classList.add('btn-secondary');
          btn.innerHTML = '<i data-lucide="arrow-up"></i> Апвоут';
          showToast('Апвоут убран');
        } else {
          await supabaseClient.from('upvotes_ideas').insert({ id_profile: pId, id_idea: ideaId });
          btn.classList.remove('btn-secondary'); btn.classList.add('btn-primary');
          btn.innerHTML = '<i data-lucide="arrow-up"></i> Апвоут поставлен';
          showToast('Апвоут поставлен');
        }
        if (window.lucide) lucide.createIcons();
      } catch (err) { console.error(err); showToast('Ошибка. Попробуйте снова.', true); }
    });

    document.getElementById('ideaFavBtn').addEventListener('click', async (e) => {
      const pId = await getProfileId();
      if (!pId) { document.getElementById('loginBtn')?.click(); return; }
      const btn = e.currentTarget;
      try {
        const { data: existing } = await supabaseClient.from('favorites_ideas').select('id').eq('id_profile', pId).eq('id_idea', ideaId).maybeSingle();
        if (existing) {
          await supabaseClient.from('favorites_ideas').delete().eq('id', existing.id);
          btn.classList.remove('btn-primary'); btn.classList.add('btn-secondary');
          btn.innerHTML = '<i data-lucide="bookmark"></i> В избранное';
          showToast('Убрано из избранного');
        } else {
          await supabaseClient.from('favorites_ideas').insert({ id_profile: pId, id_idea: ideaId });
          btn.classList.remove('btn-secondary'); btn.classList.add('btn-primary');
          btn.innerHTML = '<i data-lucide="bookmark"></i> В избранном';
          showToast('Добавлено в избранное');
        }
        if (window.lucide) lucide.createIcons();
      } catch (err) { console.error(err); showToast('Ошибка. Попробуйте снова.', true); }
    });

    // Учитываем просмотр, только если пользователь авторизован (id_profile обязателен в схеме)
    if (profileId) {
      try { await supabaseClient.from('views_ideas').insert({ id_profile: profileId, id_idea: ideaId }); }
      catch (e) { console.warn('Не удалось записать просмотр:', e); }
    }
  }

  // ================= 9. Страница настроек (settings/settings.html) =================
  // Раздел "Персонализация" (темы) и "Конфиденциальность" — заглушки, следующие шаги.
  const settingsNav = document.getElementById('settingsNav');
  if (settingsNav) {
    const navItems = settingsNav.querySelectorAll('.settings-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tab = item.getAttribute('data-settings-tab') || item.dataset.settingsTab;
        const panel = tab ? document.getElementById('settingsPanel-' + tab) : null;
        if (!panel) {
          console.warn('Нет панели настроек:', tab);
          return;
        }
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
        panel.classList.add('active');
      });
    });
    // навбар-конфиг не зависит от логина
    try { renderNavbarConfigSettings(); } catch (e) { console.warn(e); }
    initialUserUIPromise.then(() => {
      loadGeneralSettings();
      loadThemeSettings();
      loadPrivacySettings();
      try { renderNavbarConfigSettings(); } catch (e) { console.warn(e); }
    });
    // навбар-конфиг доступен сразу (localStorage)
    renderNavbarConfigSettings();
    document.getElementById('navbarConfigReset')?.addEventListener('click', () => {
      saveNavbarConfig(DEFAULT_NAVBAR.map(x => ({ ...x })));
      rebuildNavbarFromConfig();
      renderNavbarConfigSettings();
      showToast('Навбар сброшен');
    });
    applyNavbarStyle(loadNavbarStyle());
    const styleToggle = document.getElementById('navbarStyleToggle');
    if (styleToggle) {
      styleToggle.checked = loadNavbarStyle() === 1;
      styleToggle.addEventListener('change', () => {
        saveNavbarStyle(styleToggle.checked);
      });
    }
    document.getElementById('settingsOpenProfileBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      openProfileWindow();
    });
  }

  // ---------- Конфиденциальность ----------
  async function loadPrivacySettings() {
    const visibilityToggle = document.getElementById('settingsProfilePublic');
    if (!visibilityToggle) return;

    const profileId = await getProfileId();
    if (!profileId) return;

    visibilityToggle.checked = (currentProfile?.profile_visibility || 'public') === 'public';
    visibilityToggle.addEventListener('change', async () => {
      const value = visibilityToggle.checked ? 'public' : 'private';
      const { error } = await supabaseClient.from('profiles').update({ profile_visibility: value }).eq('id', profileId);
      if (error) { showToast('Не удалось сохранить', true); visibilityToggle.checked = !visibilityToggle.checked; return; }
      if (currentProfile) currentProfile.profile_visibility = value;
      showToast(value === 'public' ? 'Профиль публичный' : 'Профиль приватный');
    });

    wirePasswordToggle(document.getElementById('newPasswordInput'), document.getElementById('newPasswordToggleBtn'));
    wirePasswordToggle(document.getElementById('confirmPasswordInput'), document.getElementById('confirmPasswordToggleBtn'));

    document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('changePasswordError');
      errorEl.textContent = '';
      const pass1 = document.getElementById('newPasswordInput').value;
      const pass2 = document.getElementById('confirmPasswordInput').value;
      if (pass1 !== pass2) { errorEl.textContent = 'Пароли не совпадают.'; return; }
      if (pass1.length < 6) { errorEl.textContent = 'Минимум 6 символов.'; return; }
      const btn = document.getElementById('changePasswordBtn');
      btn.disabled = true;
      const { error } = await supabaseClient.auth.updateUser({ password: pass1 });
      btn.disabled = false;
      if (error) { errorEl.textContent = 'Не удалось обновить пароль: ' + error.message; return; }
      document.getElementById('changePasswordForm').reset();
      showToast('Пароль обновлён');
    });

    document.getElementById('logoutEverywhereBtn').addEventListener('click', async () => {
      if (!confirm('Выйти со всех устройств? Текущая сессия тоже завершится.')) return;
      await supabaseClient.auth.signOut({ scope: 'global' });
      showToast('Вы вышли со всех устройств');
      setTimeout(() => window.location.href = '../index.html', 800);
    });

    document.getElementById('deleteAccountBtn')?.addEventListener('click', () => {
      const nick = currentProfile?.username || currentUser?.user_metadata?.username || '';
      openDeleteNicknameModal(nick);
    });
  }

  // ---------- Темы ----------
  const BUILTIN_THEMES = {
    light: {
      name: 'Светлая',
      colors: {
        'accent-primary': '#4f46e5', 'accent-hover': '#4338ca', 'accent-light': '#eef2ff',
        'bg-color': '#ffffff', 'bg-muted': '#f9fafb', 'surface-color': '#ffffff',
        'text-main': '#111827', 'text-muted': '#6b7280', 'border-color': '#e5e7eb'
      }
    },
    dark: {
      name: 'Тёмная',
      colors: {
        'accent-primary': '#818cf8', 'accent-hover': '#a5b4fc', 'accent-light': '#25252f',
        'bg-color': '#0e0e13', 'bg-muted': '#16161d', 'surface-color': '#1a1a22',
        'text-main': '#f3f4f6', 'text-muted': '#9ca3af', 'border-color': '#2a2a35'
      }
    },
    colorful: {
      name: 'Океан',
      colors: {
        'accent-primary': '#0891b2', 'accent-hover': '#0e7490', 'accent-light': '#ecfeff',
        'bg-color': '#f8fdff', 'bg-muted': '#eafaff', 'surface-color': '#ffffff',
        'text-main': '#0c2733', 'text-muted': '#4b7a89', 'border-color': '#cdeef7'
      }
    },
    /* Глобальные «шкуры» сайта */
    ink: {
      name: 'Ink Editorial',
      skin: true,
      colors: {
        'accent-primary': '#14110f', 'accent-hover': '#000000', 'accent-light': '#e8e4dc',
        'bg-color': '#f7f5f0', 'bg-muted': '#efece6', 'surface-color': '#fffcf7',
        'text-main': '#14110f', 'text-muted': '#6a635c', 'border-color': '#d4cdc3'
      }
    },
    clay: {
      name: 'Clay Soft',
      skin: true,
      colors: {
        'accent-primary': '#c45c26', 'accent-hover': '#a34a1c', 'accent-light': '#fce8dc',
        'bg-color': '#faf6f1', 'bg-muted': '#f3ebe3', 'surface-color': '#ffffff',
        'text-main': '#3d2c29', 'text-muted': '#8a736c', 'border-color': '#eadfd6'
      }
    },
    neon: {
      name: 'Neon Terminal',
      skin: true,
      colors: {
        'accent-primary': '#00f0ff', 'accent-hover': '#7dffff', 'accent-light': '#0a2a33',
        'bg-color': '#070b10', 'bg-muted': '#0d1219', 'surface-color': '#0a1018',
        'text-main': '#e6f7ff', 'text-muted': '#6b8a9e', 'border-color': '#1a3344'
      }
    }
  };

  function isDarkBg(hex) {
    if (!hex || typeof hex !== 'string' || hex[0] !== '#') return false;
    const h = hex.slice(1);
    const full = h.length === 3 ? h[0]+h[0]+h[1]+h[1]+h[2]+h[2] : h;
    if (full.length < 6) return false;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) < 140;
  }

  function applyThemeColors(colors, themeKey) {
    const root = document.documentElement.style;
    Object.keys(colors).forEach(k => root.setProperty('--' + k, colors[k]));
    if (colors['accent-primary']) root.setProperty('--accent', colors['accent-primary']);
    // data-theme
    let mode = 'light';
    if (themeKey === 'dark' || themeKey === 'neon') mode = 'dark';
    else if (themeKey === 'light' || themeKey === 'colorful' || themeKey === 'ink' || themeKey === 'clay') mode = themeKey === 'colorful' ? 'colorful' : 'light';
    else if (isDarkBg(colors['bg-color'])) mode = 'dark';
    else if (themeKey && themeKey.startsWith('custom:')) mode = 'custom';
    else if (themeKey) mode = themeKey;
    document.documentElement.setAttribute('data-theme', mode);
    // глобальные шкуры
    const skins = ['ink', 'clay', 'neon'];
    if (skins.includes(themeKey)) document.documentElement.setAttribute('data-skin', themeKey);
    else document.documentElement.removeAttribute('data-skin');
    try { ensureSkinFonts(themeKey); } catch (e) {}
  }

  function ensureSkinFonts(themeKey) {
    const id = 'ideanest-skin-fonts';
    let link = document.getElementById(id);
    const hrefs = {
      ink: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap',
      clay: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap',
      neon: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap'
    };
    if (!hrefs[themeKey]) return;
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = hrefs[themeKey];
  }

  function saveThemeLocally(themeKey, colors) {
    localStorage.setItem('ideanest_theme', JSON.stringify({ key: themeKey, colors }));
  }

  function themeCardHtml(key, name, colors, isActive, isCustom) {
    const swatches = [
      { c: 'bg-color', label: 'Фон' },
      { c: 'surface-color', label: 'Карточки' },
      { c: 'accent-primary', label: 'Кнопки' },
      { c: 'text-main', label: 'Текст' }
    ].map(s => `<span class="theme-swatch-dot" style="background:${colors[s.c] || '#ccc'}" title="${s.label}"></span>`).join('');
    return `
      <div class="theme-card ${isActive ? 'active' : ''}" data-theme-key="${key}">
        ${isCustom ? `<button type="button" class="theme-card-delete" data-delete-theme="${key}"><i data-lucide="trash-2"></i></button>` : ''}
        <div class="theme-card-preview" style="background:${colors['bg-color'] || '#fff'}">${swatches}</div>
        <div class="theme-card-body">
          <span class="theme-card-name">${name}</span>
          ${isActive ? '<i data-lucide="check-circle-2" class="theme-card-check"></i>' : ''}
        </div>
      </div>`;
  }

  async function loadThemeSettings() {
    const grid = document.getElementById('themeCardsGrid');
    if (!grid) return;

    const profileId = await getProfileId();
    const activeTheme = currentProfile?.active_theme || 'light';

    let customThemes = [];
    if (profileId) {
      const { data } = await supabaseClient.from('custom_themes').select('*').eq('id_profile', profileId).order('created_at', { ascending: true });
      customThemes = data || [];
    }

    let html = '';
    Object.keys(BUILTIN_THEMES).forEach(key => {
      html += themeCardHtml(key, BUILTIN_THEMES[key].name, BUILTIN_THEMES[key].colors, activeTheme === key, false);
    });
    customThemes.forEach(t => {
      html += themeCardHtml('custom:' + t.id, t.name, t.colors, activeTheme === ('custom:' + t.id), true);
    });
    html += `<div class="theme-card theme-card-add" id="addThemeCard"><i data-lucide="plus"></i><span>Создать свою</span></div>`;

    grid.innerHTML = html;
    if (window.lucide) lucide.createIcons();

    grid.querySelectorAll('.theme-card[data-theme-key]').forEach(card => {
      card.addEventListener('click', async (e) => {
        if (e.target.closest('[data-delete-theme]')) return;
        const key = card.dataset.themeKey;
        let colors;
        if (key.startsWith('custom:')) {
          const t = customThemes.find(c => 'custom:' + c.id === key);
          colors = t?.colors;
        } else {
          colors = BUILTIN_THEMES[key].colors;
        }
        if (!colors) return;
        applyThemeColors(colors, key);
        saveThemeLocally(key, colors);
        if (profileId) await supabaseClient.from('profiles').update({ active_theme: key }).eq('id', profileId);
        if (currentProfile) currentProfile.active_theme = key;
        loadThemeSettings();
        showToast('Тема применена');
      });
    });

    grid.querySelectorAll('[data-delete-theme]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const key = btn.dataset.deleteTheme;
        const themeId = parseInt(key.replace('custom:', ''), 10);
        if (!confirm('Удалить эту тему?')) return;
        await supabaseClient.from('custom_themes').delete().eq('id', themeId);
        if (activeTheme === key) {
          applyThemeColors(BUILTIN_THEMES.light.colors, 'light');
          saveThemeLocally('light', BUILTIN_THEMES.light.colors);
          if (profileId) await supabaseClient.from('profiles').update({ active_theme: 'light' }).eq('id', profileId);
          if (currentProfile) currentProfile.active_theme = 'light';
        }
        loadThemeSettings();
        showToast('Тема удалена');
      });
    });

    const addCard = document.getElementById('addThemeCard');
    if (addCard) addCard.addEventListener('click', () => openThemeEditor());
  }

  function openThemeEditor() {
    const backdrop = document.getElementById('themeEditorBackdrop');
    if (!backdrop) return;
    document.getElementById('themeEditorTitle').textContent = 'Своя тема';
    document.getElementById('themeNameInput').value = '';
    document.getElementById('themeColorAccent').value = '#000000';
    document.getElementById('themeColorBg').value = '#ffffff';
    document.getElementById('themeColorBgMuted').value = '#f9fafb';
    document.getElementById('themeColorSurface').value = '#ffffff';
    document.getElementById('themeColorText').value = '#111827';
    document.getElementById('themeEditorError').textContent = '';
    backdrop.classList.add('active');
  }

  const themeEditorBackdrop = document.getElementById('themeEditorBackdrop');
  if (themeEditorBackdrop) {
    document.getElementById('themeEditorCloseBtn').addEventListener('click', () => themeEditorBackdrop.classList.remove('active'));
    themeEditorBackdrop.addEventListener('click', (e) => { if (e.target === themeEditorBackdrop) themeEditorBackdrop.classList.remove('active'); });

    document.getElementById('themeEditorForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('themeEditorError');
      const name = document.getElementById('themeNameInput').value.trim();
      if (!name) { errorEl.textContent = 'Введите название темы.'; return; }
      const profileId = await getProfileId();
      if (!profileId) { errorEl.textContent = 'Нужно войти в аккаунт.'; return; }
      const colors = {
        'accent-primary': document.getElementById('themeColorAccent').value,
        'bg-color': document.getElementById('themeColorBg').value,
        'bg-muted': document.getElementById('themeColorBgMuted').value,
        'surface-color': document.getElementById('themeColorSurface').value,
        'text-main': document.getElementById('themeColorText').value
      };
      const submitBtn = document.getElementById('themeEditorSubmitBtn');
      submitBtn.disabled = true;
      const { error } = await supabaseClient.from('custom_themes').insert({ id_profile: profileId, name, colors });
      submitBtn.disabled = false;
      if (error) { errorEl.textContent = 'Не удалось сохранить тему.'; return; }
      themeEditorBackdrop.classList.remove('active');
      showToast('Тема создана');
      loadThemeSettings();
    });
  }

  async function loadGeneralSettings() {
    if (!currentUser) { document.getElementById('loginBtn')?.click(); return; }
    const profileId = await getProfileId();
    if (!profileId) return;
    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', profileId).maybeSingle();
    if (!profile) return;
    currentProfile = profile;

    const langEl = document.getElementById('settingsLanguage');
    const tzEl = document.getElementById('settingsTimezone');
    const notifEl = document.getElementById('settingsNotifications');
    const emailNotifEl = document.getElementById('settingsEmailNotifications');
    if (langEl) langEl.value = profile.language || 'ru';
    if (tzEl) tzEl.value = profile.timezone || 'Europe/Moscow';
    if (notifEl) notifEl.checked = profile.notifications_enabled !== false;
    if (emailNotifEl) emailNotifEl.checked = profile.email_notifications !== false;

    renderNavbarConfigSettings();

    const form = document.getElementById('generalSettingsForm');
    if (!form || form.dataset.wired) return;
    form.dataset.wired = '1';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('generalSettingsError');
      if (errorEl) errorEl.textContent = '';
      const submitBtn = document.getElementById('generalSettingsSubmitBtn');
      if (submitBtn) submitBtn.disabled = true;
      const { error } = await supabaseClient.from('profiles').update({
        language: document.getElementById('settingsLanguage')?.value || 'ru',
        timezone: document.getElementById('settingsTimezone')?.value || 'Europe/Moscow',
        notifications_enabled: document.getElementById('settingsNotifications')?.checked !== false,
        email_notifications: document.getElementById('settingsEmailNotifications')?.checked !== false
      }).eq('id', profileId);
      if (submitBtn) submitBtn.disabled = false;
      if (error) {
        if (errorEl) errorEl.textContent = 'Не удалось сохранить. Попробуйте снова.';
        return;
      }
      showToast('Настройки сохранены');
    });
  }


  // ================= Аватар: файл → обрезка → Storage =================
  let avatarCropState = null; // { img, scale, minScale, offsetX, offsetY, dragging, lastX, lastY }



  const AVATAR_BG_PRESETS = [
    '#111827', '#1e293b', '#4f46e5', '#1d4ed8', '#7c3aed',
    '#be123c', '#c2410c', '#ca8a04', '#15803d', '#e2e8f0'
  ];
  const AVATAR_FG_PRESETS = [
    '#ffffff', '#f8fafc', '#111827', '#fef3c7', '#a5f3fc', '#fbcfe8'
  ];

  function openAvatarSourcePicker(anchorEl) {
    document.getElementById('avatarSourceBackdrop')?.remove();
    const bd = document.createElement('div');
    bd.id = 'avatarSourceBackdrop';
    bd.className = 'float-pop-backdrop avatar-source-backdrop';
    const pop = document.createElement('div');
    pop.className = 'float-pop avatar-source-pop';
    pop.innerHTML = `
      <div class="avatar-source-title">Аватар</div>
      <div class="avatar-source-options">
        <button type="button" class="avatar-source-opt" data-avatar-src="upload">
          <i data-lucide="upload"></i>
          <span class="avatar-source-opt-text">
            <strong>Загрузить фото</strong>
            <em>Любой размер — сожмём сами</em>
          </span>
        </button>
        <button type="button" class="avatar-source-opt" data-avatar-src="text">
          <i data-lucide="type"></i>
          <span class="avatar-source-opt-text">
            <strong>Из текста</strong>
            <em>1–2 символа или эмодзи</em>
          </span>
        </button>
        <button type="button" class="avatar-source-opt" data-avatar-src="gallery">
          <i data-lucide="images"></i>
          <span class="avatar-source-opt-text">
            <strong>Из галереи</strong>
            <em>Готовые стильные аватарки</em>
          </span>
        </button>
      </div>`;
    bd.appendChild(pop);
    document.body.appendChild(bd);

    const place = () => {
      const r = (anchorEl || document.body).getBoundingClientRect();
      const w = 280;
      pop.style.width = w + 'px';
      let left = r.left + r.width / 2 - w / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - w - 12));
      pop.style.left = left + 'px';
      pop.style.top = (r.bottom + 10) + 'px';
      pop.style.transformOrigin = 'top center';
    };
    place();
    requestAnimationFrame(() => bd.classList.add('active'));
    if (window.lucide) lucide.createIcons();

    const close = () => {
      bd.classList.remove('active');
      setTimeout(() => bd.remove(), 220);
    };
    bd.addEventListener('click', (e) => { if (e.target === bd) close(); });

    pop.querySelector('[data-avatar-src="upload"]')?.addEventListener('click', () => {
      close();
      setTimeout(() => openAvatarPicker(), 160);
    });
    pop.querySelector('[data-avatar-src="text"]')?.addEventListener('click', () => {
      close();
      setTimeout(() => openTextAvatarWindow(), 180);
    });
    pop.querySelector('[data-avatar-src="gallery"]')?.addEventListener('click', () => {
      close();
      setTimeout(() => openGalleryAvatarWindow(), 180);
    });
  }

  async function uploadAvatarBlob(blob, mime) {
    mime = mime || 'image/jpeg';
    const profileId = await getProfileId();
    if (!profileId || !currentUser) throw new Error('Нет профиля');
    const ext = mime.includes('png') ? 'png' : 'jpg';
    const path = `${currentUser.id}/${profileId}_${Date.now()}.${ext}`;
    const { data: signed, error: signErr } = await supabaseClient.storage.from('avatars').createSignedUploadUrl(path);
    if (signErr) throw signErr;
    const up = await fetch(signed.signedUrl, { method: 'PUT', headers: { 'Content-Type': mime }, body: blob });
    if (!up.ok) throw new Error('upload ' + up.status);
    const { data: pub } = supabaseClient.storage.from('avatars').getPublicUrl(path);
    const publicUrl = pub && pub.publicUrl;
    if (!publicUrl) throw new Error('no url');
    await supabaseClient.from('profiles').update({ avatar_url: publicUrl }).eq('id', profileId);
    if (currentProfile) currentProfile.avatar_url = publicUrl;
    document.querySelectorAll('img#profilePageAvatar, img#dropdownAvatar, img#topAvatar, img#navbarAvatar, img.profile-avatar, img.dropdown-avatar, img.avatar-img').forEach(img => {
      img.src = publicUrl + '?t=' + Date.now();
    });
    await rememberCurrentAccount();
    return publicUrl;
  }

  function dataUrlToBlob(dataUrl) {
    return fetch(dataUrl).then(r => r.blob());
  }

  function ensureGalleryAvatarWindow() {
    if (document.getElementById('galleryAvatarBackdrop')) return;
    const backdrop = document.createElement('div');
    backdrop.id = 'galleryAvatarBackdrop';
    backdrop.className = 'text-avatar-backdrop';
    const win = document.createElement('div');
    win.id = 'galleryAvatarWindow';
    win.className = 'text-avatar-window gallery-avatar-window';
    win.innerHTML = `
      <button type="button" class="text-avatar-close" id="galleryAvatarClose" aria-label="Закрыть">
        <i data-lucide="x"></i>
      </button>
      <h2 class="text-avatar-title" style="margin-bottom:6px;">Галерея аватаров</h2>
      <p class="text-avatar-sub">Выбери готовый стиль — без загрузки фото</p>
      <div class="gallery-avatar-grid" id="galleryAvatarGrid"></div>`;
    document.body.appendChild(backdrop);
    document.body.appendChild(win);
    backdrop.addEventListener('click', closeGalleryAvatarWindow);
    document.getElementById('galleryAvatarClose').addEventListener('click', closeGalleryAvatarWindow);
  }

  function closeGalleryAvatarWindow() {
    document.getElementById('galleryAvatarWindow')?.classList.remove('active');
    document.getElementById('galleryAvatarBackdrop')?.classList.remove('active');
  }

  function openGalleryAvatarWindow() {
    ensureGalleryAvatarWindow();
    const win = document.getElementById('galleryAvatarWindow');
    const backdrop = document.getElementById('galleryAvatarBackdrop');
    const grid = document.getElementById('galleryAvatarGrid');
    backdrop.classList.add('active');
    void win.offsetWidth;
    win.classList.add('active');
    if (window.lucide) lucide.createIcons();

    grid.innerHTML = '';
    for (let i = 0; i < 12; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gallery-avatar-item';
      btn.innerHTML = `<img src="${galleryAvatarDataUrl(i, 128)}" alt="Аватар ${i + 1}" />`;
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          showToast('Сохраняем аватар…');
          const dataUrl = galleryAvatarDataUrl(i, 512);
          const blob = await dataUrlToBlob(dataUrl);
          // SVG blob — storage may prefer png; convert via canvas to jpeg
          const img = new Image();
          const url = URL.createObjectURL(blob);
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
          const c = document.createElement('canvas');
          c.width = 512; c.height = 512;
          c.getContext('2d').drawImage(img, 0, 0, 512, 512);
          URL.revokeObjectURL(url);
          const jpeg = await new Promise((resolve, reject) => {
            c.toBlob(b => b ? resolve(b) : reject(new Error('blob')), 'image/jpeg', 0.92);
          });
          await uploadAvatarBlob(jpeg, 'image/jpeg');
          closeGalleryAvatarWindow();
          showToast('Аватар обновлён');
          if (document.getElementById('profileWindowBody')) renderProfileWindow();
        } catch (err) {
          console.error(err);
          showToast('Не удалось сохранить: ' + (err.message || err), true);
        } finally {
          btn.disabled = false;
        }
      });
      grid.appendChild(btn);
    }
  }


  function ensureTextAvatarWindow() {
    if (document.getElementById('textAvatarBackdrop')) return;
    const backdrop = document.createElement('div');
    backdrop.id = 'textAvatarBackdrop';
    backdrop.className = 'text-avatar-backdrop';
    const win = document.createElement('div');
    win.id = 'textAvatarWindow';
    win.className = 'text-avatar-window';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-modal', 'true');
    win.innerHTML = `
      <button type="button" class="text-avatar-close" id="textAvatarClose" aria-label="Закрыть">
        <i data-lucide="x"></i>
      </button>
      <div class="text-avatar-layout">
        <div class="text-avatar-preview-col">
          <canvas id="avatarTextPreview" width="200" height="200"></canvas>
          <p class="text-avatar-hint">Превью</p>
        </div>
        <div class="text-avatar-controls">
          <h2 class="text-avatar-title">Аватар из текста</h2>
          <p class="text-avatar-sub">Один–два символа или эмодзи по центру</p>
          <label class="avatar-text-field">
            <span>Символы</span>
            <input type="text" id="avatarTextInput" maxlength="4" placeholder="AB / 🚀" autocomplete="off" />
          </label>
          <div class="avatar-text-colors">
            <div>
              <div class="avatar-text-colors-label">Фон</div>
              <div class="avatar-swatches" id="avatarBgSwatches"></div>
            </div>
            <div>
              <div class="avatar-text-colors-label">Текст</div>
              <div class="avatar-swatches" id="avatarFgSwatches"></div>
            </div>
          </div>
          <div class="text-avatar-actions">
            <button type="button" class="btn btn-secondary" id="textAvatarCancel">Отмена</button>
            <button type="button" class="btn btn-primary" id="avatarTextApply">Сохранить</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    document.body.appendChild(win);
    backdrop.addEventListener('click', closeTextAvatarWindow);
    document.getElementById('textAvatarClose').addEventListener('click', closeTextAvatarWindow);
    document.getElementById('textAvatarCancel').addEventListener('click', closeTextAvatarWindow);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && win.classList.contains('active')) closeTextAvatarWindow();
    });
  }

  function closeTextAvatarWindow() {
    document.getElementById('textAvatarWindow')?.classList.remove('active');
    document.getElementById('textAvatarBackdrop')?.classList.remove('active');
  }

  function openTextAvatarWindow() {
    ensureTextAvatarWindow();
    const win = document.getElementById('textAvatarWindow');
    const backdrop = document.getElementById('textAvatarBackdrop');
    backdrop.classList.add('active');
    void win.offsetWidth;
    win.classList.add('active');
    if (window.lucide) lucide.createIcons();

    let bg = AVATAR_BG_PRESETS[0];
    let fg = AVATAR_FG_PRESETS[0];

    const preview = () => {
      const c = document.getElementById('avatarTextPreview');
      if (!c) return;
      const ctx = c.getContext('2d');
      let text = (document.getElementById('avatarTextInput')?.value || '').trim();
      text = [...text].slice(0, 2).join('') || '?';
      const s = c.width;
      ctx.clearRect(0, 0, s, s);
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const isEmoji = /\p{Extended_Pictographic}/u.test(text);
      ctx.font = isEmoji
        ? Math.round(s * 0.48) + 'px "Segoe UI Emoji","Apple Color Emoji",sans-serif'
        : '700 ' + Math.round(s * 0.42) + 'px Inter,system-ui,sans-serif';
      ctx.fillText(text, s / 2, isEmoji ? s / 2 + 6 : s / 2 + 4);
    };

    const fillSwatches = (el, colors, kind) => {
      if (!el) return;
      el.innerHTML = colors.map(c =>
        `<button type="button" class="avatar-swatch" data-c="${c}" style="background:${c}"></button>`
      ).join('');
      const sync = () => {
        el.querySelectorAll('.avatar-swatch').forEach(b => {
          b.classList.toggle('is-on', b.dataset.c === (kind === 'bg' ? bg : fg));
        });
      };
      el.querySelectorAll('.avatar-swatch').forEach(btn => {
        btn.addEventListener('click', () => {
          if (kind === 'bg') bg = btn.dataset.c; else fg = btn.dataset.c;
          sync();
          preview();
        });
      });
      sync();
    };

    fillSwatches(document.getElementById('avatarBgSwatches'), AVATAR_BG_PRESETS, 'bg');
    fillSwatches(document.getElementById('avatarFgSwatches'), AVATAR_FG_PRESETS, 'fg');
    const input = document.getElementById('avatarTextInput');
    if (input) {
      input.value = '';
      input.oninput = preview;
      setTimeout(() => input.focus(), 50);
    }
    preview();

    const applyBtn = document.getElementById('avatarTextApply');
    applyBtn.onclick = async () => {
      let text = (document.getElementById('avatarTextInput')?.value || '').trim();
      text = [...text].slice(0, 2).join('') || '?';
      const SIZE = 512;
      const c = document.createElement('canvas');
      c.width = SIZE; c.height = SIZE;
      const ctx = c.getContext('2d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const isEmoji = /\p{Extended_Pictographic}/u.test(text);
      ctx.font = isEmoji
        ? '280px "Segoe UI Emoji","Apple Color Emoji",sans-serif'
        : '700 220px Inter,system-ui,sans-serif';
      ctx.fillText(text, SIZE / 2, isEmoji ? SIZE / 2 + 18 : SIZE / 2 + 10);
      const blob = await new Promise((resolve, reject) => {
        c.toBlob(b => b ? resolve(b) : reject(new Error('blob')), 'image/jpeg', 0.92);
      });
      applyBtn.disabled = true;
      applyBtn.textContent = 'Сохраняем…';
      try {
        const profileId = await getProfileId();
        if (!profileId || !currentUser) throw new Error('Нет профиля');
        const path = `${currentUser.id}/${profileId}_${Date.now()}.jpg`;
        const { data: signed, error: signErr } = await supabaseClient.storage.from('avatars').createSignedUploadUrl(path);
        if (signErr) throw signErr;
        const up = await fetch(signed.signedUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
        if (!up.ok) throw new Error('upload ' + up.status);
        const { data: pub } = supabaseClient.storage.from('avatars').getPublicUrl(path);
        const publicUrl = pub && pub.publicUrl;
        if (!publicUrl) throw new Error('no url');
        await supabaseClient.from('profiles').update({ avatar_url: publicUrl }).eq('id', profileId);
        if (currentProfile) currentProfile.avatar_url = publicUrl;
        document.querySelectorAll('img#profilePageAvatar, img#dropdownAvatar, img#navbarAvatar, img.profile-avatar, img.dropdown-avatar').forEach(img => {
          img.src = publicUrl + '?t=' + Date.now();
        });
        await rememberCurrentAccount();
        closeTextAvatarWindow();
        showToast('Аватар обновлён');
        if (document.getElementById('profileWindowBody')) renderProfileWindow();
      } catch (err) {
        console.error(err);
        showToast('Не удалось сохранить: ' + (err.message || err), true);
      } finally {
        applyBtn.disabled = false;
        applyBtn.textContent = 'Сохранить';
      }
    };
  }

  function openAvatarPicker() {
    if (!currentUser) {
      document.getElementById('loginBtn')?.click();
      return;
    }
    let input = document.getElementById('profileAvatarFileInput');
    if (!input) {
      input = document.createElement('input');
      input.type = 'file';
      input.id = 'profileAvatarFileInput';
      input.accept = 'image/jpeg,image/png,image/webp,image/gif';
      input.hidden = true;
      document.body.appendChild(input);
      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        input.value = '';
        if (file) openAvatarCropModal(file);
      });
    }
    input.click();
  }

  function ensureAvatarCropModal() {
    if (document.getElementById('avatarCropBackdrop')) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'avatar-crop-backdrop';
    backdrop.id = 'avatarCropBackdrop';
    backdrop.innerHTML = `
      <div class="avatar-crop-modal" role="dialog" aria-modal="true" aria-label="Обрезка аватара">
        <h3 class="avatar-crop-title">Обрезать фото</h3>
        <div class="avatar-crop-stage" id="avatarCropStage">
          <canvas id="avatarCropCanvas" width="320" height="320"></canvas>
          <div class="avatar-crop-frame" aria-hidden="true"></div>
        </div>
        <label class="avatar-crop-zoom-label">Масштаб
          <input type="range" id="avatarCropZoom" min="1" max="3" step="0.01" value="1" />
        </label>
        <p class="avatar-crop-hint">Перетащите фото, чтобы выбрать область</p>
        <div class="avatar-crop-actions">
          <button type="button" class="btn btn-secondary" id="avatarCropCancel">Отмена</button>
          <button type="button" class="btn btn-primary" id="avatarCropSave">Сохранить</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);

    document.getElementById('avatarCropCancel').addEventListener('click', closeAvatarCropModal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeAvatarCropModal(); });
    document.getElementById('avatarCropSave').addEventListener('click', saveCroppedAvatar);

    const stage = document.getElementById('avatarCropStage');
    const onDown = (clientX, clientY) => {
      if (!avatarCropState) return;
      avatarCropState.dragging = true;
      avatarCropState.lastX = clientX;
      avatarCropState.lastY = clientY;
    };
    const onMove = (clientX, clientY) => {
      if (!avatarCropState?.dragging) return;
      const dx = clientX - avatarCropState.lastX;
      const dy = clientY - avatarCropState.lastY;
      avatarCropState.lastX = clientX;
      avatarCropState.lastY = clientY;
      avatarCropState.offsetX += dx;
      avatarCropState.offsetY += dy;
      clampAvatarCrop();
      drawAvatarCrop();
    };
    const onUp = () => { if (avatarCropState) avatarCropState.dragging = false; };

    stage.addEventListener('mousedown', (e) => { e.preventDefault(); onDown(e.clientX, e.clientY); });
    window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onUp);
    stage.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      onDown(t.clientX, t.clientY);
    }, { passive: true });
    stage.addEventListener('touchmove', (e) => {
      if (!avatarCropState?.dragging) return;
      e.preventDefault();
      const t = e.touches[0];
      onMove(t.clientX, t.clientY);
    }, { passive: false });
    stage.addEventListener('touchend', onUp);

    document.getElementById('avatarCropZoom').addEventListener('input', (e) => {
      if (!avatarCropState) return;
      avatarCropState.scale = avatarCropState.minScale * parseFloat(e.target.value);
      clampAvatarCrop();
      drawAvatarCrop();
    });
  }

  function openAvatarCropModal(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Выберите изображение', true);
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast('Файл слишком большой (макс. 8 МБ)', true);
      return;
    }
    ensureAvatarCropModal();
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const size = 320;
      const minScale = Math.max(size / img.width, size / img.height);
      avatarCropState = {
        img,
        scale: minScale,
        minScale,
        offsetX: (size - img.width * minScale) / 2,
        offsetY: (size - img.height * minScale) / 2,
        dragging: false,
        lastX: 0,
        lastY: 0
      };
      const zoom = document.getElementById('avatarCropZoom');
      zoom.value = '1';
      zoom.min = '1';
      zoom.max = '3';
      drawAvatarCrop();
      document.getElementById('avatarCropBackdrop').classList.add('active');
      document.getElementById('avatarCropSave').disabled = false;
      document.getElementById('avatarCropSave').textContent = 'Сохранить';
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      showToast('Не удалось открыть изображение', true);
    };
    img.src = url;
  }

  function closeAvatarCropModal() {
    document.getElementById('avatarCropBackdrop')?.classList.remove('active');
    avatarCropState = null;
  }

  function clampAvatarCrop() {
    const s = avatarCropState;
    if (!s) return;
    const size = 320;
    const w = s.img.width * s.scale;
    const h = s.img.height * s.scale;
    // изображение должно покрывать весь квадрат
    if (w >= size) {
      s.offsetX = Math.min(0, Math.max(size - w, s.offsetX));
    } else {
      s.offsetX = (size - w) / 2;
    }
    if (h >= size) {
      s.offsetY = Math.min(0, Math.max(size - h, s.offsetY));
    } else {
      s.offsetY = (size - h) / 2;
    }
  }

  function drawAvatarCrop() {
    const canvas = document.getElementById('avatarCropCanvas');
    const s = avatarCropState;
    if (!canvas || !s) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 320, 320);
    ctx.drawImage(s.img, s.offsetX, s.offsetY, s.img.width * s.scale, s.img.height * s.scale);
  }

  async function saveCroppedAvatar() {
    const s = avatarCropState;
    if (!s || !currentUser) return;
    const btn = document.getElementById('avatarCropSave');
    btn.disabled = true;
    btn.textContent = 'Сохраняем…';

    try {
      // Любой размер → 512×512 JPEG (сайт сжимает сам)
      const SIZE = 512;
      const out = document.createElement('canvas');
      out.width = SIZE;
      out.height = SIZE;
      const ctx = out.getContext('2d');
      const scale = SIZE / 320;
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(
        s.img,
        s.offsetX * scale,
        s.offsetY * scale,
        s.img.width * s.scale * scale,
        s.img.height * s.scale * scale
      );

      const blob = await new Promise((resolve, reject) => {
        out.toBlob((b) => (b ? resolve(b) : reject(new Error('blob'))), 'image/jpeg', 0.88);
      });

      const profileId = await getProfileId();
      if (!profileId) throw new Error('Нет профиля');

      const path = `${currentUser.id}/${profileId}_${Date.now()}.jpg`;

      // Signed upload — без огромного Authorization в заголовках (фикс "header size")
      let publicUrl = null;
      const { data: signed, error: signErr } = await supabaseClient.storage
        .from('avatars')
        .createSignedUploadUrl(path);

      if (!signErr && signed?.signedUrl) {
        const putRes = await fetch(signed.signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'image/jpeg' },
          body: blob
        });
        if (!putRes.ok) throw new Error('Ошибка загрузки: ' + putRes.status);
      } else {
        // fallback
        const { error: upErr } = await supabaseClient.storage
          .from('avatars')
          .upload(path, blob, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' });
        if (upErr) throw upErr;
      }

      const { data: pub } = supabaseClient.storage.from('avatars').getPublicUrl(path);
      publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error('Нет URL');

      const { error: dbErr } = await supabaseClient
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profileId);
      if (dbErr) throw dbErr;

      if (currentProfile) currentProfile.avatar_url = publicUrl;
      // обновить все аватарки на странице
      ['topAvatar', 'dropdownAvatar', 'profilePageAvatar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.src = publicUrl;
      });

      closeAvatarCropModal();
      showToast('Аватар обновлён');
    } catch (err) {
      console.error(err);
      const msg = err?.message || String(err);
      if (/bucket|not found|row-level|policy|403|401/i.test(msg)) {
        showToast('Storage: создайте bucket «avatars» (см. SQL)', true);
      } else {
        showToast('Не удалось сохранить аватар: ' + msg, true);
      }
      btn.disabled = false;
      btn.textContent = 'Сохранить';
    }
  }

  // ================= Окно профиля (оверлей поверх страницы) =================
  function ensureProfileWindow() {
    if (document.getElementById('profileWindowBackdrop')) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'profile-window-backdrop';
    backdrop.id = 'profileWindowBackdrop';
    const win = document.createElement('div');
    win.className = 'profile-window';
    win.id = 'profileWindow';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-modal', 'true');
    win.innerHTML = `
      <button type="button" class="profile-window-close" id="profileWindowClose" aria-label="Закрыть">
        <i data-lucide="x"></i>
      </button>
      <div id="profileWindowBody"><p style="color:var(--text-muted);">Загрузка…</p></div>`;
    document.body.appendChild(backdrop);
    document.body.appendChild(win);
    backdrop.addEventListener('click', closeProfileWindow);
    document.getElementById('profileWindowClose').addEventListener('click', closeProfileWindow);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && win.classList.contains('active')) closeProfileWindow();
    });
  }

  function openProfileWindow() {
    ensureProfileWindow();
    closeProfileDropdown();
    const win = document.getElementById('profileWindow');
    const backdrop = document.getElementById('profileWindowBackdrop');
    backdrop.classList.add('active');
    // reflow for animation
    void win.offsetWidth;
    win.classList.add('active');
    renderProfileWindow();
    if (window.lucide) lucide.createIcons();
  }

  function closeProfileWindow() {
    document.getElementById('profileWindow')?.classList.remove('active');
    document.getElementById('profileWindowBackdrop')?.classList.remove('active');
  }

  async function renderProfileWindow() {
    const body = document.getElementById('profileWindowBody');
    if (!body) return;

    if (!currentUser) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      currentUser = session?.user || null;
    }
    if (!currentUser) {
      body.innerHTML = `
        <div style="text-align:center; padding:24px 8px;">
          <p style="color:var(--text-muted); margin-bottom:16px;">Войдите, чтобы открыть профиль.</p>
          <button type="button" class="btn btn-primary" id="profileWinLoginBtn">Войти</button>
        </div>`;
      document.getElementById('profileWinLoginBtn')?.addEventListener('click', () => {
        closeProfileWindow();
        document.getElementById('loginBtn')?.click();
      });
      if (window.lucide) lucide.createIcons();
      return;
    }

    const profileId = await getProfileId();
    let profile = currentProfile;
    if (profileId) {
      const { data } = await supabaseClient.from('profiles').select('*').eq('id', profileId).maybeSingle();
      if (data) { profile = data; currentProfile = data; }
    }

    const fullName = currentUser.user_metadata?.full_name || '';
    const username = profile?.username || currentUser.user_metadata?.username || '';
    const email = currentUser.email || '';
    const avatarUrl = profile?.avatar_url
      || defaultAvatarUrl(username || fullName || 'U', 256);
    const created = profile?.created_at
      ? new Date(profile.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    const visibility = profile?.profile_visibility === 'private' ? 'Приватный' : 'Публичный';

    // Статистика профиля
    let stats = { up: 0, comments: 0, viewsIdeas: 0, viewsArticles: 0 };
    if (profileId) {
      try {
        const { data: st } = await supabaseClient
          .from('profiles_statistic')
          .select('stat_up, stat_comments, stat_views_ideas, stat_views_articles, stat_old')
          .eq('id_profile', profileId)
          .maybeSingle();
        if (st) {
          stats = {
            up: Number(st.stat_up) || 0,
            comments: parseInt(st.stat_comments, 10) || Number(st.stat_comments) || 0,
            viewsIdeas: Number(st.stat_views_ideas) || 0,
            viewsArticles: Number(st.stat_views_articles) || 0
          };
        }
      } catch (e) { console.warn('stats', e); }
    }

    body.innerHTML = `
      <div class="profile-page-header">
        <div class="profile-page-avatar-wrap">
          <img class="profile-page-avatar" id="profilePageAvatar" src="${avatarUrl}" alt="Аватар" />
          <button type="button" class="profile-page-avatar-edit" id="profileAvatarEditBtn" title="Сменить аватар" aria-label="Сменить аватар">
            <i data-lucide="camera"></i>
          </button>
        </div>
        <div class="profile-page-identity">
          <h2 id="profilePageFullName">${fullName || username || 'Без имени'}</h2>
          <div class="profile-page-nick">@${username || '—'}</div>
        </div>
      </div>

      <div class="profile-page-section">
        <div class="profile-page-section-title">Аккаунт</div>
        <form id="profileAccountForm">
          <div class="form-group">
            <label for="profileEditFullName">Имя</label>
            <input type="text" id="profileEditFullName" value="${(fullName || '').replace(/"/g, '&quot;')}" placeholder="Александр" autocomplete="name" />
          </div>
          <div class="form-group">
            <label for="profileEditUsername">Никнейм</label>
            <div class="nickname-input-wrapper">
              <span class="nickname-at">@</span>
              <input type="text" id="profileEditUsername" value="${(username || '').replace(/"/g, '&quot;')}" placeholder="nickname" autocomplete="off" maxlength="15" />
              <span class="nickname-status" id="profileUsernameStatus"></span>
            </div>
            <div class="nickname-hint" id="profileUsernameHint">От 5 до 15 символов: латиница в нижнем регистре, цифры, _</div>
          </div>
          <div class="profile-info-row" style="border-bottom:none; padding-top:4px;">
            <span class="profile-info-label">Email</span>
            <span class="profile-info-value">${email || '—'}</span>
          </div>
          <div class="profile-info-row">
            <span class="profile-info-label">Регистрация</span>
            <span class="profile-info-value">${created}</span>
          </div>
          <div class="profile-info-row">
            <span class="profile-info-label">Видимость</span>
            <span class="profile-info-value">${visibility}</span>
          </div>
          <div class="auth-error" id="profileAccountError"></div>
          <button type="submit" class="btn btn-primary" id="profileAccountSaveBtn" style="width:100%; margin-top:8px;">Сохранить</button>
        </form>
      </div>

      <div class="profile-page-section">
        <div class="profile-page-section-title">Статистика</div>
        <div class="profile-stats-grid">
          <div class="profile-stat-card">
            <div class="profile-stat-value">${stats.up}</div>
            <div class="profile-stat-label">Апвоуты</div>
          </div>
          <div class="profile-stat-card">
            <div class="profile-stat-value">${stats.comments}</div>
            <div class="profile-stat-label">Комментарии</div>
          </div>
          <div class="profile-stat-card">
            <div class="profile-stat-value">${stats.viewsIdeas}</div>
            <div class="profile-stat-label">Просмотры идей</div>
          </div>
          <div class="profile-stat-card">
            <div class="profile-stat-value">${stats.viewsArticles}</div>
            <div class="profile-stat-label">Просмотры статей</div>
          </div>
        </div>
      </div>

      <div class="profile-page-section" style="border-top:none; padding-top:8px;">
        <div class="profile-page-section-title">Смена пароля</div>
        <form id="profileChangePasswordForm">
          <div class="form-group">
            <label for="profileNewPassword">Новый пароль</label>
            <div class="password-input-wrapper">
              <input type="password" id="profileNewPassword" placeholder="Минимум 6 символов" autocomplete="new-password" />
            </div>
          </div>
          <div class="form-group">
            <label for="profileConfirmPassword">Повторите пароль</label>
            <div class="password-input-wrapper">
              <input type="password" id="profileConfirmPassword" placeholder="Ещё раз" autocomplete="new-password" />
            </div>
          </div>
          <div class="auth-error" id="profilePasswordError"></div>
          <button type="submit" class="btn btn-secondary" id="profilePasswordBtn" style="width:100%;">Обновить пароль</button>
        </form>
      </div>

      <div class="profile-page-actions">
        <button type="button" class="btn btn-danger-text" id="profileDeleteAccountBtn" style="width:100%;">
          Удалить аккаунт
        </button>
      </div>`;

    if (window.lucide) lucide.createIcons();

    document.getElementById('profileAvatarEditBtn')?.addEventListener('click', (e) => {
      openAvatarSourcePicker(e.currentTarget);
    });

    // --- Редактирование имени / ника ---
    const profileUserInput = document.getElementById('profileEditUsername');
    const profileUserHint = document.getElementById('profileUsernameHint');
    const profileUserStatus = document.getElementById('profileUsernameStatus');
    let profileNickOk = true;
    let profileNickTimer = null;
    const originalUsername = username;

    function setProfileNickStatus(state, hint, isError) {
      if (profileUserHint) {
        profileUserHint.textContent = hint;
        profileUserHint.style.color = isError ? '#dc2626' : '';
      }
      if (profileUserStatus) {
        profileUserStatus.textContent = state === 'available' ? '✓' : state === 'taken' || state === 'invalid' ? '✗' : state === 'checking' ? '…' : '';
        profileUserStatus.style.color = state === 'available' ? '#059669' : state === 'taken' || state === 'invalid' ? '#dc2626' : '';
      }
      profileNickOk = state === 'available' || state === 'empty' || (state !== 'invalid' && state !== 'taken' && state !== 'checking' && profileUserInput?.value.trim() === originalUsername);
      if (state === 'available') profileNickOk = true;
      if (state === 'taken' || state === 'invalid' || state === 'checking') profileNickOk = false;
      if (profileUserInput && profileUserInput.value.trim() === originalUsername) profileNickOk = true;
    }

    profileUserInput?.addEventListener('input', () => {
      let v = profileUserInput.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (v !== profileUserInput.value) profileUserInput.value = v;
      clearTimeout(profileNickTimer);
      if (!v) {
        setProfileNickStatus('empty', `От ${NICKNAME_MIN} до ${NICKNAME_MAX} символов: латиница в нижнем регистре, цифры, _`, false);
        return;
      }
      if (v === originalUsername) {
        setProfileNickStatus('available', 'Текущий никнейм', false);
        return;
      }
      if (v.length < NICKNAME_MIN || v.length > NICKNAME_MAX) {
        setProfileNickStatus('invalid', `Длина должна быть от ${NICKNAME_MIN} до ${NICKNAME_MAX} символов.`, true);
        return;
      }
      if (!NICKNAME_RE.test(v)) {
        setProfileNickStatus('invalid', 'Только латиница, цифры и _', true);
        return;
      }
      setProfileNickStatus('checking', 'Проверяем…', false);
      profileNickTimer = setTimeout(async () => {
        try {
          const { data } = await supabaseClient.from('profiles').select('id').eq('username', v).maybeSingle();
          if (data && Number(data.id) !== Number(profileId)) {
            setProfileNickStatus('taken', 'Этот никнейм уже занят', true);
          } else {
            setProfileNickStatus('available', 'Никнейм свободен', false);
          }
        } catch {
          setProfileNickStatus('available', '', false);
        }
      }, 400);
    });

    document.getElementById('profileAccountForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('profileAccountError');
      if (errEl) errEl.textContent = '';
      const newName = (document.getElementById('profileEditFullName')?.value || '').trim();
      const newNick = (document.getElementById('profileEditUsername')?.value || '').trim().toLowerCase();

      if (newNick && (newNick.length < NICKNAME_MIN || newNick.length > NICKNAME_MAX || !NICKNAME_RE.test(newNick))) {
        if (errEl) errEl.textContent = `Никнейм: от ${NICKNAME_MIN} до ${NICKNAME_MAX} символов (a-z, 0-9, _).`;
        return;
      }
      if (!profileNickOk && newNick !== originalUsername) {
        if (errEl) errEl.textContent = 'Выберите свободный никнейм.';
        return;
      }

      const saveBtn = document.getElementById('profileAccountSaveBtn');
      if (saveBtn) saveBtn.disabled = true;

      try {
        const { error: metaErr } = await supabaseClient.auth.updateUser({
          data: { full_name: newName || null, username: newNick || null }
        });
        if (metaErr) throw metaErr;

        if (profileId) {
          const patch = { username: newNick || originalUsername };
          const { error: dbErr } = await supabaseClient.from('profiles').update(patch).eq('id', profileId);
          if (dbErr) {
            if (dbErr.code === '23505') throw new Error('Этот никнейм уже занят.');
            throw dbErr;
          }
        }

        if (currentUser) {
          currentUser.user_metadata = {
            ...(currentUser.user_metadata || {}),
            full_name: newName || null,
            username: newNick || null
          };
        }
        if (currentProfile) currentProfile.username = newNick || originalUsername;

        // UI
        const display = newName || newNick || 'Без имени';
        const h2 = document.getElementById('profilePageFullName');
        const nickEl = document.querySelector('.profile-page-nick');
        if (h2) h2.textContent = display;
        if (nickEl) nickEl.textContent = '@' + (newNick || '—');
        const nameNav = document.getElementById('userName');
        if (nameNav) nameNav.textContent = newNick || newName || nameNav.textContent;

        const avUrl = currentProfile?.avatar_url
          || defaultAvatarUrl(newNick || newName || 'U');
        if (!currentProfile?.avatar_url) {
          ['topAvatar', 'dropdownAvatar', 'profilePageAvatar'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.src = avUrl;
          });
        }

        showToast('Профиль сохранён');
      } catch (err) {
        console.error(err);
        if (errEl) errEl.textContent = err.message || 'Не удалось сохранить.';
      }
      if (saveBtn) saveBtn.disabled = false;
    });

    document.getElementById('profileChangePasswordForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('profilePasswordError');
      errEl.textContent = '';
      const p1 = document.getElementById('profileNewPassword').value;
      const p2 = document.getElementById('profileConfirmPassword').value;
      if (p1 !== p2) { errEl.textContent = 'Пароли не совпадают.'; return; }
      if (p1.length < 6) { errEl.textContent = 'Минимум 6 символов.'; return; }
      const btn = document.getElementById('profilePasswordBtn');
      btn.disabled = true;
      const { error } = await supabaseClient.auth.updateUser({ password: p1 });
      btn.disabled = false;
      if (error) { errEl.textContent = 'Не удалось обновить: ' + error.message; return; }
      document.getElementById('profileChangePasswordForm').reset();
      showToast('Пароль обновлён');
    });

    // --- Удаление аккаунта: поповер → ввод ника ---
    const deleteBtn = document.getElementById('profileDeleteAccountBtn');
    deleteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      openDeleteConfirmPopover(deleteBtn, username || originalUsername || '');
    });
  }

  function openDeleteConfirmPopover(anchorBtn, expectedUsername) {
    // убрать старый
    document.getElementById('deleteAccountPopover')?.remove();

    const pop = document.createElement('div');
    pop.id = 'deleteAccountPopover';
    pop.className = 'delete-account-popover';
    pop.innerHTML = `
      <p class="delete-pop-title">Вы уверены?</p>
      <p class="delete-pop-desc">Это деактивирует аккаунт и скроет ваши данные.</p>
      <div class="delete-pop-actions">
        <button type="button" class="btn btn-secondary" id="deletePopCancel">Отмена</button>
        <button type="button" class="btn" id="deletePopConfirm" style="background:#dc2626;color:#fff;">Удалить аккаунт</button>
      </div>`;

    // вставить рядом с кнопкой внутри окна профиля
    const actions = anchorBtn.closest('.profile-page-actions') || anchorBtn.parentElement;
    actions.style.position = 'relative';
    actions.appendChild(pop);
    // анимация
    requestAnimationFrame(() => pop.classList.add('open'));

    const closePop = () => {
      pop.classList.remove('open');
      setTimeout(() => pop.remove(), 180);
      document.removeEventListener('click', onOutside);
    };
    const onOutside = (ev) => {
      if (!pop.contains(ev.target) && ev.target !== anchorBtn) closePop();
    };
    setTimeout(() => document.addEventListener('click', onOutside), 0);

    document.getElementById('deletePopCancel')?.addEventListener('click', closePop);
    document.getElementById('deletePopConfirm')?.addEventListener('click', () => {
      closePop();
      openDeleteNicknameModal(expectedUsername);
    });
  }

  function openDeleteNicknameModal(expectedUsername) {
    document.getElementById('deleteNickBackdrop')?.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'deleteNickBackdrop';
    backdrop.className = 'delete-nick-backdrop';
    backdrop.innerHTML = `
      <div class="delete-nick-modal" role="dialog" aria-modal="true">
        <h3>Удаление аккаунта</h3>
        <p class="delete-nick-desc">Введите свой никнейм <strong>@${expectedUsername || '…'}</strong>, чтобы подтвердить.</p>
        <div class="form-group">
          <div class="nickname-input-wrapper">
            <span class="nickname-at">@</span>
            <input type="text" id="deleteNickInput" placeholder="${expectedUsername || 'nickname'}" autocomplete="off" maxlength="15" />
          </div>
        </div>
        <div class="auth-error" id="deleteNickError"></div>
        <div class="delete-nick-actions">
          <button type="button" class="btn btn-secondary" id="deleteNickCancel">Отмена</button>
          <button type="button" class="btn" id="deleteNickSubmit" style="background:#dc2626;color:#fff;">Удалить навсегда</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('active'));

    const close = () => {
      backdrop.classList.remove('active');
      setTimeout(() => backdrop.remove(), 220);
    };
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    document.getElementById('deleteNickCancel')?.addEventListener('click', close);

    const input = document.getElementById('deleteNickInput');
    input?.focus();

    const doDelete = async () => {
      const errEl = document.getElementById('deleteNickError');
      const typed = (input?.value || '').trim().toLowerCase().replace(/^@/, '');
      const expected = (expectedUsername || '').trim().toLowerCase();
      if (!expected || typed !== expected) {
        if (errEl) errEl.textContent = 'Никнейм не совпадает.';
        return;
      }
      const submitBtn = document.getElementById('deleteNickSubmit');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Удаляем…'; }

      try {
        const profileId = await getProfileId();
        if (!profileId) throw new Error('Профиль не найден');

        // Сначала пробуем Edge Function полного удаления
        let hardOk = false;
        try {
          const { data: fnData, error: fnErr } = await supabaseClient.functions.invoke('delete-account', {
            body: { profile_id: profileId, confirm_username: (currentProfile?.username || '') }
          });
          if (!fnErr && fnData && !fnData.error) hardOk = true;
          if (fnErr) console.warn('delete-account function:', fnErr);
        } catch (fnE) {
          console.warn('Edge Function недоступна, soft-delete', fnE);
        }

        if (!hardOk) {
          const { error } = await supabaseClient.from('profiles').update({
            is_deleted: true,
            deleted_at: new Date().toISOString()
          }).eq('id', profileId);
          if (error) {
            if (/deleted_at|column/i.test(error.message || '')) {
              const { error: e2 } = await supabaseClient.from('profiles').update({ is_deleted: true }).eq('id', profileId);
              if (e2) throw e2;
            } else throw error;
          }
        }

        await supabaseClient.auth.signOut({ scope: 'global' });
        close();
        closeProfileWindow();
        showToast(hardOk ? 'Аккаунт удалён' : 'Аккаунт деактивирован');
        setTimeout(() => {
          const root = siteRootPrefix();
          window.location.href = root + 'index.html';
        }, 900);
      } catch (err) {
        console.error(err);
        if (errEl) errEl.textContent = err.message || 'Не удалось удалить аккаунт.';
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Удалить навсегда'; }
      }
    };

    document.getElementById('deleteNickSubmit')?.addEventListener('click', doDelete);
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doDelete(); } });
  }



  // ================= Публичный профиль =================
  async function initPublicProfilePage() {
    const mount = document.getElementById('publicProfileMount');
    if (!mount) return;
    const params = new URLSearchParams(location.search);
    const username = params.get('u') || params.get('username');
    const id = params.get('id');
    mount.innerHTML = '<div class="skeleton-card" style="height:120px"></div>';
    try {
      let q = supabaseClient.from('profiles').select('id, username, full_name, first_name, last_name, avatar_url, created_at');
      if (id) q = q.eq('id', id);
      else if (username) q = q.eq('username', username);
      else { mount.innerHTML = '<p>Профиль не указан</p>'; return; }
      const { data: profile, error } = await q.maybeSingle();
      if (error) throw error;
      if (!profile) { mount.innerHTML = '<p>Пользователь не найден</p>'; return; }
      const name = profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username || 'Пользователь';
      const av = profile.avatar_url || defaultAvatarUrl(name, 256);
      const [{ count: ideasCount }, { data: arts }] = await Promise.all([
        supabaseClient.from('ideas').select('id_idea', { count: 'exact', head: true }).eq('id_profile', profile.id),
        supabaseClient.from('articles').select('id, title, created_at, slug').eq('id_profile', profile.id).order('created_at', { ascending: false }).limit(24)
      ]);
      const articles = arts || [];
      const root = siteRootPrefix();
      mount.innerHTML = `
        ${renderBreadcrumbs([{ label: 'Главная', href: root + 'index.html' }, { label: name }])}
        <div class="public-profile-hero">
          <img src="${av}" alt="" />
          <div>
            <h1 style="margin:0 0 4px;font-size:1.6rem;">${name}</h1>
            <div style="color:var(--text-muted)">@${profile.username || 'user'}</div>
            <div class="public-profile-stats">
              <span><strong>${ideasCount || 0}</strong> идей</span>
              <span><strong>${articles.length}</strong> статей</span>
            </div>
          </div>
        </div>
        <h2 class="section-title" style="font-size:1.2rem;margin-bottom:12px;">Статьи автора</h2>
        <div class="grid" id="publicAuthorArticles">
          ${articles.length ? articles.map(a => `
            <a class="card" href="${articleHref(a)}" style="text-decoration:none;color:inherit;padding:16px;">
              <h3 class="card-title">${a.title || 'Без названия'}</h3>
              <div class="card-footer"><span>${formatDate(a.created_at)}</span></div>
            </a>`).join('') : '<div class="empty-state"><p>Пока нет статей</p></div>'}
        </div>`;
      if (window.lucide) lucide.createIcons();
    } catch (e) {
      console.error(e);
      mount.innerHTML = '<p>Не удалось загрузить профиль</p>';
    }
  }
  initPublicProfilePage();

  // Ссылки автора → публичный профиль (если есть username)
  document.addEventListener('click', (e) => {
    const tag = e.target.closest('[data-public-profile]');
    if (!tag) return;
    e.preventDefault();
    const u = tag.getAttribute('data-public-profile');
    if (u) location.href = siteRootPrefix() + 'profile/user.html?u=' + encodeURIComponent(u);
  });

  // Пункт «Профиль» в меню / любые .profile-open-link
  document.querySelectorAll('#profilePageLink, a.dropdown-item').forEach(el => {
    if (el.id === 'profilePageLink' || (el.getAttribute('href') || '').includes('profile/profile')) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openProfileWindow();
      });
    }
  });

  // Старый URL / #profile — открыть окно профиля
  if (/\/profile\//.test(window.location.pathname) || window.location.hash === '#profile') {
    initialUserUIPromise.then(() => openProfileWindow());
  }
});
