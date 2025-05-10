const fetch = require('node-fetch');

const SERVER_URL = 'http://localhost:3000'; // Adjust if your server runs on a different port

// --- Test IP Addresses ---
// Note: Abuse scores and country codes can change. These are for illustrative purposes.
// You might need to find current IPs for testing specific scenarios.
const GOOD_US_IP = '8.8.8.8';         // Google DNS, US, typically low abuse score
const KNOWN_BAD_IP_HIGH_SCORE = '103.208.220.220'; // Example of an IP often reported
const NON_US_IP = '200.87.127.1';   // Example IP from Argentina

async function runTest(description, ipToTest, expectedStatus) {
    console.log(`\n--- Testing: ${description} (IP: ${ipToTest}) ---`);
    try {
        const response = await fetch(`${SERVER_URL}/`, { // Test against the root path
            method: 'GET',
            headers: {
                'X-Forwarded-For': ipToTest,
                // Add 'X-API-Key': 'YOUR_SHARED_SECRET_KEY' if testing protected API routes
            },
        });

        console.log(`Status: ${response.status}`);
        const responseBodyText = await response.text(); // Read body once as text

        if (response.status === expectedStatus) {
            console.log(`✅ PASSED: Expected status ${expectedStatus}, got ${response.status}`);
            try {
                // If we expect JSON (e.g., for 403 errors from our API) or if the content type suggests JSON
                if (expectedStatus === 403 || (response.headers.get('content-type') && response.headers.get('content-type').includes('application/json'))) {
                    const jsonData = JSON.parse(responseBodyText);
                    console.log('Response Body (JSON):', jsonData);
                } else if (response.status === 200) { // If 200, it's likely HTML from static serve
                    console.log('Response Body: (HTML content - truncated)');
                    console.log(responseBodyText.substring(0, 200) + (responseBodyText.length > 200 ? '...' : ''));
                } else {
                    console.log('Response Body (Text):', responseBodyText);
                }
            } catch (e) {
                // This catch is for JSON.parse error if content-type was misleading or body was not valid JSON
                console.log('Response Body (Text, failed to parse as JSON or not expected JSON):', responseBodyText.substring(0, 500));
            }
        } else {
            console.error(`❌ FAILED: Expected status ${expectedStatus}, but got ${response.status}`);
            // Log the body text on failure to help diagnose
            console.log('Response Body on failure (Text):', responseBodyText.substring(0, 500));
        }
        return response.status === expectedStatus;
    } catch (error) {
        console.error(`❌ ERROR during test execution: ${error.message}`);
        if (expectedStatus === 'network_error') {
             console.log(`✅ PASSED: Expected network error and got one.`);
             return true;
        }
        return false;
    }
}

async function main() {
    console.log('Starting AbuseIPDB middleware tests...');
    console.log('Ensure your server is running (npm run dev) and .env has a valid ABUSEIPDB_API_KEY.');
    console.log('--------------------------------------------------');

    let allTestsPassed = true;

    // Test 1: Good US IP - Should be allowed (200 OK for static index.html)
    if (!await runTest('Good US IP', GOOD_US_IP, 200)) allTestsPassed = false;

    // Test 2: Known Bad IP (High Abuse Score) - Should be blocked (403 Forbidden)
    // Note: The actual score of this IP might vary.
    // For this test to be reliable, ensure the IP has > 60 score on AbuseIPDB at test time.
    if (!await runTest('Known Bad IP (High Abuse Score > 60)', KNOWN_BAD_IP_HIGH_SCORE, 403)) allTestsPassed = false;

    // Test 3: Non-US IP - Should be blocked (403 Forbidden)
    if (!await runTest('Non-US IP', NON_US_IP, 403)) allTestsPassed = false;
    
    // Test 4: Request with no IP (should ideally be handled, current server logic might let it pass or log warning)
    // Your current server logic might allow this if IP cannot be determined, or use socket.remoteAddress
    // This test helps understand behavior when X-Forwarded-For is missing.
    // Depending on your server setup (e.g. if it's directly internet-facing vs behind a proxy),
    // req.socket.remoteAddress might be '::1' or '127.0.0.1' if run locally.
    // If your server is running and you run this test script on the same machine,
    // req.socket.remoteAddress will likely be '::1' (localhost IPv6) or '127.0.0.1' (localhost IPv4).
    // These are typically not checked by AbuseIPDB or might be whitelisted.
    // The server code has a commented out section to skip localhost, if uncommented this would pass.
    // If that section is commented, it will try to check '::1' or '127.0.0.1'.
    // AbuseIPDB usually doesn't provide scores for localhost/private IPs.
    // The client might return an error or empty data.
    // Your server's `checkIpAbuse` function currently calls `next()` on API error.
    console.log(`\n--- Testing: Request with no X-Forwarded-For header (simulating direct connection from localhost) ---`);
    try {
        const response = await fetch(`${SERVER_URL}/`, { method: 'GET' });
        console.log(`Status: ${response.status}`);
        if (response.status === 200) {
            console.log(`✅ PASSED (as expected for localhost): Expected status 200 for direct localhost, got ${response.status}`);
        } else {
            console.error(`⚠️  UNEXPECTED (for localhost): Expected status 200, but got ${response.status}. This might be okay if AbuseIPDB somehow processed localhost or if there was an unexpected block.`);
            // allTestsPassed = false; // Decide if this should fail the test suite
        }
    } catch (error) {
        console.error(`❌ ERROR during no-IP test: ${error.message}`);
        allTestsPassed = false;
    }


    console.log('\n--------------------------------------------------');
    if (allTestsPassed) {
        console.log('🎉 All tests passed (or completed as expected)!');
    } else {
        console.log('⚠️ Some tests failed or had unexpected outcomes.');
    }
    console.log('--------------------------------------------------');

}

main();