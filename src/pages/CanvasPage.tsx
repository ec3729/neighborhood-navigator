import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, SkipForward, Save, ChevronLeft, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CATEGORY_GROUPS } from "@/lib/categories";
import {
  SortMode,
  SORT_MODE_LABELS,
  StreetGroupInfo,
  sortLocationsByStreetGroups,
} from "@/lib/canvasSorting";

type LocationType = "residential" | "business" | "vacant" | "public_space";
type LocationTypeNullable = LocationType | null;
type SurveyStatus = "not_surveyed" | "in_progress" | "surveyed";

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
  category: string | null;
}

interface Zone {
  id: string;
  name: string;
}

const typeLabels: Record<LocationType, string> = {
  residential: "Residential",
  business: "Business",
  vacant: "Vacant",
  public_space: "Public Space",
};

const statusLabels: Record<SurveyStatus, string> = {
  not_surveyed: "Not Surveyed",
  in_progress: "In Progress",
  surveyed: "Surveyed",
};

type ReviewAction = "confirmed" | "updated" | "skipped";

export default function CanvasPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [locations, setLocations] = useState<Location[]>([]);
  const [groupInfoList, setGroupInfoList] = useState<StreetGroupInfo[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("street_groups");

  // Editable fields for the current card
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editType, setEditType] = useState<LocationTypeNullable>(null);
  const [editStatus, setEditStatus] = useState<SurveyStatus>("not_surveyed");
  const [editZoneId, setEditZoneId] = useState<string>("none");
  const [editCategory, setEditCategory] = useState<string>("");
  const [categoryOpen, setCategoryOpen] = useState(false);

  // Review tracking
  const [reviews, setReviews] = useState<Map<string, ReviewAction>>(new Map());
  const [finished, setFinished] = useState(false);

  // Raw data for re-sorting
  const [rawLocations, setRawLocations] = useState<Location[]>([]);

  const applySort = useCallback((data: Location[], mode: SortMode) => {
    if (mode === "street_groups") {
      const { sorted, groupInfo } = sortLocationsByStreetGroups(data);
      setLocations(sorted);
      setGroupInfoList(groupInfo);
    } else {
      setLocations(data);
      setGroupInfoList([]);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: zonesData } = await supabase.from("zones").select("id, name").order("name");
      if (zonesData) setZones(zonesData as Zone[]);

      let query = supabase.from("locations").select("id, name, address, location_type, status, latitude, longitude, assigned_to, zone_id, category");

      const typeParam = searchParams.get("type");
      if (typeParam && typeParam !== "all") query = query.eq("location_type", typeParam as LocationType);

      const assignParam = searchParams.get("assign");
      if (assignParam === "unassigned") query = query.is("assigned_to", null);
      else if (assignParam && assignParam !== "all") query = query.eq("assigned_to", assignParam);

      const zoneParam = searchParams.get("zone");
      if (zoneParam === "unzoned") query = query.is("zone_id", null);
      else if (zoneParam && zoneParam !== "all") query = query.eq("zone_id", zoneParam);

      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) { toast.error("Failed to load locations"); setLoading(false); return; }
      const raw = (data || []) as Location[];
      setRawLocations(raw);
      applySort(raw, sortMode);
      setLoading(false);
    };
    fetchData();
  }, [searchParams]);

  // Re-sort when mode changes
  useEffect(() => {
    if (rawLocations.length > 0) {
      applySort(rawLocations, sortMode);
      setCurrentIndex(0);
      setReviews(new Map());
      setFinished(false);
    }
  }, [sortMode, applySort, rawLocations]);

  // Sync editable fields when index changes
  useEffect(() => {
    if (locations.length === 0 || currentIndex >= locations.length) return;
    const loc = locations[currentIndex];
    setEditName(loc.name || "");
    setEditAddress(loc.address);
    setEditType(loc.location_type);
    setEditStatus(loc.status);
    setEditZoneId(loc.zone_id || "none");
    setEditCategory(loc.category || "");
  }, [currentIndex, locations]);

  const current = locations[currentIndex] as Location | undefined;
  const currentGroupInfo = groupInfoList[currentIndex] as StreetGroupInfo | undefined;

  const isDirty = current
    ? editName !== (current.name || "") ||
      editAddress !== current.address ||
      editType !== current.location_type ||
      editStatus !== current.status ||
      (editZoneId === "none" ? null : editZoneId) !== current.zone_id ||
      (editCategory || null) !== (current.category || null)
    : false;

  const advance = useCallback(() => {
    if (currentIndex + 1 >= locations.length) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, locations.length]);

  const goBack = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  const handleConfirm = () => {
    if (!current) return;
    setReviews((prev) => new Map(prev).set(current.id, "confirmed"));
    advance();
  };

  const handleSkip = () => {
    if (!current) return;
    setReviews((prev) => new Map(prev).set(current.id, "skipped"));
    advance();
  };

  const handleSaveAndNext = async () => {
    if (!current) return;
    setSaving(true);
    const { error } = await supabase
      .from("locations")
      .update({
        name: editName.trim() || null,
        address: editAddress,
        location_type: editType || null,
        status: editStatus,
        zone_id: editZoneId === "none" ? null : editZoneId,
      })
      .eq("id", current.id);
    setSaving(false);
    if (error) { toast.error("Failed to save: " + error.message); return; }

    const updatedLoc = { ...current, name: editName.trim() || null, address: editAddress, location_type: editType, status: editStatus, zone_id: editZoneId === "none" ? null : editZoneId };
    setLocations((prev) => prev.map((l) => l.id === current.id ? updatedLoc : l));
    setRawLocations((prev) => prev.map((l) => l.id === current.id ? updatedLoc : l));
    setReviews((prev) => new Map(prev).set(current.id, "updated"));
    toast.success("Saved");
    advance();
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (finished || loading) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") advance();
      if (e.key === "ArrowLeft") goBack();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advance, goBack, finished, loading]);

  const progress = locations.length > 0 ? Math.round((reviews.size / locations.length) * 100) : 0;
  const confirmedCount = [...reviews.values()].filter((v) => v === "confirmed").length;
  const updatedCount = [...reviews.values()].filter((v) => v === "updated").length;
  const skippedCount = [...reviews.values()].filter((v) => v === "skipped").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center space-y-4">
        <h1 className="text-2xl font-bold font-display">Canvas Review</h1>
        <p className="text-muted-foreground">No locations to review.</p>
        <Button variant="outline" onClick={() => navigate("/locations")}>
          <ChevronLeft className="h-4 w-4 mr-2" /> Back to Locations
        </Button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="p-6 max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold font-display text-center">Review Complete</h1>
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total locations</span>
              <span className="font-semibold">{locations.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Confirmed</span>
              <Badge variant="default">{confirmedCount}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Updated</span>
              <Badge variant="secondary">{updatedCount}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Skipped</span>
              <Badge variant="outline">{skippedCount}</Badge>
            </div>
          </CardContent>
          <CardFooter className="gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setFinished(false); setCurrentIndex(0); setReviews(new Map()); }}>
              Review Again
            </Button>
            <Button className="flex-1" onClick={() => navigate("/locations")}>
              Back to Locations
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/locations")}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Locations
        </Button>
        <div className="flex items-center gap-3">
          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SORT_MODE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} of {locations.length}
          </span>
        </div>
      </div>

      {/* Street group indicator */}
      {currentGroupInfo && sortMode === "street_groups" && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {currentGroupInfo.streetName}
          </Badge>
          {currentGroupInfo.totalChunks > 1 && (
            <span className="text-xs text-muted-foreground">
              Group {currentGroupInfo.chunkIndex} of {currentGroupInfo.totalChunks}
            </span>
          )}
        </div>
      )}

      {/* Progress */}
      <div className="space-y-1">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground text-right">{reviews.size} reviewed</p>
      </div>

      {/* Card */}
      {current && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display">
              {current.name || current.address}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Location name" />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editType || "none"} onValueChange={(v) => setEditType(v === "none" ? null : v as LocationType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None</SelectItem>
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as SurveyStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Zone</Label>
              <Select value={editZoneId} onValueChange={setEditZoneId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No Zone</SelectItem>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(current.latitude != null && current.longitude != null) && (
              <p className="text-xs text-muted-foreground">
                Coordinates: {current.latitude.toFixed(6)}, {current.longitude.toFixed(6)}
              </p>
            )}
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button variant="outline" size="sm" onClick={goBack} disabled={currentIndex === 0}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" className="flex-1" onClick={handleSkip}>
              <SkipForward className="h-4 w-4 mr-1" /> Skip
            </Button>
            {isDirty ? (
              <Button className="flex-1" onClick={handleSaveAndNext} disabled={saving}>
                <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save & Next"}
              </Button>
            ) : (
              <Button className="flex-1" onClick={handleConfirm}>
                <Check className="h-4 w-4 mr-1" /> Looks Good
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={advance}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
