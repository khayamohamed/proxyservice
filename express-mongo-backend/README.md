# Express + MongoDB Backend

Backend REST for provider verification, client management and dynamic listing.

## Project structure

- `server.js`
- `config/db.js`
- `config/multer.js`
- `middleware/validateAdult.js`
- `models/Prestataire.js`
- `models/Client.js`
- `models/Commande.js`
- `controllers/*.js`
- `routes/*.js`
- `uploads/`

## Setup

```bash
npm install
copy .env.example .env
npm run dev
```

Default API: `http://localhost:5000`

## Blockchain configuration (EVM)

Set these variables in `.env` to write real identification records on-chain:

- `BLOCKCHAIN_NETWORK` (example: `sepolia`)
- `BLOCKCHAIN_RPC_URL` (RPC endpoint)
- `BLOCKCHAIN_PRIVATE_KEY` (wallet private key used to send tx)
- `BLOCKCHAIN_TARGET_ADDRESS` (optional destination address, defaults to signer wallet)
- `BLOCKCHAIN_EXPLORER_BASE_URL` (example: `https://sepolia.etherscan.io/tx`)
- `BLOCKCHAIN_REQUIRED` (`true` to fail API request if chain write fails)
- `BLOCKCHAIN_WAIT_CONFIRMATION` (`true` to wait 1 block confirmation)

If `BLOCKCHAIN_RPC_URL` and `BLOCKCHAIN_PRIVATE_KEY` are empty, the API uses a simulated tx hash fallback.

## Email notification configuration (provider inbox)

When a client confirms an order (`POST /commandes`), the backend sends an email to the provider.

Set these variables in `.env`:

- `SMTP_HOST` (example: `smtp.gmail.com`)
- `SMTP_PORT` (example: `587` or `465`)
- `SMTP_SECURE` (`true` for SSL, usually with port `465`; otherwise `false`)
- `SMTP_USER` (SMTP account username/email)
- `SMTP_PASS` (SMTP password/app password)
- `SMTP_FROM` (sender email shown in notifications; defaults to `SMTP_USER`)

If SMTP is not configured, the order is still created and the backend logs the email failure reason.

## Main routes

### Provider

- `POST /prestataires/inscription` (multipart/form-data)
  - fields: `nom`, `prenom`, `email`, `telephone`, `categorie`, `dateDeNaissance`
  - files: `cinImage`, `casierImage`
  - default status: `en_attente`

- `GET /prestataires?categorie=plomberie`
  - returns only providers with `statutVerification = valide`

### Client

- `POST /clients/inscription` (multipart/form-data)
  - fields: `nom`, `prenom`, `email`, `telephone`
  - file: `cinImage`

### Commande (MVP)

- `POST /commandes`
  - body: `clientId`, `prestataireId`, `service`, `statut` (optional)

### Admin

- `GET /admin/prestataires/en-attente`
- `PATCH /admin/prestataires/:id/valider-entretien`
- `PATCH /admin/prestataires/:id/refuser`
- `PATCH /admin/prestataires/:id/valider-fingerprint`
- `GET /admin/clients`
- `GET /admin/dashboard`

### Health

- `GET /health`

## Frontend fetch examples

### 1) Provider registration (with uploads)

```js
const formData = new FormData();
formData.append("nom", "Dupont");
formData.append("prenom", "Ali");
formData.append("email", "ali.dupont@example.com");
formData.append("telephone", "0600000000");
formData.append("categorie", "plomberie");
formData.append("dateDeNaissance", "1995-04-10");
formData.append("cinImage", cinFileInput.files[0]);
formData.append("casierImage", casierFileInput.files[0]);

await fetch("http://localhost:5000/prestataires/inscription", {
  method: "POST",
  body: formData
});
```

### 2) Client registration (with CIN upload)

```js
const formData = new FormData();
formData.append("nom", "Benali");
formData.append("prenom", "Sara");
formData.append("email", "sara@example.com");
formData.append("telephone", "0700000000");
formData.append("cinImage", cinClientFileInput.files[0]);

await fetch("http://localhost:5000/clients/inscription", {
  method: "POST",
  body: formData
});
```

### 3) Client side provider listing by category

```js
const response = await fetch("http://localhost:5000/prestataires?categorie=plomberie");
const data = await response.json();
console.log(data.prestataires);
```

### 4) Admin - pending providers list

```js
const response = await fetch("http://localhost:5000/admin/prestataires/en-attente");
const data = await response.json();
console.log(data.prestataires);
```

### 5) Admin - update status buttons

```js
await fetch(`http://localhost:5000/admin/prestataires/${id}/valider-entretien`, {
  method: "PATCH"
});

await fetch(`http://localhost:5000/admin/prestataires/${id}/refuser`, {
  method: "PATCH"
});

await fetch(`http://localhost:5000/admin/prestataires/${id}/valider-fingerprint`, {
  method: "PATCH"
});
```

### 6) Create commande

```js
await fetch("http://localhost:5000/commandes", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    clientId: "CLIENT_ID",
    prestataireId: "PRESTATAIRE_ID",
    service: "Reparation fuite"
  })
});
```

## Notes

- Provider visibility on client side is strictly limited to `statutVerification = valide`.
- Uploaded files are exposed through `/uploads/...`.
- Client/provider registrations store `blockchainHash` + blockchain tx metadata.
- Admin `valider-fingerprint` stores `fingerprintHash` + fingerprint blockchain tx metadata.
- Render auto-deploy triggers on changes inside `express-mongo-backend` when `rootDir` is set to this folder.
