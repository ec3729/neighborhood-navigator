import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, LayoutDashboard, Map, List, LogOut, Settings, Users, Layers, ClipboardCheck, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/map", label: "Map View", icon: Map },
  { to: "/locations", label: "Locations", icon: List },
  { to: "/canvas", label: "Canvas", icon: ClipboardCheck },
];

const adminItems = [
  { to: "/team", label: "Team", icon: Users },
  { to: "/zones", label: "Zones", icon: Layers },
  { to: "/review", label: "Review", icon: FileSearch },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function AppSidebar() {
  const { signOut, hasRole, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-5 flex items-center gap-2">
        <div className="h-8 w-8 rounded-md bg-sidebar-primary flex items-center justify-center">
          <MapPin className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <span className="font-display font-bold text-lg">CanvassPro</span>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}

        {hasRole("admin") && (
          <>
            <div className="pt-4 pb-1 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              Admin
            </div>
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold">
            {profile?.full_name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name || "User"}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/70" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
