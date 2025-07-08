// Express server for Airtable API routes
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Airtable configuration
const AIRTABLE_API_KEY = "patQtWH6v6F1x0kOc.eaaa3f2f6cbe84d09dd87610a3eb5cfa5256606f68eb668c5929bcf8800da8d3";
const AIRTABLE_BASE_ID = "appGTI1rWPE4kOtwW";
const AIRTABLE_TABLE_NAME = "WordCatalogues";

// Middleware
app.use(cors());
app.use(express.json());

// Save catalogue endpoint
app.post('/api/saveCatalogue', async (req, res) => {
  try {
    const { uid, wordCatalogue } = req.body;

    if (!uid || !Array.isArray(wordCatalogue)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    // Check if user record exists
    const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula={uid}='${uid}'`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const searchData = await searchResponse.json();

    const recordData = {
      fields: {
        uid: uid,
        wordCatalogue: JSON.stringify(wordCatalogue),
        lastUpdated: new Date().toISOString()
      }
    };

    let response;
    
    if (searchData.records && searchData.records.length > 0) {
      // Update existing record
      const recordId = searchData.records[0].id;
      const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${recordId}`;
      
      response = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(recordData)
      });
    } else {
      // Create new record
      const createUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
      
      response = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(recordData)
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Airtable API error:', errorData);
      return res.status(response.status).json({ error: 'Failed to save to Airtable' });
    }

    const result = await response.json();
    return res.status(200).json({ success: true, recordId: result.id });

  } catch (error) {
    console.error('Error saving catalogue:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Load catalogue endpoint
app.get('/api/loadCatalogue', async (req, res) => {
  try {
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({ error: 'User UID is required' });
    }

    // Search for user record
    const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula={uid}='${uid}'`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Airtable API error:', errorData);
      return res.status(response.status).json({ error: 'Failed to load from Airtable' });
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return res.status(404).json({ error: 'No catalogue found for user' });
    }

    const record = data.records[0];
    const wordCatalogue = JSON.parse(record.fields.wordCatalogue || '[]');
    const lastUpdated = record.fields.lastUpdated;

    return res.status(200).json({
      wordCatalogue,
      lastUpdated,
      recordId: record.id
    });

  } catch (error) {
    console.error('Error loading catalogue:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});