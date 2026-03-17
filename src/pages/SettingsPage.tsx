import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, Database, Loader2, RefreshCw } from "lucide-react";

const LOCATION_COLUMNS = [
  { value: "name", label: "Name" },
  { value: "address", label: "Address" },
  { value: "location_type", label: "Location Type" },
  { value: "status", label: "Status" },
  { value: "category", label: "Category" },
  { value: "access_type", label: "Access Type" },
  { value: "zone_name", label: "Zone Name" },
  { value: "latitude", label: "Latitude" },
  { value: "longitude", label: "Longitude" },
];

interface AirtableBase { id: string; name: string; }
interface AirtableTable { id: string; name: string; fields: { id: string; name: string; type: string }[]; }

export default function SettingsPage() {
  const { hasRole, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [patConfigured, setPatConfigured] = useState<boolean | null>(null);
  const [bases, setBases] = useState<AirtableBase[]>([]);
  const [tables, setTables] = useState<AirtableTable[]>([]);
  const [selectedBase, setSelectedBase] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [tableFields, setTableFields] = useState<{ name: string }[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [loadingBases, setLoadingBases] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingConfigId, setExistingConfigId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !hasRole("admin")) navigate("/dashboard");
  }, [authLoading, hasRole, navigate]);

  // Check PAT status and load existing config
  useEffect(() => {
    if (!user) return;
    checkStatus();
    loadExistingConfig();
  }, [user]);

  const callEdgeFunction = async (action: string, extra: Record<string, any> = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/airtable-sync`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  };

  const checkStatus = async () => {
    try {
      const data = await callEdgeFunction("check-status");
      setPatConfigured(data.configured);
    } catch { setPatConfigured(false); }
  };

  const loadExistingConfig = async () => {
    const { data } = await supabase.from("airtable_config").select("*").limit(1);
    if (data?.[0]) {
      const config = data[0];
      setExistingConfigId(config.id);
      setSelectedBase(config.base_id);
      setSelectedTable(config.table_id);
      setFieldMapping((config.field_mapping as Record<string, string>) || {});
      setSyncEnabled(config.sync_enabled);
    }
  };

  const fetchBases = async () => {
    setLoadingBases(true);
    try {
      const data = await callEdgeFunction("list-bases");
      setBases(data.bases || []);
    } catch (err: any) {
      toast({ title: "Failed to load bases", description: err.message, variant: "destructive" });
    } finally { setLoadingBases(false); }
  };

  const fetchTables = async (baseId: string) => {
    setLoadingTables(true);
    try {
      const data = await callEdgeFunction("list-tables", { baseId });
      setTables(data.tables || []);
    } catch (err: any) {
      toast({ title: "Failed to load tables", description: err.message, variant: "destructive" });
    } finally { setLoadingTables(false); }
  };

  const handleBaseChange = (baseId: string) => {
    setSelectedBase(baseId);
    setSelectedTable("");
    setTableFields([]);
    setFieldMapping({});
    if (baseId) fetchTables(baseId);
  };

  const handleTableChange = (tableId: string) => {
    setSelectedTable(tableId);
    const table = tables.find((t) => t.id === tableId);
    setTableFields(table?.fields || []);
    // Auto-map by name match
    const autoMap: Record<string, string> = {};
    for (const field of table?.fields || []) {
      const match = LOCATION_COLUMNS.find(
        (col) => col.label.toLowerCase() === field.name.toLowerCase() || col.value === field.name.toLowerCase()
      );
      if (match) autoMap[field.name] = match.value;
    }
    setFieldMapping(autoMap);
  };

  const handleSave = async () => {
    if (!selectedBase || !selectedTable) {
      toast({ title: "Select base and table", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const record = {
        base_id: selectedBase,
        table_id: selectedTable,
        field_mapping: fieldMapping,
        sync_enabled: syncEnabled,
        created_by: user!.id,
      };

      if (existingConfigId) {
        const { error } = await supabase.from("airtable_config").update(record).eq("id", existingConfigId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("airtable_config").insert(record).select().single();
        if (error) throw error;
        setExistingConfigId(data.id);
      }
      toast({ title: "Airtable configuration saved" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (authLoading) return null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold font-display">Settings</h1>

      {/* Organization Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Organization Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Custom survey templates and organization settings coming soon.
        </CardContent>
      </Card>

      {/* Airtable Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-lg">
            <Database className="h-5 w-5 text-primary" />
            Airtable Integration
          </CardTitle>
          <CardDescription>
            Connect to an Airtable base to import, export, and sync location data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {patConfigured === false && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              Airtable API token not configured. Add your Personal Access Token as the <code className="font-mono bg-destructive/10 px-1 rounded">AIRTABLE_PAT</code> secret to get started.
            </div>
          )}

          {patConfigured && (
            <>
              {/* Base selection */}
              <div className="space-y-2">
                <Label>Airtable Base</Label>
                <div className="flex gap-2">
                  <Select value={selectedBase} onValueChange={handleBaseChange}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a base..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bases.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={fetchBases} disabled={loadingBases}>
                    {loadingBases ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Table selection */}
              {selectedBase && (
                <div className="space-y-2">
                  <Label>Airtable Table</Label>
                  <Select value={selectedTable} onValueChange={handleTableChange} disabled={loadingTables}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingTables ? "Loading tables..." : "Select a table..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Field mapping */}
              {tableFields.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Field Mapping</Label>
                  <p className="text-sm text-muted-foreground">Map Airtable fields to location columns.</p>
                  <div className="grid gap-3">
                    {tableFields.map((field) => (
                      <div key={field.name} className="flex items-center gap-3">
                        <span className="w-40 text-sm font-medium truncate" title={field.name}>{field.name}</span>
                        <span className="text-muted-foreground">→</span>
                        <Select
                          value={fieldMapping[field.name] || ""}
                          onValueChange={(val) =>
                            setFieldMapping((prev) => {
                              const next = { ...prev };
                              if (val === "_none") delete next[field.name];
                              else next[field.name] = val;
                              return next;
                            })
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Skip" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">Skip</SelectItem>
                            {LOCATION_COLUMNS.map((col) => (
                              <SelectItem key={col.value} value={col.value}>{col.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sync toggle */}
              <div className="flex items-center gap-3">
                <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} id="sync-toggle" />
                <Label htmlFor="sync-toggle">Enable sync</Label>
              </div>

              {/* Save */}
              <Button onClick={handleSave} disabled={saving || !selectedBase || !selectedTable}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {existingConfigId ? "Update Configuration" : "Save Configuration"}
              </Button>
            </>
          )}

          {patConfigured === null && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking configuration...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
