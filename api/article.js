const { sbFetch } = require('./lib/supabase');
const { escapeHtml, escapeAttr, simpleMarkdown, excerpt, layout } = require('./lib/html');

module.exports = async function handler(req, res) {
  try {
    const slug = (req.query.slug || '').toString().trim();
    if (!slug) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end('<!DOCTYPE html><html lang="ru"><body><h1>Не указан slug</h1><a href="/articles/">К статьям</a></body></html>');
      return;
    }

    const rows = await sbFetch(
      `articles?slug=eq.${encodeURIComponent(slug)}&select=id,title,slug,description,text,cover_url,image_url,created_at,profiles(id,username,full_name,first_name,last_name)&limit=1`
    );
    const article = Array.isArray(rows) ? rows[0] : null;
    if (!article) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.end(`<!DOCTYPE html><html lang="ru"><head><title>Статья не найдена — IdeaNest</title></head><body>
        <main style="max-width:640px;margin:48px auto;font-family:system-ui">
          <h1>Статья не найдена</h1>
          <p><a href="/articles/">Все статьи</a> · <a href="/">На главную</a></p>
        </main></body></html>`);
      return;
    }

    const title = `${article.title || 'Статья'} — IdeaNest`;
    const desc = (article.description && String(article.description).trim())
      || excerpt(article.text, 160)
      || 'Статья на IdeaNest';
    const canonical = `https://ideanest.ru/articles/${encodeURIComponent(article.slug || slug)}`;
    const image = article.cover_url || article.image_url || 'https://ideanest.ru/assets/logo-dark.png';
    const author = article.profiles;
    const authorName = author
      ? (author.full_name || [author.first_name, author.last_name].filter(Boolean).join(' ') || author.username || '')
      : '';

    const bodyHtml = `
    <div class="article-page-body" style="cursor:default;" id="articleDetailContainer" data-ssr="1">
    <nav class="breadcrumbs" aria-label="Навигация">
      <a href="/">Главная</a> <span class="bc-sep">/</span>
      <a href="/articles/">Статьи</a> <span class="bc-sep">/</span>
      <span class="bc-current">${escapeHtml(article.title || 'Статья')}</span>
    </nav>
    <article>
      <h1 class="idea-modal-title">${escapeHtml(article.title || 'Без названия')}</h1>
      <p class="idea-pill-row" style="color:var(--text-muted);font-size:0.95rem;">
        ${authorName ? `Автор: ${escapeHtml(authorName)} · ` : ''}
        ${article.created_at ? new Date(article.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
      </p>
      <div class="article-body idea-field-block">
        ${simpleMarkdown(article.text)}
      </div>
    </article>
    <p style="margin-top:32px"><a class="btn btn-secondary" href="/articles/">← Все статьи</a></p>
    </div>`;

    const jsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title || '',
      description: desc,
      datePublished: article.created_at || undefined,
      image: image,
      author: authorName ? { '@type': 'Person', name: authorName } : undefined,
      publisher: { '@type': 'Organization', name: 'IdeaNest', url: 'https://ideanest.ru' },
      mainEntityOfPage: canonical
    });

    const html = layout({ title, description: desc, canonical, image, bodyHtml, jsonLd });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.end(html);
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!DOCTYPE html><html lang="ru"><body><h1>Ошибка загрузки статьи</h1><a href="/">На главную</a></body></html>');
  }
};
