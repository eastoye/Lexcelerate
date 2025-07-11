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
app.use(express.json({ limit: '10mb' })); // Increase limit for large catalogues
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body keys:', Object.keys(req.body));
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Save catalogue endpoint
app.post('/api/saveCatalogue', async (req, res) => {
  console.log('=== SAVE CATALOGUE REQUEST ===');
  
  try {
    const { uid, wordCatalogue } = req.body;
    
    console.log('Request body received:', {
      uid: uid ? 'present' : 'missing',
      wordCatalogue: Array.isArray(wordCatalogue) ? `array with ${wordCatalogue.length} items` : 'invalid format'
    });

    // Validate input
    if (!uid) {
      console.error('Validation error: Missing uid');
      return res.status(400).json({ 
        error: 'Missing required field: uid',
        details: 'User ID is required to save catalogue'
      });
    }

    if (!Array.isArray(wordCatalogue)) {
      console.error('Validation error: wordCatalogue is not an array');
      return res.status(400).json({ 
        error: 'Invalid wordCatalogue format',
        details: 'wordCatalogue must be an array'
      });
    }

    console.log(`Saving catalogue for user ${uid} with ${wordCatalogue.length} words`);

    // Check if user record exists
    const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula={uid}='${uid}'`;
    
    console.log('Searching for existing record...');
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Airtable search error:', {
        status: searchResponse.status,
        statusText: searchResponse.statusText,
        body: errorText
      });
      return res.status(searchResponse.status).json({ 
        error: 'Failed to search Airtable records',
        details: `HTTP ${searchResponse.status}: ${searchResponse.statusText}`,
        airtableError: errorText
      });
    }

    const searchData = await searchResponse.json();
    console.log('Search result:', {
      recordsFound: searchData.records ? searchData.records.length : 0
    });

    const recordData = {
      fields: {
        uid: uid,
        wordCatalogue: JSON.stringify(wordCatalogue),
        lastUpdated: new Date().toISOString()
      }
    };

    let response;
    let operation;
    
    if (searchData.records && searchData.records.length > 0) {
      // Update existing record
      operation = 'update';
      const recordId = searchData.records[0].id;
      const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${recordId}`;
      
      console.log(`Updating existing record ${recordId}`);
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
      operation = 'create';
      const createUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
      
      console.log('Creating new record');
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
      const errorText = await response.text();
      console.error(`Airtable ${operation} error:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      return res.status(response.status).json({ 
        error: `Failed to ${operation} record in Airtable`,
        details: `HTTP ${response.status}: ${response.statusText}`,
        airtableError: errorText
      });
    }

    const result = await response.json();
    console.log(`Successfully ${operation}d record:`, result.id);
    
    return res.status(200).json({ 
      success: true, 
      recordId: result.id,
      operation: operation,
      wordsCount: wordCatalogue.length
    });

  } catch (error) {
    console.error('Unexpected error in saveCatalogue:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Load catalogue endpoint
app.get('/api/loadCatalogue', async (req, res) => {
  console.log('=== LOAD CATALOGUE REQUEST ===');
  
  try {
    const { uid } = req.query;
    
    console.log('Query parameters:', { uid: uid ? 'present' : 'missing' });

    if (!uid) {
      console.error('Validation error: Missing uid parameter');
      return res.status(400).json({ 
        error: 'Missing required parameter: uid',
        details: 'User ID is required to load catalogue'
      });
    }

    console.log(`Loading catalogue for user ${uid}`);

    // Search for user record
    const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula={uid}='${uid}'`;
    
    console.log('Fetching from Airtable...');
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable fetch error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      return res.status(response.status).json({ 
        error: 'Failed to fetch from Airtable',
        details: `HTTP ${response.status}: ${response.statusText}`,
        airtableError: errorText
      });
    }

    const data = await response.json();
    console.log('Airtable response:', {
      recordsFound: data.records ? data.records.length : 0
    });

    if (!data.records || data.records.length === 0) {
      console.log('No catalogue found for user');
      return res.status(404).json({ 
        error: 'No catalogue found for user',
        details: 'User has no saved word catalogue'
      });
    }

    const record = data.records[0];
    let wordCatalogue;
    
    try {
      wordCatalogue = JSON.parse(record.fields.wordCatalogue || '[]');
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return res.status(500).json({
        error: 'Invalid catalogue data format',
        details: 'Stored catalogue data is corrupted'
      });
    }

    const lastUpdated = record.fields.lastUpdated;

    console.log(`Successfully loaded catalogue with ${wordCatalogue.length} words`);

    return res.status(200).json({
      wordCatalogue,
      lastUpdated,
      recordId: record.id,
      wordsCount: wordCatalogue.length
    });

  } catch (error) {
    console.error('Unexpected error in loadCatalogue:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Express error handler:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: error.message
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Route not found',
    details: `${req.method} ${req.path} is not a valid endpoint`
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`📊 Airtable Base: ${AIRTABLE_BASE_ID}`);
  console.log(`📋 Table: ${AIRTABLE_TABLE_NAME}`);
  console.log(`🔑 API Key: ${AIRTABLE_API_KEY.substring(0, 10)}...`);
});