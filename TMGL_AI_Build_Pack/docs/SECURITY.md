# TMGL Security Requirements

## Secrets

Never expose:
- Supabase service-role key
- database password
- private API tokens

Frontend may use the Supabase publishable/anon client key when RLS is correctly configured.

## RLS model

Public:
- read only explicitly public competition/profile data

Player:
- read own private records
- update only fields explicitly allowed
- score only assigned/authorized rounds

Manager:
- manage competition records within assigned scope

Super Admin:
- full authorized access

## Security requirements

- Enable RLS on every user/league table that needs authorization.
- Do not rely only on frontend route protection.
- Validate ownership server/database-side.
- Use database constraints for uniqueness and valid state transitions.
- Log sensitive administrative actions.
- Validate uploaded file types and sizes.
- Avoid dangerouslySetInnerHTML unless absolutely necessary.
- Do not trust client-calculated totals as official values.
- Recalculate official totals server-side/database-side.
