import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import Dashboard from "@/components/Dashboard";
import Customers from "@/pages/Customers";
import Vehicles from "@/pages/Vehicles";
import Rentals from "@/pages/Rentals";
import Maintenance from "@/pages/Maintenance";
import ExtratoConta from "@/pages/ExtratoConta";
import Finance from "@/pages/Finance";
import Invoices from "@/pages/Invoices";
import Devices from "@/pages/Devices";
import Settings from "@/pages/Settings";
import Map from "@/pages/Map";
import Reports from "@/pages/Reports";
import TrafficFines from "@/pages/TrafficFines";
import Users from "@/pages/Users";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/vehicles" element={<Vehicles />} />
              <Route path="/rentals" element={<Rentals />} />
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/extrato-conta" element={<ExtratoConta />} />
              <Route path="/devices" element={<Devices />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/map" element={<Map />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/traffic-fines" element={<TrafficFines />} />
              <Route path="/users" element={<Users />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
