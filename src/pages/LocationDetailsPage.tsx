import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronLeft, Pencil, X, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { CATEGORY_GROUPS } from "@/lib/categories";

const typeLabels: Record<string, string> = {
  residential: "Residential",
  business: "Business",
  vacant: "Vacant",
  public_space: "Public Space",
};

const statusColors: Record<string, string> = {
  not_surveyed: "bg-destructive/10 text-destructive",
  in_progress: "bg-warning/10 text-accent-foreground",
  surveyed: "bg-primary/10 text-primary",
};

const conditionLabels: Record<string, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  critical: "Critical",
};

interface Location {
  id: string;
  name: string | null;
  address: string;
  location_type: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  zone_id: string | null;
  category: string | null;
  access_type: string | null;
  created_at: string;
  updated_at: string;
}

interface Survey {
  id: string;
  surveyor_id: string;
  created_at: string;
  property_condition: string | null;
  occupancy_status: string | null;
  resident_name: string | null;
  business_name: string | null;
}

export default function LocationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canEdit = hasRole("admin") || hasRole("surveyor");
  const [location, setLocation] = useState<Location | null>(null);
  const [zoneName, setZoneName] = useState<string | null>(null);
  const [assignedSurveyors, setAssignedSurveyors] = useState<{ user_id: string; full_name: string }[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [surveyorMap, setSurveyorMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editType, setEditType] = useState("residential");
  const [editStatus, setEditStatus] = useState("not_surveyed");
  const [editCategory, setEditCategory] = useState("");
  const [editAccessType, setEditAccessType] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      const { data: loc } = await supabase
        .from("locations")
        .select("*")
        .eq("id", id)
        .single();
      if (!loc) {
        toast.error("Location not found");
        navigate("/locations");
        return;
      }
      setLocation(loc as unknown as Location);

      // Fetch zone name
      if (loc.zone_id) {
        const { data: z } = await supabase.from("zones").select("name").eq("id", loc.zone_id).single();
        if (z) setZoneName(z.name);
      }

      // Fetch assigned surveyor name
      if (loc.assigned_to) {
        const { data: p } = await supabase.from("profiles").select("full_name").eq("user_id", loc.assigned_to).single();
        if (p) setSurveyorName(p.full_name);
      }

      // Fetch surveys
      const { data: surveyData } = await supabase
        .from("surveys")
        .select("id, surveyor_id, created_at, property_condition, occupancy_status, resident_name, business_name")
        .eq("location_id", id)
        .order("created_at", { ascending: false });
      const surveyList = (surveyData || []) as Survey[];
      setSurveys(surveyList);

      // Resolve surveyor names for surveys
      const uniqueIds = [...new Set(surveyList.map((s) => s.surveyor_id))];
      if (uniqueIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", uniqueIds);
        if (profiles) setSurveyorMap(new Map(profiles.map((p) => [p.user_id, p.full_name || "Unnamed"])));
      }

      setLoading(false);
    };
    fetchAll();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const startEditing = () => {
    if (!location) return;
    setEditName(location.name || "");
    setEditAddress(location.address);
    setEditType(location.location_type || "residential");
    setEditCategory(location.category || "");
    setEditAccessType(location.access_type || "");
    setEditStatus(location.status);
    setEditing(true);
  };

  const cancelEditing = () => setEditing(false);

  const handleSave = async () => {
    if (!location || !editAddress.trim()) {
      toast.error("Address is required");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("locations")
      .update({
        name: editName.trim() || null,
        address: editAddress.trim(),
        location_type: editType as any,
        status: editStatus as any,
        category: editCategory || null,
        access_type: editAccessType || null,
      })
      .eq("id", location.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setLocation({ ...location, name: editName.trim() || null, address: editAddress.trim(), location_type: editType, status: editStatus, category: editCategory || null, access_type: editAccessType || null });
    setEditing(false);
    toast.success("Location updated");
  };

  if (!location) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/locations")}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Locations
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold font-display">{location.name || location.address}</h1>
        {location.name && <p className="text-muted-foreground mt-1">{location.address}</p>}
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-display">Details</CardTitle>
            {canEdit && !editing && (
              <Button variant="ghost" size="sm" onClick={startEditing}>
                <Pencil className="h-4 w-4 mr-1" /> Edit
              </Button>
            )}
            {editing && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={saving}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Check className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="mt-0.5">
                {editing ? (
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Location name (optional)" className="h-8" />
                ) : (
                  <span className="font-medium">{location.name || <span className="text-muted-foreground/50">—</span>}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Address</dt>
              <dd className="font-medium mt-0.5">{location.address}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="mt-0.5">
                {editing ? (
                  <Select value={editType} onValueChange={setEditType}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="font-medium">{location.location_type ? typeLabels[location.location_type] || location.location_type : "—"}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="mt-0.5">
                {editing ? (
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_surveyed">Not Surveyed</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="surveyed">Surveyed</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary" className={statusColors[location.status] || ""}>
                    {location.status.replace(/_/g, " ")}
                  </Badge>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Category</dt>
              <dd className="mt-0.5">
                {editing ? (
                  <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={categoryOpen} className="h-8 w-full justify-between text-sm font-normal">
                        {editCategory || "Select category…"}
                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search categories…" />
                        <CommandList>
                          <CommandEmpty>No category found.</CommandEmpty>
                          <CommandItem value="__clear__" onSelect={() => { setEditCategory(""); setCategoryOpen(false); }}>
                            <span className="text-muted-foreground">None</span>
                          </CommandItem>
                          {CATEGORY_GROUPS.map((group) => (
                            <CommandGroup key={group.label} heading={group.label}>
                              {group.items.map((item) => (
                                <CommandItem key={item} value={item} onSelect={() => { setEditCategory(item); setCategoryOpen(false); }}>
                                  {item}
                                  {editCategory === item && <Check className="ml-auto h-3 w-3" />}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <span className="font-medium">{location.category || <span className="text-muted-foreground/50">—</span>}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Access Type</dt>
              <dd className="mt-0.5">
                {editing ? (
                  <Select value={editAccessType || "none"} onValueChange={(v) => setEditAccessType(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None</SelectItem>
                      <SelectItem value="Public">Public</SelectItem>
                      <SelectItem value="Private">Private</SelectItem>
                      <SelectItem value="Mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="font-medium">{location.access_type || <span className="text-muted-foreground/50">—</span>}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Zone</dt>
              <dd className="mt-0.5">
                {zoneName ? (
                  <button
                    onClick={() => navigate(`/zones/${location.zone_id}`)}
                    className="text-primary hover:underline font-medium"
                  >
                    {zoneName}
                  </button>
                ) : (
                  <span className="text-muted-foreground/50">Unzoned</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Assigned To</dt>
              <dd className="font-medium mt-0.5">{surveyorName || <span className="text-muted-foreground/50">Unassigned</span>}</dd>
            </div>
            {(location.latitude != null && location.longitude != null) && (
              <div>
                <dt className="text-muted-foreground">Coordinates</dt>
                <dd className="font-medium mt-0.5">{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Added</dt>
              <dd className="font-medium mt-0.5">{new Date(location.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Surveys Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display">
            Surveys
            <Badge variant="secondary" className="ml-2">{surveys.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Surveyor</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Occupancy</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {surveys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No surveys recorded for this location.
                  </TableCell>
                </TableRow>
              ) : (
                surveys.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{surveyorMap.get(s.surveyor_id) || "Unknown"}</TableCell>
                    <TableCell>
                      {s.property_condition ? (
                        <Badge variant="outline">{conditionLabels[s.property_condition] || s.property_condition}</Badge>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.occupancy_status || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {s.resident_name || s.business_name || "—"}
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
