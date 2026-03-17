import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Search, Trash2, Users } from "lucide-react";

type AppRole = "admin" | "surveyor" | "viewer";

interface TeamMember {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: AppRole;
  joined_at: string;
}

const roleBadgeVariant = (role: AppRole) => {
  switch (role) {
    case "admin": return "default";
    case "surveyor": return "secondary";
    case "viewer": return "outline";
  }
};

const roleLabel = (role: AppRole) =>
  role.charAt(0).toUpperCase() + role.slice(1);

export default function TeamPage() {
  const { user, hasRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !hasRole("admin")) navigate("/dashboard");
  }, [authLoading, hasRole, navigate]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, avatar_url, created_at"),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    if (profilesRes.error || rolesRes.error) {
      toast({ title: "Error loading team", description: profilesRes.error?.message || rolesRes.error?.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const rolesMap = new Map(rolesRes.data.map((r) => [r.user_id, r.role as AppRole]));
    const merged: TeamMember[] = profilesRes.data.map((p) => ({
      user_id: p.user_id,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      role: rolesMap.get(p.user_id) ?? "viewer",
      joined_at: p.created_at,
    }));

    setMembers(merged);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (!authLoading && hasRole("admin")) fetchMembers();
  }, [authLoading, hasRole, fetchMembers]);

  const handleRoleChange = async (memberId: string, newRole: AppRole) => {
    if (memberId === user?.id) {
      toast({ title: "Cannot change your own role", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", memberId);

    if (error) {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role updated" });
      setMembers((prev) => prev.map((m) => m.user_id === memberId ? { ...m, role: newRole } : m));
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", memberId);

    if (error) {
      toast({ title: "Failed to remove member", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Member removed" });
      setMembers((prev) => prev.filter((m) => m.user_id !== memberId));
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const filtered = members.filter((m) => {
    const matchesSearch = !search || (m.full_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (authLoading) return null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Team Management
        </h1>
        <Badge variant="outline">{members.length} members</Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="surveyor">Surveyor</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden sm:table-cell">Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No members found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((m) => (
                <TableRow key={m.user_id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                        <AvatarFallback className="text-xs">{getInitials(m.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{m.full_name || "Unnamed"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant(m.role)}>{roleLabel(m.role)}</Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {new Date(m.joined_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {m.user_id !== user?.id && (
                        <>
                          <Select
                            value={m.role}
                            onValueChange={(val) => handleRoleChange(m.user_id, val as AppRole)}
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="surveyor">Surveyor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove team member?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove <strong>{m.full_name || "this user"}</strong> from the team.
                                  They will lose access to role-based features.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveMember(m.user_id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      {m.user_id === user?.id && (
                        <span className="text-xs text-muted-foreground">You</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
