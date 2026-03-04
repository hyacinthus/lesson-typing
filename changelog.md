## v0.4.0 (2026-03-04)

### New Features
- **SEO Optimization**: Added Open Graph, Twitter Card meta tags, structured data (JSON-LD), canonical URL, and noscript fallback for search engine visibility
- **PWA Support**: Added web app manifest with icons for installable app experience
- **Features Section**: Added a visible features section on the homepage highlighting curriculum texts, progress tracking, and multilingual support (in all 8 languages)
- **Sitemap & Robots**: Added sitemap.xml and robots.txt for search engine crawling

### Improvements
- **Caching Headers**: Configured immutable caching for hashed assets, no-cache for HTML, and stale-while-revalidate for lesson data
- **Security Headers**: Added X-Content-Type-Options and X-Frame-Options headers
- **Sticky Header**: Homepage header now stays visible while scrolling
- **Dynamic Lang Attribute**: HTML lang attribute now updates automatically on language change

**Full diff**: https://github.com/hyacinthus/lesson-typing/compare/v0.3.2...v0.4.0
