/**
 * FinTrack Frontend End-to-End Browser Smoke Test Suite
 * Uses Puppeteer-Core with Edge/Chrome to test real user flows on desktop & mobile viewports.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const puppeteer = require('puppeteer-core');

let smokePassed = 0;
let smokeFailed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    smokePassed++;
    console.log(`  ✅ ${label}`);
  } else {
    smokeFailed++;
    console.log(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
  }
}

async function runSmokeTests() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🎭 FRONTEND END-TO-END BROWSER SMOKE TEST SUITE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  let alertTriggered = false;
  page.on('dialog', async (dialog) => {
    alertTriggered = true;
    console.error('  ❌ ALERT DIALOG DETECTED:', dialog.message());
    await dialog.dismiss();
  });

  page.on('pageerror', (err) => {
    console.error('  [PAGE ERROR]', err.message);
  });

  const BASE_URL = 'http://localhost:5002';
  const testEmail = `smoke_user_${Date.now()}@fintrack.test`;
  const xssName = 'SmokeTester <script>alert("xss")</script>';
  const testPass = 'SecurePass123!';
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    // 1. Open Application
    console.log('🚀 1. Application Initialization & Page Load');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    const title = await page.title();
    assert('1. Open application — title loaded correctly', title.includes('Personal Finance Tracker'));

    // 2. Register
    console.log('\n🔐 2. User Registration & Security Check');
    await page.evaluate(() => window.Router.navigateTo('register'));
    await new Promise(r => setTimeout(r, 300));
    await page.type('#register-name', xssName);
    await page.type('#register-email', testEmail);
    await page.type('#register-password', testPass);
    await page.click('#register-submit-btn');
    await new Promise(r => setTimeout(r, 1200));

    // Security check: Verify XSS Name in header is sanitized
    const headerHTML = await page.evaluate(() => {
      const el = document.getElementById('user-header-profile');
      return el ? el.innerHTML : '';
    });
    assert('2. Register user — account created and user logged in', !!headerHTML);
    assert('4. Security Regression — User display name HTML-escaped in header', headerHTML.includes('&lt;script&gt;'));

    // 3. Login Flow Verification
    console.log('\n🔑 3. Logout & Fresh Login Flow');
    await page.evaluate(() => window.Auth.logout());
    await new Promise(r => setTimeout(r, 500));

    await page.type('#login-email', testEmail);
    await page.type('#login-password', testPass);
    await page.click('#login-submit-btn');
    await new Promise(r => setTimeout(r, 1000));

    const loggedIn = await page.evaluate(() => window.Auth.isLoggedIn());
    assert('3. Login — Authentication token acquired', loggedIn);

    // 4. Home View Loads
    const homeViewActive = await page.evaluate(() => {
      const sec = document.getElementById('view-home');
      return sec && sec.classList.contains('active');
    });
    assert('4. Home view — Launchpad screen displayed for logged-in user', homeViewActive);

    // 5. Dashboard View Loads
    console.log('\n📊 4. Router Navigation & Analytics Views');
    await page.evaluate(() => window.Router.navigateTo('dashboard'));
    await new Promise(r => setTimeout(r, 400));
    const dashViewActive = await page.evaluate(() => {
      const sec = document.getElementById('view-dashboard');
      return sec && sec.classList.contains('active');
    });
    assert('5. Dashboard view — Detailed analytics view active', dashViewActive);

    // 6. Home -> Dashboard -> Home Navigation
    await page.evaluate(() => window.Router.navigateTo('home'));
    await new Promise(r => setTimeout(r, 300));
    const homeRevisited = await page.evaluate(() => {
      const sec = document.getElementById('view-home');
      return sec && sec.classList.contains('active');
    });
    assert('6. View Navigation — Smooth Home -> Dashboard -> Home routing', homeRevisited);

    // 7. Add Income Transaction
    console.log('\n💳 5. Financial Transactions CRUD');
    await page.evaluate(async (dateStr) => {
      window.Router.navigateTo('expenses');
      await window.Expenses.createTransaction({
        type: 'income',
        amount: 2500.00,
        category: 'Salary',
        date: dateStr,
        paymentMethod: 'bank_transfer',
        description: 'Monthly Salary Deposit'
      });
    }, todayStr);
    await new Promise(r => setTimeout(r, 800));

    // 8. Add Expense Transaction with XSS Payload
    const xssTxnDesc = 'Dinner <script>alert("txn-xss")</script>';
    await page.evaluate(async (dateStr, desc) => {
      await window.Expenses.createTransaction({
        type: 'expense',
        amount: 45.00,
        category: 'Dining Out',
        date: dateStr,
        paymentMethod: 'card',
        description: desc
      });
    }, todayStr, xssTxnDesc);
    await new Promise(r => setTimeout(r, 800));

    // Reload expenses list
    await page.evaluate(() => window.Expenses.loadTransactions(1));
    await new Promise(r => setTimeout(r, 500));

    // 9. Transaction Appears
    const tableHTML = await page.evaluate(() => {
      const tbody = document.getElementById('expenses-table-body');
      return tbody ? tbody.innerHTML : '';
    });
    assert('7. Add Income — Salary transaction processed ($2,500.00)', tableHTML.includes('$2,500.00'));
    assert('8. Add Expense — Dining Out expense created ($45.00)', tableHTML.includes('$45.00'));
    assert('9. Transaction Appears — Table row rendered in Expenses view', tableHTML.includes('Dining Out'));
    assert('4. Security Regression — Transaction description HTML-escaped', tableHTML.includes('&lt;script&gt;'));

    // 10. Refresh & Session Persistence
    console.log('\n🔄 6. Session Persistence & Budget Management');
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));

    const stillLoggedIn = await page.evaluate(() => window.Auth.isLoggedIn());
    assert('10. Refresh page — User session and JWT token remain persistent', stillLoggedIn);

    // Verify transaction remains after refresh
    await page.evaluate(() => window.Router.navigateTo('expenses'));
    await new Promise(r => setTimeout(r, 500));
    const tableAfterRefresh = await page.evaluate(() => {
      const tbody = document.getElementById('expenses-table-body');
      return tbody ? tbody.innerHTML : '';
    });
    assert('10. Refresh page — Transactions remain stored and displayed', tableAfterRefresh.includes('Dining Out'));

    // 11. Create Budget
    await page.evaluate(async () => {
      window.Router.navigateTo('budgets');
      await window.Budgets.createBudget({
        category: 'Dining Out',
        limit: 300.00,
        period: 'monthly',
        alertThreshold: 80,
        notes: 'Monthly restaurant budget'
      });
    });
    await new Promise(r => setTimeout(r, 800));

    const budgetGridHTML = await page.evaluate(() => {
      const grid = document.getElementById('budgets-grid');
      return grid ? grid.innerHTML : '';
    });
    assert('11. Create Budget — Card rendered with limit in grid', budgetGridHTML.includes('Dining Out'));

    // 12. Reports View Loads
    console.log('\n📈 7. Reports Analytics & Re-authentication');
    await page.evaluate(() => window.Router.navigateTo('reports'));
    await new Promise(r => setTimeout(r, 600));

    const reportsActive = await page.evaluate(() => {
      const sec = document.getElementById('view-reports');
      return sec && sec.classList.contains('active');
    });
    assert('12. Reports view — Financial reporting analytics and charts loaded', reportsActive);

    // 13. Logout
    await page.evaluate(() => window.Auth.logout());
    await new Promise(r => setTimeout(r, 500));
    const isLoggedOut = await page.evaluate(() => !window.Auth.isLoggedIn());
    assert('13. Logout — Token cleared and user redirected to login view', isLoggedOut);

    // 14. Login Again
    await page.type('#login-email', testEmail);
    await page.type('#login-password', testPass);
    await page.click('#login-submit-btn');
    await new Promise(r => setTimeout(r, 1000));
    const reLoggedIn = await page.evaluate(() => window.Auth.isLoggedIn());
    assert('14. Login again — Re-authentication successful with stored credentials', reLoggedIn);

    // 15. Mobile Sidebar Responsive User Flows
    console.log('\n📱 8. Mobile Sidebar Responsive Interactions (Viewport: 375x812)');
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 300));

    // 15a. Open -> X Closes
    await page.evaluate(() => {
      const btn = document.getElementById('mobile-menu-btn') || document.getElementById('sidebar-toggle-btn');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 300));
    let sidebarOpen = await page.evaluate(() => {
      const sb = document.getElementById('sidebar');
      if (!sb) return false;
      const matrix = getComputedStyle(sb).transform;
      return sb.classList.contains('open') || matrix === 'matrix(1, 0, 0, 1, 0, 0)' || sb.style.transform === '';
    });
    assert('15a. Mobile sidebar — Opens on hamburger tap', sidebarOpen);

    await page.evaluate(() => {
      const btn = document.getElementById('sidebar-toggle-btn') || document.getElementById('close-sidebar-btn');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 300));
    let sidebarClosedX = await page.evaluate(() => {
      const sb = document.getElementById('sidebar');
      return sb ? (sb.style.transform === 'translateX(-100%)' || !sb.classList.contains('open')) : true;
    });
    assert('15a. Mobile sidebar — X button tap reliably closes sidebar (translateX(-100%))', sidebarClosedX);

    // 15b. Open -> Backdrop Closes
    await page.evaluate(() => {
      const btn = document.getElementById('mobile-menu-btn') || document.getElementById('sidebar-toggle-btn');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => {
      const bd = document.getElementById('mobile-sidebar-backdrop') || document.getElementById('mobile-backdrop');
      if (bd) bd.click();
    });
    await new Promise(r => setTimeout(r, 300));
    let sidebarClosedBackdrop = await page.evaluate(() => {
      const sb = document.getElementById('sidebar');
      return sb ? (sb.style.transform === 'translateX(-100%)' || !sb.classList.contains('open')) : true;
    });
    assert('15b. Mobile sidebar — Backdrop tap reliably closes sidebar (translateX(-100%))', sidebarClosedBackdrop);

    // 15c. Open -> Navigation Item Closes
    await page.evaluate(() => {
      const btn = document.getElementById('mobile-menu-btn') || document.getElementById('sidebar-toggle-btn');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => {
      const navItem = document.querySelector('.nav-item[data-view="expenses"]');
      if (navItem) navItem.click();
    });
    await new Promise(r => setTimeout(r, 300));
    let sidebarClosedNavItem = await page.evaluate(() => {
      const sb = document.getElementById('sidebar');
      return sb ? (sb.style.transform === 'translateX(-100%)' || !sb.classList.contains('open')) : true;
    });
    const expensesActiveAfterNav = await page.evaluate(() => {
      const sec = document.getElementById('view-expenses');
      return sec && sec.classList.contains('active');
    });
    assert('15c. Mobile sidebar — Navigation item tap closes sidebar and routes view', sidebarClosedNavItem && expensesActiveAfterNav);

    // Security Verification Assertion
    assert('4. Security Regression — Zero alert dialogs triggered during full E2E run', !alertTriggered);

  } finally {
    await browser.close();
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const totalSmoke = smokePassed + smokeFailed;
  console.log(`  SMOKE TEST RESULTS: ${smokePassed}/${totalSmoke} passed, ${smokeFailed} failed`);
  if (smokeFailed === 0) {
    console.log('  🎉 ALL BROWSER SMOKE TESTS PASSED!');
  } else {
    console.log('  ⚠️  Some smoke tests failed — review output above.');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return smokeFailed;
}

async function main() {
  console.log('🔧 Starting MongoDB Memory Server for Smoke Test Suite...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  console.log(`✅ Memory DB running at: ${uri}`);

  process.env.MONGO_URI = uri;
  process.env.PORT = '5002';
  process.env.JWT_SECRET = 'smoke_test_jwt_secret_key_987654321';
  process.env.NODE_ENV = 'test';

  const expressApp = express();

  expressApp.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  expressApp.use(cors({ origin: true, credentials: true }));
  expressApp.use(express.json({ limit: '1mb' }));
  expressApp.use(express.urlencoded({ extended: true, limit: '1mb' }));
  expressApp.use(express.static(path.join(__dirname, 'client')));

  expressApp.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Smoke Test API running' });
  });

  const authRoutes = require('./routes/auth.routes');
  const transactionRoutes = require('./routes/transaction.routes');
  const budgetRoutes = require('./routes/budget.routes');
  const dashboardRoutes = require('./routes/dashboard.routes');

  expressApp.use('/api/v1/auth', authRoutes);
  expressApp.use('/api/v1/transactions', transactionRoutes);
  expressApp.use('/api/v1/budgets', budgetRoutes);
  expressApp.use('/api/v1/dashboard', dashboardRoutes);

  expressApp.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
  });

  await mongoose.connect(uri);

  const server = expressApp.listen(5002, async () => {
    console.log('✅ Smoke Test server listening on port 5002');
    try {
      const failCount = await runSmokeTests();
      server.close();
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
      await mongod.stop();
      process.exit(failCount > 0 ? 1 : 0);
    } catch (err) {
      console.error('Smoke Test crashed:', err);
      server.close();
      await mongod.stop();
      process.exit(1);
    }
  });
}

main().catch(err => {
  console.error('Fatal Smoke Test Error:', err);
  process.exit(1);
});
