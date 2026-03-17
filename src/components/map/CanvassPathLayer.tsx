import { Polyline, CircleMarker, Tooltip, LayerGroup } from "react-leaflet";
import { sortLocationsByStreetGroups } from "@/lib/canvassSorting";

interface Location {
  id: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface CanvassPathLayerProps {
  locations: Location[];
}

export default function CanvassPathLayer({ locations }: CanvassPathLayerProps) {
  const withCoords = locations.filter((l) => l.latitude != null && l.longitude != null);
  if (withCoords.length < 2) return null;

  const { sorted } = sortLocationsByStreetGroups(withCoords);

  const positions = sorted.map((l) => [l.latitude!, l.longitude!] as [number, number]);

  return (
    <>
      <Polyline
        positions={positions}
        pathOptions={{
          color: "hsl(210, 80%, 52%)",
          weight: 3,
          dashArray: "8 6",
          opacity: 0.7,
        }}
      />
      {sorted.map((loc, i) => (
        <CircleMarker
          key={`path-${loc.id}`}
          center={[loc.latitude!, loc.longitude!]}
          radius={10}
          pathOptions={{
            fillColor: "hsl(210, 80%, 52%)",
            fillOpacity: 0.9,
            color: "white",
            weight: 2,
          }}
        >
          <Tooltip permanent direction="center" className="path-number-tooltip">
            <span className="text-[10px] font-bold text-white">{i + 1}</span>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}
