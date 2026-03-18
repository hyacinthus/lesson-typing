/**
 * Post-build script: generates per-language index.html files and sitemap.xml
 * Run after `vite build` to create i18n subpath pages in dist/.
 */

const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '..', 'dist');
const META_PATH = path.resolve(__dirname, '..', 'src', 'i18n-meta.json');

const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf-8'));
const baseUrl = meta.baseUrl;
const languages = Object.keys(meta.languages);
const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf-8');

// ---------------------------------------------------------------------------
// 1. Build hreflang link tags (used in every page)
// ---------------------------------------------------------------------------
const hreflangTags = [
  ...languages.map(
    (lang) => `<link rel="alternate" hreflang="${lang}" href="${baseUrl}/${lang}/" />`
  ),
  `<link rel="alternate" hreflang="x-default" href="${baseUrl}/en/" />`,
].join('\n    ');

// ---------------------------------------------------------------------------
// 2. Generate per-language index.html
// ---------------------------------------------------------------------------
for (const lang of languages) {
  const { title, description, ogDescription } = meta.languages[lang];
  const langUrl = `${baseUrl}/${lang}/`;

  let html = template;

  // <html lang="...">
  html = html.replace(/<html lang="[^"]*">/, `<html lang="${lang}">`);

  // <title>
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);

  // meta description
  html = html.replace(
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${description}"`
  );

  // og:title
  html = html.replace(
    /<meta property="og:title" content="[^"]*"/,
    `<meta property="og:title" content="${title}"`
  );

  // og:description
  html = html.replace(
    /<meta property="og:description" content="[^"]*"/,
    `<meta property="og:description" content="${ogDescription}"`
  );

  // og:url
  html = html.replace(
    /<meta property="og:url" content="[^"]*"/,
    `<meta property="og:url" content="${langUrl}"`
  );

  // twitter:title
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*"/,
    `<meta name="twitter:title" content="${title}"`
  );

  // twitter:description
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"/,
    `<meta name="twitter:description" content="${ogDescription}"`
  );

  // canonical
  html = html.replace(
    /<link rel="canonical" href="[^"]*"/,
    `<link rel="canonical" href="${langUrl}"`
  );

  // Structured data – "name"
  html = html.replace(
    /"name":\s*"[^"]*"/,
    `"name": "${title}"`
  );

  // Structured data – "url"
  html = html.replace(
    /"url":\s*"[^"]*"/,
    `"url": "${langUrl}"`
  );

  // Structured data – "description"
  html = html.replace(
    /"description":\s*"Free typing practice[^"]*"/,
    `"description": "${description}"`
  );

  // Inject hreflang tags before </head>
  html = html.replace('</head>', `    ${hreflangTags}\n  </head>`);

  // Write file
  const langDir = path.join(DIST, lang);
  fs.mkdirSync(langDir, { recursive: true });
  const outPath = path.join(langDir, 'index.html');
  fs.writeFileSync(outPath, html);
  console.log(`Generated: ${lang}/index.html`);
}

// ---------------------------------------------------------------------------
// 3. Replace root index.html with a redirect page
// ---------------------------------------------------------------------------
const supportedLangs = JSON.stringify(languages);

const redirectHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lesson Typing - Elementary School Typing Practice</title>
    <meta name="description" content="Free typing practice for elementary school students. Practice with real curriculum texts in 9 languages." />
    <link rel="canonical" href="${baseUrl}/en/" />
    ${hreflangTags}
    <noscript><meta http-equiv="refresh" content="0;url=/en/" /></noscript>
    <script>
      (function() {
        var supported = ${supportedLangs};
        var stored = '';
        try { stored = localStorage.getItem('lesson-typing-language') || ''; } catch(e) {}
        var nav = (navigator.language || '').split('-')[0].toLowerCase();
        var lang = (supported.indexOf(stored) !== -1 ? stored : (supported.indexOf(nav) !== -1 ? nav : 'en'));
        location.replace('/' + lang + '/' + location.hash);
      })();
    </script>
  </head>
  <body>
    <noscript>
      <p>Redirecting to <a href="/en/">English version</a>...</p>
    </noscript>
  </body>
</html>
`;

fs.writeFileSync(path.join(DIST, 'index.html'), redirectHtml);
console.log('Generated: index.html (redirect)');

// ---------------------------------------------------------------------------
// 4. Generate sitemap.xml
// ---------------------------------------------------------------------------
const allLangs = [...languages, 'x-default'];

function buildAlternates(url) {
  return languages
    .map((l) => `      <xhtml:link rel="alternate" hreflang="${l}" href="${baseUrl}/${l}/" />`)
    .concat([`      <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/en/" />`])
    .join('\n');
}

const urlEntries = [
  // Per-language entries (root URL excluded — it is a noindex redirect)
  ...languages.map(
    (lang) =>
      `  <url>\n    <loc>${baseUrl}/${lang}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n${buildAlternates(`${baseUrl}/${lang}/`)}\n  </url>`
  ),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries.join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap);
console.log('Generated: sitemap.xml');
