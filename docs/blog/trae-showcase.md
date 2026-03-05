## A Typing Practice App I Built for My Child in 2 Nights

### Background

I left Trae for two months when model updates stalled. But Solo mode for frontend is genuinely powerful — I used it to build a typing app for my elementary-school son, and the experience was great.

This is my last app with Trae. I've already refunded for the plan switch you know, but I hope Trae keeps improving — maybe I'll come back one day.

### Lesson Typing?

Most typing apps use random words. My kid found them boring. So I built **Lesson Typing** — practice typing with **real textbook content** from Grade 1–6 curricula. Kids type passages they already know from class.

- Live: https://lessontyping.com 
- GitHub: https://github.com/hyacinthus/lesson-typing

### Features & Tech Stack

- 8 languages, 270+ curriculum-aligned lessons
- Real-time stats (CPM, WPM, accuracy), personal bests, trend charts
- React 19 + TypeScript + Vite, Zustand, shadcn/ui + Tailwind CSS v4, i18next, Recharts, Supabase

### How I Used Trae

- Solo mode + Gemini 3 Pro was my main workflow. Honestly, Gemini 3 Pro works better in Trae than in Antigravity — more coherent results, possibly due to how Solo mode manages context.
- For deeper debugging I switched to normal mode for gpt-5.2-codex (Solo doesn't support it)
- Trae's **Supabase integration** is just a viewer shell — functional but shallow. **Tip: skip the Supabase MCP server** — it eats too much context. Supabase CLI works perfectly.
- One gotcha: Trae kept generating outdated Supabase Edge Function code (deprecated patterns). Hours of debugging got nowhere until I used Opus 4.6 externally to identify the root cause. Worth knowing if you work with Edge Functions.

### Final Thoughts

Solo mode is great. I'm sad to leave, but I hope Trae evolves. If it does, I'll be back maybe.
