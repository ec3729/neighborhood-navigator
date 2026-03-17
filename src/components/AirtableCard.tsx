import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, Download, Upload, RefreshCw, Loader2, Settings } from "lucide-react";

export default function AirtableCard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data } = await supabase.from("airtable_config").select("*").limit(1);
    setConfig(data?.[0] || null);
    setLoading(false);
  };

  const callEdgeFunction = async (action: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/airtable-sync`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  };

  const handleAction = async (action: string, label: string) => {
    setActionLoading(action);
    try {
      const result = await callEdgeFunction(action);
      let desc = "";
      if (action === "import") desc = `${result.imported} locations imported. ${result.errors?.length || 0} errors.`;
      else if (action === "export") desc = `${result.exported} locations exported to Airtable.`;
      else if (action === "sync") desc = `Imported ${result.imported}, exported ${result.exported}.`;
      toast({ title: `${label} complete`, description: desc });
      loadConfig(); // refresh last_synced_at
    } catch (err: any) {
      toast({ title: `${label} failed`, description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="h-5 w-5" /> Airtable
        </CardTitle>
        <CardDescription>Import, export, or sync locations with Airtable.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!config ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Airtable integration not configured yet.</p>
            <Button variant="outline" onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4 mr-2" /> Configure in Settings
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">Connected</Badge>
              {config.last_synced_at && (
                <span className="text-xs text-muted-foreground">
                  Last synced: {new Date(config.last_synced_at).toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => handleAction("import", "Import")}
                disabled={!!actionLoading}
              >
                {actionLoading === "import" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                Import from Airtable
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAction("export", "Export")}
                disabled={!!actionLoading}
              >
                {actionLoading === "export" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Export to Airtable
              </Button>
              <Button
                onClick={() => handleAction("sync", "Sync")}
                disabled={!!actionLoading}
              >
                {actionLoading === "sync" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Sync Now
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
