# SSR for crawlers (Vercel)

- `GET /articles/:slug` → `api/article.js` — HTML with article text from Supabase
- `GET /ideas/:id` → `api/idea.js` — HTML with idea fields
- `GET /sitemap.xml` → `api/sitemap.js` — dynamic sitemap from DB

Optional env on Vercel: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (defaults match public anon key in script.js).

Client SPA templates remain at `articles/article.html` and `ideas/idea.html` for local/file and legacy query URLs.
