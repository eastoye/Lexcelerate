// Backend API endpoint to save catalogue to Airtable
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!AIRTABLE_API_KEY) {
    return res.status(500).json({ error: 'Airtable API key not configured' });
  }

  try {
    const { uid, email, wordCatalogue } = req.body;

    if (!uid || !wordCatalogue) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // First, check if a record exists for this user
    const searchUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}?filterByFormula={uid}="${uid}"`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      throw new Error(`Airtable search failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    const recordData = {
      fields: {
        uid: uid,
        email: email || '',
        wordCatalogue: JSON.stringify(wordCatalogue),
        lastUpdated: new Date().toISOString()
      }
    };

    let result;
    
    if (searchData.records && searchData.records.length > 0) {
      // Update existing record
      const recordId = searchData.records[0].id;
      const updateUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}/${recordId}`;
      
      const updateResponse = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(recordData)
      });

      if (!updateResponse.ok) {
        throw new Error(`Airtable update failed: ${updateResponse.status}`);
      }

      result = await updateResponse.json();
    } else {
      // Create new record
      const createUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;
      
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ records: [recordData] })
      });

      if (!createResponse.ok) {
        throw new Error(`Airtable create failed: ${createResponse.status}`);
      }

      const createData = await createResponse.json();
      result = createData.records[0];
    }

    res.status(200).json({ 
      success: true, 
      recordId: result.id,
      message: 'Catalogue saved successfully' 
    });

  } catch (error) {
    console.error('Error saving to Airtable:', error);
    res.status(500).json({ 
      error: 'Failed to save catalogue',
      details: error.message 
    });
  }
}