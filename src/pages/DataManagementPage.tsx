import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, FileUp, Loader2, AlertCircle } from "lucide-react";

const VALID_LOCATION_TYPES = ["residential", "business", "vacant", "public_space"];
const VALID_STATUSES = ["not_surveyed", "in_progress", "surveyed"];

const CSV_COLUMNS = ["name", "address", "location_type", "status", "category", "access_type", "zone_name", "latitude", "longitude"];

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  const rows = lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { values.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    values.push(current.trim());
    return values;
  });
  return { headers, rows };
}

function escapeCSV(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function DataManagementPage() {
  const { hasRole, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (!authLoading && !hasRole("admin")) navigate("/dashboard");
  }, [authLoading, hasRole, navigate]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const [locRes, zoneRes] = await Promise.all([
        supabase.from("locations").select("*"),
        supabase.from("zones").select("id, name"),
      ]);
      if (locRes.error) throw locRes.error;
      const zoneMap = new Map((zoneRes.data ?? []).map((z) => [z.id, z.name]));

      const header = ["Name", "Address", "Location Type", "Status", "Category", "Access Type", "Zone", "Latitude", "Longitude", "Surveyed At", "Updated At"];
      const csvRows = (locRes.data ?? []).map((loc) =>
        [loc.name, loc.address, loc.location_type, loc.status, loc.category, loc.access_type, loc.zone_id ? zoneMap.get(loc.zone_id) ?? "" : "", loc.latitude, loc.longitude, loc.surveyed_at, loc.updated_at].map(escapeCSV).join(",")
      );

      const csv = [header.join(","), ...csvRows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `locations_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Export complete", description: `${locRes.data?.length ?? 0} locations exported.` });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (!parsed.headers.includes("address")) {
        toast({ title: "Invalid CSV", description: 'CSV must contain an "address" column.', variant: "destructive" });
        setPreview(null);
        return;
      }
      setPreview(parsed);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = async () => {
    if (!preview || !user) return;
    setImporting(true);
    try {
      const { data: zones } = await supabase.from("zones").select("id, name");
      const zoneMap = new Map((zones ?? []).map((z) => [z.name.toLowerCase(), z.id]));

      const { headers, rows } = preview;
      const colIdx = (col: string) => headers.indexOf(col);

      let successCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const get = (col: string) => {
          const idx = colIdx(col);
          return idx >= 0 ? row[idx]?.trim() || null : null;
        };

        const address = get("address");
        if (!address) { errors.push(`Row ${i + 1}: missing address`); continue; }

        const locationType = get("location_type");
        if (locationType && !VALID_LOCATION_TYPES.includes(locationType)) {
          errors.push(`Row ${i + 1}: invalid location_type "${locationType}"`);
          continue;
        }

        const status = get("status");
        if (status && !VALID_STATUSES.includes(status)) {
          errors.push(`Row ${i + 1}: invalid status "${status}"`);
          continue;
        }

        const zoneName = get("zone_name");
        const zoneId = zoneName ? zoneMap.get(zoneName.toLowerCase()) ?? null : null;

        const lat = get("latitude");
        const lng = get("longitude");

        const record: any = {
          address,
          created_by: user.id,
          name: get("name"),
          location_type: locationType || "residential",
          status: status || "not_surveyed",
          category: get("category"),
          access_type: get("access_type"),
          zone_id: zoneId,
          latitude: lat ? parseFloat(lat) : null,
          longitude: lng ? parseFloat(lng) : null,
        };

        const { error } = await supabase.from("locations").insert(record);
        if (error) { errors.push(`Row ${i + 1}: ${error.message}`); }
        else { successCount++; }
      }

      if (errors.length > 0) {
        toast({
          title: `Import partially complete`,
          description: `${successCount} imported, ${errors.length} failed. First error: ${errors[0]}`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Import complete", description: `${successCount} locations imported successfully.` });
      }
      setPreview(null);
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Data Management</h1>
        <p className="text-muted-foreground">Import and export location data as CSV files.</p>
      </div>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Download className="h-5 w-5" /> Export Locations
          </CardTitle>
          <CardDescription>Download all location data as a CSV file.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </CardContent>
      </Card>

      {/* Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5" /> Import Locations
          </CardTitle>
          <CardDescription>
            Upload a CSV file with columns: {CSV_COLUMNS.join(", ")}. Only <strong>address</strong> is required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <FileUp className="h-4 w-4 mr-2" /> Select CSV File
            </Button>
            {fileName && <span className="ml-3 text-sm text-muted-foreground">{fileName}</span>}
          </div>

          {preview && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span>
                  Preview: showing {Math.min(preview.rows.length, 5)} of {preview.rows.length} rows
                </span>
              </div>

              <div className="border rounded-md overflow-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {preview.headers.map((h) => (
                        <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j} className="whitespace-nowrap">{cell || <span className="text-muted-foreground italic">empty</span>}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  {importing ? "Importing…" : `Import ${preview.rows.length} Rows`}
                </Button>
                <Button variant="outline" onClick={() => { setPreview(null); setFileName(""); }}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
