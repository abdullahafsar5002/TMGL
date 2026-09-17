# TMGL Acceptance Checklist

## Authentication
- [ ] Login works
- [ ] Logout works
- [ ] Session persists
- [ ] Unauthorized users cannot access protected pages
- [ ] Roles are enforced server/database-side

## Players
- [ ] Create player
- [ ] Edit player
- [ ] View player
- [ ] Search/filter
- [ ] Team membership works

## Teams
- [ ] Create team
- [ ] Assign players
- [ ] Remove players
- [ ] Standings update from real results

## Courses
- [ ] Create course
- [ ] Add holes
- [ ] Validate hole numbers
- [ ] Course details display correctly

## Tournaments
- [ ] Create tournament
- [ ] Open registration
- [ ] Register player
- [ ] Close registration
- [ ] Assign course
- [ ] Complete tournament

## Fixtures/Matches
- [ ] Create fixture
- [ ] Assign players
- [ ] Assign tee time
- [ ] Start match
- [ ] Complete match

## Scoring
- [ ] Start round
- [ ] Enter hole score
- [ ] Navigate holes
- [ ] Running total correct
- [ ] Front 9 correct
- [ ] Back 9 correct
- [ ] Total correct
- [ ] To-par correct
- [ ] Submit scorecard
- [ ] Verify scorecard
- [ ] Reject/amend scorecard
- [ ] Unverified score does not enter official standings

## Leaderboard
- [ ] Leaderboard uses verified scores
- [ ] Position calculation correct
- [ ] Filters work
- [ ] Realtime updates work
- [ ] Realtime subscriptions clean up

## Statistics
- [ ] Stats derive from score data
- [ ] No fake hard-coded values
- [ ] Unit tests pass

## Security
- [ ] RLS enabled
- [ ] Player cannot access another player's private data
- [ ] Manager permissions limited
- [ ] Service-role key absent from frontend
- [ ] Secrets absent from Git
- [ ] Audit logs work

## PWA
- [ ] Manifest valid
- [ ] App installable
- [ ] Offline shell works
- [ ] Private data is not insecurely cached

## Release
- [ ] npm run build passes
- [ ] No broken routes
- [ ] No critical console errors
- [ ] Mobile QA complete
- [ ] Deployment checklist complete
