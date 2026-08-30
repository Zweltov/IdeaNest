function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

/** Lightweight markdown → HTML for crawlers (not full app renderer). */
function simpleMarkdown(md) {
  if (!md) return '<p></p>';
  let text = String(md).replace(/\r\n/g, '\n');
  // unwrap :::blocks — keep inner text visible for SEO
  text = text.replace(/:::[\w-]*(?:\[[^\]]*\])?\s*\n?([\s\S]*?):::/g, (_, inner) => '\n\n' + inner.trim() + '\n\n');
  // youtube lines → link
  text = text.replace(/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})\S*/g, (m) => `[Видео YouTube](${m})`);

  const lines = text.split('\n');
  const out = [];
  let inList = false;
  let para = [];

  function flushPara() {
    if (!para.length) return;
    const raw = para.join(' ').trim();
    if (raw) out.push('<p>' + inline(raw) + '</p>');
    para = [];
  }
  function flushList() {
    if (inList) { out.push('</ul>'); inList = false; }
  }
  function inline(s) {
    return escapeHtml(s)
      .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  for (const line of lines) {
    const h = /^(#{1,3})\s+(.+)$/.exec(line);
    if (h) {
      flushPara(); flushList();
      const n = h[1].length;
      out.push(`<h${n}>${inline(h[2].trim())}</h${n}>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      flushPara();
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push('<li>' + inline(line.replace(/^\s*[-*]\s+/, '')) + '</li>');
      continue;
    }
    if (!line.trim()) {
      flushPara(); flushList();
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara(); flushList();
  return out.join('\n') || '<p></p>';
}

function excerpt(text, max = 160) {
  const plain = String(text || '')
    .replace(/:::[\s\S]*?:::/g, ' ')
    .replace(/[#>*_`\[\]()]/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.slice(0, max);
}

function layout({ title, description, canonical, image, bodyHtml, jsonLd }) {
  const t = escapeHtml(title);
  const d = escapeAttr(description);
  const c = escapeAttr(canonical);
  const img = escapeAttr(image || 'https://ideanest.ru/assets/logo-dark.png');
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t}</title>
  <meta name="description" content="${d}" />
  <link rel="canonical" href="${c}" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/icon-32.png" />
  <link rel="icon" type="image/png" sizes="192x192" href="/assets/icon-192.png" />
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="theme-color" content="#F59E0B" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="IdeaNest" />
  <meta property="og:locale" content="ru_RU" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:url" content="${c}" />
  <meta property="og:image" content="${img}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  ${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ''}
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/style.css" />
  <script src="https://unpkg.com/lucide@latest"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js"></script>
</head>
<body>
  <div class="profile-blur-overlay" id="profileBlurOverlay"></div>
  <header class="navbar">
    <div class="navbar-container">
      <a class="brand" href="/">
        <img src="/assets/logo-dark.png" class="brand-logo" alt="IdeaNest" /> IdeaNest
      </a>
      <nav class="nav-links">
        <a href="/ideas/all.html" class="nav-link">Идеи</a>
        <a href="/articles/" class="nav-link">Статьи</a>
      </nav>
      <div class="navbar-actions">
        <button class="btn btn-secondary" id="loginBtn" style="display:none;">Войти</button>
        <div class="profile-wrapper" id="profileWrapper" style="display:none;">
          <img src="https://ui-avatars.com/api/?name=User&background=000&color=fff" id="topAvatar" class="avatar-img" alt="Профиль">
          <div class="profile-dropdown" id="profileDropdown">
            <div class="dropdown-header">
              <img src="https://ui-avatars.com/api/?name=User&background=000&color=fff" id="dropdownAvatar" class="dropdown-avatar" alt="">
              <div class="user-info">
                <span class="user-name" id="userName">Пользователь</span>
                <span class="user-email" id="userEmail"></span>
              </div>
            </div>
            <div class="dropdown-divider"></div>
            <a href="#" class="dropdown-item" id="profilePageLink">Профиль</a>
            <a href="/settings/settings.html" class="dropdown-item">Настройки</a>
          </div>
        </div>
      </div>
    </div>
  </header>
  <main class="detail-main detail-main--article" id="articlePage" data-ssr="1">
${bodyHtml}
  </main>
  <script src="/script.js"></script>
</body>
</html>`;
}

module.exports = { escapeHtml, escapeAttr, simpleMarkdown, excerpt, layout };
