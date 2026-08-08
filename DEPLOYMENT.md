# 🚀 Personal Finance Tracker — Production Deployment Documentation

This guide provides step-by-step instructions for deploying the **Personal Finance Tracker** full-stack web application to production.

---

## 🏗️ Architecture Overview

- **Frontend**: Single Page Application (HTML5, Vanilla CSS, Modular JavaScript ES6, Chart.js) deployed on **Vercel**.
- **Backend API**: Node.js & Express RESTful API with Helmet, Rate Limiting, Input Sanitization, and Compression deployed on **Render**.
- **Database**: **MongoDB Atlas** (Managed Cloud Database).
- **Authentication**: JWT (JSON Web Tokens) with `bcryptjs` salted password hashing.

---

## 🍃 Step 1: Prepare MongoDB Atlas Database

1. Log into your [MongoDB Atlas Console](https://www.mongodb.com/cloud/atlas).
2. Create a new Cluster (Free Shared Tier `M0` or Serverless/Dedicated).
3. Under **Database Access**, create a database user:
   - **Username**: `fintrack_user`
   - **Password**: `<generate-secure-password>`
   - **Role**: `Read and write to any database`
4. Under **Network Access**, add IP Access List entry:
   - Add `0.0.0.0/0` (Allows access from cloud providers like Render).
5. Click **Connect** → **Drivers (Node.js)** to get your connection string:
   ```text
   mongodb+srv://fintrack_user:<password>@cluster0.abcde.mongodb.net/finance_tracker?retryWrites=true&w=majority
   ```

---

## ⚙️ Step 2: Deploy Backend API to Render

1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Web Service**.
3. Connect your GitHub / GitLab repository containing this project.
4. Fill in the service configuration:
   - **Name**: `personal-finance-tracker-api`
   - **Region**: Select closest to your users (e.g., Oregon / Frankfurt).
   - **Branch**: `main`
   - **Root Directory**: `.`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add the following **Environment Variables** under the **Environment** tab:

   | Key | Example Value | Description |
   |:---|:---|:---|
   | `NODE_ENV` | `production` | Enables production optimizations & error handling |
   | `PORT` | `10000` | Port assigned by Render |
   | `MONGO_URI` | `mongodb+srv://fintrack_user:SECRET@cluster0.mongodb.net/finance_tracker?retryWrites=true&w=majority` | MongoDB Atlas URI |
   | `JWT_SECRET` | `a_very_long_64_character_random_secret_string_here_2026` | Secret key for signing JWTs |
   | `ALLOWED_ORIGINS` | `https://your-app-name.vercel.app,http://localhost:5000` | Cross-origin access whitelist |

6. Click **Create Web Service**. Note your deployment URL (e.g., `https://personal-finance-tracker-api.onrender.com`).
7. Verify backend health by visiting `https://personal-finance-tracker-api.onrender.com/api/v1/health` in your browser.

---

## 🎨 Step 3: Deploy Frontend to Vercel

1. Log into your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository.
4. Configure Project Settings:
   - **Framework Preset**: `Other`
   - **Root Directory**: `./` (or leave default)
   - **Build Command**: leave empty (Static SPA)
   - **Output Directory**: `./`
5. (Optional) If connecting directly to your Render backend via environment variable:
   - In `client/index.html` head section or window configuration script:
     ```html
     <script>window.API_BASE_URL = "https://personal-finance-tracker-api.onrender.com/api/v1";</script>
     ```
   - Alternatively, Vercel's `vercel.json` automatically proxies `/api/*` routes to your Render backend host!
6. Click **Deploy**. Vercel will build and assign a domain (e.g., `https://personal-finance-tracker.vercel.app`).

---

## 🔒 Step 4: Configure CORS & Security Handshake

1. Return to your **Render Dashboard** -> `personal-finance-tracker-api`.
2. Update the `ALLOWED_ORIGINS` environment variable to include your new Vercel domain:
   ```text
   ALLOWED_ORIGINS=https://personal-finance-tracker.vercel.app
   ```
3. Save changes — Render will automatically trigger a zero-downtime redeploy.

---

## ✅ Step 5: Post-Deployment Verification Checklist

- [ ] Visit frontend URL: `https://personal-finance-tracker.vercel.app`
- [ ] Test User Registration: Create a new account with email & password.
- [ ] Test User Login: Confirm token is stored and redirects to Dashboard.
- [ ] Test Expenses CRUD: Create income, create expense, edit entry, delete entry.
- [ ] Test Budgets: Set monthly category cap, verify spending progress bar updates automatically.
- [ ] Test Dashboard Charts: Verify Chart.js daily trend line chart, category pie chart, and monthly bar chart load dynamically.
- [ ] Test Financial Tips: Use search bar and category pills.
- [ ] Test User Profile: Change currency, monthly income target, avatar emoji preset, and update password.
- [ ] Test Dark/Light Theme Switcher in top navigation bar.

---

## 🛠️ Local Development & Maintenance

```bash
# Clone repository
git clone https://github.com/your-username/fullstack_mjp1.git

# Install dependencies
npm install

# Set up local .env file (copy from .env.example)
cp .env.example .env

# Run development server with auto-reload
npm run dev

# Run automated integration test suite (in-memory MongoDB)
node test-all.js
```
