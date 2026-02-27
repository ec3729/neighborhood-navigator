import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

type LocationType = "residential" | "business" | "vacant" | "public_space";
type SurveyStatus = "not_surveyed" | "in_progress" | "surveyed";

interface Location {
  id: string;
  address: string;
  location_type: LocationType;
  status: SurveyStatus;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

const typeLabels: Record<LocationType, string> = {
  residential: "Residential",
  business: "Business",
  vacant: "Vacant",
  public_space: "Public Space",
};

const statusColors: Record<SurveyStatus, string> = {
  not_surveyed: "bg-destructive/10 text-destructive",
  in_progress: "bg-warning/10 text-accent-foreground",
  surveyed: "bg-primary/10 text-primary",
};

export default function Locations() {
  const { user, hasRole } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newType, setNewType] = useState<LocationType>("residential");

  const fetchLocations = async () => {
    const { data } = await supabase.from("locations").select("*").order("created_at", { ascending: false });
    if (data) setLocations(data as Location[]);
  };

  useEffect(() => { fetchLocations(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("locations").insert({
      address: newAddress,
      location_type: newType,
      created_by: user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Location added");
    setNewAddress("");
    setDialogOpen(false);
    fetchLocations();
  };

  const filtered = locations.filter((l) => {
    const matchesSearch = l.address.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || l.location_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const canCreate = hasRole("surveyor") || hasRole("admin");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Locations</h1>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Location</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Add New Location</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="123 Main St" required />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newType} onValueChange={(v) => setNewType(v as LocationType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">Add Location</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search addresses..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(typeLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No locations found. Add your first location to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell className="font-medium">{loc.address}</TableCell>
                    <TableCell>{typeLabels[loc.location_type]}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[loc.status]}>
                        {loc.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {new Date(loc.created_at).toLocaleDateString()}
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
