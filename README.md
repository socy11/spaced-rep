# Review Ledger — setup

## 1. Firebase (5 min)
1. https://console.firebase.google.com → **Add project** → name it → skip Analytics.
2. **Build → Firestore Database → Create database** → **production mode** → pick a nearby region.
3. **Build → Firestore Database → Rules** tab → replace the contents with:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /students/{pin} {
         allow read, write: if true;
       }
     }
   }
   ```

   Click **Publish**. (See "About the sync code" below for what this trade-off means.)

4. **Project settings (gear icon) → General → Your apps → `</>` (Web)** → register an app (any nickname, don't need Firebase Hosting) → copy the `firebaseConfig` object it shows you.
5. Paste those values into `firebase-config.js` in this folder, replacing the `PASTE_...` placeholders.

## 2. Deploy on GitHub Pages (5 min)
1. Create a new repo on GitHub (e.g. `review-ledger`), public.
2. Upload every file in this folder to the repo root (keep the `icons/` folder structure).
3. Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main` / root → Save.
4. GitHub gives you a URL like `https://yourname.github.io/review-ledger/` — that's the link to send students.

## 3. Give it to students
Send them the GitHub Pages link. First time they open it, they'll be asked to create a sync code — that's what lets their phone and PC show the same log. On mobile, their browser will usually offer "Add to Home Screen"; that's what makes it feel like an installed app.

## About the sync code
The code is **not a password** — it's just a shared key so a device knows whose log to load, similar to a locker combination. Anyone who has (or guesses) a student's code could see or edit that student's log. For a maths tutoring log with no sensitive personal data, that's a reasonable trade-off for zero-signup simplicity. If that ever stops being acceptable (e.g. you want real accounts), the next step up is adding Firebase Authentication — a bigger change, happy to help with that later if needed.

## Updating the app later
Edit files locally, re-upload to GitHub (or `git push`), and GitHub Pages updates automatically within a minute or two. Bump `CACHE_NAME` in `service-worker.js` (e.g. `v2`) whenever you change files, so devices that already installed the app pick up the update.
