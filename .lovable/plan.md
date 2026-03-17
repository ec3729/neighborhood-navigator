

## Add Live Tally to Canvass Session

Add three small badge/count indicators next to the progress bar showing real-time confirmed, updated, and skipped counts.

### Changes

**`src/pages/CanvassPage.tsx`**
- Move the `confirmedCount`, `updatedCount`, `skippedCount` derived values (already computed from `reviews` Map) above the progress bar section
- Add a row of three compact badges/labels below the progress bar:
  - ✓ Confirmed: N (green/default badge)
  - ✏️ Updated: N (secondary badge)  
  - ⏭ Skipped: N (outline badge)
- Replace the current "X reviewed" text with this tally row

