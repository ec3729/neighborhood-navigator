

## Add Notes Field to Locations

### What
Add a `notes` text column to the `locations` table so admins and canvassers can capture freeform notes. Display and edit notes on the Location Details page and in the Canvass review cards.

### Database
- Add `notes text nullable` column to `locations` table via migration
- Existing RLS policies already allow surveyors to create and admins/creators to update locations, so no policy changes needed

### Code Changes

**`src/pages/LocationDetailsPage.tsx`**
- Add `notes` to the Location interface and the select query
- Add an editable Notes section (textarea) alongside the existing inline-edit fields

**`src/pages/CanvassPage.tsx`**
- Add `notes` to the Location interface and select query
- Add `editNotes` state and a Textarea field on the canvass card
- Include `notes` in the `isDirty` check and the save/update logic
- Canvassers can type notes during review and save them with "Save & Next"

**`src/pages/Locations.tsx`** (if it selects location fields)
- Add `notes` to the select query so it's available if needed

### UI
- Notes field uses a `<Textarea>` component with placeholder "Add notes..."
- Placed below Access Type on both the detail page and canvass card
- Full width, 3-4 rows default height

