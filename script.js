// ==========================================================================
//  IdeaNest — script.js (общий для index.html и всех страниц ideas/idea.html)
//  Подключено: аутентификация (регистрация/вход/выход), каталог идей и статей
//  из таблиц ideas/articles в Supabase, окна предпросмотра со всеми полями,
//  отдельные страницы идеи/статьи с избранным/апвоутом/учётом просмотра.
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
  const profileBlurOverlay = document.getElementById('profileBlurOverlay');
  const topAvatar = document.getElementById('topAvatar');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  function openProfileDropdown() {
    profileDropdown.classList.add('active');
    profileBlurOverlay?.classList.add('active');
  }
  function closeProfileDropdown() {
    profileDropdown.classList.remove('active');
    profileBlurOverlay?.classList.remove('active');
  }

  topAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    if (profileDropdown.classList.contains('active')) closeProfileDropdown();
    else openProfileDropdown();
  });

  document.addEventListener('click', (e) => {
    if (!profileWrapper.contains(e.target)) {
      closeProfileDropdown();
    }
  });

  // Кнопка "Профиль" в нижней мобильной панели: если пользователь не залогинен —
  // открывает то же окно входа, что и кнопка "Войти" сверху; если залогинен —
  // открывает/закрывает ту же карточку профиля (у неё уже есть свой стиль
  // "bottom sheet" на мобильном).
  const bottomNavProfile = document.getElementById('bottomNavProfile');
  if (bottomNavProfile) {
    bottomNavProfile.addEventListener('click', (e) => {
      e.stopPropagation();
      if (loginBtn && loginBtn.style.display !== 'none') {
        loginBtn.click();
      } else if (profileDropdown.classList.contains('active')) {
        closeProfileDropdown();
      } else {
        openProfileDropdown();
      }
    });
  }

  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    closeProfileDropdown();
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
    closeProfileDropdown();
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
    closeProfileDropdown();
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
        .select('id_article, articles(id, title, slug)')
        .eq('id_profile', pId);
      if (error) throw error;
      const list = (data || []).filter(r => r.articles);
      body.innerHTML = `<h2 class="idea-modal-title">Мои избранные статьи</h2>` +
        (list.length
          ? list.map(r => `<a class="btn btn-secondary idea-open-btn" style="margin-bottom:10px;" href="articles/article.html?${r.articles.slug ? 'slug=' + r.articles.slug : 'id=' + r.articles.id}">${r.articles.title || 'Без названия'}</a>`).join('')
          : '<p style="color:var(--text-muted);">Пока пусто — добавьте статьи в избранное.</p>');
    } catch (err) {
      console.error(err);
      body.innerHTML = '<p>Не удалось загрузить список.</p>';
    }
  });

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
        const { data, error } = await supabaseClient.auth.signUp({ email: identifier, password });
        if (error) throw error;
        // Если у проекта включено подтверждение по email, сессии ещё не будет —
        // профиль создадим сразу же, как только появится сессия (см. onAuthStateChange).
        if (data.user) {
          await ensureProfile(data.user, username, fullName);
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
  async function ensureProfile(user, usernameForNew, fullNameForNew) {
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
        .insert({ auth_id: user.id, username, full_name: fullNameForNew || null })
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
      closeProfileDropdown();
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
    if (event === 'PASSWORD_RECOVERY') openAuthModal('recovery');
  });

  const initialUserUIPromise = updateUserUI();

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
    });
  });

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

  function applyIdeaFilters() {
    const activeBtn = document.querySelector('.filter-btn.active');
    const category = activeBtn ? activeBtn.dataset.filter : 'all';
    const minRating = ratingSlider ? parseFloat(ratingSlider.value) : 0;
    const searchQuery = ideaSearchInput ? ideaSearchInput.value.trim().toLowerCase() : '';

    const filtered = ideasCache.filter(idea => {
      const matchesCategory = category === 'all' || idea.category === category;
      const matchesRating = idea.rating == null ? minRating === 0 : Number(idea.rating) >= minRating;
      const matchesSearch = !searchQuery || [idea.title, idea.pluses, idea.minuses, idea.risks, idea.potential]
        .some(field => (field || '').toLowerCase().includes(searchQuery));
      return matchesCategory && matchesRating && matchesSearch;
    });

    renderIdeasList(filtered);
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

  function renderIdeasList(list) {
    if (!ideasGrid) return;
    ideasGrid.innerHTML = list.length
      ? list.map(renderIdeaCard).join('')
      : '<p style="opacity:0.6;">Ничего не найдено по заданным фильтрам.</p>';
    if (window.lucide) lucide.createIcons();
    ideasGrid.querySelectorAll('[data-idea-id]').forEach(card => {
      card.addEventListener('click', () => {
        const idea = ideasCache.find(i => i.id_idea === parseInt(card.dataset.ideaId, 10));
        if (idea) openIdeaPreview(idea);
      });
    });
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
  function renderMarkdown(text) {
    if (!text) return '<p>Текст пока не заполнен.</p>';
    if (window.marked && window.DOMPurify) {
      const html = marked.parse(text, { breaks: true });
      return DOMPurify.sanitize(html);
    }
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<p style="white-space: pre-line;">${escaped}</p>`;
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
          const slug = card.dataset.articleSlug;
          const id = card.dataset.articleId;
          window.location.href = slug ? `article.html?slug=${slug}` : `article.html?id=${id}`;
        });
      });
    } catch (e) {
      console.error('Ошибка загрузки похожих статей:', e);
      container.innerHTML = '';
    }
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
      <a class="btn btn-primary idea-open-btn" href="articles/article.html?${article.slug ? 'slug=' + article.slug : 'id=' + article.id}">
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
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    const legacyId = parseInt(params.get('id'), 10);
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

    // Красивая ссылка: если открыли по старому ?id=, тихо переводим адресную строку на ?slug=
    if (!slug && article.slug) {
      window.history.replaceState(null, '', `article.html?slug=${article.slug}`);
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
      <span class="card-tag">${articleAuthor(article)}</span>
      <h1 class="idea-modal-title">${article.title || 'Без названия'}</h1>
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
      <div id="articleRelatedContainer"></div>
    `;
    if (window.lucide) lucide.createIcons();
    wireFaqCard(document.getElementById('articleFaqContainer'));
    loadRelatedArticles(article, document.getElementById('articleRelatedContainer'));

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

  // ================= 9. Страница настроек (settings/settings.html) =================
  // Раздел "Персонализация" (темы) и "Конфиденциальность" — заглушки, следующие шаги.
  const settingsNav = document.getElementById('settingsNav');
  if (settingsNav) {
    const navItems = settingsNav.querySelectorAll('.settings-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`settingsPanel-${item.dataset.settingsTab}`).classList.add('active');
      });
    });
    initialUserUIPromise.then(() => {
      loadGeneralSettings();
      loadThemeSettings();
      loadPrivacySettings();
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

    document.getElementById('deleteAccountBtn').addEventListener('click', async () => {
      const typed = prompt('Это действие деактивирует аккаунт. Введите УДАЛИТЬ, чтобы подтвердить:');
      if (typed !== 'УДАЛИТЬ') return;
      const { error } = await supabaseClient.from('profiles').update({ is_deleted: true }).eq('id', profileId);
      if (error) { showToast('Не удалось удалить аккаунт', true); return; }
      await supabaseClient.auth.signOut({ scope: 'global' });
      showToast('Аккаунт деактивирован');
      setTimeout(() => window.location.href = '../index.html', 800);
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

    const avatarUrlInput = document.getElementById('settingsAvatarUrl');
    const avatarPreview = document.getElementById('settingsAvatarPreview');
    avatarUrlInput.value = profile.avatar_url || '';
    avatarPreview.src = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=111827&color=fff`;
    avatarUrlInput.addEventListener('input', () => { if (avatarUrlInput.value.trim()) avatarPreview.src = avatarUrlInput.value.trim(); });

    document.getElementById('settingsFullName').value = profile.full_name || '';
    document.getElementById('settingsEmail').value = currentUser.email || '';
    document.getElementById('settingsLanguage').value = profile.language || 'ru';
    document.getElementById('settingsTimezone').value = profile.timezone || 'Europe/Moscow';
    document.getElementById('settingsNotifications').checked = profile.notifications_enabled !== false;
    document.getElementById('settingsEmailNotifications').checked = profile.email_notifications !== false;

    // Проверка занятости никнейма — та же идея, что в форме регистрации, но отдельная
    // реализация, чтобы не задевать код формы входа/регистрации.
    const usernameInput = document.getElementById('settingsUsername');
    const usernameStatus = document.getElementById('settingsUsernameStatus');
    const usernameHint = document.getElementById('settingsUsernameHint');
    const DEFAULT_HINT = 'От 5 до 15 символов: латиница в нижнем регистре, цифры, _';
    usernameInput.value = profile.username || '';
    let usernameCheckTimer;
    usernameInput.addEventListener('input', () => {
      const cleaned = usernameInput.value.trim().toLowerCase();
      usernameInput.value = cleaned;
      clearTimeout(usernameCheckTimer);
      if (!cleaned || cleaned === (profile.username || '')) {
        usernameStatus.className = 'nickname-status';
        usernameHint.textContent = DEFAULT_HINT; usernameHint.classList.remove('error');
        return;
      }
      if (cleaned.length < 5 || cleaned.length > 15 || !/^[a-z0-9_]+$/.test(cleaned)) {
        usernameStatus.className = 'nickname-status invalid';
        usernameHint.textContent = 'Длина 5–15, только латиница/цифры/_'; usernameHint.classList.add('error');
        return;
      }
      usernameStatus.className = 'nickname-status checking';
      usernameCheckTimer = setTimeout(async () => {
        const { data } = await supabaseClient.from('profiles').select('id').eq('username', cleaned).maybeSingle();
        if (data) {
          usernameStatus.className = 'nickname-status taken';
          usernameHint.textContent = 'Этот никнейм уже занят.'; usernameHint.classList.add('error');
        } else {
          usernameStatus.className = 'nickname-status available';
          usernameHint.textContent = DEFAULT_HINT; usernameHint.classList.remove('error');
        }
      }, 450);
    });

    document.getElementById('generalSettingsForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('generalSettingsError');
      errorEl.textContent = '';
      if (usernameStatus.classList.contains('taken') || usernameStatus.classList.contains('invalid')) {
        errorEl.textContent = 'Проверьте никнейм — сейчас он недоступен.';
        return;
      }
      const submitBtn = document.getElementById('generalSettingsSubmitBtn');
      submitBtn.disabled = true;
      const { error } = await supabaseClient.from('profiles').update({
        avatar_url: avatarUrlInput.value.trim() || null,
        full_name: document.getElementById('settingsFullName').value.trim() || null,
        username: usernameInput.value.trim(),
        language: document.getElementById('settingsLanguage').value,
        timezone: document.getElementById('settingsTimezone').value,
        notifications_enabled: document.getElementById('settingsNotifications').checked,
        email_notifications: document.getElementById('settingsEmailNotifications').checked
      }).eq('id', profileId);
      submitBtn.disabled = false;
      if (error) {
        errorEl.textContent = error.code === '23505' ? 'Этот никнейм уже занят.' : 'Не удалось сохранить. Попробуйте снова.';
        return;
      }
      Object.assign(currentProfile, { avatar_url: avatarUrlInput.value.trim(), username: usernameInput.value.trim() });
      showToast('Настройки сохранены');
    });
  }
});
