// Secure backend API to save word catalogue to Airtable
const AIRTABLE_API_KEY = "patQtWH6v6F1x0kOc.eaaa3f2f6cbe84d09dd87610a3eb5cfa5256606f68eb668c5929bcf8800da8d3";
const AIRTABLE_BASE_ID = "appGTI1rWPE4kOtwW";
const AIRTABLE_TABLE_NAME = "WordCatalogues";

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
}