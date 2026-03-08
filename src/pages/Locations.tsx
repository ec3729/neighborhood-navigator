import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Upload, AlertCircle, Trash2, UserCheck, ArrowUpDown, ArrowUp, ArrowDown, ClipboardList, MapPin, Pencil } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

type LocationType = "residential" | "business" | "vacant" | "public_space";
type LocationTypeNullable = LocationType | null;
type SurveyStatus = "not_surveyed" | "in_progress" | "surveyed";
type SortField = "name" | "address" | "location_type" | "status" | "assigned_to" | "zone" | "created_at";
type SortDir = "asc" | "desc";

interface Location {
  id: string;
  name: string | null;
  address: string;
  location_type: LocationTypeNullable;
  status: SurveyStatus;
  latitude: number | null;
  longitude: number | null;
  assigned_to: string | null;
  zone_id: string | null;
  created_at: string;
}

interface Zone {
  id: string;
  name: string;
  description: string | null;
}

interface Surveyor {
  user_id: string;
  full_name: string | null;
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
  name?: string;
  address: string;
  location_type: LocationType;
}

export default function Locations() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [assignFilter, setAssignFilter] = useState<string>("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newType, setNewType] = useState<LocationType>("residential");
  const [newName, setNewName] = useState("");
  const [newZoneId, setNewZoneId] = useState<string>("none");

  // CSV upload state
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Surveyors for assignment
  const [surveyors, setSurveyors] = useState<Surveyor[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [zoneAssignOpen, setZoneAssignOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const pageSize = 25;

  // Zone management dialog
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [zoneDescription, setZoneDescription] = useState("");
  const [savingZone, setSavingZone] = useState(false);

  const fetchLocations = async () => {
    const { data } = await supabase.from("locations").select("*").order("created_at", { ascending: false });
    if (data) setLocations(data as Location[]);
  };

  const fetchZones = async () => {
    const { data } = await supabase.from("zones").select("id, name, description").order("name");
    if (data) setZones(data as Zone[]);
  };

  const fetchSurveyors = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["surveyor", "admin"]);
    if (!roles || roles.length === 0) return;
    const userIds = [...new Set(roles.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);
    if (profiles) setSurveyors(profiles);
  };

  useEffect(() => { fetchLocations(); fetchZones(); fetchSurveyors(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("locations").insert({
      address: newAddress,
      location_type: newType,
      created_by: user.id,
      ...(newName.trim() ? { name: newName.trim() } : {}),
      ...(newZoneId !== "none" ? { zone_id: newZoneId } : {}),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Location added");
    setNewAddress("");
    setNewName("");
    setNewZoneId("none");
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
      const nameIdx = headers.indexOf("name");
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
        const name = nameIdx !== -1 ? cols[nameIdx] || undefined : undefined;
        rows.push({ address, location_type: locType, name });
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
        ...(r.name ? { name: r.name } : {}),
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

  const zoneMap = new Map(zones.map((z) => [z.id, z.name]));

  const filtered = locations.filter((l) => {
    const q = search.toLowerCase();
    const matchesSearch = l.address.toLowerCase().includes(q) || (l.name?.toLowerCase().includes(q) ?? false);
    const matchesType = typeFilter === "all" || l.location_type === typeFilter;
    const matchesAssign =
      assignFilter === "all" ||
      (assignFilter === "unassigned" ? !l.assigned_to : l.assigned_to === assignFilter);
    const matchesZone =
      zoneFilter === "all" ||
      (zoneFilter === "unzoned" ? !l.zone_id : l.zone_id === zoneFilter);
    return matchesSearch && matchesType && matchesAssign && matchesZone;
  });

  const canCreate = hasRole("surveyor") || hasRole("admin");
  const isAdmin = hasRole("admin");

  const surveyorMap = new Map(surveyors.map((s) => [s.user_id, s.full_name || "Unnamed User"]));
  const colCount = isAdmin ? 9 : 8;

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "name":
        cmp = (a.name || "").localeCompare(b.name || "");
        break;
      case "address":
        cmp = a.address.localeCompare(b.address);
        break;
      case "location_type":
        cmp = (a.location_type || "").localeCompare(b.location_type || "");
        break;
      case "status":
        cmp = a.status.localeCompare(b.status);
        break;
      case "assigned_to": {
        const nameA = a.assigned_to ? surveyorMap.get(a.assigned_to) || "" : "";
        const nameB = b.assigned_to ? surveyorMap.get(b.assigned_to) || "" : "";
        cmp = nameA.localeCompare(nameB);
        break;
      }
      case "zone": {
        const zoneA = a.zone_id ? zoneMap.get(a.zone_id) || "" : "";
        const zoneB = b.zone_id ? zoneMap.get(b.zone_id) || "" : "";
        cmp = zoneA.localeCompare(zoneB);
        break;
      }
      case "created_at":
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [search, typeFilter, assignFilter, zoneFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

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

  const handleBulkAssign = async (surveyorId: string) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("locations")
      .update({ assigned_to: surveyorId })
      .in("id", ids);
    if (error) { toast.error(error.message); return; }
    const surveyor = surveyors.find((s) => s.user_id === surveyorId);
    toast.success(`Assigned ${ids.length} location(s) to ${surveyor?.full_name || "surveyor"}.`);
    setSelectedIds(new Set());
    setAssignOpen(false);
    fetchLocations();
  };

  const handleBulkAssignZone = async (zoneId: string) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("locations")
      .update({ zone_id: zoneId === "none" ? null : zoneId })
      .in("id", ids);
    if (error) { toast.error(error.message); return; }
    const zone = zones.find((z) => z.id === zoneId);
    toast.success(`Assigned ${ids.length} location(s) to ${zone?.name || "no zone"}.`);
    setSelectedIds(new Set());
    setZoneAssignOpen(false);
    fetchLocations();
  };

  // Zone CRUD
  const openZoneDialog = (zone?: Zone) => {
    if (zone) {
      setEditingZone(zone);
      setZoneName(zone.name);
      setZoneDescription(zone.description || "");
    } else {
      setEditingZone(null);
      setZoneName("");
      setZoneDescription("");
    }
    setZoneDialogOpen(true);
  };

  const handleSaveZone = async () => {
    if (!user || !zoneName.trim()) return;
    setSavingZone(true);
    if (editingZone) {
      const { error } = await supabase.from("zones").update({ name: zoneName.trim(), description: zoneDescription.trim() || null }).eq("id", editingZone.id);
      if (error) { toast.error(error.message); setSavingZone(false); return; }
      toast.success("Zone updated");
    } else {
      const { error } = await supabase.from("zones").insert({ name: zoneName.trim(), description: zoneDescription.trim() || null, created_by: user.id });
      if (error) { toast.error(error.message); setSavingZone(false); return; }
      toast.success("Zone created");
    }
    setSavingZone(false);
    setZoneDialogOpen(false);
    fetchZones();
  };

  const handleDeleteZone = async (zoneId: string) => {
    const { error } = await supabase.from("zones").delete().eq("id", zoneId);
    if (error) { toast.error(error.message); return; }
    toast.success("Zone deleted");
    fetchZones();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Locations</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            const params = new URLSearchParams();
            if (typeFilter !== "all") params.set("type", typeFilter);
            if (assignFilter !== "all") params.set("assign", assignFilter);
            if (zoneFilter !== "all") params.set("zone", zoneFilter);
            const qs = params.toString();
            navigate(`/canvas${qs ? `?${qs}` : ""}`);
          }}>
            <ClipboardList className="h-4 w-4 mr-2" /> Canvas
          </Button>
          {isAdmin && (
            <Dialog open={csvDialogOpen} onOpenChange={(open) => { setCsvDialogOpen(open); if (!open) { setParsedRows([]); setCsvErrors([]); } }}>
              <DialogTrigger asChild>
                <Button variant="outline"><Upload className="h-4 w-4 mr-2" /> Upload CSV</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="font-display">Upload CSV</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload a CSV file with an <strong>address</strong> column and optional <strong>name</strong> and <strong>location_type</strong> columns.
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
                    <Label>Name (optional)</Label>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Joe's Coffee Shop" />
                  </div>
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
                  <div className="space-y-2">
                    <Label>Zone (optional)</Label>
                    <Select value={newZoneId} onValueChange={setNewZoneId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— No Zone</SelectItem>
                        {zones.map((z) => (
                          <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
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

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search names or addresses..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(typeLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All zones" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            <SelectItem value="unzoned">Unzoned</SelectItem>
            {zones.map((z) => (
              <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assignFilter} onValueChange={setAssignFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All assignments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignments</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {surveyors.map((s) => (
              <SelectItem key={s.user_id} value={s.user_id}>{s.full_name || "Unnamed User"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => openZoneDialog()}>
            <MapPin className="h-4 w-4 mr-2" /> Manage Zones
          </Button>
        )}
      </div>

      {isAdmin && selectedIds.size > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
          <Popover open={assignOpen} onOpenChange={setAssignOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm"><UserCheck className="h-4 w-4 mr-2" /> Assign Surveyor</Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">Select a surveyor</p>
                {surveyors.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-2">No surveyors found.</p>
                ) : (
                  surveyors.map((s) => (
                    <button
                      key={s.user_id}
                      onClick={() => handleBulkAssign(s.user_id)}
                      className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
                    >
                      {s.full_name || "Unnamed User"}
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Popover open={zoneAssignOpen} onOpenChange={setZoneAssignOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm"><MapPin className="h-4 w-4 mr-2" /> Assign Zone</Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">Select a zone</p>
                <button
                  onClick={() => handleBulkAssignZone("none")}
                  className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
                >
                  — Remove Zone
                </button>
                {zones.map((z) => (
                  <button
                    key={z.id}
                    onClick={() => handleBulkAssignZone(z.id)}
                    className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
                  >
                    {z.name}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
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
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("name")}>
                  <span className="inline-flex items-center">Name<SortIcon field="name" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("address")}>
                  <span className="inline-flex items-center">Address<SortIcon field="address" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("location_type")}>
                  <span className="inline-flex items-center">Type<SortIcon field="location_type" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("zone")}>
                  <span className="inline-flex items-center">Zone<SortIcon field="zone" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>
                  <span className="inline-flex items-center">Status<SortIcon field="status" /></span>
                </TableHead>
                <TableHead className="hidden lg:table-cell cursor-pointer select-none" onClick={() => handleSort("assigned_to")}>
                  <span className="inline-flex items-center">Assigned To<SortIcon field="assigned_to" /></span>
                </TableHead>
                <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => handleSort("created_at")}>
                  <span className="inline-flex items-center">Added<SortIcon field="created_at" /></span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="text-center text-muted-foreground py-8">
                    No locations found. Add your first location to get started.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((loc) => (
                  <TableRow key={loc.id} data-state={selectedIds.has(loc.id) ? "selected" : undefined}>
                    {isAdmin && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(loc.id)}
                          onCheckedChange={() => toggleSelect(loc.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground">{loc.name || "—"}</TableCell>
                    <TableCell className="font-medium">{loc.address}</TableCell>
                    <TableCell>{loc.location_type ? typeLabels[loc.location_type] : <span className="text-muted-foreground/50">—</span>}</TableCell>
                    <TableCell>
                      {loc.zone_id ? (
                        <Badge variant="outline">{zoneMap.get(loc.zone_id) || "Unknown"}</Badge>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[loc.status]}>
                        {loc.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {loc.assigned_to ? surveyorMap.get(loc.assigned_to) || "Unknown" : <span className="text-muted-foreground/50">Unassigned</span>}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}>
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("ellipsis");
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "ellipsis" ? (
                  <span key={`e${idx}`} className="px-2 text-sm text-muted-foreground self-center">…</span>
                ) : (
                  <Button
                    key={item}
                    variant={item === safePage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(item)}
                    className="min-w-[2.25rem]"
                  >
                    {item}
                  </Button>
                )
              )}
            <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Zone Management Dialog */}
      <Dialog open={zoneDialogOpen} onOpenChange={setZoneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editingZone ? "Edit Zone" : "Manage Zones"}</DialogTitle>
          </DialogHeader>
          {editingZone ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Zone Name</Label>
                <Input value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder="e.g. Downtown" />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input value={zoneDescription} onChange={(e) => setZoneDescription(e.target.value)} placeholder="e.g. Central business district" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingZone(null)}>Cancel</Button>
                <Button onClick={handleSaveZone} disabled={savingZone || !zoneName.trim()}>
                  {savingZone ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>New Zone Name</Label>
                <div className="flex gap-2">
                  <Input value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder="e.g. Downtown" />
                  <Button onClick={handleSaveZone} disabled={savingZone || !zoneName.trim()}>
                    {savingZone ? "..." : "Add"}
                  </Button>
                </div>
              </div>
              {zones.length > 0 && (
                <div className="space-y-2">
                  <Label>Existing Zones</Label>
                  <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                    {zones.map((z) => (
                      <div key={z.id} className="flex items-center justify-between p-2">
                        <div>
                          <p className="font-medium text-sm">{z.name}</p>
                          {z.description && <p className="text-xs text-muted-foreground">{z.description}</p>}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openZoneDialog(z)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm"><Trash2 className="h-3 w-3 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete zone "{z.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>Locations in this zone will become unzoned.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteZone(z.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
