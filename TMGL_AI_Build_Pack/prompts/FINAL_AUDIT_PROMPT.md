# FINAL PRODUCTION AUDIT PROMPT

Audit the entire TMGL repository as if you are reviewing a production system.

Do not assume features work because UI exists.

For each module verify:
- database operation
- authorization
- validation
- error handling
- loading state
- empty state
- mobile behavior
- build
- tests

Pay special attention to:
1. score integrity
2. leaderboard correctness
3. standings correctness
4. RLS
5. role escalation
6. secrets
7. realtime cleanup
8. duplicate records
9. race conditions
10. PWA security

Create:
docs/FINAL_AUDIT.md

Use severity:
CRITICAL
HIGH
MEDIUM
LOW

Do not use a subjective overall score.
