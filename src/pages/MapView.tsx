import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MapContainer, TileLayer, CircleMarker, Popup, LayersControl, LayerGroup, useMap } from "react-leaflet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2 } from "lucide-react";
import MapSidebar from "@/components/map/MapSidebar";
import CanvassPathLayer from "@/components/map/CanvassPathLayer";
import ZoneOverlay from "@/components/map/ZoneOverlay";
import { useIsMobile } from "@/hooks/use-mobile";
import "leaflet/dist/leaflet.css";

type SurveyStatus = "not_surveyed" | "in_progress" | "surveyed";

interface Location {
  id: string;
  name: string | null;
  address: string;
  status: SurveyStatus;
  location_type: string | null;
  category: string | null;
  zone_id: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface Zone {
  id: string;
  name: string;
}

const STATUS_COLORS: Record<SurveyStatus, string> = {
  not_surveyed: "hsl(215, 14%, 46%)",
  in_progress: "hsl(36, 95%, 52%)",
  surveyed: "hsl(152, 56%, 38%)",
};

const STATUS_LABELS: Record<string, string> = {
  not_surveyed: "Not Surveyed",
  in_progress: "In Progress",
  surveyed: "Surveyed",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "not_surveyed", label: "Not Surveyed" },
  { value: "in_progress", label: "In Progress" },
  { value: "surveyed", label: "Surveyed" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "residential", label: "Residential" },
  { value: "business", label: "Business" },
  { value: "vacant", label: "Vacant" },
  { value: "public_space", label: "Public Space" },
];

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 18, { duration: 0.5 });
  }, [lat, lng, map]);
  return null;
}

export default function MapView() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [locations, setLocations] = useState<Location[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");

  useEffect(() => {
    const fetch = async () => {
      const [{ data: locs }, { data: zoneData }] = await Promise.all([
        supabase.from("locations").select("id, name, address, status, location_type, category, zone_id, latitude, longitude"),
        supabase.from("zones").select("id, name").order("name"),
      ]);
      setLocations((locs as Location[]) || []);
      setZones((zoneData as Zone[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const zoneName = (zoneId: string | null) => {
    if (!zoneId) return "Unzoned";
    return zones.find((z) => z.id === zoneId)?.name || "Unknown";
  };

  const filtered = useMemo(() => {
    return locations.filter((loc) => {
      if (statusFilter !== "all" && loc.status !== statusFilter) return false;
      if (typeFilter !== "all" && loc.location_type !== typeFilter) return false;
      if (zoneFilter !== "all" && loc.zone_id !== zoneFilter) return false;
      return true;
    });
  }, [locations, statusFilter, typeFilter, zoneFilter]);

  const withCoords = filtered.filter((l) => l.latitude != null && l.longitude != null);

  // Compute center from bounding box
  const center = useMemo<[number, number]>(() => {
    if (withCoords.length === 0) return [40.716, -73.998];
    const lats = withCoords.map((l) => l.latitude!);
    const lngs = withCoords.map((l) => l.longitude!);
    return [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2];
  }, [withCoords]);

  // Zone overlay data
  const zoneOverlayData = useMemo(() => {
    const map = new Map<string, { name: string; positions: [number, number][]; surveyed: number; total: number }>();
    for (const loc of filtered) {
      if (!loc.zone_id || !loc.latitude || !loc.longitude) continue;
      if (!map.has(loc.zone_id)) {
        map.set(loc.zone_id, { name: zoneName(loc.zone_id), positions: [], surveyed: 0, total: 0 });
      }
      const z = map.get(loc.zone_id)!;
      z.positions.push([loc.latitude, loc.longitude]);
      z.total++;
      if (loc.status === "surveyed") z.surveyed++;
    }
    return [...map.entries()].map(([id, d]) => ({ id, ...d }));
  }, [filtered, zones]);

  const handleSelectLocation = (id: string) => {
    setSelectedId(id);
    const loc = locations.find((l) => l.id === id);
    if (loc?.latitude && loc?.longitude) {
      setFlyTarget({ lat: loc.latitude, lng: loc.longitude });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Filter bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card flex-wrap">
        <h1 className="text-lg font-bold font-display mr-2">Map</h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            {zones.map((z) => (
              <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{withCoords.length} on map</span>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {!isMobile && (
          <MapSidebar
            locations={filtered}
            selectedId={selectedId}
            onSelect={handleSelectLocation}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            zoneName={zoneName}
          />
        )}

        <div className="flex-1 relative">
          <MapContainer
            center={center}
            zoom={16}
            className="h-full w-full z-0"
            style={{ background: "hsl(var(--muted))" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {flyTarget && <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} />}

            <LayersControl position="topright">
              <LayersControl.Overlay name="Status Pins" checked>
                <LayerGroup>
                  {withCoords.map((loc) => (
                    <CircleMarker
                      key={loc.id}
                      center={[loc.latitude!, loc.longitude!]}
                      radius={selectedId === loc.id ? 10 : 7}
                      pathOptions={{
                        fillColor: STATUS_COLORS[loc.status],
                        fillOpacity: 0.9,
                        color: selectedId === loc.id ? "hsl(var(--ring))" : "white",
                        weight: selectedId === loc.id ? 3 : 2,
                      }}
                      eventHandlers={{
                        click: () => setSelectedId(loc.id),
                      }}
                    >
                      <Popup>
                        <div className="space-y-1 min-w-[180px]">
                          <p className="font-semibold text-sm">{loc.name || loc.address}</p>
                          {loc.name && <p className="text-xs text-muted-foreground">{loc.address}</p>}
                          <div className="flex gap-1 flex-wrap">
                            <Badge className="text-[10px]">{STATUS_LABELS[loc.status]}</Badge>
                            {loc.location_type && (
                              <Badge variant="outline" className="text-[10px] capitalize">{loc.location_type.replace("_", " ")}</Badge>
                            )}
                          </div>
                          {loc.category && <p className="text-xs text-muted-foreground">{loc.category}</p>}
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => navigate(`/locations/${loc.id}`)}
                          >
                            View Details <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </LayerGroup>
              </LayersControl.Overlay>

              <LayersControl.Overlay name="Canvass Path">
                <CanvassPathLayer locations={withCoords} />
              </LayersControl.Overlay>

              <LayersControl.Overlay name="Zone Boundaries">
                <ZoneOverlay zones={zoneOverlayData} />
              </LayersControl.Overlay>
            </LayersControl>
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
