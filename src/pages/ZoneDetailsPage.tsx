import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, Plus, X, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

interface Zone {
  id: string;
  name: string;
  description: string | null;
}

interface Location {
  id: string;
  name: string | null;
  address: string;
  zone_id: string | null;
}

export default function ZoneDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  const [zone, setZone] = useState<Zone | null>(null);
  const [allZones, setAllZones] = useState<Zone[]>([]);
  const [assignedLocations, setAssignedLocations] = useState<Location[]>([]);
  const [unassignedLocations, setUnassignedLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [selectedToRemove, setSelectedToRemove] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [showUnzonedOnly, setShowUnzonedOnly] = useState(true);
  const [reassignOpen, setReassignOpen] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    const [{ data: zoneData }, { data: allLocations }, { data: zonesData }] = await Promise.all([
      supabase.from("zones").select("id, name, description").eq("id", id).single(),
      supabase.from("locations").select("id, name, address, zone_id").order("address"),
      supabase.from("zones").select("id, name, description").order("name"),
    ]);
    if (!zoneData) { toast.error("Zone not found"); navigate("/zones"); return; }
    setZone(zoneData as Zone);
    setAllZones(((zonesData || []) as Zone[]).filter((z) => z.id !== id));
    const locs = (allLocations || []) as Location[];
    setAssignedLocations(locs.filter((l) => l.zone_id === id));
    setUnassignedLocations(locs.filter((l) => !l.zone_id || l.zone_id !== id));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleAssign = async () => {
    if (selectedToAdd.size === 0) return;
    setSaving(true);
    const ids = Array.from(selectedToAdd);
    const { error } = await supabase.from("locations").update({ zone_id: id }).in("id", ids);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Added ${ids.length} location(s) to zone`);
    setSelectedToAdd(new Set());
    fetchData();
  };

  const handleReassign = async (targetZoneId: string) => {
    if (selectedToRemove.size === 0) return;
    setSaving(true);
    const ids = Array.from(selectedToRemove);
    const { error } = await supabase.from("locations").update({ zone_id: targetZoneId }).in("id", ids);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    const targetZone = allZones.find((z) => z.id === targetZoneId);
    toast.success(`Reassigned ${ids.length} location(s) to ${targetZone?.name || "another zone"}`);
    setSelectedToRemove(new Set());
    setReassignOpen(false);
    fetchData();
  };

  const handleRemove = async () => {
    if (selectedToRemove.size === 0) return;
    setSaving(true);
    const ids = Array.from(selectedToRemove);
    const { error } = await supabase.from("locations").update({ zone_id: null }).in("id", ids);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Removed ${ids.length} location(s) from zone`);
    setSelectedToRemove(new Set());
    fetchData();
  };

  const toggleAdd = (locId: string) => {
    setSelectedToAdd((prev) => {
      const next = new Set(prev);
      if (next.has(locId)) next.delete(locId); else next.add(locId);
      return next;
    });
  };

  const toggleRemove = (locId: string) => {
    setSelectedToRemove((prev) => {
      const next = new Set(prev);
      if (next.has(locId)) next.delete(locId); else next.add(locId);
      return next;
    });
  };

  const q = search.toLowerCase();
  const filteredUnassigned = unassignedLocations
    .filter((l) => !showUnzonedOnly || !l.zone_id)
    .filter((l) => l.address.toLowerCase().includes(q) || (l.name?.toLowerCase().includes(q) ?? false));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!zone) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/zones")}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Zones
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold font-display">{zone.name}</h1>
        {zone.description && <p className="text-muted-foreground mt-1">{zone.description}</p>}
      </div>

      {/* Assigned Locations */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-display">
              Locations in this zone
              <Badge variant="secondary" className="ml-2">{assignedLocations.length}</Badge>
            </CardTitle>
            {isAdmin && selectedToRemove.size > 0 && (
              <div className="flex items-center gap-2">
                <Popover open={reassignOpen} onOpenChange={setReassignOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" disabled={saving || allZones.length === 0}>
                      <ArrowRightLeft className="h-4 w-4 mr-1" /> Reassign {selectedToRemove.size} to…
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="end">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground px-2 py-1">Move to zone</p>
                      {allZones.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-2 py-2">No other zones available.</p>
                      ) : (
                        allZones.map((z) => (
                          <button
                            key={z.id}
                            onClick={() => handleReassign(z.id)}
                            className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
                          >
                            {z.name}
                          </button>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button variant="destructive" size="sm" onClick={handleRemove} disabled={saving}>
                  <X className="h-4 w-4 mr-1" /> Remove {selectedToRemove.size} selected
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin && (
                  <TableHead className="w-10">
                    {assignedLocations.length > 0 && (
                      <Checkbox
                        checked={selectedToRemove.size === assignedLocations.length}
                        ref={(el) => {
                          if (el) {
                            (el as unknown as HTMLButtonElement).dataset.state =
                              selectedToRemove.size > 0 && selectedToRemove.size < assignedLocations.length
                                ? "indeterminate" : selectedToRemove.size === assignedLocations.length ? "checked" : "unchecked";
                          }
                        }}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedToRemove(new Set(assignedLocations.map((l) => l.id)));
                          } else {
                            setSelectedToRemove(new Set());
                          }
                        }}
                      />
                    )}
                  </TableHead>
                )}
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedLocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 3 : 2} className="text-center text-muted-foreground py-6">
                    No locations assigned to this zone yet.
                  </TableCell>
                </TableRow>
              ) : (
                assignedLocations.map((loc) => (
                  <TableRow key={loc.id}>
                    {isAdmin && (
                      <TableCell>
                        <Checkbox checked={selectedToRemove.has(loc.id)} onCheckedChange={() => toggleRemove(loc.id)} />
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground">{loc.name || "—"}</TableCell>
                    <TableCell className="font-medium">{loc.address}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Locations */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-display">Add locations to zone</CardTitle>
              {selectedToAdd.size > 0 && (
                <Button size="sm" onClick={handleAssign} disabled={saving}>
                  <Plus className="h-4 w-4 mr-1" /> Add {selectedToAdd.size} selected
                </Button>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2">
              <Input
                placeholder="Search by name or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
              />
              <div className="flex items-center gap-2 shrink-0">
                <Switch id="unzoned-only" checked={showUnzonedOnly} onCheckedChange={setShowUnzonedOnly} />
                <Label htmlFor="unzoned-only" className="text-sm whitespace-nowrap">Unzoned only</Label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      {filteredUnassigned.length > 0 && (() => {
                        const visibleIds = filteredUnassigned.slice(0, 100).map((l) => l.id);
                        const allSelected = visibleIds.every((id) => selectedToAdd.has(id));
                        const someSelected = visibleIds.some((id) => selectedToAdd.has(id));
                        return (
                          <Checkbox
                            checked={allSelected}
                            ref={(el) => {
                              if (el) {
                                (el as unknown as HTMLButtonElement).dataset.state =
                                  someSelected && !allSelected ? "indeterminate" : allSelected ? "checked" : "unchecked";
                              }
                            }}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedToAdd(new Set([...selectedToAdd, ...visibleIds]));
                              } else {
                                const next = new Set(selectedToAdd);
                                visibleIds.forEach((id) => next.delete(id));
                                setSelectedToAdd(next);
                              }
                            }}
                          />
                        );
                      })()}
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Current Zone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnassigned.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        {search ? "No matching locations found." : "All locations are already in this zone."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUnassigned.slice(0, 100).map((loc) => (
                      <TableRow key={loc.id} data-state={selectedToAdd.has(loc.id) ? "selected" : undefined}>
                        <TableCell>
                          <Checkbox checked={selectedToAdd.has(loc.id)} onCheckedChange={() => toggleAdd(loc.id)} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{loc.name || "—"}</TableCell>
                        <TableCell className="font-medium">{loc.address}</TableCell>
                        <TableCell className="text-muted-foreground/50">
                          {loc.zone_id ? <Badge variant="outline" className="text-xs">Other zone</Badge> : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {filteredUnassigned.length > 100 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-2 text-xs">
                        Showing 100 of {filteredUnassigned.length} — use search to narrow results
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
