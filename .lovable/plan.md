

## Add Category Field to Canvas Review Card

### Overview
Add a category selector to the Canvas card so reviewers can update location categories while stepping through.

### Changes

**`src/pages/CanvasPage.tsx`**
- Add `category` to the `Location` interface
- Add `editCategory` state, sync it when card changes
- Include `category` in the `isDirty` check and `handleSaveAndNext` update call
- Add a searchable category combobox (Popover + Command) to the card form, using the existing `CATEGORY_GROUPS` from `src/lib/categories.ts` — same pattern already used on the Location Details page

