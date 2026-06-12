# Cloudflare Workers deployment

The hosted build is a shared application:

- Cloudflare Access authenticates every user.
- D1 stores users, workspace roles, report metadata, versions, and audit events.
- R2 stores private JSON snapshots of every report version, including embedded files.
- The browser uses optimistic locking so an older tab cannot overwrite a newer save.
- Local client HTML exports remain read-only and do not connect to the cloud API.

## 1. Create Cloudflare resources

Create one D1 database and one private R2 bucket. Suggested names:

```text
D1: marketing-report-studio
R2: marketing-report-studio-reports
```

Apply `migrations/0001_init.sql` to the production D1 database. With Wrangler:

```powershell
npx wrangler d1 execute marketing-report-studio --remote --file=migrations/0001_init.sql
```

Use a different D1 database and R2 bucket for preview deployments.

## 2. Configure the Worker project

Connect the GitHub repository in Workers Builds and configure:

```text
Build command: npm run build
Deploy command: npx wrangler deploy
```

The tracked `wrangler.toml` builds `dist/`, serves it through Workers Static
Assets, and runs `worker.js` first for `/api/*` and the legacy application URL.

Add these exact production bindings either to `wrangler.toml` or through the
Cloudflare configuration used by the deployment:

```text
DB              -> the D1 database
REPORTS_BUCKET  -> the private R2 bucket
```

Under environment variables add:

```text
ACCESS_TEAM_DOMAIN     = https://your-team.cloudflareaccess.com
ACCESS_AUD             = the Access application's AUD tag
BOOTSTRAP_OWNER_EMAIL  = email of the first workspace owner
```

Redeploy after adding or changing bindings.

## 3. Configure Cloudflare Access

Create a self-hosted Access application for the production Worker hostname or
custom domain. Allow only the required users or identity-provider groups and
require MFA where appropriate. Protect preview deployments too.

The API validates the `Cf-Access-Jwt-Assertion` signature, issuer, expiration,
and application audience. Access authentication alone is not enough: D1 roles
also control each write.

The first authenticated request from `BOOTSTRAP_OWNER_EMAIL` creates the default
workspace and owner membership. Other authenticated users receive `403` until
the owner adds their email with the `Користувачі` button. They must also be allowed
by the Cloudflare Access policy.

Roles:

```text
owner   edit reports and manage users
editor  edit reports
viewer  read reports only
```

## 4. Build behavior

```powershell
npm.cmd run build
```

The build creates:

- `dist/index.html`, with empty embedded `reportData`
- `dist/_headers`, with CSP and other browser security headers
- `dist/_routes.json`, retained for optional Pages compatibility
- `dist/robots.txt`
- `dist/marketing_report_studio_v8_access_folders_fixed.html`, preserving the
  existing public route

Never publish the repository root as the Pages output directory. The real report
is loaded from R2 only after Access and workspace authorization succeed.

## 5. Local development

Copy `wrangler.toml.example` to `wrangler.toml`, fill in development resource IDs,
and copy `.dev.vars.example` to `.dev.vars`. `LOCAL_DEV_EMAIL` bypasses Access only
when the request hostname is localhost or `127.0.0.1`.

Build first, then run Pages locally through Wrangler. Apply the same migration to
the local or development D1 database before opening the application.

## Security notes

- Do not put API tokens, service-token secrets, or credentials in HTML or Git.
- R2 must remain private; report objects are returned only through the authorized API.
- Hosted mode does not persist report contents in localStorage, preventing one Access
  user from inheriting another user's browser cache on a shared machine.
- Every successful create/update and membership change is written to `audit_log`.
- Old R2 report versions are retained for recovery. Add a retention policy when the
  desired history period is known.
- A downloaded client HTML disables editing in the application UI. Like any local
  file, a technically skilled recipient can still modify its source; it is not a
  cryptographically tamper-proof document.
