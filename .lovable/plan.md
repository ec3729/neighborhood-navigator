

## Add "Access Type" Field to Locations

### Overview
Add a nullable `access_type` text column to locations with values: Public, Private, Mixed. Expose it on the Location Details page (view + inline edit) and the Canvas review card.

### Database Migration
```sql
ALTER TABLE public.locations ADD COLUMN access_type text NULL;
```

### Code Changes

**`src/pages/LocationDetailsPage.tsx`**
- Add `access_type` to the Location interface and edit state
- Add a Select dropdown in the Details card (alongside category) with Public / Private / Mixed options
- Include in `handleSave`

**`src/pages/CanvasPage.tsx`**
- Add `access_type` to the Location interface and fetch query
- Add `editAccessType` state, sync on card change
- Add a Select dropdown to the card form
- Include in `isDirty` check and `handleSaveAndNext`

**`src/pages/Locations.tsx`**
- Add `access_type` to the Location interface

