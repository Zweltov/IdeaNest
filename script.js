// ==========================================================================
//  IdeaNest — script.js (общий для index.html и всех страниц ideas/idea.html)
//  Подключено: аутентификация (регистрация/вход/выход), каталог идей из
//  таблицы ideas в Supabase, окно предпросмотра идеи со всеми её полями,
//  отдельная страница идеи с избранным/апвоутом/учётом просмотра.
//  Статьи пока остаются демо-данными — это следующий шаг.
// ==========================================================================

const SUPABASE_URL = 'https://hhwndrynnozllrqtcdct.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhod25kcnlubm96bGxycXRjZGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MTkyOTIsImV4cCI6MjA5OTQ5NTI5Mn0.Gq2PNYIiZzKIaUNOY1AfF-8yVnAjPCf2HRGMX11Av14';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;   // объект пользователя из supabase.auth
let currentProfile = null; // строка из таблицы profiles (id, username, auth_id, created_at)

document.addEventListener("DOMContentLoaded", () => {
  // Инициализация иконок Lucide
  lucide.createIcons();

  // ================= 1. Логика Меню Профиля (Dropdown) =================
  const profileWrapper = document.getElementById('profileWrapper');
  const profileDropdown = document.getElementById('profileDropdown');
  const topAvatar = document.getElementById('topAvatar');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  topAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    profileDropdown.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (!profileWrapper.contains(e.target)) {
      profileDropdown.classList.remove('active');
    }
  });

  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    profileDropdown.classList.remove('active');
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      showToast('Не удалось выйти: ' + error.message, true);
    } else {
      showToast('Вы вышли из аккаунта');
    }
  });

  // "Мои идеи" / "Мои статьи" — список избранного прямо в уже готовых окнах идей/статей
  const myIdeasBtn = document.getElementById('myIdeasBtn');
  const myArticlesBtn = document.getElementById('myArticlesBtn');

  if (myIdeasBtn) myIdeasBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    profileDropdown.classList.remove('active');
    const pId = await getProfileId();
    if (!pId) { loginBtn?.click(); return; }
    const backdrop = document.getElementById('ideaBackdrop');
    const body = document.getElementById('ideaModalBody');
    if (!backdrop || !body) return;
    body.innerHTML = '<p style="color:var(--text-muted);">Загрузка...</p>';
    backdrop.classList.add('active');
    try {
      const { data, error } = await supabaseClient
        .from('favorites_ideas')
        .select('id_idea, ideas(id_idea, title)')
        .eq('id_profile', pId);
      if (error) throw error;
      const list = (data || []).filter(r => r.ideas);
      body.innerHTML = `<h2 class="idea-modal-title">Мои избранные идеи</h2>` +
        (list.length
          ? list.map(r => `<a class="btn btn-secondary idea-open-btn" style="margin-bottom:10px;" href="ideas/idea.html?id=${r.ideas.id_idea}">${r.ideas.title || 'Идея №' + r.ideas.id_idea}</a>`).join('')
          : '<p style="color:var(--text-muted);">Пока пусто — добавьте идеи в избранное.</p>');
    } catch (err) {
      console.error(err);
      body.innerHTML = '<p>Не удалось загрузить список.</p>';
    }
  });

  if (myArticlesBtn) myArticlesBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    profileDropdown.classList.remove('active');
    const pId = await getProfileId();
    if (!pId) { loginBtn?.click(); return; }
    const backdrop = document.getElementById('articleBackdrop');
    const body = document.getElementById('articleModalBody');
    if (!backdrop || !body) return;
    body.innerHTML = '<p style="color:var(--text-muted);">Загрузка...</p>';
    backdrop.classList.add('active');
    try {
      const { data, error } = await supabaseClient
        .from('favorites_articles')
        .select('id_article, articles(id, title)')
        .eq('id_profile', pId);
      if (error) throw error;
      const list = (data || []).filter(r => r.articles);
      body.innerHTML = `<h2 class="idea-modal-title">Мои избранные статьи</h2>` +
        (list.length
          ? list.map(r => `<a class="btn btn-secondary idea-open-btn" style="margin-bottom:10px;" href="articles/article.html?id=${r.articles.id}">${r.articles.title || 'Без названия'}</a>`).join('')
          : '<p style="color:var(--text-muted);">Пока пусто — добавьте статьи в избранное.</p>');
    } catch (err) {
      console.error(err);
      body.innerHTML = '<p>Не удалось загрузить список.</p>';
    }
  });

  // ================= 2. Модальное окно авторизации =================
  const authBackdrop = document.getElementById('authBackdrop');
  const authForm = document.getElementById('authForm');
  const authTabs = document.querySelectorAll('.auth-tab');
  const usernameGroup = document.getElementById('usernameGroup');
  const authUsername = document.getElementById('authUsername');
  const authEmail = document.getElementById('authEmail');
  const authPassword = document.getElementById('authPassword');
  const authError = document.getElementById('authError');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authCloseBtn = document.getElementById('authCloseBtn');
  let authMode = 'signin'; // 'signin' | 'signup'

  function openAuthModal(mode) {
    authMode = mode || 'signin';
    authTabs.forEach(t => t.classList.toggle('active', t.dataset.authTab === authMode));
    usernameGroup.style.display = authMode === 'signup' ? 'flex' : 'none';
    authSubmitBtn.textContent = authMode === 'signup' ? 'Создать аккаунт' : 'Войти';
    authError.textContent = '';
    authForm.reset();
    authBackdrop.classList.add('active');
  }
  function closeAuthModal() { authBackdrop.classList.remove('active'); }

  loginBtn.addEventListener('click', () => openAuthModal('signin'));
  authCloseBtn.addEventListener('click', closeAuthModal);
  authBackdrop.addEventListener('click', (e) => { if (e.target === authBackdrop) closeAuthModal(); });

  authTabs.forEach(tab => {
    tab.addEventListener('click', () => openAuthModal(tab.dataset.authTab));
  });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.textContent = '';
    const email = authEmail.value.trim();
    const password = authPassword.value;

    if (!email || !password) { authError.textContent = 'Заполните email и пароль.'; return; }
    if (authMode === 'signup' && password.length < 6) {
      authError.textContent = 'Пароль должен быть не короче 6 символов.'; return;
    }

    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = authMode === 'signup' ? 'Создаём аккаунт...' : 'Входим...';

    try {
      if (authMode === 'signup') {
        const username = authUsername.value.trim() || email.split('@')[0];
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
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
    if (/invalid login credentials/i.test(msg)) return 'Неверный email или пароль.';
    if (/password/i.test(msg) && /6/.test(msg)) return 'Пароль должен быть не короче 6 символов.';
    return msg;
  }

  // ================= 3. Состояние авторизации =================
  // Находит (или создаёт) запись в таблице profiles для текущего пользователя.
  // Схема: profiles(id, created_at, username, auth_id -> auth.users.id)
  async function ensureProfile(user, usernameForNew) {
    try {
      const { data: existing, error: selErr } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('auth_id', user.id)
        .maybeSingle();
      if (selErr) throw selErr;
      if (existing) return existing;

      const username = usernameForNew || (user.email ? user.email.split('@')[0] : 'user');
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
      loginBtn.style.display = '';
      profileWrapper.style.display = 'none';
      profileDropdown.classList.remove('active');
      return;
    }

    currentProfile = await ensureProfile(currentUser);
    const displayName = currentProfile?.username || currentUser.email.split('@')[0];
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=111827&color=fff&bold=true`;

    document.getElementById('topAvatar').src = avatarUrl;
    document.getElementById('dropdownAvatar').src = avatarUrl;
    document.getElementById('userName').textContent = displayName;
    document.getElementById('userEmail').textContent = currentUser.email;

    loginBtn.style.display = 'none';
    profileWrapper.style.display = '';
  }

  // Реагируем на любые изменения сессии: вход, выход, обновление токена
  supabaseClient.auth.onAuthStateChange((event) => {
    updateUserUI();
    if (event === 'SIGNED_IN') showToast('Вы вошли в аккаунт');
  });

  updateUserUI();

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

  // ================= 6. Фильтры (с сохранением иконок/текста) =================
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filterValue = btn.dataset.filter;
      console.log(`Фильтруем по категории: ${filterValue}`);
      // Подключение к таблице ideas (фильтрация на стороне Supabase) — следующий шаг.
    });
  });

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

  function renderIdeaCard(idea) {
    const shortText = (idea.pluses || idea.risks || 'Описание пока не заполнено.').slice(0, 110);
    return `
      <div class="card" data-idea-id="${idea.id_idea}">
        <span class="card-tag">${idea.complexity || 'Сложность не указана'}</span>
        <h3 class="card-title">${ideaTitle(idea)}</h3>
        <p class="card-desc">${shortText}${shortText.length >= 110 ? '…' : ''}</p>
        <div class="card-footer">
          <span>${formatBudget(idea.budget)}</span>
          <div class="card-rating">
            <i data-lucide="star" style="width:14px; height:14px; fill: currentColor;"></i> ${idea.rating != null ? Number(idea.rating).toFixed(1) : '—'}
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

  async function loadIdeasFromSupabase() {
    if (!ideasGrid) return;
    try {
      const { data, error } = await supabaseClient
        .from('ideas')
        .select('*')
        .order('id_idea', { ascending: true });
      if (error) throw error;
      ideasCache = data || [];
      ideasGrid.innerHTML = ideasCache.length
        ? ideasCache.map(renderIdeaCard).join('')
        : '<p style="opacity:0.6;">Пока нет ни одной идеи в базе.</p>';
      if (window.lucide) lucide.createIcons();
      ideasGrid.querySelectorAll('[data-idea-id]').forEach(card => {
        card.addEventListener('click', () => {
          const idea = ideasCache.find(i => i.id_idea === parseInt(card.dataset.ideaId, 10));
          if (idea) openIdeaPreview(idea);
        });
      });
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
    const text = (article.text || '').trim();
    return text.length > len ? text.slice(0, len) + '…' : (text || 'Текст пока не заполнен.');
  }

  function renderArticleCard(article) {
    return `
      <div class="card" data-article-id="${article.id}">
        <span class="card-tag">${articleAuthor(article)}</span>
        <h3 class="card-title">${article.title || 'Без названия'}</h3>
        <p class="card-desc">${articleExcerpt(article, 130)}</p>
        <div class="card-footer">
          <span>${formatDate(article.created_at)}</span>
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
      <a class="btn btn-primary idea-open-btn" href="articles/article.html?id=${article.id}">
        <i data-lucide="book-open"></i> Читать
      </a>
    `;
    if (window.lucide) lucide.createIcons();
    articleBackdrop.classList.add('active');
  }

  async function loadArticlesFromSupabase() {
    if (!articlesGrid) return;
    try {
      // Пробуем подтянуть автора через связь с profiles; если внешний ключ
      // в Supabase не настроен, откатываемся к обычной выборке без автора.
      let { data, error } = await supabaseClient
        .from('articles')
        .select('*, profiles(username)')
        .order('created_at', { ascending: false });
      if (error) {
        const fallback = await supabaseClient.from('articles').select('*').order('created_at', { ascending: false });
        data = fallback.data; error = fallback.error;
        if (error) throw error;
      }
      articlesCache = data || [];
      articlesGrid.innerHTML = articlesCache.length
        ? articlesCache.map(renderArticleCard).join('')
        : '<p style="opacity:0.6;">Пока нет ни одной статьи в базе.</p>';
      if (window.lucide) lucide.createIcons();
      articlesGrid.querySelectorAll('[data-article-id]').forEach(card => {
        card.addEventListener('click', () => {
          const article = articlesCache.find(a => a.id === parseInt(card.dataset.articleId, 10));
          if (article) openArticlePreview(article);
        });
      });
    } catch (e) {
      console.error('Ошибка загрузки статей:', e);
      articlesGrid.innerHTML = '<p style="opacity:0.6;">Не удалось загрузить статьи.</p>';
    }
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
    const articleId = parseInt(new URLSearchParams(window.location.search).get('id'), 10);
    if (!articleId) { container.innerHTML = '<p>Статья не найдена — не указан id.</p>'; return; }

    let article;
    try {
      let { data, error } = await supabaseClient
        .from('articles')
        .select('*, profiles(username)')
        .eq('id', articleId)
        .maybeSingle();
      if (error) {
        const fallback = await supabaseClient.from('articles').select('*').eq('id', articleId).maybeSingle();
        data = fallback.data; error = fallback.error;
        if (error) throw error;
      }
      if (!data) { container.innerHTML = '<p>Статья не найдена.</p>'; return; }
      article = data;
    } catch (e) {
      console.error('Ошибка загрузки статьи:', e);
      container.innerHTML = '<p>Не удалось загрузить статью. Попробуйте обновить страницу.</p>';
      return;
    }

    document.title = `${article.title || 'Статья'} — IdeaNest`;

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
      <span class="card-tag">${articleAuthor(article)}</span>
      <h1 class="idea-modal-title">${article.title || 'Без названия'}</h1>
      <div class="idea-pill-row">
        <span class="idea-pill"><i data-lucide="calendar"></i> ${formatDate(article.created_at) || 'дата не указана'}</span>
      </div>
      <div class="idea-field-block">
        <p style="white-space: pre-line; font-size: 0.95rem; line-height: 1.75;">${article.text || 'Текст пока не заполнен.'}</p>
      </div>
      <div class="hero-actions" style="justify-content:flex-start; margin-top: 24px;">
        <button class="btn ${isUpvoted ? 'btn-primary' : 'btn-secondary'}" id="articleUpvoteBtn">
          <i data-lucide="arrow-up"></i> ${isUpvoted ? 'Апвоут поставлен' : 'Апвоут'}
        </button>
        <button class="btn ${isFav ? 'btn-primary' : 'btn-secondary'}" id="articleFavBtn">
          <i data-lucide="bookmark"></i> ${isFav ? 'В избранном' : 'В избранное'}
        </button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();

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

    container.innerHTML = `
      <span class="card-tag">${idea.complexity || 'Сложность не указана'}</span>
      <h1 class="idea-modal-title">${ideaTitle(idea)}</h1>
      <div class="idea-pill-row">
        <span class="idea-pill"><i data-lucide="wallet"></i> ${formatBudget(idea.budget)}</span>
        <span class="idea-pill"><i data-lucide="bar-chart-2"></i> ${idea.complexity || '—'}</span>
        <span class="idea-pill"><i data-lucide="trending-up"></i> ${idea.potential || '—'}</span>
        <span class="idea-pill"><i data-lucide="star"></i> ${idea.rating != null ? Number(idea.rating).toFixed(1) : '—'}</span>
      </div>
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
    `;
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
});
