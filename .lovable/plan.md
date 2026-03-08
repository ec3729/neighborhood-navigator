

## Remove Type from Sample Locations

Two changes needed:

### 1. Schema Migration
Alter `location_type` column to allow NULL:
```sql
ALTER TABLE locations ALTER COLUMN location_type DROP NOT NULL;
```

### 2. Data Update
Set `location_type` to NULL for the 20 "Main St" sample records:
```sql
UPDATE locations SET location_type = NULL WHERE address LIKE '% Main St';
```

### 3. Code Update
Update `src/pages/CanvasPage.tsx` and `src/pages/Locations.tsx` to handle nullable `location_type` (guard against null in display/select components, show "—" or similar when unset).

