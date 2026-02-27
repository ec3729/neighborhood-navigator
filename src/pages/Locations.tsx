import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Upload, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

type LocationType = "residential" | "business" | "vacant" | "public_space";
type SurveyStatus = "not_surveyed" | "in_progress" | "surveyed";

interface Location {
  id: string;
  address: string;
  location_type: LocationType;
  status: SurveyStatus;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

const typeLabels: Record<LocationType, string> = {
  residential: "Residential",
  business: "Business",
  vacant: "Vacant",
  public_space: "Public Space",
};

const validTypes = new Set<string>(["residential", "business", "vacant", "public_space"]);

const statusColors: Record<SurveyStatus, string> = {
  not_surveyed: "bg-destructive/10 text-destructive",
  in_progress: "bg-warning/10 text-accent-foreground",
  surveyed: "bg-primary/10 text-primary",
};

interface ParsedRow {
  address: string;
  location_type: LocationType;
}

export default function Locations() {
  const { user, hasRole } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newType, setNewType] = useState<LocationType>("residential");

  // CSV upload state
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Bulk delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchLocations = async () => {
    const { data } = await supabase.from("locations").select("*").order("created_at", { ascending: false });
    if (data) setLocations(data as Location[]);
  };

  useEffect(() => { fetchLocations(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("locations").insert({
      address: newAddress,
      location_type: newType,
      created_by: user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Location added");
    setNewAddress("");
    setDialogOpen(false);
    fetchLocations();
  };

  const handleCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        setCsvErrors(["CSV must have a header row and at least one data row."]);
        setParsedRows([]);
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const addrIdx = headers.indexOf("address");
      if (addrIdx === -1) {
        setCsvErrors(["CSV must contain an 'address' column."]);
        setParsedRows([]);
        return;
      }
      const typeIdx = headers.indexOf("location_type");
      const rows: ParsedRow[] = [];
      const errors: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        const address = cols[addrIdx] || "";
        if (!address) { errors.push(`Row ${i + 1}: missing address, skipped.`); continue; }
        let locType: LocationType = "residential";
        if (typeIdx !== -1 && cols[typeIdx]) {
          const raw = cols[typeIdx].toLowerCase().replace(/\s+/g, "_");
          if (validTypes.has(raw)) {
            locType = raw as LocationType;
          } else {
            errors.push(`Row ${i + 1}: invalid type "${cols[typeIdx]}", defaulting to residential.`);
          }
        }
        rows.push({ address, location_type: locType });
      }
      setParsedRows(rows);
      setCsvErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleBulkImport = async () => {
    if (!user || parsedRows.length === 0) return;
    setUploading(true);
    let successCount = 0;
    let failCount = 0;
    const batchSize = 100;
    for (let i = 0; i < parsedRows.length; i += batchSize) {
      const batch = parsedRows.slice(i, i + batchSize).map((r) => ({
        address: r.address,
        location_type: r.location_type,
        created_by: user.id,
      }));
      const { error } = await supabase.from("locations").insert(batch);
      if (error) { failCount += batch.length; } else { successCount += batch.length; }
    }
    setUploading(false);
    setCsvDialogOpen(false);
    setParsedRows([]);
    setCsvErrors([]);
    toast.success(`Imported ${successCount} location(s)${failCount > 0 ? `, ${failCount} failed` : ""}.`);
    fetchLocations();
  };

  const filtered = locations.filter((l) => {
    const matchesSearch = l.address.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || l.location_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const canCreate = hasRole("surveyor") || hasRole("admin");
  const isAdmin = hasRole("admin");

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((l) => l.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("locations").delete().in("id", ids);
    if (error) { toast.error(error.message); return; }
    toast.success(`Deleted ${ids.length} location(s).`);
    setSelectedIds(new Set());
    fetchLocations();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Locations</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <Dialog open={csvDialogOpen} onOpenChange={(open) => { setCsvDialogOpen(open); if (!open) { setParsedRows([]); setCsvErrors([]); } }}>
              <DialogTrigger asChild>
                <Button variant="outline"><Upload className="h-4 w-4 mr-2" /> Upload CSV</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="font-display">Upload CSV</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload a CSV file with an <strong>address</strong> column and an optional <strong>location_type</strong> column.
                  </p>
                  <Input type="file" accept=".csv" onChange={handleCSVFile} />
                  {csvErrors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc pl-4 text-xs space-y-0.5">
                          {csvErrors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  {parsedRows.length > 0 && (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Address</TableHead>
                            <TableHead>Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedRows.slice(0, 50).map((r, i) => (
                            <TableRow key={i}>
                              <TableCell>{r.address}</TableCell>
                              <TableCell>{typeLabels[r.location_type]}</TableCell>
                            </TableRow>
                          ))}
                          {parsedRows.length > 50 && (
                            <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">...and {parsedRows.length - 50} more</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                      <Button onClick={handleBulkImport} disabled={uploading} className="w-full">
                        {uploading ? "Importing..." : `Import ${parsedRows.length} Location(s)`}
                      </Button>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
          {canCreate && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Add Location</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Add New Location</DialogTitle></DialogHeader>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="123 Main St" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={newType} onValueChange={(v) => setNewType(v as LocationType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(typeLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">Add Location</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search addresses..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(typeLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isAdmin && selectedIds.size > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" /> Delete Selected</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedIds.size} location(s)?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone. All selected locations and their associated data will be permanently removed.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead>Address</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-muted-foreground py-8">
                    No locations found. Add your first location to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((loc) => (
                  <TableRow key={loc.id} data-state={selectedIds.has(loc.id) ? "selected" : undefined}>
                    {isAdmin && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(loc.id)}
                          onCheckedChange={() => toggleSelect(loc.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{loc.address}</TableCell>
                    <TableCell>{typeLabels[loc.location_type]}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[loc.status]}>
                        {loc.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {new Date(loc.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
