const { sbFetch } = require('./lib/supabase');

module.exports = async function handler(req, res) {
  try {
    const [articles, ideas] = await Promise.all([
      sbFetch('articles?select=slug,created_at&order=created_at.desc&limit=5000'),
      sbFetch('ideas?select=id_idea,created_at&order=created_at.desc&limit=5000')
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const urls = [
      { loc: 'https://ideanest.ru/', priority: '1.0', changefreq: 'daily' },
      { loc: 'https://ideanest.ru/ideas/all.html', priority: '0.9', changefreq: 'daily' },
      { loc: 'https://ideanest.ru/articles/', priority: '0.9', changefreq: 'daily' },
      { loc: 'https://ideanest.ru/ideas/match.html', priority: '0.6', changefreq: 'monthly' },
      { loc: 'https://ideanest.ru/about', priority: '0.4', changefreq: 'yearly' },
      { loc: 'https://ideanest.ru/privacy', priority: '0.3', changefreq: 'yearly' },
      { loc: 'https://ideanest.ru/terms', priority: '0.3', changefreq: 'yearly' },
      { loc: 'https://ideanest.ru/disclaimer', priority: '0.3', changefreq: 'yearly' }
    ];

    for (const a of articles || []) {
      if (!a.slug) continue;
      urls.push({
        loc: `https://ideanest.ru/articles/${encodeURIComponent(a.slug)}`,
        lastmod: (a.created_at || today).toString().slice(0, 10),
        priority: '0.8',
        changefreq: 'weekly'
      });
    }
    for (const i of ideas || []) {
      if (i.id_idea == null) continue;
      urls.push({
        loc: `https://ideanest.ru/ideas/${i.id_idea}`,
        lastmod: (i.created_at || today).toString().slice(0, 10),
        priority: '0.7',
        changefreq: 'weekly'
      });
    }

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : `<lastmod>${today}</lastmod>`}
    <changefreq>${u.changefreq || 'weekly'}</changefreq>
    <priority>${u.priority || '0.5'}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.end(body);
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('sitemap error');
  }
};
