# Jenga Capital Backend

## Requirements

- Node.js 18 or newer
- npm

## Run locally

```powershell
npm install
npm start
```

Open `http://localhost:3000`. The SQLite database is created automatically as `jenga-capital.sqlite`.

The protected admin dashboard is at `http://localhost:3000/admin.html`. Set `ADMIN_PASSWORD` in your environment before starting the server:

```powershell
$env:ADMIN_PASSWORD = "use-a-long-private-password"
npm start
```

The dashboard shows all registered applicants, filters by application status, and supports rejecting applications. Approval is enforced by the backend and is available only after the registration fee has been verified as paid.

The API health check is available at `GET /api/health`. Loan applications are submitted to `POST /api/applications` and are stored with either `fee_required` or `not_qualified` status.

## Important payment note

The KSh 300 registration-fee endpoint intentionally returns a configuration error until a verified M-Pesa or card provider is integrated. Do not mark an application paid from the browser or accept payment references without verifying them through the provider webhook/API.

The initial qualification rule is currently a placeholder: requested amounts from KSh 1,000 through KSh 1,000,000 qualify for the fee step. Replace `isQualified` in `server.js` with Jenga Capital's approved lending criteria before going live.