# FinTrack — Personal Finance Tracker

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v4.19-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-brightgreen.svg)](https://mongoosejs.com/)
[![License](https://img.shields.io/badge/License-Unspecified-gray.svg)]()

FinTrack is a full-stack personal finance web application designed to empower users to take control of their financial health. It provides intuitive tools for tracking income and expenses, setting category budget limits, analyzing spending trends with interactive charts, generating exportable financial reports, and receiving actionable financial advice—all backed by robust security and data isolation.

---

## 🌟 Key Features

- 📊 **Interactive Financial Dashboard**: Instant overview of key metrics including monthly income, monthly expenses, weekly spending, today's spending, net savings, savings rate (%), average daily spend, and highest single expense.
- 💳 **Transaction Management**: Easily log income and expense items with automatic category assignment, payment method tags, and local calendar date selection. Supports searching, date filtering, and multi-column sorting.
- 🎯 **Category Budgets & Overspending Alerts**: Set custom monthly spending caps for categories (e.g., Groceries, Rent, Entertainment). Track real-time progress bars with automatic warning and exceeded states.
- 📈 **Visual Analytics & Charting**: Dynamic Chart.js visualizations including a 30-day cash flow line chart and a category breakdown pie chart with interactive hover tooltips.
- 📄 **Reports & Data Export**: Filter financial records by custom date ranges and export formatted transaction summaries directly to **CSV** or generate **print/PDF-friendly** report pages.
- 💱 **Multi-Currency Support**: Seamless support for **USD (`$`)**, **EUR (`€`)**, **GBP (`£`)**, and **INR (`₹`)** formatted consistently across all UI cards, charts, and tables.
- 🔐 **Enterprise-Grade Security**: Built-in `bcryptjs` password hashing, Stateless JWT authentication, NoSQL query sanitization, password change rate limiting, and strict user data isolation.
- 📱 **Modern Fintech Interface**: Clean, responsive layout utilizing custom design tokens, dark mode compatibility, accessible typography with tabular number formatting, and an auto-closing mobile navigation drawer.
- 💡 **Actionable Financial Advice**: Curated financial tips feed categorised by budgeting, emergency funds, and savings strategies.

---

## 🖼️ Screenshots

> *Replace the placeholder paths below with your actual screenshot images when available.*

| Dashboard View | Reports & Analytics |
| :---: | :---: |
| ![Dashboard Overview](docs/screenshots/dashboard.png) | ![Reports & Analytics](docs/screenshots/reports.png) |

| Budget Management | Mobile View |
| :---: | :---: |
| ![Budget Management](docs/screenshots/budgets.png) | ![Mobile Drawer](docs/screenshots/mobile.png) |

---

## 🛠️ Tech Stack

### Frontend
- **Structure & Logic**: HTML5, Vanilla JavaScript (ES6+ Modules)
- **Styling**: Vanilla CSS3 (Custom Design System with CSS variables and Light/Dark theme support)
- **Data Visualization**: [Chart.js](https://www.chartjs.org/) (v4 via CDN)

### Backend
- **Runtime Environment**: [Node.js](https://nodejs.org/) (v18+)
- **Web Framework**: [Express.js](https://expressjs.com/) (v4.19)
- **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose ODM](https://mongoosejs.com/) (v8.4)
- **Development Database**: Integrated [`mongodb-memory-server`](https://github.com/nodemodule/mongodb-memory-server) fallback for zero-config local development without requiring a local MongoDB service.

### Security & Utilities
- **Authentication**: JSON Web Tokens (`jsonwebtoken`)
- **Password Hashing**: `bcryptjs`
- **Security Middleware**: `helmet`, `express-mongo-sanitize`, `express-rate-limit`, `cors`, `express-validator`

---

## 📁 Project Structure

```text
fintrack-personal-finance/
├── client/                     # Frontend Static Web Application
│   ├── assets/                 # Brand assets & SVG favicon
│   ├── css/                    # Modular CSS stylesheets (main.css, components.css, dashboard.css)
│   ├── data/                   # Financial advice static JSON content
│   ├── js/                     # Frontend JavaScript modules (api, auth, budgets, charts, dashboard, expenses, profile, reports, ui)
│   └── index.html              # Main Single-Page Application HTML shell
├── config/                     # Backend configuration (Database connection setup)
├── controllers/                # Business logic handlers (auth, budget, dashboard, report, transaction)
├── middleware/                 # Custom Express middleware (auth, rateLimiter, validate, errorHandler)
├── models/                     # Mongoose database schemas (User, Transaction, Budget)
├── routes/                     # REST API routes (auth, budget, dashboard, report, transaction)
├── utils/                      # Helper utilities (date formatting)
├── .env.example                # Template file for environment configuration
├── .gitignore                  # Git ignore rules for node_modules and .env files
├── package.json                # Project dependencies and script definitions
├── server.js                   # Express application entrypoint
└── test-all.js                 # Automated integration test suite
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: Version 18.x or higher installed.
- **npm**: Package manager (included with Node.js).

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

4. **Start the application**:
   - **Development Mode** (with automatic server restart via Nodemon and in-memory MongoDB):
     ```bash
     npm run dev
     ```
   - **Production Mode**:
     ```bash
     npm start
     ```

5. **Open in Browser**:
   Navigate to **`http://localhost:5000`** in your web browser.

---

## 🔑 Environment Variables

The application configures its environment settings via a `.env` file in the root directory. Use `.env.example` as your setup guide:

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

> ⚠️ **SECURITY WARNING**: Never commit your `.env` or `.env.production` files containing real secrets to version control. The repository `.gitignore` is configured to exclude all `.env*` files automatically.

---

## 📖 Usage Guide

1. **Account Registration & Login**:
   - Register a new account or log in with an existing user. Session tokens are securely managed in client storage.
2. **Logging Income & Expenses**:
   - Navigate to the **Expenses** view to add income or expense entries. Select dates using the local calendar picker and assign standardized categories (e.g., Groceries, Rent, Utilities, Salary, Dining Out).
3. **Setting Up Budgets**:
   - Go to the **Budgets** section to establish monthly spending limits for specific categories. Budgets automatically calculate spent amounts, remaining balances, and progress percentages.
4. **Analyzing Reports**:
   - Access the **Reports** section to view interactive cash flow line graphs and category pie charts. Filter data by date range, export transactions as **CSV**, or use **Print/PDF** mode to save physical reports.
5. **Managing Preferences**:
   - Visit the **Profile** tab to update display names, customize avatar selections, update your default currency symbol (USD, EUR, GBP, INR), or securely change your account password.

---

## 🛡️ Security Implementation

- **Password Protection**: Passwords are securely hashed before storage using `bcryptjs` with 10 salt rounds.
- **Route Authorization**: Protected endpoints verify JWT tokens via the `auth.middleware.js` layer.
- **Rate Limiting**: Password change attempts are rate-limited (`5 attempts / 15 minutes`) using `express-rate-limit` to mitigate brute-force risks.
- **Query Sanitization**: Incoming requests pass through `express-mongo-sanitize` to defend against NoSQL injection vectors.
- **Strict User Data Isolation**: API queries enforce user identity matching (`userId: req.user._id`), preventing unauthorized cross-account data access or manipulation.

---

## 🧪 Testing

The repository includes a comprehensive, self-contained integration test suite [`test-all.js`](file:///c:/Users/Dell%203410/Documents/fullstack_mjp1/test-all.js) that spins up an isolated `mongodb-memory-server` and verifies all system endpoints.

To run the test suite:

```bash
node test-all.js
```

### Test Suite Execution Status
- **Total Assertions Executed**: **114**
- **Passing Status**: **114 / 114 Passed (100%)**
- **Coverage**: Health check, Authentication flow, Cross-account isolation, Transaction CRUD, Budget calculations, Dashboard aggregation, Security route protection, Input validation, and Static asset serving.

---

## 🔮 Future Improvements

- 🔄 **Recurring Subscriptions**: Automatic logging for recurring monthly subscriptions and bill reminders.
- 👛 **Multi-Wallet Accounts**: Ability to group balances across checking, savings, and credit accounts.
- 🎨 **Theme Persistence**: Save user-selected light/dark theme preferences directly to the user profile schema.

---

## 📄 License

This project currently has no specified license.

---

## 👤 Author

**Pranith**  
GitHub: [@Pranith-102938](https://github.com/Pranith-102938)
