## Sort Canvas Locations by Street Groups with Odd/Even Ordering

### Overview

Add a client-side sorting function to the Canvas page that reorders fetched locations before presenting them. The sort logic:

1. Parse each address to extract the house number and street name
2. Group locations by street name
3. Within each street, split into chunks of 10
4. Within each chunk of 10, show odd-numbered addresses first (ascending), then even-numbered addresses (ascending)

Add functionality to be able to pick different sorting functions.

### Changes

`**src/pages/CanvasPage.tsx**`

Add a helper function `sortLocationsByStreetGroups(locations)` that:

1. **Parses addresses**: Uses a regex like `/^(\d+)\s+(.+)$/` to extract the leading house number and the remaining street name. Addresses without a leading number go into a fallback group at the end.
2. **Groups by street name**: Normalizes street names (trim, lowercase) to group correctly.
3. **Sorts streets alphabetically**, then within each street:
  - Sorts all addresses by house number ascending
  - Splits into chunks of 10
  - Within each chunk: odd numbers first (ascending), then even numbers (ascending)
4. **Flattens** the grouped/chunked result back into a single ordered array.

Apply this sort after fetching locations (line 94), replacing:

```ts
setLocations((data || []) as Location[]);
```

with:

```ts
setLocations(sortLocationsByStreetGroups((data || []) as Location[]));
```

Also display the current street group name and chunk indicator in the card header area so the user knows which group they're reviewing (e.g., "Main Street — Group 1 of 3").

### Technical Details

- Pure client-side sort, no database changes needed
- The sorting function handles edge cases: addresses without numbers, duplicate numbers, non-numeric prefixes
- The existing filter params and query logic remain unchanged; sorting is applied after fetch