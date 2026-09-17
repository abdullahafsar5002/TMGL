# TMGL Database Architecture

## Core entities

profiles
players
seasons
divisions
teams
team_members
courses
course_holes
tournaments
tournament_players
fixtures
matches
match_players
rounds
scorecards
hole_scores
standings
handicaps
player_statistics
achievements
player_achievements
notifications
announcements
settings
audit_logs

## Relationship summary

profiles 1:1 players (where applicable)
players N:M teams through team_members
seasons 1:N divisions
seasons 1:N teams
courses 1:N course_holes
tournaments N:M players through tournament_players
fixtures 1:N matches
matches N:M players through match_players
rounds 1:N scorecards
scorecards 1:N hole_scores

## Derived data

Do not let users manually edit:
- official leaderboard position
- official team points
- calculated player statistics

These must be derived from verified competition data.

## Recommended score fields

hole_scores:
- scorecard_id
- hole_id
- strokes
- putts (nullable)
- fairway_hit (nullable)
- green_in_regulation (nullable)
- penalties (nullable)
- notes (nullable)

## Auditability

Important changes should be auditable:
- score creation
- score amendment
- score verification
- result confirmation
- role changes
- competition configuration changes
