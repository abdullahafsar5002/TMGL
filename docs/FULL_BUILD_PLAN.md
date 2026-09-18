# TMGL Full Build Plan — Phases 5-9

**Date:** 2026-09-18
**Goal:** Complete the full TMGL specification — premium golf league platform

---

## Current State (End of Phase 4)

### What Exists
- 33 web pages (seasons, divisions, players, teams, courses, tournaments, rounds, matches, scoring, leaderboard, analytics)
- 12 Android screens (auth, home, tournaments, matches, scoring, leaderboard, players, teams, profile, settings)
- 8 Supabase migrations (14 tables, RLS, triggers, storage)
- 345 passing tests
- PWA with offline fallback
- Role-based access (super_admin, league_manager, player, public)
- Toast notifications, ErrorBoundary, Pagination, ImageUpload

### What's Missing (Gap Analysis)

#### Missing Web Pages (16 pages)
1. About TMGL
2. News & Announcements
3. Gallery
4. Contact
5. Forgot Password
6. Practice Hub
7. Practice Scorecard
9. Practice History
10. Friendly Matches
11. Friendly Match Details
12. My Tournaments
13. My Scores
14. My Statistics
15. Notifications
16. Profile Settings
17. Organizer Dashboard (enhanced)
18. Admin Dashboard (enhanced)

#### Missing Android Screens (10 screens)
1. Practice Hub
2. Create Practice Round
3. Practice Scorecard
4. Practice History
5. Friendly Matches
6. Create Friendly Match
7. Statistics
8. Notifications
9. Onboarding
10. Forgot Password

#### Missing Feature Systems
1. **Practice Rounds** — create, score, history, statistics
2. **Friendly Matches** — create, invite, score, formats, history
3. **Player Statistics** — charts, trends, course performance, hole analysis
4. **Notifications** — in-app notification system
5. **Announcements** — league/tournament announcements
6. **Gallery** — tournament image galleries
7. **Offline Scoring** — IndexedDB/localStorage draft saving with sync
8. **Match Formats** — Stroke Play, Match Play, Stableford, Best Ball, Scramble
9. **Player Rankings** — ELO/handicap-based ranking system
10. **Admin Dashboard** — system-wide analytics and management
11. **Organizer Dashboard** — tournament-specific management view

#### Missing DB Tables (from spec)
- practice_rounds
- practice_scores
- friendly_matches
- friendly_match_players
- rankings
- player_statistics
- notifications
- announcements
- galleries
- media_uploads
- audit_logs

---

## Phase 5: Practice System + Player Hub + DB Migrations

### 5.1 Database Migrations
**File:** `supabase/migrations/0009_practice_and_friendly.sql`

New tables:
```sql
-- Practice rounds
practice_rounds (id, player_id, course_id, holes_count, tee_box, status, notes, started_at, completed_at)
practice_scores (id, practice_round_id, hole_number, par, strokes, putts, fairway_hit, gir, penalty_strokes, notes)

-- Friendly matches
friendly_matches (id, course_id, holes_count, match_format, creator_id, invite_code, status, started_at, completed_at)
friendly_match_players (id, friendly_match_id, player_id, score, status)

-- Notifications
notifications (id, user_id, type, title, message, read, data, created_at)

-- Announcements
announcements (id, title, content, author_id, tournament_id, visibility, published_at)

-- Player statistics (materialized for performance)
player_statistics (id, player_id, total_rounds, avg_score, best_score, birdies, pars, bogeys, double_bogeys, fairways_hit, gir, putting_avg, updated_at)
```

### 5.2 Service Layer
**Files:** `src/lib/practice.ts`, `src/lib/friendly.ts`, `src/lib/notifications.ts`, `src/lib/statistics.ts`

Practice service functions:
- createPracticeRound, getPracticeRounds, getPracticeRound
- savePracticeScore, submitPracticeRound
- getPracticeHistory, getPracticeStatistics

Friendly match service functions:
- createFriendlyMatch, getFriendlyMatches, getFriendlyMatch
- joinFriendlyMatch, saveFriendlyScore, completeFriendlyMatch
- getInviteCode (short code for sharing)

Notification service functions:
- getNotifications, markAsRead, markAllAsRead, getUnreadCount

Statistics service functions:
- getPlayerStatistics, updatePlayerStatistics
- getScoreTrend, getCoursePerformance, getHolePerformance

### 5.3 Web Pages (8 new pages)
1. `PracticeHubPage.tsx` — Dashboard for practice: quick start, recent rounds, stats summary
2. `PracticeCreatePage.tsx` — Create practice round (course, holes, tee box)
3. `PracticeScorecardPage.tsx` — Hole-by-hole scoring with advanced fields (putts, fairway, GIR)
4. `PracticeHistoryPage.tsx` — List of all practice rounds with filters
5. `MyTournamentsPage.tsx` — Player's tournament list (joined, upcoming, completed)
6. `MyScoresPage.tsx` — All scorecards (tournament + practice) in one view
7. `MyStatisticsPage.tsx` — Charts and stats (score trend, averages, performance by course)
8. `ProfileSettingsPage.tsx` — Edit profile, avatar, preferences

### 5.4 Components
- `PracticeScorecardForm.tsx` — Advanced scorecard input with putts, fairway, GIR toggles
- `StatsChart.tsx` — Reusable chart component (score trend, performance)
- `StatsCard.tsx` — Stat display card (avg score, best round, etc.)
- `PerformanceChart.tsx` — Line/bar chart for trends
- `StatPieChart.tsx` — Pie chart for scoring distribution (birdies, pars, etc.)

### 5.5 Router Updates
Add 8 new routes to AppRouter.tsx

### 5.6 Tests
- practice.test.ts (service functions)
- friendly.test.ts (service functions)
- notifications.test.ts (service functions)
- statistics.test.ts (service functions)

---

## Phase 6: Friendly Matches + Match Formats + Notifications

### 6.1 Match Formats
**File:** `src/lib/matchFormats.ts`

Implement scoring logic for:
- **Stroke Play** — total strokes (already exists)
- **Match Play** — hole-by-hole comparison
- **Stableford** — points system (birdie=3, par=2, bogey=1, double+=0)
- **Best Ball** — team best score per hole
- **Scramble** — team selects best shot each hole (Coming Soon label)

Non-implemented formats get a clear "Coming Soon" badge.

### 6.2 Friendly Match Pages
1. `FriendlyMatchesPage.tsx` — List of friendly matches (active, pending, completed)
2. `FriendlyMatchCreatePage.tsx` — Create match, select format, generate invite code
3. `FriendlyMatchDetailPage.tsx` — View match, live scores, invite players
4. `FriendlyMatchScorePage.tsx` — Score a friendly match

### 6.3 Notifications
- `NotificationsPage.tsx` — Full notification center
- Notification bell icon in header with unread count badge
- Toast notifications for real-time events

### 6.4 Database
**File:** `supabase/migrations/0010_announcements_and_galleries.sql`

```sql
-- Announcements
announcements (id, title, content, author_id, tournament_id, visibility, published_at)

-- Galleries
galleries (id, tournament_id, title, description, created_at)
gallery_images (id, gallery_id, image_url, caption, uploaded_by, created_at)

-- Audit logs
audit_logs (id, user_id, action, entity_type, entity_id, details, created_at)
```

---

## Phase 7: Missing Web Pages + Admin/Organizer Dashboards

### 7.1 Public Pages
1. `AboutPage.tsx` — TMGL story, mission, team
2. `NewsPage.tsx` — Announcements listing
3. `GalleryPage.tsx` — Tournament photo galleries
4. `ContactPage.tsx` — Contact form + info
5. `ForgotPasswordPage.tsx` — Password reset flow

### 7.2 Enhanced Dashboards
6. `OrganizerDashboardPage.tsx` — Tournament organizer view (my tournaments, pending verifications, quick actions)
7. `AdminDashboardPage.tsx` — System admin view (all users, all tournaments, system stats, audit logs)

### 7.3 Router Updates
Add 7 new routes

---

## Phase 8: Android Catch-Up

### 8.1 New Screens (10 screens)
1. `PracticeHubScreen.kt` — Practice dashboard
2. `PracticeCreateScreen.kt` — Create practice round
3. `PracticeScorecardScreen.kt` — Score practice round
4. `PracticeHistoryScreen.kt` — Practice history list
5. `FriendlyMatchesScreen.kt` — Friendly matches list
6. `FriendlyMatchCreateScreen.kt` — Create friendly match
7. `FriendlyMatchDetailScreen.kt` — View/score friendly match
8. `StatisticsScreen.kt` — Player statistics
9. `NotificationsScreen.kt` — Notification center
10. `OnboardingScreen.kt` — First-launch onboarding

### 8.2 Navigation Updates
Update `Screen.kt` and `AppNavigation.kt` with new routes
Update bottom nav to include Practice tab

### 8.3 Repository Updates
Add practice, friendly, notification, statistics methods to repositories

---

## Phase 9: Polish, Offline Scoring, Branding, Final QA

### 9.1 Offline Scoring
- IndexedDB wrapper for draft scorecards
- Sync queue for pending submissions
- Conflict resolution UI
- Offline indicator component

### 9.2 Branding Polish
- Ensure Toruk Makto logo is used in all required locations
- Consistent color scheme (deep green, gold accents)
- Professional empty states with logo
- Consistent spacing and typography

### 9.3 Analytics Enhancement
- Score trend charts (line charts)
- Scoring distribution (pie charts)
- Course performance comparison
- Hole-by-hole analysis
- Tournament performance history

### 9.4 Final QA
- All routes tested
- All forms validated
- All error states handled
- All loading states implemented
- Responsive testing (320px - 1920px)
- TypeScript strict mode clean
- All tests passing
- Production build successful

---

## Execution Order

| Phase | Scope | Est. Files | Priority |
|-------|-------|-----------|----------|
| **5** | Practice system + Player Hub + DB | ~20 files | HIGH |
| **6** | Friendly matches + Notifications + Formats | ~15 files | HIGH |
| **7** | Missing web pages + Dashboards | ~10 files | MEDIUM |
| **8** | Android catch-up | ~15 files | MEDIUM |
| **9** | Polish + Offline + QA | ~10 files | MEDIUM |

**Total estimated new/modified files: ~70**
