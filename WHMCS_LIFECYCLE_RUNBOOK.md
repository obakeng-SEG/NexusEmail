# WHMCS Lifecycle Runbook - Nexus Brand Protection

## Current production endpoints

- Frontend: `https://brandprotection.segbytes.co.za`
- API base: `https://api.brandprotection.segbytes.co.za/api`
- Health: `https://api.brandprotection.segbytes.co.za/api/health`

## WHMCS product configuration

In WHMCS Admin, go to **System Settings -> Products/Services** and create or edit the hosted product:

- Product name: `Nexus Brand Protection`
- Product type: Server Module
- Module name: `Nexus Brand Protection`
- API Base URL: `https://api.brandprotection.segbytes.co.za/api`
- API Token: must match the VM `WHMCS_API_TOKEN` / `NEXUSEMAIL_WHMCS_API_TOKEN`
- Default Plan: `starter` unless another package is intentionally being tested

Recommended module automation:

- Auto setup after first payment received, or manual create for initial dummy testing.
- Suspend can map to WHMCS overdue/non-payment automation.
- Terminate should only be enabled when cancellation should mark the Nexus organization as cancelled.

## Expected WHMCS server files

The module code expects:

```text
/srv/segbytes/whmcs/modules/servers/nexusbrandprotection/nexusbrandprotection.php
/srv/segbytes/whmcs/modules/servers/nexusbrandprotection/templates/clientarea.tpl
```

Read-only verification:

```bash
php -l /srv/segbytes/whmcs/modules/servers/nexusbrandprotection/nexusbrandprotection.php
find /srv/segbytes/whmcs/modules/servers/nexusbrandprotection -maxdepth 3 -type f | sort
```

## Dummy order lifecycle test

Use a disposable WHMCS client/service only.

1. Create dummy WHMCS client.
2. Place order for `Nexus Brand Protection`.
3. Accept the order or manually run module **Create**.
4. Confirm module command returns success.
5. Open the client-area service page.
6. Click **Open Nexus Brand Protection**.
7. Confirm redirect to `https://brandprotection.segbytes.co.za?token=...`.
8. Confirm the frontend exchanges the token and signs in.
9. Run module **Suspend**.
10. Run module **Unsuspend**.
11. Run module **Terminate** only for the disposable dummy service.
12. Review WHMCS Module Log and confirm tokens are not exposed.

## Backend lifecycle endpoints

The WHMCS server module calls:

- `POST /api/whmcs/provision`
- `POST /api/whmcs/suspend`
- `POST /api/whmcs/unsuspend`
- `POST /api/whmcs/terminate`
- `POST /api/whmcs/login-token`
- `GET /api/whmcs/status/:clientId`

Payloads use WHMCS `clientId`, `serviceId`, company/admin fields, and selected `plan`.
