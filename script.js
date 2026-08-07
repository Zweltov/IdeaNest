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

// Ссылка на статью: всегда обычная articles/article.html?id=... — сама страница
// статьи после загрузки тихо подменяет адрес на красивый (см. initArticleDetailPage).
function articleHref(article) {
  return siteRootPrefix() + 'articles/article.html?id=' + article.id;
}

let currentUser = null;   // объект пользователя из supabase.auth
let currentProfile = null; // строка из таблицы profiles (id, username, auth_id, created_at)

document.addEventListener("DOMContentLoaded", () => {
  // Инициализация иконок Lucide
  lucide.createIcons();

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
        <div class="mobile-menu-footer">
          <button type="button" class="btn btn-secondary" id="mobileMenuAuthBtn" style="width:100%;"></button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeMobileMenu(); });
    document.getElementById('mobileMenuProfileBtn')?.addEventListener('click', () => {
      closeMobileMenu();
      if (!currentUser) { loginBtn?.click(); return; }
      openProfileWindow();
    });
    document.getElementById('mobileMenuAuthBtn')?.addEventListener('click', async () => {
      closeMobileMenu();
      if (currentUser) {
        await supabaseClient.auth.signOut({ scope: 'global' });
        showToast('Вы вышли');
        setTimeout(() => location.reload(), 400);
      } else loginBtn?.click();
    });
  }
  function openMobileMenu() {
    ensureMobileMenu();
    const authBtn = document.getElementById('mobileMenuAuthBtn');
    if (authBtn) authBtn.textContent = currentUser ? 'Выйти' : 'Войти';
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
            <a href="#" data-footer-soon="about">Об авторе</a>
            <a href="#" data-footer-soon="contacts">Контакты</a>
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




  // Hero CTA на главной
  document.getElementById('heroStartBtn')?.addEventListener('click', () => {
    document.getElementById('ideas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.getElementById('heroHowBtn')?.addEventListener('click', () => {
    document.getElementById('articles')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

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
      const entry = {
        id: u.id,
        email: u.email || '',
        username: u.user_metadata?.username || (u.email || '').split('@')[0],
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        updated_at: Date.now()
      };
      let list = loadSavedAccounts().filter(a => a.id !== entry.id);
      list.unshift(entry);
      persistSavedAccounts(list);
    } catch (e) { console.warn('remember account', e); }
  }

  async function switchToSavedAccount(accountId) {
    const acc = loadSavedAccounts().find(a => a.id === accountId);
    if (!acc?.access_token || !acc?.refresh_token) {
      showToast('Сессия аккаунта устарела — войдите снова', true);
      return;
    }
    const { error } = await supabaseClient.auth.setSession({
      access_token: acc.access_token,
      refresh_token: acc.refresh_token
    });
    if (error) {
      showToast('Не удалось переключить: ' + error.message, true);
      return;
    }
    await rememberCurrentAccount();
    showToast('Аккаунт: ' + (acc.username || acc.email));
    closeProfileDropdown();
    setTimeout(() => location.reload(), 350);
  }

  function openAccountSwitcher() {
    const list = loadSavedAccounts();
    const currentId = currentUser?.id;
    if (!list.length) {
      showToast('Сохранённых аккаунтов пока нет. Войдите в другой — он появится здесь.');
      return;
    }
    document.getElementById('accountSwitchBackdrop')?.remove();
    const bd = document.createElement('div');
    bd.id = 'accountSwitchBackdrop';
    bd.className = 'account-switch-backdrop';
    bd.innerHTML = `
      <div class="account-switch-modal" role="dialog">
        <h3>Переключить аккаунт</h3>
        <div class="account-switch-list">
          ${list.map(a => `
            <button type="button" class="account-switch-item${a.id === currentId ? ' is-current' : ''}" data-acc-id="${a.id}">
              <span class="account-switch-name">@${a.username || 'user'}</span>
              <span class="account-switch-email">${a.email || ''}</span>
              ${a.id === currentId ? '<span class="account-switch-badge">текущий</span>' : ''}
            </button>
          `).join('')}
        </div>
        <button type="button" class="btn btn-secondary" id="accountSwitchClose" style="width:100%;margin-top:12px;">Закрыть</button>
      </div>`;
    document.body.appendChild(bd);
    requestAnimationFrame(() => bd.classList.add('active'));
    bd.addEventListener('click', (e) => { if (e.target === bd) bd.remove(); });
    document.getElementById('accountSwitchClose')?.addEventListener('click', () => bd.remove());
    bd.querySelectorAll('[data-acc-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.accId;
        if (id === currentId) { showToast('Уже этот аккаунт'); return; }
        switchToSavedAccount(id);
      });
    });
  }

  function wireAccountMenuButtons() {
    document.querySelectorAll('.profile-dropdown .dropdown-item').forEach(el => {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text.includes('Текущий аккаунт') && !el.dataset.accWired) {
        el.dataset.accWired = '1';
        el.addEventListener('click', (e) => {
          e.preventDefault();
          if (!currentUser) { showToast('Вы не вошли'); return; }
          const name = currentProfile?.username || currentUser.email || '';
          showToast('Текущий: ' + name);
        });
      }
      if (text.includes('Добавить аккаунт') && !el.dataset.accWired) {
        el.dataset.accWired = '1';
        el.addEventListener('click', async (e) => {
          e.preventDefault();
          await rememberCurrentAccount();
          closeProfileDropdown();
          await supabaseClient.auth.signOut({ scope: 'local' });
          currentUser = null;
          currentProfile = null;
          if (loginBtn) loginBtn.style.display = '';
          if (profileWrapper) profileWrapper.style.display = 'none';
          openAuthModal('signin');
          showToast('Войдите в другой аккаунт');
        });
      }
      if (text.includes('Переключить аккаунт') && !el.dataset.accWired) {
        el.dataset.accWired = '1';
        el.addEventListener('click', (e) => {
          e.preventDefault();
          closeProfileDropdown();
          openAccountSwitcher();
        });
      }
    });
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
                return `<a class="mega-menu-item mega-menu-item--compact" href="${root}ideas/idea.html?id=${i.id_idea}">
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
    identifierGroup.style.display = isRecovery ? 'none' : '';
    authEmail.required = !isRecovery;
    passwordGroup.style.display = (isReset || isRecovery) ? 'none' : '';
    authPassword.required = !(isReset || isRecovery);
    recoveryPasswordGroup.style.display = isRecovery ? 'flex' : 'none';
    authForgotRow.style.display = (authMode === 'signin') ? 'block' : 'none';

    if (isRecovery) authSubmitBtn.textContent = 'Сохранить новый пароль';
    else if (isReset) authSubmitBtn.textContent = 'Отправить письмо';
    else authSubmitBtn.textContent = authMode === 'signup' ? 'Создать аккаунт' : 'Войти';

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
    }

    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = authMode === 'signup' ? 'Создаём аккаунт...' : 'Входим...';

    try {
      if (authMode === 'signup') {
        const fullName = authFullName.value.trim();
        const username = authUsername.value.trim();
        // full_name хранится в Auth user_metadata, не в таблице profiles
        const { data, error } = await supabaseClient.auth.signUp({
          email: identifier,
          password,
          options: { data: { full_name: fullName, username } }
        });
        if (error) throw error;
        // Если у проекта включено подтверждение по email, сессии ещё не будет —
        // профиль создадим сразу же, как только появится сессия (см. onAuthStateChange).
        if (data.user) {
          await ensureProfile(data.user, username);
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
      authSubmitBtn.disabled = false;
      authSubmitBtn.textContent = authMode === 'signup' ? 'Создать аккаунт' : 'Войти';
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
  async function ensureProfile(user, usernameForNew) {
    try {
      const { data: existing, error: selErr } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('auth_id', user.id)
        .maybeSingle();
      if (selErr) throw selErr;
      if (existing) return existing;

      const username = usernameForNew
        || user.user_metadata?.username
        || (user.email ? user.email.split('@')[0] : 'user');
      const { data: created, error: insErr } = await supabaseClient
        .from('profiles')
        .insert({ auth_id: user.id, username })
        .select()
        .maybeSingle();
      if (insErr) throw insErr;
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
    const quickAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(quickName)}&background=111827&color=fff&bold=true`;
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
      || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=111827&color=fff&bold=true`;
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


  function applyIdeaFilters() {
    const activeBtn = document.querySelector('.filter-btn.active');
    const category = activeBtn ? activeBtn.dataset.filter : 'all';
    const minRating = ratingSlider ? parseFloat(ratingSlider.value) : 0;
    const searchQuery = ideaSearchInput ? ideaSearchInput.value.trim().toLowerCase() : '';

    const filtered = ideasCache.filter(idea => {
      const matchesArticle = !filterArticleId || relatedIdeaIds.has(Number(idea.id_idea));
      const matchesCategory = category === 'all' || idea.category === category;
      const matchesRating = idea.rating == null ? minRating === 0 : Number(idea.rating) >= minRating;
      const matchesSearch = !searchQuery || [idea.title, idea.pluses, idea.minuses, idea.risks, idea.potential]
        .some(field => (field || '').toLowerCase().includes(searchQuery));
      return matchesArticle && matchesCategory && matchesRating && matchesSearch;
    });

    renderIdeasList(sortIdeas(filtered));
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
      <a class="btn btn-primary idea-open-btn" href="ideas/idea.html?id=${idea.id_idea}">
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
      ideasGrid.innerHTML = shown.length
        ? shown.map(idea => renderIdeaCard(idea, {
            featured: !!(filterArticleId && mainIdeaIdForArticle && Number(idea.id_idea) === mainIdeaIdForArticle)
          })).join('')
        : '<p style="opacity:0.6;">Ничего не найдено по заданным фильтрам.</p>';
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
    try {
      const { data, error } = await supabaseClient
        .from('ideas')
        .select('*')
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

  function articleAuthor(article) {
    return article.profiles?.username || 'Автор не указан';
  }

  function articleExcerpt(article, len) {
    const text = (article.text || '').replace(/[#*`>_~-]/g, '').trim();
    return text.length > len ? text.slice(0, len) + '…' : (text || 'Текст пока не заполнен.');
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
    const cleaned = text.replace(/:::(tip|warning|note|success|danger|pros|cons|checklist)\s*\n([\s\S]*?)\n:::/g, (m, type, body) => {
      const idx = blocks.length;
      if (type === 'pros' || type === 'cons') {
        const isPros = type === 'pros';
        const items = body.split('\n').map(l => l.trim()).filter(Boolean)
          .map(l => `<li><i data-lucide="${isPros ? 'check' : 'x'}"></i> ${l}</li>`).join('');
        blocks.push(`<ul class="proscons-list ${type}">${items}</ul>`);
      } else if (type === 'checklist') {
        const items = body.split('\n').map(l => l.trim()).filter(Boolean)
          .map(l => `<li><i data-lucide="square"></i> ${l}</li>`).join('');
        blocks.push(`<ul class="checklist-list">${items}</ul>`);
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
      ADD_TAGS: ['iframe', 'input', 'label'],
      ADD_ATTR: [
        'allow', 'allowfullscreen', 'frameborder', 'src', 'title', 'loading',
        'type', 'min', 'max', 'step', 'value', 'placeholder', 'class', 'id',
        'data-payback-id', 'data-payback-months', 'data-payback-year', 'data-payback-roi'
      ]
    };
    return window.DOMPurify ? DOMPurify.sanitize(html, purifyCfg) : html;
  }

  function setMetaDescription(text) {
    if (!text) return;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', text.trim().slice(0, 160));
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
        .select('*, profiles(username)')
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
                <span class="card-tag">${articleAuthor(a)}</span>
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
          <span class="card-tag">${articleAuthor(article)}</span>
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
      <span class="card-tag">${articleAuthor(article)}</span>
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
      grid.innerHTML = list.length
        ? list.map(a => renderArticleCard(a)).join('')
        : '<p style="opacity:0.6;">Пока нет ни одной статьи в базе.</p>';
      if (window.lucide) lucide.createIcons();
      wireArticleCardClicks(grid);
    } catch (err) {
      console.error('Ошибка отрисовки статей:', err);
      grid.innerHTML = '<p style="opacity:0.6;">Не удалось отобразить статьи.</p>';
    }
  }

  async function loadArticlesFromSupabase() {
    const articlesPageGrid = document.getElementById('articlesPageGrid');
    const targetGrid = document.getElementById('articlesGrid') || articlesPageGrid;
    if (!targetGrid) return;
    try {
      // Сначала простой select — без join (join часто ломается без FK и даёт пустой ответ/ошибку)
      let data = null;
      let error = null;
      {
        const res = await supabaseClient
          .from('articles')
          .select('*')
          .order('created_at', { ascending: false });
        data = res.data;
        error = res.error;
      }
      if (error) throw error;

      articlesCache = data || [];

      // Опционально подтянуть ники (не блокируем список)
      try {
        const { data: withAuthors } = await supabaseClient
          .from('articles')
          .select('id, profiles(username)')
          .order('created_at', { ascending: false });
        if (withAuthors && withAuthors.length) {
          const map = {};
          withAuthors.forEach(r => { map[r.id] = r.profiles; });
          articlesCache.forEach(a => {
            if (map[a.id]) a.profiles = map[a.id];
          });
        }
      } catch (_) { /* ignore */ }

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
    grid.querySelectorAll('[data-article-id]').forEach(card => {
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
      const query = supabaseClient.from('articles').select('*, profiles(username)');
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

    container.innerHTML = `
      ${mediaCoverUrl(article) ? `
      <div class="article-hero" style="background-image:url('${escapeAttr(mediaCoverUrl(article))}')">
        <div class="article-hero-overlay">
          <span class="card-tag idea-hero-tag">${articleAuthor(article)}</span>
          <h1 class="idea-hero-title">${article.title || 'Без названия'}</h1>
        </div>
      </div>` : `
      <span class="card-tag">${articleAuthor(article)}</span>
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
    wireFaqCard(document.getElementById('articleFaqContainer'));
    wirePaybackCalcs(document.getElementById('articleBody') || document);
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
            ${list.map(r => `<a class="btn btn-secondary idea-open-btn" href="../ideas/idea.html?id=${r.ideas.id_idea}">${r.ideas.title || 'Идея №' + r.ideas.id_idea}</a>`).join('')}
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
    const ideaId = parseInt(new URLSearchParams(window.location.search).get('id'), 10);
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

    document.title = `${ideaTitle(idea)} — IdeaNest`;

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

    container.innerHTML = `
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
        'accent-primary': '#000000', 'accent-hover': '#374151', 'accent-light': '#f3f4f6',
        'bg-color': '#ffffff', 'bg-muted': '#f9fafb', 'surface-color': '#ffffff',
        'text-main': '#111827', 'text-muted': '#6b7280', 'border-color': '#e5e7eb'
      }
    },
    dark: {
      name: 'Тёмная',
      colors: {
        'accent-primary': '#6366f1', 'accent-hover': '#818cf8', 'accent-light': '#25252f',
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
    }
  };

  function applyThemeColors(colors) {
    const root = document.documentElement.style;
    Object.keys(colors).forEach(k => root.setProperty('--' + k, colors[k]));
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
        applyThemeColors(colors);
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
          applyThemeColors(BUILTIN_THEMES.light.colors);
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
      // 256×256 JPEG (меньше файл → стабильнее upload)
      const SIZE = 256;
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
        out.toBlob((b) => (b ? resolve(b) : reject(new Error('blob'))), 'image/jpeg', 0.82);
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
      || `https://ui-avatars.com/api/?name=${encodeURIComponent(username || fullName || 'U')}&background=111827&color=fff&bold=true&size=256`;
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

    document.getElementById('profileAvatarEditBtn')?.addEventListener('click', () => {
      openAvatarPicker();
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
          || `https://ui-avatars.com/api/?name=${encodeURIComponent(newNick || newName || 'U')}&background=111827&color=fff&bold=true`;
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

        // soft-delete: флаг + время; auth-пользователь остаётся (полное удаление — Edge Function)
        const { error } = await supabaseClient.from('profiles').update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        }).eq('id', profileId);
        if (error) {
          // если колонки deleted_at нет — только is_deleted
          if (/deleted_at|column/i.test(error.message || '')) {
            const { error: e2 } = await supabaseClient.from('profiles').update({ is_deleted: true }).eq('id', profileId);
            if (e2) throw e2;
          } else {
            throw error;
          }
        }

        await supabaseClient.auth.signOut({ scope: 'global' });
        close();
        closeProfileWindow();
        showToast('Аккаунт деактивирован');
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
