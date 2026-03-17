

## Airtable Integration for Data Management

### Overview
Add two-way Airtable sync to the Data Management page, with configuration stored in Settings. This requires a Personal Access Token from the user, a backend function to proxy Airtable API calls, a new database table for config, and UI updates to both Settings and Data Management pages.

### Architecture

```text
Browser  →  Edge Function (airtable-sync)  →  Airtable REST API
                  ↕
            Supabase DB (locations, airtable_config)
```

### Step 1: Store the Airtable API Token
- Use the `add_secret` tool to request the user's Airtable Personal Access Token (created at airtable.com/create/tokens with `data.records:read` and `data.records:write` scopes)
- Stored as `AIRTABLE_PAT` secret, accessible to edge functions

### Step 2: New DB table — `airtable_config`
Stores the admin's Airtable connection settings (one row per org, but we keep it simple with a single-row table):

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | default gen_random_uuid() |
| base_id | text | e.g. `appXXXXXXXX` |
| table_id | text | e.g. `tblXXXXXXXX` |
| field_mapping | jsonb | Maps Airtable field names → location columns |
| sync_enabled | boolean | default false |
| last_synced_at | timestamptz | nullable |
| created_by | uuid | user who configured |
| updated_at | timestamptz | default now() |

RLS: Only admins can read/write.

### Step 3: Edge Function — `airtable-sync`
A single edge function with action-based routing. Validates auth (admin only), reads config from `airtable_config`, and calls the Airtable REST API using the stored PAT.

**Actions:**
- `list-bases` — `GET https://api.airtable.com/v0/meta/bases` (for config UI)
- `list-tables` — `GET https://api.airtable.com/v0/meta/bases/{baseId}/tables`
- `import` — Fetches records from Airtable, maps fields, upserts into `locations`
- `export` — Reads `locations`, maps fields, batch creates/updates in Airtable
- `sync` — Runs both import + export with conflict resolution (latest `updated_at` wins)

Uses `AIRTABLE_PAT` secret. Includes CORS headers. Input validated with Zod.

### Step 4: Settings Page — Airtable Config Section
Add a new Card to SettingsPage for Airtable configuration:
- Dropdown to select Base (fetched via edge function `list-bases`)
- Dropdown to select Table (fetched via `list-tables`)
- Field mapping UI: for each location column, select the corresponding Airtable field name
- Toggle for "Enable auto-sync"
- Save button → upserts into `airtable_config` table

### Step 5: Data Management Page — Airtable Section
Add a third Card below Import with Airtable operations:
- Shows connection status (configured or not, last synced time)
- Three buttons: **Import from Airtable**, **Export to Airtable**, **Sync Now**
- Each calls the edge function with the appropriate action
- Progress/result shown via toast notifications
- If not configured, show a link to Settings page

### File Changes Summary

| File | Change |
|------|--------|
| `supabase/functions/airtable-sync/index.ts` | New edge function |
| `supabase/config.toml` | Add function config with `verify_jwt = false` |
| `src/pages/SettingsPage.tsx` | Add Airtable config section |
| `src/pages/DataManagementPage.tsx` | Add Airtable import/export/sync card |
| Migration | Create `airtable_config` table with RLS |

### Field Mapping Defaults
The config UI will suggest sensible defaults mapping common Airtable field names to location columns:
- "Name" → `name`, "Address" → `address`, "Type" → `location_type`, "Status" → `status`, "Latitude" → `latitude`, "Longitude" → `longitude`, etc.

Admins can customize these mappings for their specific Airtable schema.

