import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map } from "lucide-react";

export default function MapView() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold font-display">Map View</h1>
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            Interactive Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <Map className="h-12 w-12 mx-auto opacity-40" />
              <p className="font-medium">Map coming soon</p>
              <p className="text-sm">Interactive Leaflet map with color-coded location pins will be added next.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
