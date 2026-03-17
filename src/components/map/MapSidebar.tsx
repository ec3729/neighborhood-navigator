import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Location {
  id: string;
  name: string | null;
  address: string;
  status: "not_surveyed" | "in_progress" | "surveyed";
  location_type: string | null;
  category: string | null;
  zone_id: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface MapSidebarProps {
  locations: Location[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  zoneName: (zoneId: string | null) => string;
}

const STATUS_COLORS: Record<string, string> = {
  not_surveyed: "bg-muted-foreground/30 text-muted-foreground",
  in_progress: "bg-accent/20 text-accent-foreground",
  surveyed: "bg-primary/20 text-primary",
};

const STATUS_LABELS: Record<string, string> = {
  not_surveyed: "Not Surveyed",
  in_progress: "In Progress",
  surveyed: "Surveyed",
};

export default function MapSidebar({ locations, selectedId, onSelect, collapsed, onToggle, zoneName }: MapSidebarProps) {
  // Group locations by street
  const grouped = new Map<string, Location[]>();
  for (const loc of locations) {
    const street = loc.address.replace(/^\d+\s+/, "") || "Other";
    if (!grouped.has(street)) grouped.set(street, []);
    grouped.get(street)!.push(loc);
  }

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-2 border-r border-border bg-card w-10">
        <Button variant="ghost" size="icon" onClick={onToggle} className="mb-2">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground [writing-mode:vertical-lr] rotate-180">
          {locations.length} locations
        </span>
      </div>
    );
  }

  return (
    <div className="w-[300px] border-r border-border bg-card flex flex-col shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-semibold">{locations.length} Locations</span>
        <Button variant="ghost" size="icon" onClick={onToggle}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {[...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([street, locs]) => (
            <div key={street}>
              <p className="text-xs font-medium text-muted-foreground px-2 mb-1 uppercase tracking-wide">{street}</p>
              {locs.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => onSelect(loc.id)}
                  className={cn(
                    "w-full text-left rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                    selectedId === loc.id && "bg-primary/10 ring-1 ring-primary/30"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{loc.name || loc.address}</p>
                      {loc.name && <p className="text-xs text-muted-foreground truncate">{loc.address}</p>}
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge className={cn("text-[10px] px-1.5 py-0", STATUS_COLORS[loc.status])}>
                          {STATUS_LABELS[loc.status]}
                        </Badge>
                        {loc.zone_id && (
                          <span className="text-[10px] text-muted-foreground">{zoneName(loc.zone_id)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
