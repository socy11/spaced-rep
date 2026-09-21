# Review Ledger

A spaced-repetition study log for maths tutoring students. Log a topic the day you learn it and the app schedules when to revise it again.

Built and installs as a Progressive Web App to work offline and syncs a student's log between their own devices via a personal sync code.

**Live app:** (https://socy11.github.io/spaced-rep/)

## How it works

Topics are reviewed at expanding intervals — 1, 3, 7, 14, 30, 60, then 90 days — based on Hermann Ebbinghaus's forgetting-curve research and the spaced intervals Piotr Woźniak derived from it for SuperMemo. The spacing effect itself (spaced practice outperforming cramming for long-term retention) is supported by Cepeda et al.'s 2006 meta-analysis in *Psychological Bulletin*.

## What's in this repo

| File | Purpose |
|---|---|
| `index.html` | App UI and structure |
| `app.js` | App logic: scheduling, rendering, Firebase sync |
| `firebase-config.js` | Firebase project connection details |
| `manifest.json` | PWA metadata (name, icons, install behaviour) |
| `service-worker.js` | Offline caching of the app shell |
| `icons/` | App icons for home-screen install |
| `SETUP.md` | Step-by-step Firebase + GitHub Pages setup, for anyone redeploying this |

## Data & privacy

Each student's log is stored in Firestore, keyed to a sync code they choose themselves — no accounts, no personal data collected beyond what a student types in. The code functions as a shared key rather than a password; see `SETUP.md` for details on that trade-off.

## Credit

This project was built with the assistance of Claude (Anthropic).
