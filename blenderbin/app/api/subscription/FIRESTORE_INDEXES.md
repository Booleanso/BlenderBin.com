# Firestore Indexes Required

## Overview
The subscription system requires specific Firestore indexes for optimal performance. The current implementation avoids using `orderBy` to prevent index errors, but you can create these indexes for better performance.

## Required Composite Indexes

### For subscriptions collection
**Collection ID**: `subscriptions` (under `customers/{userId}/`)

#### Index 1: Status + Created Date
- **Fields**:
  - `status` (Ascending) - Array-contains-any
  - `created` (Descending)
- **Query scope**: Collection

#### Index 2: Status only (automatically created)
- **Fields**:
  - `status` (Ascending) - Array-contains-any
- **Query scope**: Collection

## How to Create Indexes

### Option 1: Firestore Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Firestore Database
4. Click on "Indexes" tab
5. Click "Create Index"
6. Set up the composite index as described above

### Option 2: Firebase CLI
```bash
# firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "subscriptions",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "arrayConfig": "CONTAINS",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "created",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
```

### Option 3: Let the error guide you
1. Make a query that fails
2. Copy the URL from the error message
3. Click the URL to auto-create the index

## Performance Impact

Without the index:
- Queries work but are slower
- Manual sorting is performed in application code
- Limited to small result sets

With the index:
- Faster queries
- Native Firestore sorting
- Can handle larger datasets efficiently

## Current Workaround

The current implementation:
1. Removes `orderBy` from queries to avoid index errors
2. Fetches up to 5 documents
3. Sorts manually by `created` date in application code
4. Takes the most recent subscription

This works well for small numbers of subscriptions per user but should be optimized with proper indexes for production use. 