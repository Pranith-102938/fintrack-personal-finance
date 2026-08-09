# FinTrack — Personal Finance Tracker

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v4.19-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-brightgreen.svg)](https://mongoosejs.com/)
[![Tests](https://img.shields.io/badge/Tests-155%2F155%20Passed-brightgreen.svg)]()
[![Production](https://img.shields.io/badge/Production-Render-blue.svg)](https://fintrack-personal-finance.onrender.com)

FinTrack is a full-stack personal finance web application designed to empower users to take control of their financial health. It provides intuitive tools for tracking income and expenses, setting category budget limits, analyzing spending trends with interactive charts, generating exportable financial reports, and receiving actionable financial advice—all backed by robust security, responsive accessibility, and user data isolation.

🔗 **Live Production Deployment**: [https://fintrack-personal-finance.onrender.com](https://fintrack-personal-finance.onrender.com)

---

## 🌟 Application Views & Key Features

### 🏠 1. Home Launchpad Overview (View: `#home`)
Personalized financial hub serving distinct views for guest visitors and authenticated users:
- **Guest Landing Page**: Highlights core value propositions, feature summaries, and quick authentication CTA buttons.
- **Personal Finance Launchpad**:
  - **Welcome Header**: Greeting display card with current user display name.
  - **Quick Snapshot Metrics**: 3 summary cards showing Net Balance, This Month's Savings, and Total Recorded Transactions.
  - **Quick Action Grid**: One-tap shortcuts to Add Income, Add Expense, Set Budget, and View Reports.
  - **Recent Activity Feed**: Real-time view of recent financial transactions.
  - **Financial Tip Spotlight**: Dynamic featured advisory card with direct link to full tips section.
  - **Detailed Dashboard Banner**: Direct CTA navigation to the full analytics dashboard.

### 📊 2. Detailed Analytics Dashboard (View: `#dashboard`)
In-depth data analytics workspace providing detailed metrics and interactive visualizations:
- **8 Key Financial Metric Cards**:
  - **Primary**: Monthly Income, Monthly Expenses, Weekly Expenses, Today's Expenses.
  - **Secondary**: Net Savings, Savings Rate (%), Avg Daily Spending, Highest Single Expense.
- **Interactive Chart.js Visualizations**:
  - **Daily Spending Trend**: 30-day cash flow line chart.
  - **Category Breakdown**: Interactive expense distribution pie chart.
  - **6-Month Comparative Bar Chart**: Historical monthly income vs. expense comparison.
- **Recent Transactions Table**: Live summary table of recent activity.
- **Category Budget Health Progress**: Real-time category spending progress bars with warning and exceeded threshold indicators.

### 💳 3. Transactions & Expense Management (View: `#expenses`)
- Full CRUD management for income and expense transactions.
- Filter records by category, transaction type (income/expense), and custom date ranges.
- Search by description or category name with real-time multi-column sorting (date, amount).

### 🎯 4. Category Budgets & Overspending Alerts (View: `#budgets`)
- Set custom monthly spending caps for individual categories (e.g., Groceries, Rent, Utilities, Entertainment).
- Automatic color-coded visual progress indicators (`Good Health`, `Warning`, `Exceeded`).
- Category summary bar displaying Total Budget, Total Spent, Remaining Balance, and Exceeded category count.

### 📈 5. Reports & Data Export (View: `#reports`)
- Filter financial metrics across preset ranges (*This Month, Last Month, Last 3 Months, Year to Date*) or custom date ranges.
- Export transaction summaries directly to **CSV** or generate **Print/PDF-friendly** report formats.

### 💡 6. Financial Advisory & Wisdom (View: `#tips`)
- Expert financial tips and advice organized by category tags (Budgeting, Emergency Fund, Saving, Investing).
- Search advice topics and view a highlighted "Daily Financial Tip".

### 👤 7. User Profile & Settings (View: `#profile`)
- Customize user display name, preferred currency (**USD `$`, EUR `€`, GBP `£`, INR `₹`**), and monthly target income.
- Update avatar presets or securely change user account password.

---

## 🛠️ Tech Stack

### Frontend
- **Structure & Logic**: HTML5 (Accessible Semantic Layout), Vanilla JavaScript (ES6+ Native Modules)
- **Styling**: Vanilla CSS3 (Custom Design System with CSS Variables and Light/Dark Mode)
- **Data Visualization**: [Chart.js](https://www.chartjs.org/) (v4 via CDN)
- **Accessibility**: Keyboard focus rings, Skip-to-main link, ARIA landmarks & modal dialog attributes

### Backend
- **Runtime Environment**: [Node.js](https://nodejs.org/) (v18+)
- **Web Framework**: [Express.js](https://expressjs.com/) (v4.19)
- **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose ODM](https://mongoosejs.com/) (v8.4)
- **Development Database**: Integrated [`mongodb-memory-server`](https://github.com/nodemodule/mongodb-memory-server) fallback for zero-config local development and testing.

### Security
- **Authentication**: Stateless JSON Web Tokens (`jsonwebtoken`)
- **Password Hashing**: `bcryptjs` (10 salt rounds)
- **Security Middleware**: `helmet`, `express-mongo-sanitize`, `express-rate-limit`, `cors`, `express-validator`

---

## 📁 Project Structure

```text
fintrack-personal-finance/
├── client/                     # Frontend Static Web Application
│   ├── assets/                 # Brand assets & SVG favicon
│   ├── css/                    # Modular CSS stylesheets (main.css, components.css, dashboard.css)
│   ├── data/                   # Financial advice static JSON content
│   ├── js/                     # Modular JS (api, auth, budgets, charts, dashboard, expenses, home, profile, reports, router, theme, tips, ui, app)
│   └── index.html              # Main Single-Page Application HTML shell
├── config/                     # Backend database connection configuration
├── controllers/                # Business logic handlers (auth, budget, dashboard, report, transaction)
├── middleware/                 # Express middleware (auth, rateLimiter, validate, errorHandler)
├── models/                     # Mongoose schemas (User, Transaction, Budget)
├── routes/                     # REST API routes (auth, budget, dashboard, report, transaction)
├── utils/                      # Helper utilities (date formatting)
├── .env.example                # Safe environment configuration template
├── DEPLOYMENT.md               # Render production deployment guide
├── package.json                # Project dependencies and script definitions
├── server.js                   # Express server entrypoint
├── test-all.js                 # Integration & API test suite (133 assertions)
└── test-smoke.js               # End-to-End browser smoke test suite (22 assertions)
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: Version 18.x or higher installed.
- **npm**: Node package manager.

### Installation & Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Pranith-102938/fintrack-personal-finance.git
   cd fintrack-personal-finance
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a local `.env` file based on the provided `.env.example` template:
   ```bash
   cp .env.example .env
   ```

4. **Start the Application**:
   - **Development Mode** (with automatic server restart via Nodemon and in-memory MongoDB fallback):
     ```bash
     npm run dev
     ```
   - **Production Mode**:
     ```bash
     npm start
     ```

5. **Open in Browser**:
   Navigate to **`http://localhost:5000`** in your browser.

---

## 🔑 Environment Variables

Configure environment settings in a local `.env` file. Safe default values:

```env
# Server Network Configuration
PORT=5000
NODE_ENV=development

# Database Connection String
# In development, if MONGO_URI is omitted or unavailable, an in-memory MongoDB instance will automatically start.
MONGO_URI=mongodb://localhost:27017/finance_tracker

# JWT Authentication Secret Key
JWT_SECRET=your_jwt_secret_key_here
```

> ⚠️ **SECURITY NOTE**: Real secrets and credentials must never be committed to version control. The repository `.gitignore` is configured to exclude all `.env*` files automatically.

---

## 🛡️ Security Implementation

- **Password Protection**: Hashed using `bcryptjs` with 10 salt rounds.
- **Route Authorization**: Endpoints verify JWT bearer tokens via `auth.middleware.js`.
- **Query Sanitization**: Requests pass through `express-mongo-sanitize` to block NoSQL injection.
- **Rate Limiting**: Auth & password change endpoints enforce rate limiting to mitigate brute-force risks.
- **Strict Data Isolation**: Mongoose queries explicitly scope data retrieval to `userId: req.user._id`, guaranteeing cross-account isolation.
- **XSS Defense**: DOM outputs sanitized via `escapeHtml()` utility across all template strings.
- **Production CORS**: Configured to restrict origin requests strictly to the live production frontend domain (`https://fintrack-personal-finance.onrender.com`).

---

## 🧪 Testing Infrastructure

The repository features a two-tier automated testing suite:

```bash
# Run both Integration and E2E Browser Smoke tests
npm test

# Run In-Memory API & Integration Test Suite (133 assertions)
npm run test:all

# Run E2E Headless Browser Smoke Test Suite (22 assertions)
npm run test:smoke
```

### Test Results
- **Total Assertions Executed**: **155 Assertions**
- **Passing Status**: **155 / 155 Passed (100%)**
- **Test Coverage**:
  - `test-all.js` (133 Assertions): Health check, registration/login flow, JWT authentication, user isolation, transaction CRUD & filtering, budget calculations, dashboard analytics, route protection, input validation, static file serving, XSS escaping, and CORS preflight verification.
  - `test-smoke.js` (22 Assertions): Real browser automation testing full E2E user registration, login, view routing, expense creation, budget card rendering, report loading, session refresh persistence, responsive mobile sidebar interactions (hamburger open, X button close, backdrop click close, nav item navigation close), and zero-dialog XSS security checks.

---

## 🌐 Production Deployment

- **Hosting Platform**: [Render](https://render.com/)
- **Live URL**: [https://fintrack-personal-finance.onrender.com](https://fintrack-personal-finance.onrender.com)
- **Deployment Guide**: Detailed production environment and Render configuration steps are documented in [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## 📄 License

This project is open for educational and personal finance tracking purposes.

---

## 👤 Author

**Pranith**  
GitHub: [@Pranith-102938](https://github.com/Pranith-102938)
