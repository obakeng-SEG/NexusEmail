# NexusEmail Hosted Segbytes Plan

## Product direction
NexusEmail stays free/open-source, but Segbytes will also run a hosted instance for client organizations.

## Hosted requirements
- Segbytes admin can create client organizations.
- Each organization has its own users.
- Domains, scans, integrations, settings, reports, and brand-protection data are scoped by organization.
- Users authenticate before accessing the dashboard/API.
- Production auth must connect to the WHMCS client login flow used on segbytes.co.za.

## Implemented first slice
- Local JWT auth.
- Seeded Segbytes admin tenant for development.
- Organization/user data model.
- Segbytes admin endpoint to create client organizations and first owner.
- Auth-required API routes.
- Tenant scoping across active JSON-backed data operations.
- Frontend login screen and bearer-token API calls.
- Production guardrails for JWT secret and first admin password.

## Production environment required
- `JWT_SECRET` or `NEXUSEMAIL_JWT_SECRET`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD` on first production boot
- `ALLOWED_ORIGINS` set to the hosted frontend URL

## Next implementation steps
1. Replace local email/password login with a WHMCS client-area login/session adapter.
2. Add client-organization provisioning from the Segbytes billing/client portal.
3. Add organization switch/admin UI for Segbytes staff.
4. Move JSON storage to Postgres/SQLite before serious multi-client production use.
5. Add audit logs for login, domain changes, provider credentials, and remediation actions.

## Employee delegation model
Use agency-agents as Segbytes employees for this work:
- Software Architect: tenancy/auth architecture review.
- Backend Architect: org/user/data isolation implementation.
- Frontend Developer: hosted login/client UI.
- Security Engineer: auth, tenant isolation, provider credential handling, audit logs.
- DevOps Automator: hosted deployment, envs, backups, health checks.
- Project Shepherd: execution board, milestones, blockers.


## WHMCS login direction
- WHMCS client login is the hosted NexusEmail source of truth.
- WHMCS client/contact identity maps to NexusEmail users.
- WHMCS client/account or active product service maps to NexusEmail organization.
- Hosted clients should not need a second NexusEmail password.
- Provisioning should eventually be driven by WHMCS product/service lifecycle events.

## Implemented WHMCS hosted slice
- `/api/whmcs/provision` creates/fetches an organization from WHMCS client/service payload and creates the first owner.
- `/api/whmcs/login-token` mints a NexusEmail session only from a server-side WHMCS-authorized call.
- `/api/whmcs/suspend`, `/unsuspend`, `/terminate`, `/status/:clientId` manage org lifecycle.
- WHMCS calls support bearer token auth and optional HMAC headers: `x-whmcs-timestamp`, `x-whmcs-nonce`, `x-whmcs-signature`.
- `AUTH_MODE=whmcs` blocks normal client password login; platform admin remains available as break-glass/admin path.
- Platform admin is separated from tenant owner/admin via `platform_role`.
- `NEXUSEMAIL_DATA_DIR` allows production data to live outside the deploy directory.
