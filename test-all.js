/**
 * Test Server Launcher — Uses mongodb-memory-server for a self-contained test environment.
 * This script:
 * 1. Spins up an in-memory MongoDB instance
 * 2. Updates MONGO_URI to point to it
 * 3. Starts the Express server
 * 4. Runs the full integration test suite
 * 5. Shuts everything down cleanly
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const http = require('http');

let testsPassed = 0;
let testsFailed = 0;
let testToken = null;

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const body = data ? JSON.stringify(data) : null;
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: `/api/v1${path}`,
      method,
      headers,
    };

    const req = http.request(options, (res) => {
      let chunks = '';
      res.on('data', (d) => (chunks += d));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(chunks) });
        } catch {
          resolve({ status: res.statusCode, body: chunks });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

function assert(label, condition, detail = '') {
  if (condition) {
    testsPassed++;
    console.log(`  ✅ ${label}`);
  } else {
    testsFailed++;
    console.log(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
  }
}

async function runTests() {
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  COMPREHENSIVE APPLICATION TEST SUITE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ─── 1. HEALTH CHECK ───────────────────────────
  console.log('📦 1. HEALTH CHECK');
  try {
    const res = await request('GET', '/health');
    assert('Health endpoint returns 200', res.status === 200);
    assert('Health response has success status', res.body.status === 'success');
  } catch (e) {
    assert('Health endpoint reachable', false, e.message);
  }

  // ─── 2. AUTHENTICATION ─────────────────────────
  console.log('\n🔐 2. AUTHENTICATION');

  // Register
  const regRes = await request('POST', '/auth/register', {
    name: 'Test User',
    email: testEmail,
    password: testPassword,
  });
  assert('Register returns 201', regRes.status === 201, `got ${regRes.status}: ${regRes.body?.message}`);
  assert('Register returns token', !!regRes.body.token);
  assert('Register returns user object', !!regRes.body.user);
  assert('User name correct', regRes.body.user?.name === 'Test User');
  assert('User email correct', regRes.body.user?.email === testEmail);
  testToken = regRes.body.token;

  // Duplicate Registration
  const dupRes = await request('POST', '/auth/register', {
    name: 'Test User',
    email: testEmail,
    password: testPassword,
  });
  assert('Duplicate registration rejected (400)', dupRes.status === 400);

  // Login
  const loginRes = await request('POST', '/auth/login', {
    email: testEmail,
    password: testPassword,
  });
  assert('Login returns 200', loginRes.status === 200, `got ${loginRes.status}`);
  assert('Login returns token', !!loginRes.body.token);
  assert('Login returns welcome message', loginRes.body.message?.includes('Welcome'));
  testToken = loginRes.body.token;

  // Invalid Login
  const badLoginRes = await request('POST', '/auth/login', {
    email: testEmail,
    password: 'WrongPassword!',
  });
  assert('Invalid password rejected (401)', badLoginRes.status === 401);

  // Missing fields Login
  const emptyLoginRes = await request('POST', '/auth/login', {
    email: '',
    password: '',
  });
  assert('Empty login fields rejected (400)', emptyLoginRes.status === 400);

  // Get Current User (GET /auth/me)
  const meRes = await request('GET', '/auth/me', null, testToken);
  assert('GET /auth/me returns 200', meRes.status === 200, `got ${meRes.status}`);
  assert('User email matches', meRes.body.user?.email === testEmail);

  // Protected Route without Token
  const noAuthRes = await request('GET', '/auth/me');
  assert('Protected route without token returns 401', noAuthRes.status === 401);

  // Update Profile
  const profileRes = await request('PUT', '/auth/profile', {
    name: 'Updated Name',
    currency: 'EUR',
    monthlyIncomeTarget: 8000,
  }, testToken);
  assert('Update profile returns 200', profileRes.status === 200);
  assert('Profile name updated', profileRes.body.user?.name === 'Updated Name');
  assert('Profile currency updated', profileRes.body.user?.currency === 'EUR');

  // Avatar Update
  const avatarRes = await request('PUT', '/auth/profile', {
    avatar: '🚀',
  }, testToken);
  assert('Avatar update returns 200', avatarRes.status === 200);
  assert('Avatar set correctly', avatarRes.body.user?.avatar === '🚀');

  // Change Password
  const pwRes = await request('PUT', '/auth/change-password', {
    currentPassword: testPassword,
    newPassword: 'NewPass456!',
  }, testToken);
  assert('Change password returns 200', pwRes.status === 200);

  // Login with new password
  const newLoginRes = await request('POST', '/auth/login', {
    email: testEmail,
    password: 'NewPass456!',
  });
  assert('Login with new password works', newLoginRes.status === 200);
  testToken = newLoginRes.body.token;

  // Wrong current password
  const badPwRes = await request('PUT', '/auth/change-password', {
    currentPassword: 'TotallyWrong',
    newPassword: 'SomeNewPass!',
  }, testToken);
  assert('Wrong current password rejected (400)', badPwRes.status === 400);

  // Weak new password
  const weakPwRes = await request('PUT', '/auth/change-password', {
    currentPassword: 'NewPass456!',
    newPassword: '123',
  }, testToken);
  assert('Weak new password (< 6 chars) rejected (400)', weakPwRes.status === 400);

  // Missing token for password change
  const noTokenPwRes = await request('PUT', '/auth/change-password', {
    currentPassword: 'NewPass456!',
    newPassword: 'SomeNewPass!',
  });
  assert('Missing token cannot change password (401)', noTokenPwRes.status === 401);

  // Invalid token for password change
  const invalidTokenPwRes = await request('PUT', '/auth/change-password', {
    currentPassword: 'NewPass456!',
    newPassword: 'SomeNewPass!',
  }, 'invalid.fake.jwt.token');
  assert('Invalid token cannot change password (401)', invalidTokenPwRes.status === 401);

  // User Isolation: User B cannot modify User A's profile
  const userBEmail = `userb_${Date.now()}@example.com`;
  const userBReg = await request('POST', '/auth/register', {
    name: 'User B',
    email: userBEmail,
    password: 'UserBPass123!',
  });
  const userBToken = userBReg.body.token;

  const attackRes = await request('PUT', '/auth/profile', {
    _id: regRes.body.user._id,
    userId: regRes.body.user._id,
    name: 'Hacked Name',
  }, userBToken);
  assert('User B cross-account body injection updates User B only', attackRes.status === 200 && attackRes.body.user?.email === userBReg.body.user?.email);

  const userACheck = await request('GET', '/auth/me', null, testToken);
  assert('User A profile remains intact (User isolation verified)', userACheck.body.user?.name === 'Updated Name');

  // ─── 3. TRANSACTIONS / EXPENSES ────────────────
  console.log('\n💳 3. TRANSACTIONS / EXPENSES');

  // Create Expense
  const txn1 = await request('POST', '/transactions', {
    type: 'expense',
    amount: 150.50,
    category: 'Groceries',
    date: '2026-08-01',
    paymentMethod: 'card',
    description: 'Weekly grocery shopping',
  }, testToken);
  assert('Create expense returns 201', txn1.status === 201, `got ${txn1.status}: ${txn1.body?.message}`);
  assert('Expense has _id', !!txn1.body.data?._id);
  assert('Expense amount correct', txn1.body.data?.amount === 150.50);
  const txnId = txn1.body.data?._id;

  // Create Income
  const txn2 = await request('POST', '/transactions', {
    type: 'income',
    amount: 5000,
    category: 'Salary',
    date: '2026-08-01',
    description: 'Monthly salary',
  }, testToken);
  assert('Create income returns 201', txn2.status === 201);

  // Create additional expenses for dashboard data
  const txn3 = await request('POST', '/transactions', {
    type: 'expense', amount: 200, category: 'Entertainment',
    date: '2026-08-05', description: 'Concert tickets',
  }, testToken);
  assert('Create entertainment expense', txn3.status === 201);

  const today = new Date().toISOString().split('T')[0];
  const txn4 = await request('POST', '/transactions', {
    type: 'expense', amount: 75.25, category: 'Dining Out',
    date: today, description: 'Dinner at restaurant',
  }, testToken);
  assert('Create today expense', txn4.status === 201);

  // Create Utilities expense
  await request('POST', '/transactions', {
    type: 'expense', amount: 120, category: 'Utilities',
    date: '2026-08-03', description: 'Electric bill',
  }, testToken);

  // Get Transactions List
  const listRes = await request('GET', '/transactions?page=1&limit=10', null, testToken);
  assert('List transactions returns 200', listRes.status === 200);
  assert('Response has data array', Array.isArray(listRes.body.data));
  assert('5+ transactions returned', listRes.body.data.length >= 5);
  assert('Has pagination info', !!listRes.body.pagination);
  assert('Pagination has totalItems', typeof listRes.body.pagination?.totalItems === 'number');

  // Get with Category Filter
  const filterRes = await request('GET', '/transactions?category=Groceries&type=expense', null, testToken);
  assert('Filter by category works', filterRes.status === 200);
  assert('Filtered results correct', filterRes.body.data.every(t => t.category === 'Groceries'));

  // Get with Date Filter
  const dateFilterRes = await request('GET', `/transactions?startDate=2026-08-01&endDate=2026-08-05`, null, testToken);
  assert('Filter by date range works', dateFilterRes.status === 200);

  // Search
  const searchRes = await request('GET', '/transactions?search=grocery', null, testToken);
  assert('Search by description works', searchRes.status === 200);
  assert('Search returns matching results', searchRes.body.data.length >= 1);

  // Sort by amount desc
  const sortRes = await request('GET', '/transactions?sortBy=amount&sortOrder=desc', null, testToken);
  assert('Sort by amount works', sortRes.status === 200);
  if (sortRes.body.data.length >= 2) {
    assert('Descending sort correct', sortRes.body.data[0].amount >= sortRes.body.data[1].amount);
  }

  // Update Transaction
  const updateRes = await request('PUT', `/transactions/${txnId}`, {
    amount: 175.00,
    description: 'Updated grocery amount',
  }, testToken);
  assert('Update transaction returns 200', updateRes.status === 200);
  assert('Amount updated to 175', updateRes.body.data?.amount === 175);

  // Get Summary
  const summaryRes = await request('GET', '/transactions/summary/totals', null, testToken);
  assert('Transaction summary returns 200', summaryRes.status === 200);

  // Delete Transaction (create and delete)
  const tmpTxn = await request('POST', '/transactions', {
    type: 'expense', amount: 10, category: 'Other',
    date: '2026-08-01', description: 'Temporary delete test',
  }, testToken);
  const tmpId = tmpTxn.body.data?._id;
  const delRes = await request('DELETE', `/transactions/${tmpId}`, null, testToken);
  assert('Delete transaction returns 200', delRes.status === 200);

  // ─── 4. BUDGETS ────────────────────────────────
  console.log('\n📊 4. BUDGETS');

  // Create Budget
  const budget1 = await request('POST', '/budgets', {
    category: 'Groceries',
    limit: 500,
    alertThreshold: 80,
    notes: 'Monthly grocery limit',
  }, testToken);
  assert('Create budget returns 201', budget1.status === 201, `got ${budget1.status}: ${budget1.body?.message}`);
  assert('Budget has _id', !!budget1.body.data?._id);
  const budgetId = budget1.body.data?._id;

  // Create another budget
  const budget2 = await request('POST', '/budgets', {
    category: 'Entertainment',
    limit: 300,
    alertThreshold: 75,
  }, testToken);
  assert('Create entertainment budget', budget2.status === 201);

  // Create Dining Out budget
  await request('POST', '/budgets', {
    category: 'Dining Out',
    limit: 200,
  }, testToken);

  // Get Budgets List
  const budgetList = await request('GET', '/budgets', null, testToken);
  assert('List budgets returns 200', budgetList.status === 200);
  assert('Budgets returned (>= 3)', Array.isArray(budgetList.body.data) && budgetList.body.data.length >= 3);

  // Budget has spending data from transactions
  const groceryBudget = budgetList.body.data.find(b => b.category === 'Groceries');
  assert('Budget shows spending amount', groceryBudget && groceryBudget.spent > 0);
  assert('Budget has remaining field', groceryBudget && typeof groceryBudget.remaining === 'number');
  assert('Budget has percentage field', groceryBudget && typeof groceryBudget.percentage === 'number');

  // Update Budget
  const budgetUpdate = await request('PUT', `/budgets/${budgetId}`, {
    limit: 600,
    notes: 'Increased grocery budget',
  }, testToken);
  assert('Update budget returns 200', budgetUpdate.status === 200);
  assert('Budget limit updated to 600', budgetUpdate.body.data?.limit === 600);

  // Duplicate Budget Prevention
  const dupBudget = await request('POST', '/budgets', {
    category: 'Groceries',
    limit: 400,
  }, testToken);
  assert('Duplicate budget category rejected (400)', dupBudget.status === 400);

  // Delete Budget
  const budgetDel = await request('DELETE', `/budgets/${budgetId}`, null, testToken);
  assert('Delete budget returns 200', budgetDel.status === 200);

  // Verify deleted
  const budgetListAfter = await request('GET', '/budgets', null, testToken);
  const stillExists = budgetListAfter.body.data.some(b => b._id === budgetId);
  assert('Deleted budget not in list', !stillExists);

  // ─── 5. DASHBOARD ─────────────────────────────
  console.log('\n📈 5. DASHBOARD');

  const dashRes = await request('GET', '/dashboard/stats', null, testToken);
  assert('Dashboard stats returns 200', dashRes.status === 200, `got ${dashRes.status}`);
  assert('Has metrics object', !!dashRes.body.data?.metrics);
  assert('Has charts object', !!dashRes.body.data?.charts);

  if (dashRes.body.data?.metrics) {
    const m = dashRes.body.data.metrics;
    assert('Monthly income > 0', m.monthlyIncome > 0);
    assert('Monthly expense > 0', m.monthlyExpense > 0);
    assert('Net savings calculated', typeof m.netSavings === 'number');
    assert('Savings rate calculated', typeof m.savingsRate === 'number');
    assert('Avg daily spending calculated', typeof m.avgDailySpending === 'number');
    assert('Highest expense present', !!m.highestExpense);
    assert('Weekly expense calculated', typeof m.weeklyExpense === 'number');
    assert('Today expense calculated', typeof m.todayExpense === 'number');
  }

  if (dashRes.body.data?.charts) {
    const c = dashRes.body.data.charts;
    assert('Daily trend has labels', Array.isArray(c.dailyTrend?.labels));
    assert('Daily trend has expense data', Array.isArray(c.dailyTrend?.expense));
    // Verify daily trend accurately sums non-zero expenses for today (last item in 30 days)
    const lastExpense = c.dailyTrend.expense[c.dailyTrend.expense.length - 1];
    assert('Daily trend today expense is non-zero and matching', typeof lastExpense === 'number' && lastExpense > 0);
    assert('Category breakdown present', Array.isArray(c.categoryBreakdown));
    assert('Category breakdown has items', c.categoryBreakdown.length > 0);
    assert('Monthly trend has labels', Array.isArray(c.monthlyTrend?.labels));
    assert('Monthly trend has income data', Array.isArray(c.monthlyTrend?.income));
  }

  // ─── 6. PROTECTED ROUTES ───────────────────────
  console.log('\n🛡️ 6. ROUTE PROTECTION');

  const noAuth1 = await request('GET', '/transactions');
  assert('Transactions without auth → 401', noAuth1.status === 401);

  const noAuth2 = await request('POST', '/budgets', { category: 'Test', limit: 100 });
  assert('Create budget without auth → 401', noAuth2.status === 401);

  const noAuth3 = await request('GET', '/dashboard/stats');
  assert('Dashboard without auth → 401', noAuth3.status === 401);

  const noAuth4 = await request('PUT', '/auth/profile', { name: 'Hacker' });
  assert('Update profile without auth → 401', noAuth4.status === 401);

  const noAuth5 = await request('DELETE', '/transactions/507f1f77bcf86cd799439011');
  assert('Delete transaction without auth → 401', noAuth5.status === 401);

  // ─── 7. INPUT VALIDATION ──────────────────────
  console.log('\n✅ 7. INPUT VALIDATION');

  const missingFieldsTxn = await request('POST', '/transactions', {
    type: 'expense',
  }, testToken);
  assert('Transaction missing fields rejected (400)', missingFieldsTxn.status === 400);

  const negativeAmount = await request('POST', '/transactions', {
    type: 'expense',
    amount: -50,
    category: 'Groceries',
    date: '2026-08-01',
  }, testToken);
  assert('Negative amount rejected (400)', negativeAmount.status === 400);

  const badRegister = await request('POST', '/auth/register', {
    name: 'X',
    email: 'notanemail',
    password: '123',
  });
  assert('Invalid registration data rejected (400)', badRegister.status === 400);

  const noNameRegister = await request('POST', '/auth/register', {
    email: 'valid@test.com',
    password: 'validpass123',
  });
  assert('Registration without name rejected (400)', noNameRegister.status === 400);

  // ─── 8. STATIC FILES ──────────────────────────
  console.log('\n📁 8. STATIC FILES');

  const htmlRes = await new Promise((resolve, reject) => {
    http.get('http://localhost:5001/', (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
  assert('Index.html served at /', htmlRes.status === 200);
  assert('HTML contains app layout', htmlRes.body.includes('id="app-layout"'));
  assert('HTML contains Chart.js script', htmlRes.body.includes('chart.js'));
  assert('HTML contains sidebar navigation', htmlRes.body.includes('id="sidebar"'));
  assert('HTML contains dashboard view', htmlRes.body.includes('id="view-dashboard"'));
  assert('HTML contains tips view', htmlRes.body.includes('id="view-tips"'));
  assert('HTML contains reports view', htmlRes.body.includes('id="view-reports"'));
  assert('HTML contains report-cash-flow-chart canvas', htmlRes.body.includes('<canvas id="report-cash-flow-chart">'));
  assert('HTML contains report-category-chart canvas', htmlRes.body.includes('<canvas id="report-category-chart">'));
  assert('HTML contains reports.js script', htmlRes.body.includes('js/reports.js'));
  assert('HTML contains Dining Out in txn-category select', htmlRes.body.includes('option value="Dining Out"'));
  assert('HTML contains Investment in txn-category select', htmlRes.body.includes('option value="Investment"'));
  assert('HTML contains favicon link', htmlRes.body.includes('rel="icon"') && htmlRes.body.includes('assets/favicon.svg'));

  const faviconRes = await new Promise((resolve, reject) => {
    http.get('http://localhost:5001/assets/favicon.svg', (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
  assert('Favicon SVG served correctly', faviconRes.status === 200 && faviconRes.body.includes('<svg'));

  const reportsJsRes = await new Promise((resolve, reject) => {
    http.get('http://localhost:5001/js/reports.js', (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
  assert('reports.js served correctly', reportsJsRes.status === 200);
  assert('reports.js contains loadReports', reportsJsRes.body.includes('loadReports'));
  assert('reports.js contains exportCSV', reportsJsRes.body.includes('exportCSV'));
  assert('reports.js contains exportPDF', reportsJsRes.body.includes('exportPDF'));

  const tipsJsonRes = await new Promise((resolve, reject) => {
    http.get('http://localhost:5001/data/tips.json', (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    }).on('error', reject);
  });
  assert('tips.json served correctly', tipsJsonRes.status === 200);
  assert('tips.json has daily_tip', !!tipsJsonRes.body.daily_tip);
  assert('tips.json has categories', Array.isArray(tipsJsonRes.body.categories));
  assert('tips.json has 8 tips', tipsJsonRes.body.tips?.length === 8);

  const cssRes = await new Promise((resolve, reject) => {
    http.get('http://localhost:5001/css/main.css', (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
  assert('CSS files served correctly', cssRes.status === 200);

  // ─── RESULTS ───────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const total = testsPassed + testsFailed;
  console.log(`  RESULTS: ${testsPassed}/${total} passed, ${testsFailed} failed`);
  if (testsFailed === 0) {
    console.log('  🎉 ALL TESTS PASSED!');
  } else {
    console.log('  ⚠️  Some tests failed — review output above.');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return testsFailed;
}

async function main() {
  console.log('🔧 Starting MongoDB Memory Server...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  console.log(`✅ Memory MongoDB running at: ${uri}`);

  // Override environment for the test
  process.env.MONGO_URI = uri;
  process.env.PORT = '5001';
  process.env.JWT_SECRET = 'test_jwt_secret_key_for_integration_testing';
  process.env.NODE_ENV = 'test';

  // Clear require cache and load the server fresh
  delete require.cache[require.resolve('./config/db')];
  delete require.cache[require.resolve('./server')];

  // Re-connect mongoose to the in-memory DB
  const mongoose = require('mongoose');
  await mongoose.connect(uri);
  console.log('✅ Mongoose connected to memory DB');

  // Start Express server
  const express = require('express');
  const path = require('path');
  const cors = require('cors');
  const helmet = require('helmet');

  const app = express();

  // Security Headers
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // CORS
  app.use(cors({ origin: true, credentials: true }));

  // Body Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Static files
  app.use(express.static(path.join(__dirname, 'client')));

  // Health
  app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'API running', timestamp: new Date().toISOString() });
  });

  // Routes (no rate limiting in test)
  const authRoutes = require('./routes/auth.routes');
  const transactionRoutes = require('./routes/transaction.routes');
  const budgetRoutes = require('./routes/budget.routes');
  const dashboardRoutes = require('./routes/dashboard.routes');

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/transactions', transactionRoutes);
  app.use('/api/v1/budgets', budgetRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);

  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
  });

  // Error handler
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ status: 'error', message: err.message || 'Internal Server Error' });
  });

  const server = app.listen(5001, async () => {
    console.log('✅ Test server running on port 5001\n');

    try {
      const failCount = await runTests();

      server.close();
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
      await mongod.stop();
      console.log('🧹 Cleanup complete — memory DB stopped.');
      process.exit(failCount > 0 ? 1 : 0);
    } catch (err) {
      console.error('Test suite crashed:', err);
      server.close();
      await mongod.stop();
      process.exit(1);
    }
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
