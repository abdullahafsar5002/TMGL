# TMGL Deployment

## Environment variables

Create production environment variables for:
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY (or the project's supported browser client key)

Never deploy:
- database password
- Supabase service-role key
- private tokens

## Recommended flow

Local:
npm install
npm run dev

Build:
npm run build

Preview:
npm run preview

Git:
git add .
git commit -m "TMGL release"
git push

## Hosting

Use a static frontend host that supports SPA routing, such as Vercel/Netlify, or configure GitHub Pages with an appropriate SPA fallback strategy.

Before production:
- configure Supabase redirect URLs
- configure authentication URLs
- apply migrations
- enable RLS
- verify storage policies
- test production environment variables
- test mobile installation
