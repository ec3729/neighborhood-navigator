import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, MapPin, Play, Globe, Filter } from "lucide-react";

type SurveyStatus = "not_surveyed" | "in_progress" | "surveyed";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "not_surveyed", label: "Not Surveyed" },
  { value: "in_progress", label: "In Progress" },
  { value: "surveyed", label: "Surveyed" },
];

interface ZoneOption {
  id: string;
  name: string;
  description: string | null;
  locationCount: number;
}

export default function CanvasStartPage() {
  const navigate = useNavigate();
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unzonedCount, setUnzonedCount] = useState(0);
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch zones
      const { data: zonesData } = await supabase.from("zones").select("id, name, description").order("name");

      // Fetch all locations to compute counts
      const { data: locations } = await supabase.from("locations").select("zone_id, status");

      const zoneCounts = new Map<string, number>();
      const zoneStatusCounts = new Map<string, Map<string, number>>();
      let unzoned = 0;
      let unzonedByStatus = new Map<string, number>();
      const totalByStatus = new Map<string, number>();
      const total = locations?.length || 0;

      for (const loc of locations || []) {
        // Total by status
        totalByStatus.set(loc.status, (totalByStatus.get(loc.status) || 0) + 1);

        if (loc.zone_id) {
          zoneCounts.set(loc.zone_id, (zoneCounts.get(loc.zone_id) || 0) + 1);
          if (!zoneStatusCounts.has(loc.zone_id)) zoneStatusCounts.set(loc.zone_id, new Map());
          const zsc = zoneStatusCounts.get(loc.zone_id)!;
          zsc.set(loc.status, (zsc.get(loc.status) || 0) + 1);
        } else {
          unzoned++;
          unzonedByStatus.set(loc.status, (unzonedByStatus.get(loc.status) || 0) + 1);
        }
      }

      setTotalCount(total);
      setUnzonedCount(unzoned);
      setTotalByStatus(totalByStatus);
      setUnzonedByStatus(unzonedByStatus);
      setZoneStatusCounts(zoneStatusCounts);
      setZones(
        (zonesData || []).map((z: any) => ({
          id: z.id,
          name: z.name,
          description: z.description,
          locationCount: zoneCounts.get(z.id) || 0,
        }))
      );
      setLoading(false);
    };
    fetchData();
  }, []);

  const [totalByStatus, setTotalByStatus] = useState<Map<string, number>>(new Map());
  const [unzonedByStatus, setUnzonedByStatus] = useState<Map<string, number>>(new Map());
  const [zoneStatusCounts, setZoneStatusCounts] = useState<Map<string, Map<string, number>>>(new Map());

  const getFilteredCount = (zoneId: string) => {
    if (selectedStatus === "all") {
      if (zoneId === "all") return totalCount;
      if (zoneId === "unzoned") return unzonedCount;
      return zones.find(z => z.id === zoneId)?.locationCount || 0;
    }
    if (zoneId === "all") return totalByStatus.get(selectedStatus) || 0;
    if (zoneId === "unzoned") return unzonedByStatus.get(selectedStatus) || 0;
    return zoneStatusCounts.get(zoneId)?.get(selectedStatus) || 0;
  };

  const handleStart = () => {
    const params = new URLSearchParams();
    if (selectedZone !== "all") params.set("zone", selectedZone);
    if (selectedStatus !== "all") params.set("status", selectedStatus);
    const qs = params.toString();
    navigate(`/canvas/review${qs ? `?${qs}` : ""}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/locations")}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Locations
        </Button>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold font-display">Start Canvassing</h1>
        <p className="text-muted-foreground text-sm">Pick a zone to review, or canvas all locations.</p>
      </div>

      {/* Zone cards */}
      <div className="grid gap-3">
        {/* All Locations */}
        <Card
          className={`cursor-pointer transition-colors border-2 ${
            selectedZone === "all" ? "border-primary bg-primary/5" : "border-transparent hover:border-muted-foreground/20"
          }`}
          onClick={() => setSelectedZone("all")}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">All Locations</p>
                <p className="text-xs text-muted-foreground">Every location in the database</p>
              </div>
            </div>
            <Badge variant="secondary">{getFilteredCount("all")}</Badge>
          </CardContent>
        </Card>

        {/* Individual zones */}
        {zones.map((zone) => (
          <Card
            key={zone.id}
            className={`cursor-pointer transition-colors border-2 ${
              selectedZone === zone.id ? "border-primary bg-primary/5" : "border-transparent hover:border-muted-foreground/20"
            }`}
            onClick={() => setSelectedZone(zone.id)}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{zone.name}</p>
                  {zone.description && (
                    <p className="text-xs text-muted-foreground">{zone.description}</p>
                  )}
                </div>
              </div>
              <Badge variant="secondary">{zone.locationCount}</Badge>
            </CardContent>
          </Card>
        ))}

        {/* Unzoned */}
        {unzonedCount > 0 && (
          <Card
            className={`cursor-pointer transition-colors border-2 ${
              selectedZone === "unzoned" ? "border-primary bg-primary/5" : "border-transparent hover:border-muted-foreground/20"
            }`}
            onClick={() => setSelectedZone("unzoned")}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground opacity-50" />
                <div>
                  <p className="font-medium">Unzoned</p>
                  <p className="text-xs text-muted-foreground">Locations not assigned to any zone</p>
                </div>
              </div>
              <Badge variant="secondary">{unzonedCount}</Badge>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Start button */}
      <Button className="w-full" size="lg" onClick={handleStart}>
        <Play className="h-4 w-4 mr-2" /> Start Canvassing
      </Button>
    </div>
  );
}
