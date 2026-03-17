import { Polygon, Tooltip, LayerGroup } from "react-leaflet";

interface ZoneData {
  id: string;
  name: string;
  positions: [number, number][];
  surveyed: number;
  total: number;
}

const ZONE_COLORS = [
  "hsl(152, 56%, 38%)",
  "hsl(36, 95%, 52%)",
  "hsl(210, 80%, 52%)",
  "hsl(340, 65%, 50%)",
  "hsl(270, 50%, 55%)",
  "hsl(180, 50%, 40%)",
];

function convexHull(points: [number, number][]): [number, number][] {
  if (points.length <= 3) return points;

  const sorted = [...points].sort((a, b) => a[1] - b[1] || a[0] - b[0]);

  const cross = (O: [number, number], A: [number, number], B: [number, number]) =>
    (A[1] - O[1]) * (B[0] - O[0]) - (A[0] - O[0]) * (B[1] - O[1]);

  const lower: [number, number][] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }

  const upper: [number, number][] = [];
  for (const p of sorted.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }

  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

// Expand hull slightly so markers aren't on the edge
function expandHull(hull: [number, number][], factor = 0.0002): [number, number][] {
  const cx = hull.reduce((s, p) => s + p[0], 0) / hull.length;
  const cy = hull.reduce((s, p) => s + p[1], 0) / hull.length;
  return hull.map(([lat, lng]) => {
    const dx = lat - cx;
    const dy = lng - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    return [lat + (dx / dist) * factor, lng + (dy / dist) * factor] as [number, number];
  });
}

interface ZoneOverlayProps {
  zones: ZoneData[];
}

export default function ZoneOverlay({ zones }: ZoneOverlayProps) {
  return (
    <>
      {zones.map((zone, i) => {
        if (zone.positions.length < 3) return null;
        const hull = expandHull(convexHull(zone.positions));
        const color = ZONE_COLORS[i % ZONE_COLORS.length];

        return (
          <Polygon
            key={zone.id}
            positions={hull}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.1,
              weight: 2,
              dashArray: "4 4",
            }}
          >
            <Tooltip sticky>
              <span className="font-semibold">{zone.name}</span>
              <span className="text-muted-foreground"> — {zone.surveyed}/{zone.total} surveyed</span>
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}
