const { sbFetch } = require('./lib/supabase');
const { escapeHtml, escapeAttr, simpleMarkdown, excerpt, layout } = require('./lib/html');

function formatBudget(b) {
  if (b == null || b === '') return '—';
  const n = Number(b);
  if (Number.isNaN(n)) return String(b);
  return new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
}

module.exports = async function handler(req, res) {
  try {
    const id = (req.query.id || '').toString().trim();
    if (!/^\d+$/.test(id)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end('<!DOCTYPE html><html lang="ru"><body><h1>Некорректный id</h1><a href="/ideas/all.html">К идеям</a></body></html>');
      return;
    }

    const rows = await sbFetch(
      `ideas?id_idea=eq.${id}&select=id_idea,title,budget,complexity,category,rating,potential,pluses,minuses,risks,cover_url,image_url,created_at&limit=1`
    );
    const idea = Array.isArray(rows) ? rows[0] : null;
    if (!idea) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.end(`<!DOCTYPE html><html lang="ru"><head><title>Идея не найдена — IdeaNest</title></head><body>
        <main style="max-width:640px;margin:48px auto;font-family:system-ui">
          <h1>Идея не найдена</h1>
          <p><a href="/ideas/all.html">Все идеи</a></p>
        </main></body></html>`);
      return;
    }

    const name = idea.title || `Идея №${idea.id_idea}`;
    const title = `${name} — IdeaNest`;
    const desc = excerpt(idea.potential || idea.pluses || idea.risks || name, 160);
    const canonical = `https://ideanest.ru/ideas/${idea.id_idea}`;
    const image = idea.cover_url || idea.image_url || 'https://ideanest.ru/assets/logo-dark.png';

    const block = (label, content) => {
      if (!content) return '';
      const html = String(content).includes('\n')
        ? '<ul>' + String(content).split('\n').map(l => l.trim()).filter(Boolean).map(l => `<li>${escapeHtml(l)}</li>`).join('') + '</ul>'
        : `<p>${escapeHtml(content)}</p>`;
      return `<section class="idea-field-block"><h2>${escapeHtml(label)}</h2>${html}</section>`;
    };

    const bodyHtml = `
    <div class="card" style="cursor:default;" id="ideaDetailContainer" data-ssr="1">
    <nav class="breadcrumbs">
      <a href="/">Главная</a> <span class="bc-sep">/</span>
      <a href="/ideas/all.html">Идеи</a> <span class="bc-sep">/</span>
      <span class="bc-current">${escapeHtml(name)}</span>
    </nav>
    <article>
      <h1 class="idea-modal-title">${escapeHtml(name)}</h1>
      <p class="idea-pill-row">
        <span class="idea-pill">Бюджет: ${escapeHtml(formatBudget(idea.budget))}</span>
        <span class="idea-pill">Сложность: ${escapeHtml(idea.complexity || '—')}</span>
        <span class="idea-pill">Категория: ${escapeHtml(idea.category || '—')}</span>
        <span class="idea-pill">Рейтинг: ${idea.rating != null ? escapeHtml(String(idea.rating)) : '—'}</span>
      </p>
      ${block('Потенциал', idea.potential)}
      ${block('Плюсы', idea.pluses)}
      ${block('Минусы', idea.minuses)}
      ${block('Риски', idea.risks)}
    </article>
    <p style="margin-top:32px"><a class="btn btn-secondary" href="/ideas/all.html">← Все идеи</a></p>
    </div>`;

    const jsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name,
      description: desc,
      url: canonical,
      image
    });

    const html = layout({ title, description: desc, canonical, image, bodyHtml, jsonLd })
      .replace('detail-main--article', 'detail-main--idea')
      .replace('id="articlePage"', 'id="ideaPage"');

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.end(html);
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!DOCTYPE html><html lang="ru"><body><h1>Ошибка загрузки идеи</h1><a href="/ideas/all.html">К идеям</a></body></html>');
  }
};
