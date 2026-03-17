import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function airtableFetch(path: string, pat: string, options: RequestInit = {}) {
  const res = await fetch(`https://api.airtable.com/v0${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${pat}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Airtable API error ${res.status}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return jsonResponse({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    // Admin check
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
    if (!roleData?.length) return jsonResponse({ error: "Admin access required" }, 403);

    // PAT check
    const pat = Deno.env.get("AIRTABLE_PAT");
    
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (!action) return jsonResponse({ error: "Missing action" }, 400);

    // Actions that need PAT
    if (!pat && action !== "check-status") {
      return jsonResponse({ error: "AIRTABLE_PAT secret not configured. Please add your Airtable Personal Access Token." }, 400);
    }

    switch (action) {
      case "check-status": {
        return jsonResponse({ configured: !!pat });
      }

      case "list-bases": {
        const data = await airtableFetch("/meta/bases", pat!);
        return jsonResponse({ bases: data.bases || [] });
      }

      case "list-tables": {
        const { baseId } = body;
        if (!baseId) return jsonResponse({ error: "Missing baseId" }, 400);
        const data = await airtableFetch(`/meta/bases/${baseId}/tables`, pat!);
        return jsonResponse({ tables: (data.tables || []).map((t: any) => ({ id: t.id, name: t.name, fields: t.fields?.map((f: any) => ({ id: f.id, name: f.name, type: f.type })) || [] })) });
      }

      case "import": {
        // Get config
        const { data: configs } = await supabase.from("airtable_config").select("*").limit(1);
        const config = configs?.[0];
        if (!config) return jsonResponse({ error: "Airtable not configured. Go to Settings to set up." }, 400);

        const fieldMapping = config.field_mapping as Record<string, string>;
        const reverseMapping: Record<string, string> = {};
        for (const [atField, locCol] of Object.entries(fieldMapping)) {
          reverseMapping[atField] = locCol;
        }

        // Fetch all records from Airtable (paginated)
        let allRecords: any[] = [];
        let offset: string | undefined;
        do {
          const params = offset ? `?offset=${offset}` : "";
          const data = await airtableFetch(`/${config.base_id}/${config.table_id}${params}`, pat!);
          allRecords = allRecords.concat(data.records || []);
          offset = data.offset;
        } while (offset);

        let imported = 0;
        const errors: string[] = [];

        // Get zones for mapping
        const { data: zones } = await supabase.from("zones").select("id, name");
        const zoneMap = new Map((zones ?? []).map((z: any) => [z.name.toLowerCase(), z.id]));

        for (const record of allRecords) {
          const fields = record.fields || {};
          const mapped: Record<string, any> = { created_by: userId };

          for (const [atField, locCol] of Object.entries(reverseMapping)) {
            const val = fields[atField];
            if (val !== undefined && val !== null && val !== "") {
              if (locCol === "zone_name") {
                mapped.zone_id = zoneMap.get(String(val).toLowerCase()) ?? null;
              } else if (locCol === "latitude" || locCol === "longitude") {
                mapped[locCol] = parseFloat(val);
              } else {
                mapped[locCol] = val;
              }
            }
          }

          if (!mapped.address) { errors.push(`Record ${record.id}: no address mapped`); continue; }
          mapped.location_type = mapped.location_type || "residential";
          mapped.status = mapped.status || "not_surveyed";

          const { error } = await supabase.from("locations").insert(mapped);
          if (error) errors.push(`Record ${record.id}: ${error.message}`);
          else imported++;
        }

        // Update last_synced_at
        await supabase.from("airtable_config").update({ last_synced_at: new Date().toISOString() }).eq("id", config.id);

        return jsonResponse({ imported, errors, total: allRecords.length });
      }

      case "export": {
        const { data: configs } = await supabase.from("airtable_config").select("*").limit(1);
        const config = configs?.[0];
        if (!config) return jsonResponse({ error: "Airtable not configured" }, 400);

        const fieldMapping = config.field_mapping as Record<string, string>;
        // fieldMapping: { airtableField: locationColumn }

        const { data: locations, error: locError } = await supabase.from("locations").select("*, zones(name)");
        if (locError) throw locError;

        // Batch create in Airtable (max 10 per request)
        const records = (locations || []).map((loc: any) => {
          const fields: Record<string, any> = {};
          for (const [atField, locCol] of Object.entries(fieldMapping)) {
            if (locCol === "zone_name") {
              fields[atField] = loc.zones?.name || "";
            } else {
              fields[atField] = (loc as any)[locCol] ?? "";
            }
          }
          return { fields };
        });

        let exported = 0;
        for (let i = 0; i < records.length; i += 10) {
          const batch = records.slice(i, i + 10);
          await airtableFetch(`/${config.base_id}/${config.table_id}`, pat!, {
            method: "POST",
            body: JSON.stringify({ records: batch }),
          });
          exported += batch.length;
        }

        await supabase.from("airtable_config").update({ last_synced_at: new Date().toISOString() }).eq("id", config.id);

        return jsonResponse({ exported });
      }

      case "sync": {
        // Two-way: import then export
        // For simplicity, run import first, then export
        const { data: configs } = await supabase.from("airtable_config").select("*").limit(1);
        const config = configs?.[0];
        if (!config) return jsonResponse({ error: "Airtable not configured" }, 400);

        const fieldMapping = config.field_mapping as Record<string, string>;

        // Import phase
        let allRecords: any[] = [];
        let offset: string | undefined;
        do {
          const params = offset ? `?offset=${offset}` : "";
          const data = await airtableFetch(`/${config.base_id}/${config.table_id}${params}`, pat!);
          allRecords = allRecords.concat(data.records || []);
          offset = data.offset;
        } while (offset);

        const { data: zones } = await supabase.from("zones").select("id, name");
        const zoneMap = new Map((zones ?? []).map((z: any) => [z.name.toLowerCase(), z.id]));

        let imported = 0;
        for (const record of allRecords) {
          const fields = record.fields || {};
          const mapped: Record<string, any> = { created_by: userId };
          for (const [atField, locCol] of Object.entries(fieldMapping)) {
            const val = fields[atField];
            if (val != null && val !== "") {
              if (locCol === "zone_name") mapped.zone_id = zoneMap.get(String(val).toLowerCase()) ?? null;
              else if (locCol === "latitude" || locCol === "longitude") mapped[locCol] = parseFloat(val);
              else mapped[locCol] = val;
            }
          }
          if (!mapped.address) continue;
          mapped.location_type = mapped.location_type || "residential";
          mapped.status = mapped.status || "not_surveyed";
          const { error } = await supabase.from("locations").insert(mapped);
          if (!error) imported++;
        }

        // Export phase
        const { data: locations } = await supabase.from("locations").select("*, zones(name)");
        const exportRecords = (locations || []).map((loc: any) => {
          const fields: Record<string, any> = {};
          for (const [atField, locCol] of Object.entries(fieldMapping)) {
            if (locCol === "zone_name") fields[atField] = loc.zones?.name || "";
            else fields[atField] = (loc as any)[locCol] ?? "";
          }
          return { fields };
        });

        let exported = 0;
        for (let i = 0; i < exportRecords.length; i += 10) {
          const batch = exportRecords.slice(i, i + 10);
          try {
            await airtableFetch(`/${config.base_id}/${config.table_id}`, pat!, {
              method: "POST",
              body: JSON.stringify({ records: batch }),
            });
            exported += batch.length;
          } catch { /* continue on batch error */ }
        }

        await supabase.from("airtable_config").update({ last_synced_at: new Date().toISOString() }).eq("id", config.id);

        return jsonResponse({ imported, exported });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err: any) {
    console.error("airtable-sync error:", err);
    return jsonResponse({ error: err.message || "Internal error" }, 500);
  }
});
