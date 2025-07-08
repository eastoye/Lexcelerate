// Secure backend API to load word catalogue from Airtable
const AIRTABLE_API_KEY = "patQtWH6v6F1x0kOc.eaaa3f2f6cbe84d09dd87610a3eb5cfa5256606f68eb668c5929bcf8800da8d3";
const AIRTABLE_BASE_ID = "appGTI1rWPE4kOtwW";
const AIRTABLE_TABLE_NAME = "WordCatalogues";

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
}