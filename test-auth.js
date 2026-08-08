const http = require('http');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`\n${method} ${path} => ${res.statusCode}`);
        try {
          const parsed = JSON.parse(body);
          console.log(JSON.stringify(parsed, null, 2));
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          console.log(body);
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      console.error(`Request failed: ${err.message}`);
      reject(err);
    });

    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('=== AUTH API INTEGRATION TESTS ===\n');

  // Test 1: Register with missing fields (validation)
  console.log('--- Test 1: Register with missing name ---');
  await makeRequest('POST', '/api/v1/auth/register', { email: 'test@example.com', password: 'pass123' });

  // Test 2: Register with short password (validation)
  console.log('\n--- Test 2: Register with short password ---');
  await makeRequest('POST', '/api/v1/auth/register', { name: 'Test', email: 'test@example.com', password: '12' });

  // Test 3: Register valid user
  console.log('\n--- Test 3: Register valid user ---');
  const registerResult = await makeRequest('POST', '/api/v1/auth/register', {
    name: 'Test User',
    email: 'testuser@finance.com',
    password: 'securePass123'
  });

  // Test 4: Duplicate registration
  console.log('\n--- Test 4: Duplicate email registration ---');
  await makeRequest('POST', '/api/v1/auth/register', {
    name: 'Another User',
    email: 'testuser@finance.com',
    password: 'anotherPass123'
  });

  // Test 5: Login with wrong password
  console.log('\n--- Test 5: Login with wrong password ---');
  await makeRequest('POST', '/api/v1/auth/login', { email: 'testuser@finance.com', password: 'wrongpassword' });

  // Test 6: Login with correct credentials
  console.log('\n--- Test 6: Login with correct credentials ---');
  const loginResult = await makeRequest('POST', '/api/v1/auth/login', {
    email: 'testuser@finance.com',
    password: 'securePass123'
  });

  const token = loginResult.data.token;

  // Test 7: Access protected route without token
  console.log('\n--- Test 7: GET /me without token ---');
  await makeRequest('GET', '/api/v1/auth/me');

  // Test 8: Access protected route with valid token
  if (token) {
    console.log('\n--- Test 8: GET /me with valid token ---');
    await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost', port: 5000,
        path: '/api/v1/auth/me', method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          console.log(`GET /api/v1/auth/me => ${res.statusCode}`);
          console.log(JSON.stringify(JSON.parse(body), null, 2));
          resolve();
        });
      });
      req.on('error', reject);
      req.end();
    });

    // Test 9: Update profile
    console.log('\n--- Test 9: PUT /profile with token ---');
    await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost', port: 5000,
        path: '/api/v1/auth/profile', method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          console.log(`PUT /api/v1/auth/profile => ${res.statusCode}`);
          console.log(JSON.stringify(JSON.parse(body), null, 2));
          resolve();
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify({ name: 'Updated Name', currency: 'INR' }));
      req.end();
    });
  }

  console.log('\n=== ALL TESTS COMPLETE ===');
}

runTests().catch(console.error);
