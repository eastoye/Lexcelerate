// Backend API endpoint to load catalogue from Airtable
import 'dotenv/config';

const BASE_ID = 'appm9iGdIBKGBzzeF';
const TABLE_NAME = 'Table 1';

export default async function handler(req, res) {
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405, {'Content-Type': 'application/json'});
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  if (!AIRTABLE_API_KEY) {
    res.writeHead(500, {'Content-Type': 'application/json'});
    return res.end(JSON.stringify({ error: 'Airtable API key not configured' }));
  }

  try {
    const { uid } = req.query;

    if (!uid) {
      res.writeHead(400, {'Content-Type': 'application/json'});
      return res.end(JSON.stringify({ error: 'Missing uid parameter' }));
    }

    // Search for the user's record
    const searchUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}?filterByFormula={uid}="${uid}"`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.records || data.records.length === 0) {
      res.writeHead(404, {'Content-Type': 'application/json'});
      return res.end(JSON.stringify({ error: 'No catalogue found for this user' }));
    }

    const record = data.records[0];
    const wordCatalogueString = record.fields.WordCatalogues;
    
    let wordCatalogue = [];
    if (wordCatalogueString) {
      try {
        wordCatalogue = JSON.parse(wordCatalogueString);
      } catch (parseError) {
        console.error('Error parsing word catalogue:', parseError);
        wordCatalogue = [];
      }
    }

    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ 
      success: true,
      wordCatalogue: wordCatalogue,
      lastUpdated: record.fields.lastUpdated
    }));

  } catch (error) {
    console.error('Error loading from Airtable:', error);
    res.writeHead(500, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ 
      error: 'Failed to load catalogue',
      details: error.message 
    }));
  }
}