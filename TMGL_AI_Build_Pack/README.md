# Toruk Maktu Golf League — AI Build Pack

This package is a structured development specification for building TMGL as a production-ready web application and installable PWA.

## Goal

Build a real Golf League Management System, not a static mockup.

Core stack:
- React + Vite
- Supabase PostgreSQL
- Supabase Auth
- Supabase Realtime
- GitHub
- PWA

Primary AI workflow:
- Gemini CLI as the main coding agent
- VS Code as the development environment
- Optional Ollama only for small/local tasks

## Build rule

Do NOT ask the AI to generate the entire application in one response.

Use:
1. Master architecture
2. Database
3. Authentication/RBAC
4. Modules one by one
5. Testing after every phase
6. Security review
7. Deployment

The AI must inspect the repository before editing it and must run the available build/test commands after changes.

## Files

- docs/MASTER_ARCHITECTURE.md — source of truth
- docs/DATABASE_ARCHITECTURE.md — data model
- docs/SECURITY.md — security/RLS requirements
- docs/UI_DESIGN_SYSTEM.md — visual system
- docs/DEVELOPMENT_ROADMAP.md — phase order
- prompts/00_MASTER_AGENT_PROMPT.md — first prompt
- prompts/01-14_PHASE_PROMPTS.md — phase-by-phase prompts
- prompts/BUGFIX_PROMPT.md — debugging prompt
- prompts/FINAL_AUDIT_PROMPT.md — production audit
- supabase/migrations/0001_initial_schema.sql — starter schema
- tests/ACCEPTANCE_CHECKLIST.md — manual QA
- deployment/DEPLOYMENT.md — deployment plan

## Important

Do not put Supabase service-role keys, passwords, private tokens, or other secrets into source code.

The schema is intentionally modular. Official handicap calculations should only be claimed when the actual verified rules have been implemented.
