import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold font-display">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Organization Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Custom survey templates and organization settings coming soon.
        </CardContent>
      </Card>
    </div>
  );
}
