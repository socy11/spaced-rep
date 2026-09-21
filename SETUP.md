# Setup — Firebase + GitHub Pages

## 1. Firebase
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

   Click **Publish**.

4. **Project settings (gear icon) → General → Your apps → `</>` (Web)** → register an app (any nickname, no need for Firebase Hosting) → copy the `firebaseConfig` object it shows you.
5. Paste those values into `firebase-config.js`, replacing the placeholders.

## 2. Deploy on GitHub Pages
1. Create a new public repo on GitHub.
2. Push/upload every file in this project to the repo root (keep the `icons/` folder structure — use GitHub Desktop or `git push` if the web upload UI won't take a whole folder).
3. Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main` / root → Save.
4. GitHub gives you a URL like `https://yourname.github.io/review-ledger/` — that's the link to share.

## About the sync code
The code students choose is **not a password** — it's a shared key so a device knows whose log to load, similar to a locker combination. Anyone who has (or guesses) a student's code could see or edit that student's log. For a maths log with no sensitive data, that's a reasonable trade-off for zero-signup simplicity. The next step up in security would be Firebase Authentication with real accounts.

## About the Firebase API key
The `apiKey` in `firebase-config.js` is not a secret credential — it identifies the project and is expected to live in public client-side code. Actual access control comes from the Firestore rules above. GitHub's secret-scanning may still flag it; that alert can be safely dismissed. Optionally, you can restrict the key to your domain in Google Cloud Console → APIs & Services → Credentials → the key → Application restrictions → Websites.

## Updating the app later
Edit files, push/re-upload to GitHub, and Pages updates automatically within a minute or two. Bump `CACHE_NAME` in `service-worker.js` (e.g. `v2`) whenever you change files, so devices that already installed the app pick up the update.
