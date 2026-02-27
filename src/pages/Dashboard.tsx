import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, ClipboardCheck, AlertTriangle, Users } from "lucide-react";

interface Stats {
  totalLocations: number;
  surveyed: number;
  notSurveyed: number;
  totalSurveys: number;
}

export default function Dashboard() {
  const { profile, roles } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalLocations: 0, surveyed: 0, notSurveyed: 0, totalSurveys: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [locRes, surveyRes] = await Promise.all([
        supabase.from("locations").select("status"),
        supabase.from("surveys").select("id", { count: "exact", head: true }),
      ]);

      const locations = locRes.data || [];
      setStats({
        totalLocations: locations.length,
        surveyed: locations.filter((l) => l.status === "surveyed").length,
        notSurveyed: locations.filter((l) => l.status === "not_surveyed").length,
        totalSurveys: surveyRes.count || 0,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "Total Locations", value: stats.totalLocations, icon: MapPin, color: "text-primary" },
    { title: "Surveyed", value: stats.surveyed, icon: ClipboardCheck, color: "text-success" },
    { title: "Remaining", value: stats.notSurveyed, icon: AlertTriangle, color: "text-warning" },
    { title: "Total Surveys", value: stats.totalSurveys, icon: Users, color: "text-info" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>
        <p className="text-muted-foreground mt-1">
          {roles.includes("admin") ? "Organization overview" : "Your survey dashboard"}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2">
          <p>1. Add locations using the <strong>Map View</strong> or <strong>Locations</strong> list.</p>
          <p>2. Assign surveyors and begin collecting data in the field.</p>
          <p>3. Track progress here on the dashboard.</p>
        </CardContent>
      </Card>
    </div>
  );
}
