/**
 * Единая оболочка IdeaNest на всех страницах:
 * капсула-навбар (реальные ссылки), футер, тема, вход.
 */
(function () {
  const SUPABASE_URL = 'https://hhwndrynnozllrqtcdct.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhod25kcnlubm96bGxycXRjZGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MTkyOTIsImV4cCI6MjA5OTQ5NTI5Mn0.Gq2PNYIiZzKIaUNOY1AfF-8yVnAjPCf2HRGMX11Av14';

  const ORDER = ['home', 'ideas', 'picker', 'articles', 'tools'];

  function rootPrefix() {
    const p = location.pathname.replace(/\\/g, '/');
    if (/\/(ideas|articles|settings|profile)\//.test(p)) return '../';
    return '';
  }

  function hrefs(root) {
    return {
      home: root + 'index.html',
      ideas: root + 'ideas/all.html',
      picker: root + 'ideas/match.html',
      articles: root + 'articles/index.html',
      tools: root + 'tools.html',
    };
  }

  function currentId() {
    const p = location.pathname.replace(/\\/g, '/');
    if (/\/ideas\/match/.test(p) || /match\.html/.test(p)) return 'picker';
    if (/tools(\.html)?$/.test(p) || /\/tools(\/|$)/.test(p)) return 'tools';
    if (/\/ideas(\/|$)/.test(p)) return 'ideas';
    if (/\/articles(\/|$)/.test(p)) return 'articles';
    if (/settings|profile|about|privacy|terms|disclaimer/.test(p)) return 'home';
    if (/index\.html?$/.test(p) || p.endsWith('/') || p === '' ) return 'home';
    return 'home';
  }

  function hideLegacy() {
    // Только сам старый header.navbar — НЕ потомков (контент мог ошибочно лежать внутри)
    document.querySelectorAll(
      'header.navbar, .bottom-nav, #bottomNav, .mobile-menu, #mobileMenu'
    ).forEach((el) => {
      // если внутри main/контент-сетка — не трогаем целиком, только прячем chrome-часть
      if (el.querySelector && (el.querySelector('#ideasGrid') || el.querySelector('#articlesPageGrid') || el.querySelector('.grid-cards'))) {
        return;
      }
      el.setAttribute('data-shell-hidden', '1');
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
      el.style.setProperty('height', '0', 'important');
      el.style.setProperty('overflow', 'hidden', 'important');
      el.style.setProperty('margin', '0', 'important');
      el.style.setProperty('padding', '0', 'important');
    });
    // script.js иногда пересоздаёт — следим
    if (!window.__shellHideObs) {
      window.__shellHideObs = new MutationObserver(() => {
        document.querySelectorAll('header.navbar:not([data-shell-hidden])').forEach((el) => {
          el.setAttribute('data-shell-hidden', '1');
          el.style.setProperty('display', 'none', 'important');
        });
      });
      try {
        window.__shellHideObs.observe(document.body, { childList: true, subtree: true });
      } catch (e) {}
    }
  }

  function inject() {
    if (document.getElementById('shellNavCapsule')) return;

    document.documentElement.classList.add('shell-site');
    document.body.classList.add('shell-body', 'shell-site');

    const root = rootPrefix();
    const h = hrefs(root);
    const active = currentId();

    const wrap = document.createElement('div');
    wrap.id = 'shellChromeRoot';
    const isHome = active === 'home';
    wrap.innerHTML = `
      <div class="shell-nav-scrim" id="shellNavScrim" aria-hidden="true"></div>
      <header class="nav-wrap shell-nav-wrap is-sticky is-fixed" id="shellNavWrap">
        <div class="shell-nav-row">
          ${isHome ? '' : `<a class="shell-back-btn" href="${h.home}" title="На главную" aria-label="На главную">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </a>`}
          <div class="nav-capsule" id="shellNavCapsule">
            <a class="nav-brand" href="${h.home}">
              <span class="brand-mark">in</span>
              <span class="brand-name">IdeaNest</span>
            </a>
            <nav class="nav-links shell-nav-links" id="shellNavLinks">
              <span class="nav-indicator" id="shellNavIndicator" aria-hidden="true"></span>
              <a class="shell-nav-item" data-nav="home" href="${h.home}">Главная</a>
              <a class="shell-nav-item" data-nav="ideas" href="${h.ideas}">Идеи</a>
              <a class="shell-nav-item" data-nav="picker" href="${h.picker}">Подбор</a>
              <a class="shell-nav-item" data-nav="articles" href="${h.articles}">Статьи</a>
              <a class="shell-nav-item" data-nav="tools" href="${h.tools}">Расчёт</a>
            </nav>
            <div class="nav-right">
              <button type="button" class="icon-btn shell-theme-btn" id="shellThemeBtn" title="Тема" aria-label="Тема">
                <span class="theme-ico theme-ico-moon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M20.5 14.2A8.6 8.6 0 0 1 9.8 3.5 8.7 8.7 0 1 0 20.5 14.2z"/></svg>
                </span>
                <span class="theme-ico theme-ico-sun" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
                </span>
              </button>
              <button type="button" class="shell-avatar-btn" id="shellAuthBtn" title="Профиль" aria-label="Профиль">
                <span class="shell-avatar-fallback" id="shellAvatarFallback">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="9" r="3.5"/><path d="M5 19.5c1.8-3.2 4.2-4.5 7-4.5s5.2 1.3 7 4.5"/></svg>
                </span>
                <img class="shell-avatar-img is-hidden" id="shellAvatarImg" alt="" />
              </button>
              <div class="shell-profile-pop is-hidden" id="shellProfilePop" role="dialog">
                <div class="shell-profile-pop-head">
                  <div class="shell-pop-ava-wrap" id="shellPopAva">
                    <span class="shell-avatar-fallback" id="shellPopAvaFb">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="9" r="3.5"/><path d="M5 19.5c1.8-3.2 4.2-4.5 7-4.5s5.2 1.3 7 4.5"/></svg>
                    </span>
                    <img class="shell-avatar-img is-hidden" id="shellPopAvaImg" alt="" />
                  </div>
                  <div class="shell-profile-pop-text" id="shellPopText">
                    <strong id="shellPopName" class="is-hidden"></strong>
                    <button type="button" class="btn btn-dark btn-sm shell-pop-login-btn" id="shellPopLogin">Войти</button>
                  </div>
                </div>
                <div class="shell-profile-pop-body" id="shellPopBody">
                  <a class="shell-pop-link is-hidden" id="shellPopProfile" href="${root}profile/profile.html" data-open-profile="1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="9" r="3.5"/><path d="M5 19.5c1.8-3.2 4.2-4.5 7-4.5s5.2 1.3 7 4.5"/></svg>
                    Профиль
                  </a>
                  <a class="shell-pop-link" href="${root}settings/settings.html">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
                    Настройки
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      <nav class="mobile-capsule" id="shellMobileCapsule" aria-label="Меню">
        <a class="m-item" data-nav="home" href="${h.home}"><span>⌂</span>Главная</a>
        <a class="m-item" data-nav="ideas" href="${h.ideas}"><span>◇</span>Идеи</a>
        <a class="m-item" data-nav="picker" href="${h.picker}"><span>◎</span>Подбор</a>
        <a class="m-item" data-nav="articles" href="${h.articles}"><span>§</span>Статьи</a>
      </nav>`;
    document.body.insertBefore(wrap, document.body.firstChild);

    document.querySelectorAll('#shellChromeRoot [data-nav="' + active + '"]').forEach((el) => {
      el.classList.add('is-active', 'is-on');
    });

    document.querySelectorAll('#shellChromeRoot [data-nav]').forEach((a) => {
      a.addEventListener('click', () => {
        try {
          sessionStorage.setItem('shell-nav-from', String(ORDER.indexOf(active)));
          sessionStorage.setItem('shell-nav-to', String(ORDER.indexOf(a.getAttribute('data-nav'))));
        } catch (e) {}
      });
    });

    if (!document.getElementById('shellFooter')) {
      const foot = document.createElement('footer');
      foot.id = 'shellFooter';
      foot.className = 'shell-footer';
      foot.innerHTML = `
        <div class="shell-footer-inner">
          <div class="shell-footer-brand">
            <span class="brand-mark">in</span>
            <div>
              <strong>IdeaNest</strong>
              <p>Идеи, статьи и расчёты для запуска бизнеса</p>
            </div>
          </div>
          <div class="shell-footer-cols">
            <div>
              <h4>Разделы</h4>
              <a href="${h.ideas}">Идеи</a>
              <a href="${h.articles}">Статьи</a>
              <a href="${h.picker}">Подбор</a>
              <a href="${h.tools}">Расчёт</a>
            </div>
            <div>
              <h4>Документы</h4>
              <a href="${root}privacy.html">Политика конфиденциальности</a>
              <a href="${root}terms.html">Пользовательское соглашение</a>
              <a href="${root}disclaimer.html">Дисклеймер</a>
              <a href="${root}about.html">Об авторе</a>
            </div>
          </div>
        </div>`;
      document.body.appendChild(foot);
    }

    // Auth modal (общий)
    if (!document.getElementById('shellAuthModal')) {
      const bg = document.createElement('div');
      bg.className = 'modal-bg is-hidden';
      bg.id = 'shellAuthBg';
      const modal = document.createElement('div');
      modal.className = 'modal card-soft is-hidden';
      modal.id = 'shellAuthModal';
      modal.innerHTML = `
        <button type="button" class="modal-x" id="shellAuthClose" aria-label="Закрыть">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
        <h2 id="shellAuthTitle">Вход</h2>
        <div id="shellAuthLoginFields">
          <label class="field">Email или никнейм
            <input type="text" id="shellAuthEmail" autocomplete="username" placeholder="you@example.com или nickname" />
          </label>
          <label class="field">Пароль
            <div class="pass-wrap">
              <input type="password" id="shellAuthPass" autocomplete="current-password" placeholder="Минимум 6 символов" />
              <button type="button" class="pass-toggle" id="shellPassToggle" aria-label="Показать пароль">
                <svg class="eye-on" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg class="eye-off is-hidden" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.9 10.9 0 0 1 12 19c-7 0-11-7-11-7a19.6 19.6 0 0 1 5.06-5.94M9.9 4.24A10.9 10.9 0 0 1 12 5c7 0 11 7 11 7a19.5 19.5 0 0 1-2.16 3.19M1 1l22 22M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>
              </button>
            </div>
          </label>
          <button type="button" class="auth-text-link forgot-link" id="shellForgotPass">Забыли пароль?</button>
        </div>
        <div id="shellAuthSignupFields" class="is-hidden">
          <label class="field">Никнейм
            <input type="text" id="shellAuthNick" autocomplete="username" placeholder="@nickname" maxlength="15" />
          </label>
          <p class="field-hint" id="shellNickHint">От 5 до 15 символов: латиница в нижнем регистре, цифры, _</p>
          <label class="field">Email
            <input type="email" id="shellAuthEmail2" autocomplete="email" placeholder="you@example.com" />
          </label>
          <label class="field">Пароль
            <div class="pass-wrap">
              <input type="password" id="shellAuthPass2" autocomplete="new-password" placeholder="Минимум 6 символов" />
              <button type="button" class="pass-toggle" id="shellPassToggle2" aria-label="Показать пароль">
                <svg class="eye-on" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg class="eye-off is-hidden" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.9 10.9 0 0 1 12 19c-7 0-11-7-11-7a19.6 19.6 0 0 1 5.06-5.94M9.9 4.24A10.9 10.9 0 0 1 12 5c7 0 11 7 11 7a19.5 19.5 0 0 1-2.16 3.19M1 1l22 22M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>
              </button>
            </div>
          </label>
          <label class="legal-check">
            <input type="checkbox" id="shellTerms" />
            <span class="legal-box" aria-hidden="true"></span>
            <span class="legal-text">Я ознакомился и принимаю <a href="${root}terms.html" target="_blank" rel="noopener">Пользовательское соглашение</a>.</span>
          </label>
          <label class="legal-check">
            <input type="checkbox" id="shellPrivacy" />
            <span class="legal-box" aria-hidden="true"></span>
            <span class="legal-text">Я даю согласие на обработку персональных данных в соответствии с <a href="${root}privacy.html" target="_blank" rel="noopener">Политикой конфиденциальности</a>.</span>
          </label>
        </div>
        <p class="auth-err is-hidden" id="shellAuthErr"></p>
        <div class="auth-actions-row" id="shellAuthActions">
          <button type="button" class="btn btn-accent" id="shellAuthSubmit">Войти</button>
          <button type="button" class="auth-text-link" id="shellAuthToggle">Создать аккаунт</button>
        </div>`;
      document.body.appendChild(bg);
      document.body.appendChild(modal);
      wireAuth(bg, modal);
    }

    try { setupMagnetic(active); } catch (e) { console.warn(e); }
    try { setupTheme(); } catch (e) { console.warn(e); }
    try { wireProfilePop(); } catch (e) { console.warn(e); }
    try { refreshShellUser(); } catch (e) { console.warn(e); }
  }

  window.openShellAuth = function openShellAuth(show) {
    const bg = document.getElementById('shellAuthBg');
    const modal = document.getElementById('shellAuthModal');
    if (!bg || !modal) return;
    if (show) {
      bg.classList.remove('is-hidden');
      modal.classList.remove('is-hidden');
      requestAnimationFrame(() => {
        bg.classList.add('is-open');
        modal.classList.add('is-open');
      });
    } else {
      bg.classList.remove('is-open');
      modal.classList.remove('is-open');
      setTimeout(() => {
        bg.classList.add('is-hidden');
        modal.classList.add('is-hidden');
      }, 280);
    }
  };

  function getDb() {
    if (window.__shellSb) return window.__shellSb;
    if (window.supabaseClient) return window.supabaseClient;
    if (!window.supabase) return null;
    window.__shellSb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return window.__shellSb;
  }


  function openEmailVerifyWait(email) {
    document.getElementById('emailVerifyBackdrop')?.remove();
    const safeEmail = String(email || '').replace(/[<>&"]/g, '');
    const bd = document.createElement('div');
    bd.id = 'emailVerifyBackdrop';
    bd.className = 'email-verify-backdrop';
    bd.style.cssText = 'position:fixed;inset:0;z-index:7500;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(10,20,16,0.4);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);';
    bd.innerHTML = `
      <div class="email-verify-modal" role="dialog" aria-modal="true" style="
        position:relative;width:min(400px,100%);background:#fff;border-radius:20px;padding:28px 24px 24px;
        box-shadow:0 24px 56px rgba(0,0,0,0.2);text-align:center;box-sizing:border-box;
      ">
        <button type="button" id="emailVerifyCloseBtn" aria-label="Закрыть" style="
          position:absolute;top:12px;right:12px;width:32px;height:32px;border:none;border-radius:50%;
          background:#f3f6f5;color:#5a6f66;cursor:pointer;font-size:1.1rem;line-height:1;display:flex;
          align-items:center;justify-content:center;font-family:inherit;
        ">×</button>
        <div class="email-verify-anim" aria-hidden="true" style="margin:8px auto 18px;width:64px;height:64px;position:relative;">
          <div class="email-verify-ring"></div>
          <div class="email-verify-icon">✉</div>
        </div>
        <h2 style="margin:0 0 10px;font-size:1.25rem;font-weight:700;color:#0c1411;">Подтвердите почту</h2>
        <p style="margin:0 0 16px;font-size:0.95rem;line-height:1.5;color:#5a6f66;">
          Мы отправили код${safeEmail ? ' на <strong style="color:#0c1411">' + safeEmail + '</strong>' : ''}.
          Введите его ниже.
        </p>
        <div style="text-align:left;margin-bottom:8px;">
          <label for="emailVerifyCode" style="display:block;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#5a6f66;margin-bottom:6px;">Код из письма</label>
          <input type="text" id="emailVerifyCode" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456" style="
            width:100%;box-sizing:border-box;border:1.5px solid #d5e0db;border-radius:12px;padding:12px 14px;
            font-size:1.25rem;letter-spacing:0.2em;text-align:center;font-family:inherit;font-weight:600;
          " />
        </div>
        <p id="emailVerifyErr" style="min-height:1.2em;margin:6px 0 10px;font-size:0.85rem;color:#dc2626;"></p>
        <button type="button" id="emailVerifySubmit" style="
          width:100%;border:none;border-radius:12px;padding:12px 16px;background:#1a9f4b;color:#fff;
          font-weight:600;font-size:0.95rem;cursor:pointer;font-family:inherit;
        ">Подтвердить</button>
        <button type="button" id="emailVerifyResend" style="
          margin-top:12px;background:transparent;border:none;color:#5a6f66;font-size:0.85rem;
          cursor:pointer;font-family:inherit;text-decoration:underline;
        ">Отправить код ещё раз</button>
      </div>`;
    document.body.appendChild(bd);

    const close = () => {
      bd.style.opacity = '0';
      setTimeout(() => bd.remove(), 220);
      if (window.__emailVerifyUnsub) {
        try { window.__emailVerifyUnsub(); } catch (e) {}
        window.__emailVerifyUnsub = null;
      }
      if (window.__emailVerifyTimer) {
        clearInterval(window.__emailVerifyTimer);
        window.__emailVerifyTimer = null;
      }
    };
    bd.querySelector('#emailVerifyCloseBtn')?.addEventListener('click', close);

    const db = getDb();
    const errEl = () => document.getElementById('emailVerifyErr');
    const codeInput = document.getElementById('emailVerifyCode');
    codeInput?.focus();

    const onConfirmed = async () => {
      close();
      try { await refreshShellUser(); } catch (e) {}
      try {
        if (typeof showToast === 'function') showToast('Почта подтверждена — вы вошли');
        else if (window.showToast) window.showToast('Почта подтверждена — вы вошли');
      } catch (e) {}
    };

    async function tryVerify() {
      const token = (codeInput?.value || '').trim().replace(/\s+/g, '');
      if (!token || token.length < 4) {
        if (errEl()) errEl().textContent = 'Введите код из письма';
        return;
      }
      if (!db) {
        if (errEl()) errEl().textContent = 'Supabase не загружен';
        return;
      }
      const btn = document.getElementById('emailVerifySubmit');
      if (btn) { btn.disabled = true; btn.textContent = 'Проверяем…'; }
      if (errEl()) errEl().textContent = '';
      try {
        // signup OTP, затем email как запасной тип
        let result = await db.auth.verifyOtp({ email: safeEmail, token, type: 'signup' });
        if (result.error) {
          result = await db.auth.verifyOtp({ email: safeEmail, token, type: 'email' });
        }
        if (result.error) throw result.error;
        await onConfirmed();
      } catch (e) {
        console.error(e);
        if (errEl()) errEl().textContent = e.message || 'Неверный или устаревший код';
        if (btn) { btn.disabled = false; btn.textContent = 'Подтвердить'; }
      }
    }

    document.getElementById('emailVerifySubmit')?.addEventListener('click', tryVerify);
    codeInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); tryVerify(); }
    });

    document.getElementById('emailVerifyResend')?.addEventListener('click', async () => {
      if (!db || !safeEmail) return;
      const b = document.getElementById('emailVerifyResend');
      if (b) { b.disabled = true; b.textContent = 'Отправляем…'; }
      try {
        // повторная отправка письма подтверждения
        const { error } = await db.auth.resend({ type: 'signup', email: safeEmail });
        if (error) throw error;
        if (errEl()) {
          errEl().style.color = '#1a9f4b';
          errEl().textContent = 'Код отправлен повторно';
        }
      } catch (e) {
        if (errEl()) {
          errEl().style.color = '#dc2626';
          errEl().textContent = e.message || 'Не удалось отправить';
        }
      } finally {
        if (b) { b.disabled = false; b.textContent = 'Отправить код ещё раз'; }
      }
    });

    if (!db) return;

    // На случай, если пользователь всё же перешёл по ссылке из письма
    try {
      const { data: { subscription } } = db.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
          onConfirmed();
        }
      });
      window.__emailVerifyUnsub = () => subscription?.unsubscribe?.();
    } catch (e) { console.warn(e); }

    window.__emailVerifyTimer = setInterval(async () => {
      try {
        const { data } = await db.auth.getSession();
        if (data?.session?.user) await onConfirmed();
      } catch (e) {}
    }, 3000);
  }

  function wireAuth(bg, modal) {
    let mode = 'login';
    const title = () => document.getElementById('shellAuthTitle');
    const submit = () => document.getElementById('shellAuthSubmit');
    const toggle = () => document.getElementById('shellAuthToggle');
    const err = () => document.getElementById('shellAuthErr');
    const loginF = () => document.getElementById('shellAuthLoginFields');
    const signupF = () => document.getElementById('shellAuthSignupFields');
    const NICK_RE = /^[a-z0-9_]{5,15}$/;

    document.getElementById('shellAuthClose').onclick = () => openShellAuth(false);
    bg.onclick = () => openShellAuth(false);

    function setMode(m) {
      mode = m;
      const isSignup = m === 'signup';
      title().textContent = isSignup ? 'Регистрация' : 'Вход';
      submit().textContent = isSignup ? 'Создать аккаунт' : 'Войти';
      toggle().textContent = isSignup ? 'Уже есть аккаунт' : 'Создать аккаунт';
      loginF().classList.toggle('is-hidden', isSignup);
      signupF().classList.toggle('is-hidden', !isSignup);
      document.getElementById('shellAuthActions')?.classList.toggle('is-signup', isSignup);
      err().classList.add('is-hidden');
    }

    toggle().onclick = () => {
      const startH = modal.offsetHeight;
      modal.style.height = startH + 'px';
      modal.style.overflow = 'hidden';
      modal.style.transition = 'height 0.32s cubic-bezier(0.22, 1, 0.36, 1)';
      setMode(mode === 'login' ? 'signup' : 'login');
      requestAnimationFrame(() => {
        modal.style.height = 'auto';
        const endH = modal.offsetHeight;
        modal.style.height = startH + 'px';
        modal.getBoundingClientRect();
        modal.style.height = endH + 'px';
        setTimeout(() => {
          modal.style.height = '';
          modal.style.overflow = '';
          modal.style.transition = '';
        }, 340);
      });
    };

    function bindPassToggle(btnId, inputId) {
      const btn = document.getElementById(btnId);
      const input = document.getElementById(inputId);
      if (!btn || !input) return;
      btn.onclick = () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.querySelector('.eye-on')?.classList.toggle('is-hidden', show);
        btn.querySelector('.eye-off')?.classList.toggle('is-hidden', !show);
      };
    }
    bindPassToggle('shellPassToggle', 'shellAuthPass');
    bindPassToggle('shellPassToggle2', 'shellAuthPass2');

    // Enter → Войти / Создать
    function onAuthEnter(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit()?.click();
      }
    }
    ['shellAuthEmail', 'shellAuthPass', 'shellAuthNick', 'shellAuthEmail2', 'shellAuthPass2'].forEach(function (id) {
      document.getElementById(id)?.addEventListener('keydown', onAuthEnter);
    });

    // nickname uniqueness
    let nickTimer = null;
    const nickInput = document.getElementById('shellAuthNick');
    const nickHint = document.getElementById('shellNickHint');
    if (nickInput) {
      nickInput.addEventListener('input', () => {
        clearTimeout(nickTimer);
        let v = nickInput.value.trim().replace(/^@/, '').toLowerCase();
        nickInput.value = v;
        if (!v) {
          nickHint.textContent = 'От 5 до 15 символов: латиница в нижнем регистре, цифры, _';
          nickHint.className = 'field-hint';
          return;
        }
        if (!NICK_RE.test(v)) {
          nickHint.textContent = 'Никнейм: 5–15 символов, только a-z, 0-9 и _';
          nickHint.className = 'field-hint is-bad';
          return;
        }
        nickHint.textContent = 'Проверяем…';
        nickHint.className = 'field-hint';
        nickTimer = setTimeout(async () => {
          const db = getDb();
          if (!db) return;
          try {
            const { data } = await db.from('profiles').select('id').eq('username', v).maybeSingle();
            if (data) {
              nickHint.textContent = 'Такой никнейм уже занят';
              nickHint.className = 'field-hint is-bad';
            } else {
              nickHint.textContent = 'Никнейм свободен';
              nickHint.className = 'field-hint is-ok';
            }
          } catch (e) {
            nickHint.textContent = 'От 5 до 15 символов: латиница в нижнем регистре, цифры, _';
            nickHint.className = 'field-hint';
          }
        }, 400);
      });
    }

    document.getElementById('shellForgotPass').onclick = async () => {
      const db = getDb();
      const raw = document.getElementById('shellAuthEmail').value.trim();
      err().classList.add('is-hidden');
      if (!raw) {
        err().textContent = 'Введите email для сброса пароля';
        err().classList.remove('is-hidden');
        return;
      }
      let email = raw;
      if (!raw.includes('@') && db) {
        try {
          const { data } = await db.rpc('get_email_by_username', { uname: raw });
          if (data) email = data;
        } catch (e) {}
      }
      if (!email.includes('@')) {
        err().textContent = 'Укажите email или никнейм, привязанный к почте';
        err().classList.remove('is-hidden');
        return;
      }
      try {
        const { error } = await db.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin + '/index.html',
        });
        if (error) throw error;
        err().textContent = 'Письмо для сброса пароля отправлено (если аккаунт существует)';
        err().classList.remove('is-hidden');
        err().classList.add('is-ok-msg');
      } catch (e) {
        err().textContent = e.message || 'Не удалось отправить письмо';
        err().classList.remove('is-hidden');
      }
    };

    submit().onclick = async () => {
      err().classList.remove('is-ok-msg');
      err().classList.add('is-hidden');
      const db = getDb();
      if (!db) {
        err().textContent = 'Не загружен Supabase';
        err().classList.remove('is-hidden');
        return;
      }
      try {
        if (mode === 'login') {
          let login = document.getElementById('shellAuthEmail').value.trim();
          const password = document.getElementById('shellAuthPass').value;
          if (!login || !password) throw new Error('Заполните поля');
          if (!login.includes('@')) {
            const { data: resolved, error: rErr } = await db.rpc('get_email_by_username', { uname: login });
            if (rErr || !resolved) throw new Error('Неверный никнейм или пароль');
            login = resolved;
          }
          const { error } = await db.auth.signInWithPassword({ email: login, password });
          if (error) throw error;
        } else {
          const nick = (document.getElementById('shellAuthNick').value || '').trim().replace(/^@/, '').toLowerCase();
          const email = document.getElementById('shellAuthEmail2').value.trim();
          const password = document.getElementById('shellAuthPass2').value;
          if (!NICK_RE.test(nick)) throw new Error('Никнейм: 5–15 символов, a-z, 0-9, _');
          if (!email.includes('@')) throw new Error('Укажите корректный email');
          if (!password || password.length < 6) throw new Error('Пароль не короче 6 символов');
          if (!document.getElementById('shellTerms').checked) throw new Error('Примите пользовательское соглашение');
          if (!document.getElementById('shellPrivacy').checked) throw new Error('Дайте согласие на обработку данных');
          const { data: taken } = await db.from('profiles').select('id').eq('username', nick).maybeSingle();
          if (taken) throw new Error('Такой никнейм уже занят');
          const { data, error } = await db.auth.signUp({
            email,
            password,
            options: {
              data: {
                username: nick,
                accepted_terms: true,
                accepted_privacy: true,
                terms_accepted_at: new Date().toISOString(),
                privacy_accepted_at: new Date().toISOString(),
              },
              emailRedirectTo: (location.origin || '') + (location.pathname || '/').replace(/[^/]+$/, '') + 'index.html',
            },
          });
          if (error) throw error;
          if (data?.user) {
            try {
              await db.from('profiles').upsert({
                auth_id: data.user.id,
                username: nick,
                accepted_terms: true,
                accepted_privacy: true,
              }, { onConflict: 'auth_id' });
            } catch (e) { console.warn(e); }
          }
          openShellAuth(false);
          // Нет сессии → нужно подтвердить почту
          if (!data?.session) {
            openEmailVerifyWait(email);
            return;
          }
          try { await refreshShellUser(); } catch (re) { console.warn(re); }
          return;
        }
        // login success
        openShellAuth(false);
        try { await refreshShellUser(); } catch (re) { console.warn(re); }
        try { location.reload(); } catch (re2) { console.warn(re2); }
      } catch (e) {
        console.error('[auth]', e);
        var msg = (e && e.message) ? e.message : 'Ошибка';
        if (/appendChild|null/i.test(msg)) msg = 'Вход выполнен, обновляем страницу…';
        err().textContent = msg;
        err().classList.remove('is-hidden');
        // if login actually worked, still reload
        try {
          var db2 = getDb();
          if (db2) {
            db2.auth.getSession().then(function (r) {
              if (r?.data?.session) setTimeout(function () { location.reload(); }, 400);
            });
          }
        } catch (x) {}
      }
    };
  }

  async function refreshShellUser() {
    const db = getDb();
    const btn = document.getElementById('shellAuthBtn');
    const img = document.getElementById('shellAvatarImg');
    const fb = document.getElementById('shellAvatarFallback');
    const popName = document.getElementById('shellPopName');
    const popLogin = document.getElementById('shellPopLogin');
    const popBody = document.getElementById('shellPopBody');
    const popImg = document.getElementById('shellPopAvaImg');
    const popFb = document.getElementById('shellPopAvaFb');
    if (!db || !btn) return;
    const { data } = await db.auth.getSession();
    const user = data?.session?.user;
    window.__shellUser = user || null;
    let profile = null;
    if (user) {
      try {
        const { data: p } = await db.from('profiles').select('*').eq('auth_id', user.id).maybeSingle();
        profile = p;
      } catch (e) {}
    }
    window.__shellProfile = profile;
    const av = profile?.avatar_url
      || user?.user_metadata?.avatar_url
      || null;
    const name = profile?.full_name
      || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
      || profile?.username
      || user?.user_metadata?.full_name
      || (user?.email || '').split('@')[0]
      || 'Гость';
    const popProfile = document.getElementById('shellPopProfile');

    function showAvatar(elImg, elFb, url) {
      if (url && elImg) {
        elImg.src = url;
        elImg.classList.remove('is-hidden');
        elImg.style.display = 'block';
        elImg.style.visibility = 'visible';
        elImg.style.opacity = '1';
        elImg.onerror = function () {
          elImg.classList.add('is-hidden');
          elImg.style.display = 'none';
          if (elFb) {
            elFb.classList.remove('is-hidden');
            elFb.style.display = 'grid';
          }
        };
        if (elFb) {
          elFb.classList.add('is-hidden');
          elFb.style.display = 'none';
        }
      } else {
        if (elImg) {
          elImg.classList.add('is-hidden');
          elImg.style.display = 'none';
        }
        if (elFb) {
          elFb.classList.remove('is-hidden');
          elFb.style.display = 'grid';
        }
      }
    }

    if (user) {
      showAvatar(img, fb, av);
      showAvatar(popImg, popFb, av);
      if (popName) {
        popName.textContent = name;
        popName.classList.remove('is-hidden');
        popName.style.display = 'block';
      }
      if (popLogin) {
        popLogin.classList.add('is-hidden');
        popLogin.style.display = 'none';
      }
      if (popProfile) {
        popProfile.classList.remove('is-hidden');
        popProfile.style.display = 'flex';
      }
    } else {
      showAvatar(img, fb, null);
      showAvatar(popImg, popFb, null);
      if (popName) {
        popName.textContent = '';
        popName.classList.add('is-hidden');
        popName.style.display = 'none';
      }
      if (popLogin) {
        popLogin.classList.remove('is-hidden');
        popLogin.style.display = '';
      }
      if (popProfile) {
        popProfile.classList.add('is-hidden');
        popProfile.style.display = 'none';
      }
    }
  }

  function wireProfilePop() {
    const btn = document.getElementById('shellAuthBtn');
    let pop = document.getElementById('shellProfilePop');
    if (!btn || !pop) {
      console.warn('[shell] profile btn/pop missing');
      return;
    }
    if (btn.__shellPopBound) return;
    btn.__shellPopBound = true;

    const root = rootPrefix();

    // Backdrop for mobile — sibling under body, always BELOW the pop
    let bd = document.getElementById('shellProfileBackdrop');
    if (!bd) {
      bd = document.createElement('div');
      bd.id = 'shellProfileBackdrop';
      bd.className = 'shell-profile-backdrop is-hidden';
      bd.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bd);
    } else if (bd.parentElement !== document.body) {
      document.body.appendChild(bd);
    }
    // Pop must be after backdrop in DOM for paint order when fixed
    if (pop.parentElement) {
      // keep pop where it is for desktop absolute; on mobile CSS makes it fixed
    }

    function isMobile() {
      return window.matchMedia('(max-width: 800px)').matches;
    }

    function openPop() {
      if (isMobile()) {
        // move to body: fixed inside nav with backdrop-filter is relative to nav
        if (pop.parentElement !== document.body) {
          pop.__shellHomeParent = pop.parentElement;
          document.body.appendChild(pop);
        }
        if (bd.parentElement !== document.body) {
          document.body.appendChild(bd);
        }
        document.body.insertBefore(bd, pop);
        pop.style.cssText = 'position:fixed;left:50%;top:50%;right:auto;bottom:auto;transform:translate(-50%,-50%);z-index:4100;';
        bd.style.cssText = 'position:fixed;inset:0;z-index:4000;display:block;';
        bd.classList.remove('is-hidden');
        requestAnimationFrame(function () { bd.classList.add('is-open'); });
        bd.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      } else {
        if (pop.__shellHomeParent && pop.parentElement === document.body) {
          pop.__shellHomeParent.appendChild(pop);
        }
        pop.style.cssText = '';
        bd.classList.add('is-hidden');
        bd.classList.remove('is-open');
        bd.style.display = 'none';
      }
      pop.classList.remove('is-hidden');
      requestAnimationFrame(function () { pop.classList.add('is-open'); });
      try { refreshShellUser(); } catch (e) {}
    }

    function closePop() {
      pop.classList.remove('is-open');
      bd.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function () {
        if (!pop.classList.contains('is-open')) {
          pop.classList.add('is-hidden');
          bd.classList.add('is-hidden');
          bd.setAttribute('aria-hidden', 'true');
          bd.style.display = 'none';
          if (pop.__shellHomeParent && pop.parentElement === document.body) {
            pop.style.cssText = '';
            pop.__shellHomeParent.appendChild(pop);
          }
        }
      }, 220);
    }

    window.__shellOpenProfilePop = openPop;
    window.__shellCloseProfilePop = closePop;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (pop.classList.contains('is-open')) closePop();
      else openPop();
    });

    bd.addEventListener('click', () => closePop());

    // Settings
    const settingsLink = pop.querySelector('a.shell-pop-link[href*="settings"]');
    settingsLink?.addEventListener('click', (e) => {
      e.preventDefault();
      closePop();
      location.assign(root + 'settings/settings.html');
    });

    // Profile
    document.getElementById('shellPopProfile')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closePop();
      function tryOpen(n) {
        if (typeof window.openProfileWindow === 'function') {
          try { window.openProfileWindow(); return true; } catch (err) {
            console.warn('[shell] openProfileWindow error', err);
          }
        }
        if (n > 0) { setTimeout(function () { tryOpen(n - 1); }, 100); return false; }
        console.warn('[shell] openProfileWindow missing after retries');
        return false;
      }
      tryOpen(20);
    });

    document.getElementById('shellPopLogin')?.addEventListener('click', (e) => {
      e.preventDefault();
      closePop();
      openShellAuth(true);
    });

    /* logout moved to profile window */

    document.addEventListener('click', (e) => {
      if (!pop.classList.contains('is-open')) return;
      if (btn.contains(e.target) || pop.contains(e.target)) return;
      closePop();
    });
  }

  function setupMagnetic(activeId) {
    const links = document.getElementById('shellNavLinks');
    const ind = document.getElementById('shellNavIndicator');
    if (!links || !ind) return;
    const items = [...links.querySelectorAll('.shell-nav-item')];
    // снять is-active со всех, повесить только на нужный
    items.forEach((a) => a.classList.remove('is-active', 'is-on'));
    const activeEl = items.find((a) => a.getAttribute('data-nav') === activeId) || null;
    if (activeEl) activeEl.classList.add('is-active', 'is-on');

    function place() {
      const el = items.find((a) => a.classList.contains('is-active')) || activeEl;
      if (!el) {
        ind.style.opacity = '0';
        return;
      }
      // offsetLeft надёжнее getBoundingClientRect при шрифтах/layout
      const x = el.offsetLeft;
      const w = el.offsetWidth;
      ind.style.transition = 'none';
      ind.style.width = w + 'px';
      ind.style.transform = 'translate3d(' + x + 'px, -50%, 0)';
      ind.classList.add('is-ready');
    }

    const run = () => {
      place();
      requestAnimationFrame(place);
    };
    run();
    setTimeout(run, 50);
    setTimeout(run, 200);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(run).catch(() => {});
    }
    window.addEventListener('resize', run);
    window.addEventListener('load', run);
  }

  function setupTheme() {
    const btn = document.getElementById('shellThemeBtn');
    if (!btn || btn.__bound) return;
    btn.__bound = true;
    const syncIco = () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      btn.classList.toggle('is-dark', dark);
    };
    syncIco();
    btn.addEventListener('click', () => {
            const goingDark = document.documentElement.getAttribute('data-theme') !== 'dark';
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const maxR = Math.ceil(Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy))) + 80;
      const body = document.body;

      // без анимации иконки
      // Снимок «старого» фона: фиксированный слой с текущими цветами
      const snap = document.createElement('div');
      snap.id = 'shellThemeSnap';
      snap.className = 'theme-snap';
      snap.style.background = goingDark ? '#f3f6f5' : '#0c1411';
      document.body.appendChild(snap);

      if (goingDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        try {
          localStorage.setItem('ideanest-theme', 'dark');
          var darkColors = {
            'accent-primary': '#1a9f4b', 'accent-hover': '#22c55e', 'accent-light': '#143528',
            'bg-color': '#0c1411', 'bg-muted': '#101a16', 'surface-color': '#15201b',
            'text-main': '#e8f0ec', 'text-muted': '#8aa399', 'border-color': 'rgba(255,255,255,0.1)'
          };
          localStorage.setItem('ideanest_theme', JSON.stringify({ key: 'dark', colors: darkColors }));
          var rs = document.documentElement.style;
          Object.keys(darkColors).forEach(function (k) { rs.setProperty('--' + k, darkColors[k]); });
          rs.setProperty('--accent', '#1a9f4b');
        } catch (e) {}
      } else {
        document.documentElement.removeAttribute('data-theme');
        try {
          localStorage.setItem('ideanest-theme', 'light');
          var lightColors = {
            'accent-primary': '#1a9f4b', 'accent-hover': '#15803d', 'accent-light': '#e8f8ef',
            'bg-color': '#f3f6f5', 'bg-muted': '#e8eeeb', 'surface-color': '#ffffff',
            'text-main': '#0c1411', 'text-muted': '#5a6f66', 'border-color': '#d5e0db'
          };
          localStorage.setItem('ideanest_theme', JSON.stringify({ key: 'light', colors: lightColors }));
          var rs2 = document.documentElement.style;
          Object.keys(lightColors).forEach(function (k) { rs2.setProperty('--' + k, lightColors[k]); });
          rs2.setProperty('--accent', '#1a9f4b');
        } catch (e) {}
      }
      syncIco();

      // Круг «дырки» в старом фоне → виден уже новый сайт
      snap.style.clipPath = `circle(0px at ${cx}px ${cy}px)`;
      snap.style.webkitClipPath = `circle(0px at ${cx}px ${cy}px)`;
      requestAnimationFrame(() => {
        snap.style.transition = 'clip-path 0.55s cubic-bezier(0.22, 1, 0.36, 1), -webkit-clip-path 0.55s cubic-bezier(0.22, 1, 0.36, 1)';
        // инверсия: увеличиваем прозрачную дыру — через mask
        snap.style.maskImage = `radial-gradient(circle at ${cx}px ${cy}px, transparent 0px, transparent 0px, #000 0px)`;
        snap.style.webkitMaskImage = `radial-gradient(circle at ${cx}px ${cy}px, transparent 0px, transparent 0px, #000 1px)`;
        requestAnimationFrame(() => {
          snap.style.maskImage = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${maxR}px, transparent ${maxR}px, #000 ${maxR + 1}px)`;
          snap.style.webkitMaskImage = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${maxR}px, #000 ${maxR + 1}px)`;
          snap.style.transition = 'mask-image 0.55s cubic-bezier(0.22, 1, 0.36, 1), -webkit-mask-image 0.55s cubic-bezier(0.22, 1, 0.36, 1)';
        });
      });

      setTimeout(() => {
        snap.remove();
      }, 600);
    });
  }

  function boot() {
    hideLegacy();
    try {
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    } catch (e) {}
    // главная со своей капсулой — заменяем на единую
    const own = document.querySelector('[data-shell-own-nav]');
    if (own) {
      document.querySelectorAll('.page > .nav-wrap, #indexNavLinks, .page > header.nav-wrap').forEach((el) => el.remove());
      document.querySelectorAll('.mobile-capsule:not(#shellMobileCapsule)').forEach((el) => el.remove());
      document.querySelectorAll('#indexFooter').forEach((el) => el.remove());
    }
    inject();
    hideLegacy();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
