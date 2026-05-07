# The Approvals Atlas v4 — SDA Permit Pathway Portal

## What's new in v4

- **Proper duplex subdivision flow** — choose "Proposed", "Approved" or "Already titled" status, then enter the parent lot size (when relevant) followed by both subdivided lots
- **Smart subdivision validation** — checks that the parent lot meets the state's minimum (800m² in QLD) and each subdivided lot meets the minimum subdivided lot size (~400m² QLD)
- **Click-to-jump wizard navigation** — click any step number in the progress bar to jump directly to that step
- **Edit Project button** — re-enter the wizard at any time to change anything (project name, type, lots, SDA config)
- **Subdivision status tracking** — distinguishes between proposed, approved-but-not-titled, and already-titled lots

## Quick start

```bash
npm install
npm run dev
```

Opens at http://localhost:5173

## Deploy to Railway

Push to GitHub, connect repo to Railway, auto-deploys.

## Storage

v4 uses its own localStorage key (`sda-projects-v4`) so previous version projects won't appear. Each version is isolated.
