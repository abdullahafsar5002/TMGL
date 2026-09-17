# PHASE 12 — SECURITY AUDIT

Perform a security-focused audit.

Check:
- RLS on all relevant tables
- role escalation
- unauthorized record access
- service-role exposure
- environment secrets
- unsafe SQL
- unsafe HTML
- upload validation
- auth/session handling
- score tampering
- direct API access bypassing UI permissions

Add tests for unauthorized access where feasible.

Fix findings, then run build/tests.
