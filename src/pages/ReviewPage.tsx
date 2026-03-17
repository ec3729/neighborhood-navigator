import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ArrowUpDown, CalendarIcon, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";

interface LocationRow {
  id: string;
  name: string | null;
  address: string;
  location_type: string | null;
  status: string;
  updated_at: string;
  surveyed_at: string | null;
  zone_id: string | null;
  zones: { name: string } | null;
}

type SortKey = "name" | "address" | "location_type" | "status" | "zone" | "updated_at" | "surveyed_at";

const PER_PAGE = 25;

const statusLabels: Record<string, string> = {
  not_surveyed: "Not Surveyed",
  in_progress: "In Progress",
  surveyed: "Surveyed",
};

const typeLabels: Record<string, string> = {
  residential: "Residential",
  business: "Business",
  vacant: "Vacant",
  public_space: "Public Space",
};

const statusColors: Record<string, string> = {
  not_surveyed: "bg-muted text-muted-foreground",
  in_progress: "bg-accent text-accent-foreground",
  surveyed: "bg-primary/10 text-primary",
};

export default function ReviewPage() {
  const { hasRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Pagination
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!authLoading && !hasRole("admin")) {
      navigate("/dashboard");
    }
  }, [authLoading, hasRole, navigate]);

  useEffect(() => {
    async function fetchData() {
      const [locRes, zoneRes] = await Promise.all([
        supabase.from("locations").select("id, name, address, location_type, status, updated_at, surveyed_at, zone_id, zones(name)"),
        supabase.from("zones").select("id, name"),
      ]);
      if (locRes.data) setLocations(locRes.data as unknown as LocationRow[]);
      if (zoneRes.data) setZones(zoneRes.data);
      setLoading(false);
    }
    if (!authLoading && hasRole("admin")) fetchData();
  }, [authLoading, hasRole]);

  const filtered = useMemo(() => {
    let result = [...locations];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) => l.name?.toLowerCase().includes(q) || l.address.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") result = result.filter((l) => l.status === statusFilter);
    if (typeFilter !== "all") result = result.filter((l) => l.location_type === typeFilter);
    if (zoneFilter !== "all") result = result.filter((l) => l.zone_id === zoneFilter);
    if (dateFrom) {
      const from = dateFrom.getTime();
      result = result.filter((l) => new Date(l.updated_at).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((l) => new Date(l.updated_at).getTime() <= to.getTime());
    }

    result.sort((a, b) => {
      let aVal: string | null = "";
      let bVal: string | null = "";
      if (sortKey === "zone") {
        aVal = a.zones?.name ?? "";
        bVal = b.zones?.name ?? "";
      } else {
        aVal = (a as any)[sortKey] ?? "";
        bVal = (b as any)[sortKey] ?? "";
      }
      const cmp = (aVal ?? "").localeCompare(bVal ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [locations, search, statusFilter, typeFilter, zoneFilter, dateFrom, dateTo, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [search, statusFilter, typeFilter, zoneFilter, dateFrom, dateTo]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(sortKeyName)}>
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn("h-3 w-3", sortKey === sortKeyName ? "text-foreground" : "text-muted-foreground/50")} />
      </div>
    </TableHead>
  );

  if (authLoading || loading) {
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Review Locations</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name or address…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="not_surveyed">Not Surveyed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="surveyed">Surveyed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="residential">Residential</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="vacant">Vacant</SelectItem>
            <SelectItem value="public_space">Public Space</SelectItem>
          </SelectContent>
        </Select>

        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Zone" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            {zones.map((z) => (
              <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date From */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-40 justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        {/* Date To */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-40 justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "MMM d, yyyy") : "To date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
            <X className="h-4 w-4 mr-1" /> Clear dates
          </Button>
        )}
      </div>

      <div className="text-sm text-muted-foreground">{filtered.length} location{filtered.length !== 1 ? "s" : ""}</div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Name" sortKeyName="name" />
              <SortHeader label="Address" sortKeyName="address" />
              <SortHeader label="Type" sortKeyName="location_type" />
              <SortHeader label="Status" sortKeyName="status" />
              <SortHeader label="Zone" sortKeyName="zone" />
              <SortHeader label="Updated At" sortKeyName="updated_at" />
              <SortHeader label="Surveyed At" sortKeyName="surveyed_at" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No locations found.</TableCell>
              </TableRow>
            ) : (
              paginated.map((loc) => (
                <TableRow key={loc.id} className="cursor-pointer" onClick={() => navigate(`/locations/${loc.id}`)}>
                  <TableCell className="font-medium">{loc.name || "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{loc.address}</TableCell>
                  <TableCell>{loc.location_type ? typeLabels[loc.location_type] || loc.location_type : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[loc.status]}>
                      {statusLabels[loc.status] || loc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{loc.zones?.name || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{format(new Date(loc.updated_at), "MMM d, yyyy h:mm a")}</TableCell>
                  <TableCell className="whitespace-nowrap">{loc.surveyed_at ? format(new Date(loc.surveyed_at), "MMM d, yyyy h:mm a") : "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={() => setPage((p) => Math.max(1, p - 1))} className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => (
                <PaginationItem key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-2 text-muted-foreground">…</span>}
                  <PaginationLink isActive={p === page} onClick={() => setPage(p)} className="cursor-pointer">{p}</PaginationLink>
                </PaginationItem>
              ))}
            <PaginationItem>
              <PaginationNext onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
