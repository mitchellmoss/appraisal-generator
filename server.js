const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { AbuseIPDBClient } = require('abuseipdb-client'); // Corrected import
const helmet = require('helmet');
require('dotenv').config(); // Load environment variables from .env file

// IMPORTANT: Change this secret key and consider using an environment variable!
const SHARED_SECRET_KEY = process.env.API_SECRET_KEY || '923948fnvu9823cnujrfef091cim9ij91m';
const ABUSEIPDB_API_KEY = process.env.ABUSEIPDB_API_KEY;

// Initialize AbuseIPDB client
let abuseIpDbClient;
if (ABUSEIPDB_API_KEY) {
    abuseIpDbClient = new AbuseIPDBClient(ABUSEIPDB_API_KEY); // Corrected instantiation
} else {
    console.warn('ABUSEIPDB_API_KEY not found. IP checking will be skipped.');
}

// Middleware to check IP address against AbuseIPDB
const checkIpAbuse = async (req, res, next) => {
    if (!abuseIpDbClient) {
        return next(); // Skip if client not initialized
    }

    // Attempt to get the real IP address, considering proxies
    const ip = req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress;

    if (!ip) {
        console.warn('Could not determine client IP address.');
        return next(); // Or block if strict IP checking is required
    }

    // Skip for localhost or private IPs if desired (optional)
    // if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    //     return next();
    // }

    try {
        console.log(`[checkIpAbuse] Checking IP: ${ip}`); // Log IP being checked
        // Corrected method call from checkIp to check
        const reports = await abuseIpDbClient.check(ip);
        
        console.log(`[checkIpAbuse] Raw reports from AbuseIPDB for ${ip}:`, JSON.stringify(reports, null, 2)); // Log raw report

        // Corrected path to access the data: reports.result.data
        if (reports && reports.result && reports.result.data) {
            const { abuseConfidenceScore, countryCode, usageType } = reports.result.data;
            console.log(`[checkIpAbuse] Data for IP ${ip}: Score=${abuseConfidenceScore}, Country=${countryCode}, Usage=${usageType}`);

            if (countryCode && countryCode !== 'US') {
                console.log(`[checkIpAbuse] Blocking IP ${ip} from country ${countryCode} (Score: ${abuseConfidenceScore})`);
                return res.status(403).json({ error: 'Access denied: Country not allowed.' });
            }

            if (abuseConfidenceScore && abuseConfidenceScore > 60) {
                console.log(`[checkIpAbuse] Blocking IP ${ip} with abuse confidence score ${abuseConfidenceScore} (Country: ${countryCode})`);
                return res.status(403).json({ error: 'Access denied: High abuse confidence score.' });
            }
            console.log(`[checkIpAbuse] IP ${ip} allowed (Score: ${abuseConfidenceScore}, Country: ${countryCode})`);
        } else {
            console.log(`[checkIpAbuse] No reports.result.data found for IP ${ip}. Allowing request. Full report: ${JSON.stringify(reports)}`);
        }
        next();
    } catch (error) {
        console.error(`[checkIpAbuse] Error checking IP ${ip} with AbuseIPDB:`, error.message, error.stack); // Log full error stack
        // Decide if you want to block or allow access on API error
        // For now, we'll allow access to prevent service disruption due to AbuseIPDB issues
        next();
    }
};

// Middleware to protect API routes
const protectApi = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === SHARED_SECRET_KEY) {
        next(); // API key is valid, proceed
    } else {
        res.status(401).json({ error: 'Unauthorized: Missing or invalid API key' });
    }
};

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure global middleware
app.use(checkIpAbuse); // Check IP address first
app.use(helmet()); // Set security-related HTTP headers
app.use(cors()); // Enable CORS for all routes
app.use(express.json({ limit: '1mb' })); // Parse JSON request bodies
app.use(express.static('.')); // Serve static files from current directory (e.g., index.html)

// Ensure the appraisals directory exists
const APPRAISALS_DIR = path.join(__dirname, 'appraisals');
if (!fs.existsSync(APPRAISALS_DIR)) {
    fs.mkdirSync(APPRAISALS_DIR, { recursive: true });
}

// Create a new router for API endpoints that require protection
const appraisalRouter = express.Router();
appraisalRouter.use(protectApi); // Apply API key protection to all routes in this router

/**
 * POST /
 * Saves a new appraisal to the server (Protected)
 */
appraisalRouter.post('/', (req, res) => {
    try {
        const appraisalData = req.body;
        
        if (!appraisalData || !appraisalData.clientName) {
            return res.status(400).json({ error: 'Missing required appraisal data' });
        }
        
        const appraisalId = uuidv4();
        const timestamp = new Date().toISOString();
        
        const dataToSave = {
            id: appraisalId,
            createdAt: timestamp,
            updatedAt: timestamp,
            ...appraisalData
        };
        
        const filename = `${appraisalId}.json`;
        const filePath = path.join(APPRAISALS_DIR, filename);
        
        fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));
        
        res.status(201).json({ 
            id: appraisalId,
            message: 'Appraisal saved successfully',
            createdAt: timestamp
        });
    } catch (error) {
        console.error('Error saving appraisal:', error);
        res.status(500).json({ error: 'Failed to save appraisal' });
    }
});

/**
 * GET /:id
 * Retrieves a specific appraisal by ID (Protected)
 */
appraisalRouter.get('/:id', (req, res) => {
    try {
        const appraisalId = req.params.id;
        const filePath = path.join(APPRAISALS_DIR, `${appraisalId}.json`);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Appraisal not found' });
        }
        
        const appraisalData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        res.json(appraisalData);
    } catch (error) {
        console.error('Error retrieving appraisal:', error);
        res.status(500).json({ error: 'Failed to retrieve appraisal' });
    }
});

/**
 * GET /
 * Lists all saved appraisals (summary information only) (Protected)
 */
appraisalRouter.get('/', (req, res) => {
    try {
        const files = fs.readdirSync(APPRAISALS_DIR)
            .filter(file => file.endsWith('.json'));

        const appraisals = files.map(file => {
            const data = JSON.parse(fs.readFileSync(path.join(APPRAISALS_DIR, file), 'utf8'));

            let appraisedValue = data.appraisedValue || 'Not specified';
            if (data.articles && Array.isArray(data.articles) && data.articles.length > 0) {
                let total = 0;
                data.articles.forEach(article => {
                    if (article.appraisedValue) {
                        const value = article.appraisedValue.replace(/[^0-9.-]+/g, "");
                        if (value && !isNaN(parseFloat(value))) {
                            total += parseFloat(value);
                        }
                    }
                });
                if (total > 0) {
                    appraisedValue = "$" + total.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                }
            }

            return {
                id: data.id,
                clientName: data.clientName,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                appraisalDate: data.appraisalDate,
                appraisedValue: appraisedValue
            };
        });

        appraisals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(appraisals);
    } catch (error) {
        console.error('Error listing appraisals:', error);
        res.status(500).json({ error: 'Failed to list appraisals' });
    }
});

/**
 * PUT /:id
 * Updates an existing appraisal (Protected)
 */
appraisalRouter.put('/:id', (req, res) => {
    try {
        const appraisalId = req.params.id;
        const filePath = path.join(APPRAISALS_DIR, `${appraisalId}.json`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Appraisal not found' });
        }

        const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const appraisalData = req.body;
        if (!appraisalData || !appraisalData.clientName) {
            return res.status(400).json({ error: 'Missing required appraisal data' });
        }

        const updatedData = {
            ...appraisalData,
            id: existingData.id,
            createdAt: existingData.createdAt,
            updatedAt: new Date().toISOString()
        };

        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));

        res.json({
            id: updatedData.id,
            message: 'Appraisal updated successfully',
            updatedAt: updatedData.updatedAt
        });
    } catch (error) {
        console.error('Error updating appraisal:', error);
        res.status(500).json({ error: 'Failed to update appraisal' });
    }
});

/**
 * DELETE /:id
 * Deletes an appraisal by ID (Protected)
 */
appraisalRouter.delete('/:id', (req, res) => {
    try {
        const appraisalId = req.params.id;
        const filePath = path.join(APPRAISALS_DIR, `${appraisalId}.json`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Appraisal not found' });
        }

        fs.unlinkSync(filePath);

        res.json({
            id: appraisalId,
            message: 'Appraisal deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting appraisal:', error);
        res.status(500).json({ error: 'Failed to delete appraisal' });
    }
});

// Mount the protected API router
app.use('/api/appraisals', appraisalRouter);

// Error handling middleware (should be defined after all other app.use and routes)
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'An unexpected error occurred' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Appraisal server running on port ${PORT}`);
    console.log(`Access the app at http://localhost:${PORT}`);
});