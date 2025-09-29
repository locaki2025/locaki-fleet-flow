import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  MapPin, 
  Search, 
  Filter, 
  Car, 
  Navigation, 
  Clock,
  Zap,
  AlertTriangle,
  RefreshCw,
  Settings
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import GoogleMapComponent from "@/components/GoogleMap";
import RastrosystemConfigDialog from "@/components/RastrosystemConfigDialog";

const Map = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchVehicles();
    }
  }, [user]);

  const fetchVehicles = async () => {
    if (!user?.id) {
      console.warn('No user ID found, skipping vehicles fetch');
      setVehicles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // First fetch devices from database (Rastrosystem data is stored here)
      const { data: devicesData, error: devicesError } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id);

      if (devicesError) {
        console.error('Supabase error fetching devices:', devicesError);
        throw new Error(`Erro ao carregar veículos: ${devicesError.message}`);
      }
      
      // Try to sync latest data from Rastrosystem
      try {
        const { data: syncData, error: syncError } = await supabase.functions.invoke('rastrosystem-sync', {
          body: { 
            action: 'sync_devices',
            user_id: user.id
          }
        });
        
        if (syncError) {
          console.warn('Rastrosystem sync failed, using cached data:', syncError);
        } else {
          console.log('Rastrosystem sync successful:', syncData);
        }
      } catch (syncError) {
        console.warn('Rastrosystem sync error, using cached data:', syncError);
      }
      
      // Fetch updated devices data after sync attempt
      const { data: updatedDevices, error: updatedError } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id);
        
      if (!updatedError && updatedDevices) {
        // Map devices to vehicle format expected by GoogleMapComponent
        const mappedVehicles = updatedDevices.map(device => ({
          id: device.id,
          plate: device.vehicle_plate,
          brand: device.name.split(' ')[0] || 'Veículo',
          model: device.name,
          latitude: device.latitude,
          longitude: device.longitude,
          status: device.status,
          last_update: device.last_update,
          address: device.address
        }));
        
        setVehicles(mappedVehicles);
        console.log('Map vehicles loaded successfully:', mappedVehicles.length);
      } else {
        // Use fallback data
        const mappedDevices = (devicesData || []).map(device => ({
          id: device.id,
          plate: device.vehicle_plate,
          brand: device.name.split(' ')[0] || 'Veículo',
          model: device.name,
          latitude: device.latitude,
          longitude: device.longitude,
          status: device.status,
          last_update: device.last_update,
          address: device.address
        }));
        
        setVehicles(mappedDevices);
        console.log('Using fallback vehicles data:', mappedDevices.length);
      }
      
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast({
        title: "Erro ao carregar veículos",
        description: error instanceof Error ? error.message : "Erro desconhecido ao carregar veículos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const vehiclesWithLocation = vehicles.filter(v => v.latitude && v.longitude);
  const onlineVehicles = vehicles.filter(v => v.status === 'online').length;
  const offlineVehicles = vehicles.length - onlineVehicles;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mapa & Rastreamento</h1>
          <p className="text-muted-foreground">Acompanhe a localização da sua frota em tempo real</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowConfigDialog(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurar Rastrosystem
          </Button>
          <Button 
            variant="outline" 
            onClick={fetchVehicles}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

      <RastrosystemConfigDialog 
        open={showConfigDialog} 
        onOpenChange={setShowConfigDialog}
        onConfigSaved={fetchVehicles}
      />

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-success">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Online</p>
                <p className="text-2xl font-bold text-success">{onlineVehicles}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-success/20 flex items-center justify-center">
                <Navigation className="h-4 w-4 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Offline</p>
                <p className="text-2xl font-bold text-destructive">{offlineVehicles}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-accent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Em Movimento</p>
                <p className="text-2xl font-bold text-accent">2</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                <Car className="h-4 w-4 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-warning">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alertas</p>
                <p className="text-2xl font-bold text-warning">1</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-warning/20 flex items-center justify-center">
                <Zap className="h-4 w-4 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Area */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Mapa da Frota
                </CardTitle>
                <CardDescription>
                  Visualização em tempo real dos veículos
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                 <Button variant="outline" size="sm" onClick={() => {
                   alert("Funcionalidade de filtros em desenvolvimento");
                 }}>
                   <Filter className="h-4 w-4 mr-2" />
                   Filtros
                 </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-96 rounded-lg overflow-hidden">
              <GoogleMapComponent vehicles={vehicles} />
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-success"></div>
                <span className="text-xs">Online</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-accent"></div>
                <span className="text-xs">Em movimento</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-destructive"></div>
                <span className="text-xs">Offline</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle List */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Veículos Online</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar veículo..."
                  className="pl-10"
                />
              </div>
            </CardHeader>
             <CardContent className="max-h-96 overflow-y-auto space-y-3">
               {vehicles.filter(v => v.latitude && v.longitude).map((vehicle) => (
                 <div key={vehicle.id} className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                   <div className="flex items-center justify-between mb-2">
                     <div className="flex items-center gap-2">
                       <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                         <Car className="h-4 w-4 text-primary" />
                       </div>
                       <div>
                         <p className="font-medium text-sm">{vehicle.brand} {vehicle.model}</p>
                         <p className="text-xs text-muted-foreground font-mono">{vehicle.plate}</p>
                       </div>
                     </div>
                     <Badge 
                       variant="outline" 
                       className={`${vehicle.status === 'online' ? 'bg-success/10 text-success border-success' : 'bg-destructive/10 text-destructive border-destructive'}`}
                     >
                       {vehicle.status === 'online' ? 'Online' : 'Offline'}
                     </Badge>
                   </div>
                   
                   <div className="space-y-1">
                     <div className="flex items-center gap-1 text-xs text-muted-foreground">
                       <Clock className="h-3 w-3" />
                       <span>
                         Atualizado {vehicle.last_update ? new Date(vehicle.last_update).toLocaleTimeString('pt-BR') : 'N/A'}
                       </span>
                     </div>
                     <div className="flex items-center gap-1 text-xs text-muted-foreground">
                       <Navigation className="h-3 w-3" />
                       <span>Coordenadas: {vehicle.latitude?.toFixed(4)}, {vehicle.longitude?.toFixed(4)}</span>
                     </div>
                     {vehicle.address && (
                       <div className="flex items-center gap-1 text-xs text-muted-foreground">
                         <MapPin className="h-3 w-3" />
                         <span className="truncate">{vehicle.address}</span>
                       </div>
                     )}
                   </div>
                 </div>
               ))}
               
               {vehicles.filter(v => v.latitude && v.longitude).length === 0 && (
                  <div className="text-center py-8">
                    <Car className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum veículo online encontrado</p>
                    <p className="text-xs text-muted-foreground">Configure a Rastrosystem para ver a localização dos veículos</p>
                  </div>
               )}
             </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Alertas Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium">Velocidade Excedida</span>
                </div>
                <p className="text-xs text-muted-foreground">Honda CG 160 - ABC-1234</p>
                <p className="text-xs text-muted-foreground">Há 15 minutos</p>
              </div>
              
              <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Entrada em Geofence</span>
                </div>
                <p className="text-xs text-muted-foreground">Yamaha Factor - DEF-5678</p>
                <p className="text-xs text-muted-foreground">Há 32 minutos</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Map;