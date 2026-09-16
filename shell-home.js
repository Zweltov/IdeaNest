(function () {
  const SUPABASE_URL = 'https://hhwndrynnozllrqtcdct.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhod25kcnlubm96bGxycXRjZGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MTkyOTIsImV4cCI6MjA5OTQ5NTI5Mn0.Gq2PNYIiZzKIaUNOY1AfF-8yVnAjPCf2HRGMX11Av14';
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  let ideas = [];
  let articles = [];
  let prevScreen = 'home';
  let authMode = 'login';
  let pickerStep = 0;
  const pickerAns = {};
  let currentUser = null;
  let profileRow = null;
  let favIds = new Set();
  let upvoteIds = new Set();
  let openIdeaId = null;

  const PICKER = [
    { key: 'budget', q: 'Какой бюджет готовы вложить?', opts: [
      { id: '100', label: 'До 100 000 ₽', max: 100000 },
      { id: '300', label: '100–300 тыс. ₽', max: 300000 },
      { id: '700', label: '300–700 тыс. ₽', max: 700000 },
      { id: '1m', label: 'Более 700 тыс. ₽', max: 1e12 },
    ]},
    { key: 'format', q: 'Формат работы?', opts: [
      { id: 'offline', label: 'Офлайн' },
      { id: 'it', label: 'IT / онлайн-сервисы' },
      { id: 'any', label: 'Неважно' },
    ]},
    { key: 'level', q: 'Сложность?', opts: [
      { id: 'easy', label: 'Проще' },
      { id: 'mid', label: 'Средняя' },
      { id: 'any', label: 'Любая' },
    ]},
  ];

  const $ = (id) => document.getElementById(id);

  function ideaUrl(id) {
    if (location.protocol === 'file:') return 'ideas/idea.html?id=' + id;
    return '/ideas/' + id;
  }
  function articleUrl(a) {
    if (a.slug) {
      if (location.protocol === 'file:') return 'articles/article.html?slug=' + encodeURIComponent(a.slug);
      return '/articles/' + encodeURIComponent(a.slug);
    }
    if (location.protocol === 'file:') return 'articles/article.html?id=' + a.id;
    return '/articles/article.html?id=' + a.id;
  }

  function money(n) {
    if (n == null || n === '') return '—';
    const x = Number(n);
    if (!Number.isFinite(x)) return String(n);
    if (x >= 1000) return 'от ' + Math.round(x).toLocaleString('ru-RU') + ' ₽';
    return String(n);
  }

  function catLabel(c) {
    if (c === 'it') return 'IT';
    if (c === 'crypto') return 'Crypto';
    if (c === 'offline') return 'Офлайн';
    return c || 'Идея';
  }

  function go(name) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('is-on'));
    const el = $('screen-' + name);
    if (el) el.classList.add('is-on');
    document.querySelectorAll('.nav-links button').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.screen === name);
    });
    document.querySelectorAll('.mobile-capsule .m-item').forEach((b) => {
      const map = { home: 'home', ideas: 'ideas', picker: 'picker', articles: 'articles', favs: 'ideas', idea: 'ideas', tools: 'home' };
      b.classList.toggle('is-on', b.dataset.screen === (map[name] || name));
    });
    if (name === 'favs') renderFavs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function ideaCard(i) {
    const cover = i.cover_url
      ? `style="background-image:url('${String(i.cover_url).replace(/'/g, '')}');background-size:cover;background-position:center"`
      : '';
    const cls = i.category === 'it' ? 'c2' : i.category === 'crypto' ? 'c3' : '';
    return `<article class="idea-card" data-idea="${i.id_idea}">
      <div class="idea-cover ${cls}" ${cover}></div>
      <div class="idea-body">
        <span class="idea-tag">${catLabel(i.category)}</span>
        <h3>${escapeHtml(i.title || 'Без названия')}</h3>
        <p>${escapeHtml(excerpt(i.potential || i.pluses || '', 110))}</p>
        <div class="idea-meta">
          <span>Вложения: <strong>${escapeHtml(money(i.budget))}</strong></span>
          <span>Сложность: <strong>${escapeHtml(i.complexity || '—')}</strong></span>
        </div>
      </div>
    </article>`;
  }

  function articleRow(a) {
    return `<article class="article-card" data-article="${a.id}">
      <div class="article-thumb" ${a.cover_url ? `style="background-image:url('${String(a.cover_url).replace(/'/g, '')}');background-size:cover"` : ''}></div>
      <div>
        <h3>${escapeHtml(a.title || 'Статья')}</h3>
        <p>${escapeHtml(a.description || excerpt(a.text || '', 120) || 'Открыть материал')}</p>
      </div>
    </article>`;
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function excerpt(s, n) {
    const t = String(s || '').replace(/\s+/g, ' ').trim();
    return t.length > n ? t.slice(0, n - 1) + '…' : t;
  }

  function bindCards(root) {
    root.querySelectorAll('[data-idea]').forEach((el) => {
      el.onclick = () => openIdea(Number(el.dataset.idea));
    });
    root.querySelectorAll('[data-article]').forEach((el) => {
      el.onclick = () => {
        const a = articles.find((x) => String(x.id) === String(el.dataset.article));
        if (a) location.href = articleUrl(a);
      };
    });
  }

  async function openIdea(id) {
    const i = ideas.find((x) => x.id_idea === id);
    if (!i) return;
    openIdeaId = id;
    prevScreen = [...document.querySelectorAll('.screen.is-on')][0]?.id?.replace('screen-', '') || 'home';
    const pluses = String(i.pluses || '')
      .split(/\n|•|;/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 6);
    const minuses = String(i.minuses || '')
      .split(/\n|•|;/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 6);

    let relatedHtml = '';
    try {
      const { data: links } = await db.from('idea_articles').select('id_article').eq('id_idea', id).limit(6);
      const ids = (links || []).map((r) => r.id_article).filter(Boolean);
      if (ids.length) {
        const related = articles.filter((a) => ids.includes(a.id));
        if (related.length) {
          relatedHtml = `<div class="block-t"><h3>Статьи по теме</h3><div class="article-stack" style="margin-top:8px">${related.map(articleRow).join('')}</div></div>`;
        }
      }
      if (!relatedHtml) {
        const { data: byMain } = await db.from('articles').select('id, title, slug, description, cover_url').eq('main_idea_id', id).limit(4);
        if (byMain && byMain.length) {
          relatedHtml = `<div class="block-t"><h3>Статьи по теме</h3><div class="article-stack" style="margin-top:8px">${byMain.map(articleRow).join('')}</div></div>`;
        }
      }
    } catch (e) { console.warn(e); }

    const isFav = favIds.has(id);
    const isUp = upvoteIds.has(id);

    $('ideaPage').innerHTML = `
      <h1>${escapeHtml(i.title || '')}</h1>
      <div class="pills">
        <span class="pill">${escapeHtml(money(i.budget))}</span>
        <span class="pill">${escapeHtml(catLabel(i.category))}</span>
        <span class="pill">${escapeHtml(i.complexity || '—')}</span>
        ${i.rating != null ? `<span class="pill">★ ${escapeHtml(i.rating)}</span>` : ''}
      </div>
      ${i.potential ? `<p style="color:var(--muted);margin-bottom:16px">${escapeHtml(excerpt(i.potential, 400))}</p>` : ''}
      ${pluses.length ? `<div class="block-t"><h3>Плюсы</h3><ul>${pluses.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul></div>` : ''}
      ${minuses.length ? `<div class="block-t"><h3>Минусы</h3><ul>${minuses.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul></div>` : ''}
      ${i.risks ? `<div class="block-t"><h3>Риски</h3><p style="color:var(--muted)">${escapeHtml(excerpt(i.risks, 500))}</p></div>` : ''}
      ${relatedHtml}
      <div class="idea-actions">
        <a class="btn btn-accent" href="${ideaUrl(i.id_idea)}">Открыть полностью</a>
        <button type="button" class="btn btn-ghost" id="btnUpvote">${isUp ? '★ Апвоут' : '☆ Апвоут'}</button>
        <button type="button" class="btn btn-ghost" id="btnFavorite">${isFav ? 'В избранном' : 'В избранное'}</button>
        <button type="button" class="btn btn-ghost" data-screen="tools">Рассчитать</button>
      </div>`;
    go('idea');
    bindCards($('ideaPage'));

    const needAuth = () => {
      if (!currentUser) {
        openAuth(true);
        return true;
      }
      return false;
    };

    $('btnFavorite').onclick = async () => {
      if (needAuth()) return;
      if (!profileRow) await ensureProfile();
      if (!profileRow) return alert('Профиль ещё не создан. Зайдите в настройки один раз или повторите вход.');
      try {
        if (favIds.has(id)) {
          await db.from('favorites_ideas').delete().eq('id_profile', profileRow.id).eq('id_idea', id);
          favIds.delete(id);
        } else {
          await db.from('favorites_ideas').insert({ id_profile: profileRow.id, id_idea: id });
          favIds.add(id);
        }
        openIdea(id);
      } catch (e) {
        alert(e.message || 'Не удалось изменить избранное');
      }
    };
    $('btnUpvote').onclick = async () => {
      if (needAuth()) return;
      if (!profileRow) await ensureProfile();
      if (!profileRow) return;
      try {
        if (upvoteIds.has(id)) {
          await db.from('upvotes_ideas').delete().eq('id_profile', profileRow.id).eq('id_idea', id);
          upvoteIds.delete(id);
        } else {
          await db.from('upvotes_ideas').insert({ id_profile: profileRow.id, id_idea: id });
          upvoteIds.add(id);
        }
        openIdea(id);
      } catch (e) {
        alert(e.message || 'Не удалось поставить апвоут');
      }
    };
  }

  function filterIdeas(mode, query) {
    let list = ideas.slice();
    const q = (query || '').toLowerCase().trim();
    if (mode === 'offline' || /офлайн|offline|город/.test(q)) list = list.filter((i) => i.category === 'offline');
    if (mode === 'it' || /\bit\b|онлайн|ai|saas/.test(q)) list = list.filter((i) => i.category === 'it');
    if (mode === 'crypto' || /крипт|crypto/.test(q)) list = list.filter((i) => i.category === 'crypto');
    if (mode === 'low' || /100|300|до\s*\d/.test(q)) {
      const max = /100/.test(q) ? 100000 : 300000;
      list = list.filter((i) => Number(i.budget) <= max);
    }
    if (q && mode === 'search') {
      list = ideas.filter((i) => {
        const blob = [i.title, i.category, i.potential, i.complexity, i.pluses].join(' ').toLowerCase();
        const tokens = q.split(/\s+/).filter(Boolean);
        return tokens.every((t) => blob.includes(t) || softMatch(t, i));
      });
      if (!list.length) {
        // soft fallback by budget/category keywords only
        list = filterIdeas(
          /онлайн|it/.test(q) ? 'it' : /офлайн|город/.test(q) ? 'offline' : /100|300|тыс/.test(q) ? 'low' : 'all',
          ''
        );
      }
    }
    if (mode === 'all' && !q) list = ideas.slice();
    return list;
  }

  function softMatch(t, i) {
    if (t === 'онлайн') return i.category === 'it';
    if (t === 'офлайн') return i.category === 'offline';
    return false;
  }

  function renderIdeaLists() {
    const home = ideas.slice(0, 6);
    $('homeIdeas').innerHTML = home.length ? home.map(ideaCard).join('') : '<p class="muted-line">Идей пока нет.</p>';
    $('ideasGrid').innerHTML = ideas.length ? ideas.map(ideaCard).join('') : '<p class="muted-line">Идей пока нет.</p>';
    bindCards(document.body);
  }

  function renderArticles() {
    const rows = articles.map(articleRow).join('');
    $('homeArticles').innerHTML = articles.length ? articles.slice(0, 4).map(articleRow).join('') : '<p class="muted-line">Статей пока нет.</p>';
    $('articlesGrid').innerHTML = articles.length ? rows : '<p class="muted-line">Статей пока нет.</p>';
    bindCards(document.body);
  }

  async function loadData() {
    try {
      const { data, error } = await db
        .from('ideas')
        .select('id_idea, title, category, budget, complexity, rating, potential, pluses, minuses, risks, cover_url')
        .order('id_idea', { ascending: true });
      if (error) throw error;
      ideas = data || [];
    } catch (e) {
      console.error(e);
      $('homeIdeas').innerHTML = '<p class="muted-line">Не удалось загрузить идеи. Проверьте сеть / RLS.</p>';
      $('ideasGrid').innerHTML = $('homeIdeas').innerHTML;
    }
    try {
      let res = await db
        .from('articles')
        .select('id, title, slug, description, cover_url, created_at')
        .order('created_at', { ascending: false })
        .limit(24);
      if (res.error) {
        res = await db.from('articles').select('id, title, slug, description, created_at').order('created_at', { ascending: false }).limit(24);
      }
      if (res.error) throw res.error;
      articles = res.data || [];
    } catch (e) {
      console.error(e);
      $('homeArticles').innerHTML = '<p class="muted-line">Не удалось загрузить статьи.</p>';
      $('articlesGrid').innerHTML = $('homeArticles').innerHTML;
    }
    renderIdeaLists();
    renderArticles();
  }

  function runSearch(q) {
    const list = filterIdeas('search', q);
    $('ideasLead').textContent = q
      ? `По запросу «${q}»: ${list.length} идей`
      : 'Каталог из базы IdeaNest.';
    $('ideasGrid').innerHTML = list.length ? list.map(ideaCard).join('') : '<p class="muted-line">Ничего не найдено — попробуйте другой запрос или подбор.</p>';
    bindCards($('ideasGrid'));
    go('ideas');
  }

  function renderPicker() {
    const s = PICKER[pickerStep];
    $('pickerMeta').textContent = `Шаг ${pickerStep + 1} из ${PICKER.length}`;
    $('pickerBar').style.width = `${((pickerStep + 1) / PICKER.length) * 100}%`;
    $('pickerQ').textContent = s.q;
    $('pickerOpts').innerHTML = s.opts
      .map(
        (o) =>
          `<button type="button" class="opt${pickerAns[s.key] === o.id ? ' on' : ''}" data-opt="${o.id}">${o.label}</button>`
      )
      .join('');
    $('pickerBack').disabled = pickerStep === 0;
    $('pickerNext').textContent = pickerStep === PICKER.length - 1 ? 'Показать идеи' : 'Далее';
    $('pickerBox').classList.remove('is-hidden');
    $('pickerOut').classList.add('is-hidden');
    $('pickerOpts').querySelectorAll('.opt').forEach((btn) => {
      btn.onclick = () => {
        pickerAns[s.key] = btn.dataset.opt;
        $('pickerOpts').querySelectorAll('.opt').forEach((b) => b.classList.remove('on'));
        btn.classList.add('on');
      };
    });
  }

  function finishPicker() {
    const maxB = (PICKER[0].opts.find((o) => o.id === pickerAns.budget) || {}).max || 1e12;
    const fmt = pickerAns.format || 'any';
    const ranked = ideas
      .map((idea) => {
        let sc = 60;
        const b = Number(idea.budget) || 0;
        if (b <= maxB) sc += 18;
        else sc -= 20;
        if (fmt === 'any') sc += 5;
        else if (fmt === 'it' && idea.category === 'it') sc += 14;
        else if (fmt === 'offline' && idea.category === 'offline') sc += 14;
        else sc -= 8;
        if (pickerAns.level === 'easy' && /низк|легк|просто/i.test(String(idea.complexity || ''))) sc += 8;
        sc = Math.max(40, Math.min(97, sc));
        return { idea, sc };
      })
      .sort((a, b) => b.sc - a.sc)
      .slice(0, 12);

    $('pickerBox').classList.add('is-hidden');
    const out = $('pickerOut');
    out.classList.remove('is-hidden');
    out.innerHTML =
      `<p class="page-lead">Найдено ${ranked.length} идей по ответам (не прогноз прибыли).</p>` +
      ranked
        .map(
          ({ idea, sc }) => `
      <div class="match" data-idea="${idea.id_idea}">
        <div><strong>${escapeHtml(idea.title)}</strong>
        <div style="color:var(--muted);font-size:0.85rem">${escapeHtml(money(idea.budget))} · ${escapeHtml(catLabel(idea.category))}</div></div>
        <div class="match-score">${sc}%</div>
      </div>`
        )
        .join('');
    bindCards(out);
  }

  function updateCalc() {
    const inv = Number($('inv').value) || 0;
    const p = Number($('profit').value) || 0;
    $('mYear').textContent = (p * 12).toLocaleString('ru-RU') + ' ₽';
    if (p <= 0) {
      $('mMonths').textContent = '—';
      $('mRoi').textContent = '—';
      return;
    }
    const m = inv / p;
    $('mMonths').textContent = m < 0.2 ? 'сразу' : m.toFixed(1).replace('.0', '') + ' мес.';
    $('mRoi').textContent = inv > 0 ? Math.round((p * 12) / inv * 100) + '% / год' : '—';
  }

  function openAuth(show) {
    $('authBg').classList.toggle('is-hidden', !show);
    $('authModal').classList.toggle('is-hidden', !show);
    if (show) $('authErr').classList.add('is-hidden');
  }

  async function ensureProfile() {
    if (!currentUser) return null;
    try {
      let { data } = await db.from('profiles').select('*').eq('auth_id', currentUser.id).maybeSingle();
      if (!data) {
        const { data: byUser } = await db.from('profiles').select('*').eq('user_id', currentUser.id).maybeSingle();
        data = byUser;
      }
      if (!data) {
        // try id match some schemas store auth uuid differently
        const { data: list } = await db.from('profiles').select('*').limit(1);
        void list;
      }
      profileRow = data || null;
      return profileRow;
    } catch (e) {
      console.warn('profile', e);
      profileRow = null;
      return null;
    }
  }

  async function loadUserMeta() {
    favIds = new Set();
    upvoteIds = new Set();
    if (!currentUser) return;
    await ensureProfile();
    if (!profileRow) return;
    try {
      const { data: favs } = await db.from('favorites_ideas').select('id_idea').eq('id_profile', profileRow.id);
      (favs || []).forEach((r) => favIds.add(r.id_idea));
    } catch (e) { console.warn(e); }
    try {
      const { data: ups } = await db.from('upvotes_ideas').select('id_idea').eq('id_profile', profileRow.id);
      (ups || []).forEach((r) => upvoteIds.add(r.id_idea));
    } catch (e) { console.warn(e); }
  }

  function daysOnSite() {
    const raw = profileRow?.created_at || currentUser?.created_at;
    if (!raw) return null;
    const d = Math.max(0, Math.floor((Date.now() - new Date(raw).getTime()) / 86400000));
    return d;
  }

  function fillProfileSheet() {
    const name = profileRow?.full_name || profileRow?.username || (currentUser?.email || '').split('@')[0] || 'Пользователь';
    const email = currentUser?.email || '';
    $('profileName').textContent = name;
    $('profileEmail').textContent = email;
    const d = daysOnSite();
    $('profileDays').textContent = d == null ? '' : (d === 0 ? 'Сегодня с нами' : `На сайте ${d} дн.`);
    const letter = (name || '?').trim().charAt(0).toUpperCase();
    $('profileAva').textContent = letter;
    if (profileRow?.avatar_url) {
      $('profileAva').style.backgroundImage = `url('${profileRow.avatar_url}')`;
      $('profileAva').textContent = '';
    } else {
      $('profileAva').style.backgroundImage = '';
    }
  }

  function openProfile(show) {
    if (show) fillProfileSheet();
    $('profileBg').classList.toggle('is-hidden', !show);
    $('profileSheet').classList.toggle('is-hidden', !show);
  }

  function renderFavs() {
    if (!currentUser) {
      $('favsLead').textContent = 'Войдите, чтобы видеть сохранённые идеи.';
      $('favsGrid').innerHTML = '<p class="muted-line">Нужен вход.</p>';
      return;
    }
    const list = ideas.filter((i) => favIds.has(i.id_idea));
    $('favsLead').textContent = list.length ? `Сохранено: ${list.length}` : 'Пока пусто — отметьте идеи «В избранное».';
    $('favsGrid').innerHTML = list.length ? list.map(ideaCard).join('') : '<p class="muted-line">Нет избранных идей.</p>';
    bindCards($('favsGrid'));
  }

  async function refreshSession() {
    const { data } = await db.auth.getSession();
    currentUser = data?.session?.user || null;
    if (currentUser) {
      $('btnAuth').classList.add('is-hidden');
      $('btnUser').classList.remove('is-hidden');
      $('btnUser').textContent = (currentUser.email || 'Аккаунт').split('@')[0];
      await loadUserMeta();
    } else {
      $('btnAuth').classList.remove('is-hidden');
      $('btnUser').classList.add('is-hidden');
      profileRow = null;
      favIds = new Set();
      upvoteIds = new Set();
    }
  }

  // Events
  document.body.addEventListener('click', (e) => {
    const t = e.target.closest('[data-screen]');
    if (!t) return;
    if (t.tagName === 'A') return;
    e.preventDefault();
    openProfile(false);
    if (t.dataset.screen === 'picker') {
      pickerStep = 0;
      Object.keys(pickerAns).forEach((k) => delete pickerAns[k]);
      renderPicker();
    }
    go(t.dataset.screen);
  });

  $('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    runSearch($('searchInput').value);
  });
  document.querySelectorAll('.chip[data-q]').forEach((c) => {
    c.addEventListener('click', () => {
      $('searchInput').value = c.dataset.q;
      runSearch(c.dataset.q);
    });
  });

  $('ideaFilters').querySelectorAll('.seg-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      $('ideaFilters').querySelectorAll('.seg-item').forEach((b) => b.classList.remove('is-on'));
      btn.classList.add('is-on');
      const list = filterIdeas(btn.dataset.f, '');
      $('ideasGrid').innerHTML = list.length ? list.map(ideaCard).join('') : '<p class="muted-line">Пусто.</p>';
      bindCards($('ideasGrid'));
    });
  });

  $('pickerNext').onclick = () => {
    const s = PICKER[pickerStep];
    if (!pickerAns[s.key]) pickerAns[s.key] = s.opts[0].id;
    if (pickerStep >= PICKER.length - 1) finishPicker();
    else {
      pickerStep++;
      renderPicker();
    }
  };
  $('pickerBack').onclick = () => {
    if (pickerStep > 0) {
      pickerStep--;
      renderPicker();
    }
  };
  $('ideaBack').onclick = () => go(prevScreen || 'home');
  ['inv', 'profit'].forEach((id) => $(id).addEventListener('input', updateCalc));
  updateCalc();

  $('btnAuth').onclick = () => {
    authMode = 'login';
    $('authTitle').textContent = 'Вход';
    $('authSubmit').textContent = 'Войти';
    openAuth(true);
  };
  $('btnUser').onclick = () => openProfile(true);
  $('profileBg').onclick = () => openProfile(false);
  $('profileHandle').onclick = () => openProfile(false);
  $('btnLogout').onclick = async () => {
    await db.auth.signOut();
    openProfile(false);
    await refreshSession();
  };
  $('btnFavs').onclick = () => {
    openProfile(false);
    renderFavs();
    go('favs');
  };
  $('authClose').onclick = () => openAuth(false);
  $('authBg').onclick = () => openAuth(false);
  $('authToggle').onclick = () => {
    authMode = authMode === 'login' ? 'signup' : 'login';
    $('authTitle').textContent = authMode === 'login' ? 'Вход' : 'Регистрация';
    $('authSubmit').textContent = authMode === 'login' ? 'Войти' : 'Создать';
    $('authToggle').textContent = authMode === 'login' ? 'Создать аккаунт' : 'Уже есть аккаунт';
  };
  $('authSubmit').onclick = async () => {
    const email = $('authEmail').value.trim();
    const password = $('authPass').value;
    $('authErr').classList.add('is-hidden');
    try {
      if (authMode === 'login') {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await db.auth.signUp({ email, password });
        if (error) throw error;
      }
      openAuth(false);
      refreshSession();
    } catch (err) {
      $('authErr').textContent = err.message || 'Ошибка';
      $('authErr').classList.remove('is-hidden');
    }
  };

  $('btnTheme').onclick = () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (dark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('ideanest-theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('ideanest-theme', 'dark');
    }
  };

  // dark theme vars
  const darkCss = document.createElement('style');
  darkCss.textContent = `
    [data-theme="dark"] {
      --bg: #0c1411; --surface: #15201b; --text: #e8f0ec; --muted: #8aa399;
      --line: rgba(255,255,255,0.08); --dark: #e8f0ec; --accent-soft: #143528;
    }
    [data-theme="dark"] .nav-capsule { background: rgba(21,32,27,0.92); }
    [data-theme="dark"] .btn-dark { background: #e8f0ec; color: #0c1411; }
    [data-theme="dark"] .seg-item.is-on { background: #e8f0ec; color: #0c1411; }
    [data-theme="dark"] .nav-links button.is-active { background: #e8f0ec; color: #0c1411; }
  `;
  document.head.appendChild(darkCss);

  const modalCss = document.createElement('style');
  modalCss.textContent = `
    .modal-bg { position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:200; }
    .modal { position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:210;
      width:min(400px,92vw);padding:28px;display:flex;flex-direction:column;gap:12px; }
    .modal-x { position:absolute;right:14px;top:14px;border:none;background:var(--bg);width:36px;height:36px;border-radius:50%;cursor:pointer; }
    .auth-err { color:#b91c1c;font-size:.9rem; }
    .muted-line { color:var(--muted);padding:12px 0; }
    .footer a { color:var(--muted);text-decoration:none; }
    .footer a:hover { color:var(--accent-hover); }
  `;
  document.head.appendChild(modalCss);

  refreshSession();
  loadData();
})();
