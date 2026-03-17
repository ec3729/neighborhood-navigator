

## Fix: Preserve progress when changing sort mode

When the user changes sort mode mid-session, the current effect (line 134-141) resets `currentIndex`, `reviews`, and `finished`. Instead, we should re-sort the locations and remap the user's position to the same location they were viewing.

### Changes to `src/pages/CanvassPage.tsx`

Modify the re-sort `useEffect` (lines 134-141):

1. Before re-sorting, capture the current location's `id`
2. Apply the new sort order
3. Find the index of that same location in the newly sorted array and set `currentIndex` to it (fallback to 0 if not found)
4. **Do not** reset `reviews` or `finished`

```typescript
useEffect(() => {
  if (rawLocationsRef.current.length > 0) {
    const currentId = locations[currentIndex]?.id;
    applySort(rawLocationsRef.current, sortMode);
    // After applySort updates locations via setState, find the same location
    // We need to compute the new sorted array inline to get the new index
    const { sorted } = sortLocationsByStreetGroups(rawLocationsRef.current);
    const newList = sortMode === "street_groups" ? sorted : rawLocationsRef.current;
    const newIdx = currentId ? newList.findIndex(l => l.id === currentId) : 0;
    setCurrentIndex(newIdx >= 0 ? newIdx : 0);
  }
}, [sortMode]);
```

No other files affected. Reviews, finished state, and progress counters are fully preserved.

