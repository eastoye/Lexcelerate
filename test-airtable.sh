#!/bin/bash

# Test script for Airtable API endpoints
# Make sure your server is running on localhost:3000

echo "=== Testing Airtable API Endpoints ==="
echo ""

# Test 1: Save a catalogue (POST)
echo "1. Testing SAVE catalogue..."
curl -X POST http://localhost:3000/api/saveCatalogue \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "test-user-123",
    "email": "test@example.com",
    "wordCatalogue": [
      {
        "word": "serendipity",
        "totalAttempts": 5,
        "correctFirstTryCount": 3,
        "mistakes": {"serendipity": 1, "serendipidy": 1},
        "nextReview": 1703097600000,
        "interval": 2,
        "score": 85,
        "streak": 2
      },
      {
        "word": "eloquence",
        "totalAttempts": 3,
        "correctFirstTryCount": 2,
        "mistakes": {},
        "nextReview": 1703097600000,
        "interval": 1,
        "score": 92,
        "streak": 1
      }
    ]
  }'

echo ""
echo ""

# Test 2: Load the catalogue (GET)
echo "2. Testing LOAD catalogue..."
curl -X GET "http://localhost:3000/api/loadCatalogue?uid=test-user-123"

echo ""
echo ""

# Test 3: Test with non-existent user (should return 404)
echo "3. Testing with non-existent user (should return 404)..."
curl -X GET "http://localhost:3000/api/loadCatalogue?uid=non-existent-user"

echo ""
echo ""

# Test 4: Test missing parameters (should return 400)
echo "4. Testing missing uid parameter (should return 400)..."
curl -X GET "http://localhost:3000/api/loadCatalogue"

echo ""
echo ""

# Test 5: Update existing catalogue
echo "5. Testing UPDATE existing catalogue..."
curl -X POST http://localhost:3000/api/saveCatalogue \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "test-user-123",
    "email": "test@example.com",
    "wordCatalogue": [
      {
        "word": "serendipity",
        "totalAttempts": 6,
        "correctFirstTryCount": 4,
        "mistakes": {"serendipity": 1, "serendipidy": 1},
        "nextReview": 1703097600000,
        "interval": 3,
        "score": 90,
        "streak": 3
      },
      {
        "word": "eloquence",
        "totalAttempts": 3,
        "correctFirstTryCount": 2,
        "mistakes": {},
        "nextReview": 1703097600000,
        "interval": 1,
        "score": 92,
        "streak": 1
      },
      {
        "word": "ephemeral",
        "totalAttempts": 1,
        "correctFirstTryCount": 1,
        "mistakes": {},
        "nextReview": 1703097600000,
        "interval": 1,
        "score": 100,
        "streak": 1
      }
    ]
  }'

echo ""
echo ""

echo "=== Test Complete ==="
echo "Check your Airtable base to see if the data was saved correctly!"