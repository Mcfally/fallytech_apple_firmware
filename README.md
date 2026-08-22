# FallyTech Apple Firmware Website

A practical Node.js + Express website that uses the IPSW.me API as the Apple firmware data source.

## Requirements
- Node.js 18+ (Node 20+ recommended)
- Internet connection

## Run locally

```bash
npm install
npm start
```

Open:

http://localhost:3000

## How it works

Browser → `/api/devices` → IPSW.me API

Browser → `/api/firmware/:identifier` → IPSW.me API

The backend acts as a controlled proxy so your frontend does not need to call the third-party API directly.

The download button uses the firmware URL returned by IPSW.me. IPSW.me states that it does not mirror Apple firmware files; Apple download links redirect to Apple servers.

## Production

Deploy the Node/Express application to a Node-compatible host such as Render, Railway, Fly.io, VPS, or another Node hosting provider.

Do not put secrets in `public/app.js`. If you later add customer accounts, payments, admin controls, or provider API keys, keep those credentials in server environment variables.
