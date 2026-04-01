# BOSS Foundation — Full Setup & Deployment Guide

## ✅ What's Built

A full internship management portal with:
- **Super Admin** — manages admins, all interns, tasks, journals, reviews
- **Admin** — manages their interns, assigns tasks, reviews journals
- **Intern** — submits daily journals (with Drive link), views tasks, downloads offer letter
- Firebase Auth + Firestore backend
- Netlify deployment

---

## STEP 1 — Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click **"Add project"** → Name it `boss-foundation`
3. Disable Google Analytics (optional) → **Create project**

### Enable Authentication
1. Left menu → **Authentication** → **Get started**
2. **Sign-in method** tab → Enable **Email/Password** → Save

### Create Firestore Database
1. Left menu → **Firestore Database** → **Create database**
2. Choose **"Start in production mode"** → Pick region (e.g., `asia-south1` for India) → **Done**

### Get Firebase Config
1. Project Settings (gear icon) → **General** tab
2. Scroll to **"Your apps"** → Click **"</>"** (Web app)
3. Register app name: `boss-foundation-web` → **Register app**
4. Copy the `firebaseConfig` object — you'll need it in Step 3

---

## STEP 2 — Create Super Admin Account in Firebase

1. In Firebase Console → **Authentication** → **Users** tab
2. Click **"Add user"**
3. Email: `vijey.prasanna@devverse1.in`
4. Password: `vjy24@#1234`
5. Click **Add user** ✅

> The app recognizes this email as super admin automatically — no database entry needed.

---

## STEP 3 — Set Up the Code

### Install Node.js
Download from https://nodejs.org (LTS version)

### Get the project files
All files are in the `boss-foundation/` folder. Place your `favicon.jpg` inside the `public/` folder.

### Configure Firebase
Open `src/firebase.js` and replace the placeholder config:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",           // from Firebase Console
  authDomain: "boss-foundation.firebaseapp.com",
  projectId: "boss-foundation",
  storageBucket: "boss-foundation.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### Install dependencies
Open terminal in the `boss-foundation/` folder:
```bash
npm install
```

### Test locally
```bash
npm start
```
Open http://localhost:3000 — login with super admin credentials.

---

## STEP 4 — Deploy Firestore Security Rules

### Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Login & deploy rules
```bash
firebase login
firebase use --add    # select your boss-foundation project
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## STEP 5 — Build & Deploy to Netlify

### Build the app
```bash
npm run build
```
This creates a `build/` folder.

### Deploy to Netlify

**Option A — Netlify CLI (Recommended)**
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=build
```

**Option B — Netlify Dashboard (Drag & Drop)**
1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Deploy manually"**
3. Drag and drop your **`build/`** folder into the upload zone
4. Your site is live! ✅

**Option C — GitHub Auto-Deploy**
1. Push code to a GitHub repo
2. Netlify → **"Import from Git"** → Connect GitHub
3. Build command: `npm run build`
4. Publish directory: `build`
5. Every push auto-deploys ✅

---

## STEP 6 — First Login & Setup

1. Open your Netlify URL
2. Login: `vijey.prasanna@devverse1.in` / `vjy24@#1234`
3. You'll see the **Super Admin Dashboard**

### Add your first Admin:
1. Sidebar → **Admins** → **Add Admin**
2. Fill name, email, password, team, start/end date
3. The admin can now login with those credentials

### Add Interns (as Admin or Super Admin):
1. Sidebar → **Interns** → **Add Intern**
2. Fill all details including start & end date
3. A unique NIN is auto-generated
4. Intern logs in and can download their offer letter

---

## 📁 Project File Structure

```
boss-foundation/
├── public/
│   ├── index.html
│   ├── favicon.jpg         ← PUT YOUR LOGO HERE
│   └── _redirects          ← Netlify SPA routing
├── src/
│   ├── contexts/
│   │   └── AuthContext.js   ← Login/logout/role detection
│   ├── components/
│   │   ├── Sidebar.js       ← Navigation sidebar
│   │   └── Layout.js        ← Page wrapper
│   ├── pages/
│   │   ├── Login.js         ← Login page
│   │   ├── Dashboard.js     ← Role-based dashboard
│   │   ├── Admins.js        ← Super admin: manage admins
│   │   ├── Interns.js       ← Admin/SA: manage interns
│   │   ├── Tasks.js         ← Admin/SA: assign tasks
│   │   ├── Journal.js       ← Intern: submit daily journals
│   │   ├── Journals.js      ← Admin/SA: review journals
│   │   ├── MyTasks.js       ← Intern: view/update tasks
│   │   ├── Profile.js       ← Intern: profile + offer letter
│   │   ├── Reviews.js       ← Admin/SA: weekly reviews
│   │   └── Pending.js       ← Pending approval screen
│   ├── firebase.js          ← Firebase config ⚠️ EDIT THIS
│   ├── App.js               ← Routes & auth guards
│   ├── index.js             ← Entry point
│   └── index.css            ← Full design system
├── firestore.rules          ← Security rules
├── firestore.indexes.json   ← DB indexes
├── firebase.json            ← Firebase project config
└── package.json
```

---

## 🔐 Role Access Matrix

| Feature                     | Super Admin | Admin | Intern |
|-----------------------------|:-----------:|:-----:|:------:|
| Manage Admins               | ✅          | ❌    | ❌     |
| Approve/Terminate Admins    | ✅          | ❌    | ❌     |
| Add Interns                 | ✅          | ✅    | ❌     |
| Cancel Internship           | ✅          | ✅    | ❌     |
| Assign Tasks (all/team)     | ✅          | ✅    | ❌     |
| Assign Tasks (individual)   | ✅          | ✅    | ❌     |
| View All Journals           | ✅          | ✅*   | ❌     |
| Remark on Journals          | ✅          | ✅*   | ❌     |
| Submit Daily Journal        | ❌          | ❌    | ✅     |
| View Own Tasks              | ❌          | ❌    | ✅     |
| Update Task Status          | ❌          | ❌    | ✅     |
| Download Offer Letter       | ❌          | ❌    | ✅     |
| Weekly Reviews              | ✅          | ✅    | ❌     |

*Admins only see journals from interns assigned to them

---

## 🔄 How Journal Review Chain Works

```
Intern submits DJ
      ↓
Admin reviews & adds remark (Approve/Reject)
      ↓
Super Admin can also add a remark on top
      ↓
Intern sees both remarks on their journal
```

---

## ⚠️ Important Notes

1. **Intern data is retained** even after cancellation — tenure end date controls visibility
2. **Offer letter is downloadable** only after the tenure start date
3. **No self-registration** — only admins/superadmin can create accounts
4. **Tasks persist per intern UID** — even if profile is cancelled
5. When tenure ends, intern login still works but data is read-only

---

## 🛠 Troubleshooting

| Problem | Solution |
|---------|----------|
| White screen after deploy | Check `public/_redirects` file exists |
| Login fails | Verify Firebase Auth email/password enabled |
| Firestore permission denied | Deploy `firestore.rules` via Firebase CLI |
| Data not loading | Deploy `firestore.indexes.json` |
| Offer letter not downloading | Check jsPDF is installed (`npm install jspdf jspdf-autotable`) |
| Page 404 on refresh | Netlify `_redirects` must be in `public/` folder |

---

## 📞 Support

For any issues during setup, check:
- Firebase Console logs: https://console.firebase.google.com
- Netlify deploy logs: https://app.netlify.com
- Browser console (F12) for JavaScript errors
