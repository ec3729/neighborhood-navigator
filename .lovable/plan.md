

## Bug: Canvass session progress resets on every confirm/save

### Root Cause

The re-sort `useEffect` on line 134-141 has `rawLocations` in its dependency array:

```javascript
useEffect(() => {
  if (rawLocations.length > 0) {
    applySort(rawLocations, sortMode);
    setCurrentIndex(0);      // ← resets position to first card
    setReviews(new Map());   // ← wipes all review progress
    setFinished(false);
  }
}, [sortMode, applySort, rawLocations]);  // ← rawLocations triggers this
```

Every time `handleConfirm` or `handleSaveAndNext` calls `setRawLocations(...)` to keep the raw data in sync, this effect fires. It resets `currentIndex` to 0 and clears the `reviews` Map — which is why the reviewed count drops back to zero and the card jumps back to the start.

### Fix

**Separate the re-sort effect from the data-sync updates.** The re-sort + reset should only happen when `sortMode` changes, not when individual location properties are updated in-place.

1. **Remove `rawLocations` from the re-sort effect's dependency array** — make it only respond to `sortMode` changes by using a ref for rawLocations or restructuring the effect.

2. **Use a `useRef` for rawLocations** to hold the current data without triggering the effect. The re-sort effect reads from the ref, and `sortMode` remains the only trigger for the reset.

3. **Update `handleConfirm` and `handleSaveAndNext`** to update both `locations` and the ref in-place (as they already do for `locations`) without triggering a re-sort. The existing `setLocations(prev => prev.map(...))` calls are correct — they just shouldn't also trigger the re-sort effect.

4. **For the status badge on the current card**: it shows `current.status` which reflects the pre-update value until re-render. Since `advance()` is called immediately after `setLocations`, the user moves to the next card before seeing the updated badge. This is acceptable behavior, but the status in the progress summary at the end will be correct.

### Files Changed

- `src/pages/CanvassPage.tsx` — refactor rawLocations to a ref, restrict re-sort effect to `sortMode` changes only

