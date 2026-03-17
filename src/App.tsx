import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Locations from "./pages/Locations";
import MapView from "./pages/MapView";
import TeamPage from "./pages/TeamPage";
import SettingsPage from "./pages/SettingsPage";
import CanvasPage from "./pages/CanvasPage";
import CanvasStartPage from "./pages/CanvasStartPage";
import ZonesPage from "./pages/ZonesPage";
import ZoneDetailsPage from "./pages/ZoneDetailsPage";
import LocationDetailsPage from "./pages/LocationDetailsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/locations" element={<Locations />} />
              <Route path="/locations/:id" element={<LocationDetailsPage />} />
              <Route path="/map" element={<MapView />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/canvas" element={<CanvasStartPage />} />
              <Route path="/canvas/review" element={<CanvasPage />} />
              <Route path="/zones" element={<ZonesPage />} />
              <Route path="/zones/:id" element={<ZoneDetailsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
