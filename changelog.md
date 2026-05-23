## v0.16.0 (2026-05-23)

### Content
- **Lesson authenticity audit** — Replaced ~140 fabricated/AI-generated entries across all 9 languages (grade-1..6 + poetry-7) with verified public-domain works:
  - **English** — additional traditional Mother Goose rhymes, Aesop's fables, Andersen/Grimm tales, Kipling's *Just So Stories*
  - **Chinese** — real PEP (人教版) textbook lessons (赵州桥, 大自然的声音, 飞向蓝天的恐龙, 桂花雨, 珍珠鸟, 母鸡, 陶罐和铁罐), plus 朱自清《春》, 萧红《祖父的园子》
  - **French** — corrected 6 misattributed/fabricated poems in poetry-7 (Hugo, Rimbaud, Musset, Jammes); replaced Tournier (not PD) with verbatim Verne
  - **German** — traditional Kinderreime/Volkslieder, Grimm tales, Aesop, Goethe's *Der Fischer*
  - **Italian** — replaced ~75 generic *Sussidiario/Storia/Scienza/Geografia/Educazione Civica* entries with Rodari, De Amicis (*Cuore*), Collodi (*Pinocchio* chapters), Calvino (*Marcovaldo*), Pascoli, Carducci, Leopardi, Foscolo, Manzoni, Dante, Petrarca, Boccaccio, Pirandello, Verga, Svevo, D'Annunzio, Ariosto, Tasso; verbatim Italian Constitution Art. 1–3 and UDHR Art. 1–2
  - **Japanese** — 8 misattributed/fabricated 新美南吉 stories replaced with canonical Aozora Bunko texts; corrected 宮沢賢治 entry
  - **Korean** — replaced ~30 fabricated 수필/역사/동시 entries with traditional 전래동화 and canonical public-domain poems by 김소월, 한용운, 윤동주, 이육사, 정지용, 김영랑, 이상화 (빼앗긴 들에도 봄은 오는가), 이상; short-story excerpts by 김유정, 현진건, 이효석, 나도향
  - **Portuguese** — traditional Brazilian/Portuguese cantigas, Aesop, Machado de Assis (*A Cartomante*, *Missa do Galo*), Olavo Bilac, Castro Alves, Gonçalves Dias, Casimiro de Abreu, Cruz e Sousa, Florbela Espanca, Euclides da Cunha; verbatim Hino Nacional Brasileiro lyrics
  - **Spanish** — traditional canciones infantiles, Aesop, Juan Ramón Jiménez (*Platero y yo*), Gabriela Mistral, Rubén Darío (*Sonatina*, *Canción de Otoño en Primavera*), Bécquer, José Martí, Federico García Lorca, Cervantes (*Don Quijote* opening)

### Maintenance
- **Dependency upgrade** — Bumped all dependencies to latest, including major version jumps for TypeScript 5.9→6.0, Vite 7→8, ESLint 9→10, react-i18next 16→17, i18next 25→26, lucide-react 0.577→1.16, uuid 13→14, @vitejs/plugin-react 5→6, globals 15→17, shadcn 3→4
- **TypeScript 6 compatibility** — Removed deprecated `baseUrl` from `tsconfig.app.json` (paths now resolve relative to tsconfig location)
- **gitignore** — Added `.claude/scheduled_tasks.lock`

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.15.3...v0.16.0
