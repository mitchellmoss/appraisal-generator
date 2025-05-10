const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json({ limit: '1mb' })); // Parse JSON request bodies
app.use(express.static('.')); // Serve static files from current directory

// Ensure the appraisals directory exists
const APPRAISALS_DIR = path.join(__dirname, 'appraisals');
if (!fs.existsSync(APPRAISALS_DIR)) {
    fs.mkdirSync(APPRAISALS_DIR, { recursive: true });
}

/**
 * POST /api/appraisals
 * Saves a new appraisal to the server
 */
app.post('/api/appraisals', (req, res) => {
    try {
        const appraisalData = req.body;
        
        // Validate required fields
        if (!appraisalData || !appraisalData.clientName) {
            return res.status(400).json({ error: 'Missing required appraisal data' });
        }
        
        // Generate unique ID and add metadata
        const appraisalId = uuidv4();
        const timestamp = new Date().toISOString();
        
        const dataToSave = {
            id: appraisalId,
            createdAt: timestamp,
            updatedAt: timestamp,
            ...appraisalData
        };
        
        // Save to file
        const filename = `${appraisalId}.json`;
        const filePath = path.join(APPRAISALS_DIR, filename);
        
        fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));
        
        // Return success with the ID
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
 * GET /api/appraisals/:id
 * Retrieves a specific appraisal by ID
 */
app.get('/api/appraisals/:id', (req, res) => {
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
 * GET /api/appraisals
 * Lists all saved appraisals (summary information only)
 */
app.get('/api/appraisals', (req, res) => {
    try {
        const files = fs.readdirSync(APPRAISALS_DIR)
            .filter(file => file.endsWith('.json'));

        const appraisals = files.map(file => {
            const data = JSON.parse(fs.readFileSync(path.join(APPRAISALS_DIR, file), 'utf8'));

            // Calculate total appraised value from articles if available
            let appraisedValue = data.appraisedValue || 'Not specified';

            // If we have articles array, calculate the total
            if (data.articles && Array.isArray(data.articles) && data.articles.length > 0) {
                let total = 0;
                data.articles.forEach(article => {
                    if (article.appraisedValue) {
                        // Extract numeric value (remove currency symbols, commas, etc.)
                        const value = article.appraisedValue.replace(/[^0-9.-]+/g, "");
                        if (value && !isNaN(parseFloat(value))) {
                            total += parseFloat(value);
                        }
                    }
                });

                // Format with dollar sign and commas if we have a calculated value
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

        // Sort by creation date, newest first
        appraisals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(appraisals);
    } catch (error) {
        console.error('Error listing appraisals:', error);
        res.status(500).json({ error: 'Failed to list appraisals' });
    }
});

/**
 * PUT /api/appraisals/:id
 * Updates an existing appraisal
 */
app.put('/api/appraisals/:id', (req, res) => {
    try {
        const appraisalId = req.params.id;
        const filePath = path.join(APPRAISALS_DIR, `${appraisalId}.json`);

        // Check if appraisal exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Appraisal not found' });
        }

        // Read existing appraisal to get metadata
        const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Validate required fields in the update
        const appraisalData = req.body;
        if (!appraisalData || !appraisalData.clientName) {
            return res.status(400).json({ error: 'Missing required appraisal data' });
        }

        // Preserve metadata and update
        const updatedData = {
            ...appraisalData,
            id: existingData.id, // Ensure ID doesn't change
            createdAt: existingData.createdAt, // Preserve original creation date
            updatedAt: new Date().toISOString() // Update the modified timestamp
        };

        // Save the updated appraisal
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));

        // Return success
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
 * DELETE /api/appraisals/:id
 * Deletes an appraisal by ID
 */
app.delete('/api/appraisals/:id', (req, res) => {
    try {
        const appraisalId = req.params.id;
        const filePath = path.join(APPRAISALS_DIR, `${appraisalId}.json`);

        // Check if appraisal exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Appraisal not found' });
        }

        // Delete the file
        fs.unlinkSync(filePath);

        // Return success
        res.json({
            id: appraisalId,
            message: 'Appraisal deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting appraisal:', error);
        res.status(500).json({ error: 'Failed to delete appraisal' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'An unexpected error occurred' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Appraisal server running on port ${PORT}`);
    console.log(`Access the app at http://localhost:${PORT}`);
});