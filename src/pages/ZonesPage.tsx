import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";

interface Zone {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function ZonesPage() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationCounts, setLocationCounts] = useState<Map<string, number>>(new Map());

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [zoneDescription, setZoneDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const isAdmin = hasRole("admin");

  const fetchZones = async () => {
    const { data, error } = await supabase.from("zones").select("*").order("name");
    if (error) { toast.error("Failed to load zones"); setLoading(false); return; }
    setZones((data || []) as Zone[]);
    setLoading(false);
  };

  const fetchLocationCounts = async () => {
    const { data } = await supabase.from("locations").select("zone_id");
    if (!data) return;
    const counts = new Map<string, number>();
    for (const loc of data) {
      if (loc.zone_id) {
        counts.set(loc.zone_id, (counts.get(loc.zone_id) || 0) + 1);
      }
    }
    setLocationCounts(counts);
  };

  useEffect(() => { fetchZones(); fetchLocationCounts(); }, []);

  const openCreate = () => {
    setEditingZone(null);
    setZoneName("");
    setZoneDescription("");
    setDialogOpen(true);
  };

  const openEdit = (zone: Zone) => {
    setEditingZone(zone);
    setZoneName(zone.name);
    setZoneDescription(zone.description || "");
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !zoneName.trim()) return;
    setSaving(true);
    if (editingZone) {
      const { error } = await supabase.from("zones").update({ name: zoneName.trim(), description: zoneDescription.trim() || null }).eq("id", editingZone.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Zone updated");
    } else {
      const { error } = await supabase.from("zones").insert({ name: zoneName.trim(), description: zoneDescription.trim() || null, created_by: user.id });
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Zone created");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchZones();
  };

  const handleDelete = async (zoneId: string) => {
    const { error } = await supabase.from("zones").delete().eq("id", zoneId);
    if (error) { toast.error(error.message); return; }
    toast.success("Zone deleted");
    fetchZones();
    fetchLocationCounts();
  };

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center space-y-4">
        <h1 className="text-2xl font-bold font-display">Zones</h1>
        <p className="text-muted-foreground">Only admins can manage zones.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Zones</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Zone
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Locations</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="h-6 w-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : zones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No zones yet. Create your first zone to group locations.
                  </TableCell>
                </TableRow>
              ) : (
                zones.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {zone.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {zone.description || <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold">{locationCounts.get(zone.id) || 0}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {new Date(zone.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(zone)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete zone "{zone.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove the zone. {locationCounts.get(zone.id) ? `${locationCounts.get(zone.id)} location(s) will become unzoned.` : "No locations are assigned to this zone."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(zone.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editingZone ? "Edit Zone" : "Create Zone"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder="e.g. Downtown" required />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input value={zoneDescription} onChange={(e) => setZoneDescription(e.target.value)} placeholder="e.g. Central business district area" />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !zoneName.trim()}>
                {saving ? "Saving..." : editingZone ? "Save Changes" : "Create Zone"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
