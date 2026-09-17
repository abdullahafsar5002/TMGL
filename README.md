# TMGL — Toruk Maktu Golf League

A mobile-first PWA golf league management platform with live scoring, leaderboards, and tournament management.

## Live

- **Web**: https://tmgl.vercel.app
- **GitHub**: https://github.com/abdullahafsar5002/TMGL

## Tech Stack

- React 18 + TypeScript (strict mode)
- Vite + Tailwind CSS
- Supabase (PostgreSQL, Auth, RLS)
- PWA (vite-plugin-pwa, service worker)
- Capacitor (Android)
- Vercel (deployment)

## Features

| Feature | Status |
|---------|--------|
| Foundation (React/Vite/Design System) | Complete |
| Auth & RBAC (login, roles, protected routes) | Complete |
| League Structure (seasons, divisions, teams, players) | Complete |
| Golf Courses (CRUD, holes, rating/slope) | Complete |
| Competition (tournaments, rounds, matches) | Complete |
| Scoring & Leaderboards (scorecards, hole scores, live leaderboard) | Complete |
| Dashboard & Analytics (manager/player dashboards, stats) | Complete |
| PWA (manifest, service worker, installable) | Complete |
| Capacitor Android (debug APK builds) | Complete |
| Vercel Deployment | Complete |

## Roles

- **super_admin** — Full access
- **league_manager** — Manage players, teams, tournaments, scoring
- **player** — Enter scores, view own data
- **public** — View leaderboards, seasons, players, teams

## Development

```bash
npm install
npm run dev
```

## Testing

```bash
npm test
npx tsc --noEmit
npm run build
```

## Android

```bash
npx cap sync android
cd android && gradlew.bat assembleDebug
```

## Environment Variables

Create `.env` from `.env.example`:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
