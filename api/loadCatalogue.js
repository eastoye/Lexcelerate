// Backend API endpoint to load catalogue from Airtable
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = 'appGTI1rWPE4kOtwW';
const TABLE_NAME = 'WordCatalogues';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!AIRTABLE_API_KEY) {
    return res.status(500).json({ error: 'Airtable API key not configured' });
  }

  try {
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({ error: 'Missing uid parameter' });
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
      return res.status(404).json({ error: 'No catalogue found for this user' });
    }

    const record = data.records[0];
    const wordCatalogueString = record.fields.wordCatalogue;
    
    let wordCatalogue = [];
    if (wordCatalogueString) {
      try {
        wordCatalogue = JSON.parse(wordCatalogueString);
      } catch (parseError) {
        console.error('Error parsing word catalogue:', parseError);
        wordCatalogue = [];
      }
    }

    res.status(200).json({ 
      success: true,
      wordCatalogue: wordCatalogue,
      lastUpdated: record.fields.lastUpdated
    });

  } catch (error) {
    console.error('Error loading from Airtable:', error);
    res.status(500).json({ 
      error: 'Failed to load catalogue',
      details: error.message 
    });
  }
}