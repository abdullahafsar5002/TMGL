# TMGL Master Architecture

## Product

Toruk Maktu Golf League (TMGL)

A mobile-first golf league platform supporting public viewing, player accounts, league management, tournaments, live scoring, rankings and administration.

## User roles

### Public
- View home
- View current season
- View teams
- View players
- View tournaments
- View fixtures
- View results
- View public live leaderboard

### Player
- Everything public
- Own profile
- Own team
- Assigned fixtures/matches
- Own scorecards
- Hole-by-hole scoring where authorized
- Own statistics
- Rankings
- Notifications

### League Manager
- Player management
- Team management
- Course management
- Tournament management
- Fixtures
- Matches
- Score verification
- Results
- League standings

### Super Admin
- Everything
- Users/roles
- Settings
- Security
- Audit logs
- Data export/backup
- System configuration

## Main modules

1. Public website
2. Authentication
3. Dashboard
4. Players
5. Teams
6. Seasons
7. Divisions
8. Courses
9. Tournaments
10. Registrations
11. Fixtures
12. Matches
13. Tee times/pairings
14. Scorecards
15. Hole scores
16. Live leaderboard
17. Standings
18. Rankings
19. Handicaps
20. Player statistics
21. Achievements
22. Notifications
23. Announcements
24. Reports
25. Payments/fees (optional phase)
26. Audit logs
27. Settings
28. Backup/export
29. PWA/offline shell

## Critical data flow

Fixture -> Match -> Round -> Scorecard -> Hole Scores
                                  |
                                  +-> verified result
                                  +-> leaderboard
                                  +-> player statistics
                                  +-> team standings
                                  +-> rankings

Never maintain independent fake copies of derived statistics.

## Score verification

A submitted scorecard is NOT automatically an official result unless the league's configured workflow explicitly allows it.

Recommended states:
draft -> in_progress -> submitted -> verified -> rejected -> amended

Only verified scores feed official leaderboards/statistics.

## Architecture rules

- Components should not contain complex database logic.
- Use service/data-access modules.
- Keep scoring calculations in pure, testable functions.
- Keep ranking rules configurable.
- Keep handicap calculations isolated.
- Use database constraints for important integrity rules.
- Use RLS for authorization.
- Use transactions/RPC where multiple related writes must remain atomic.
- Use realtime subscriptions for live competition screens.
