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
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import GoogleMapComponent from "@/components/GoogleMap";
import RastrosystemConfigDialog from "@/components/RastrosystemConfigDialog";
import VehicleMapCard from "@/components/VehicleMapCard";
import { useMonitoramentoTraccar } from "@/hooks/useMonitoramentoTraccar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const Map = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const { fetchLocation } = useMonitoramentoTraccar();
  
  // Filtros - iniciam desmarcados
  const [filterOnline, setFilterOnline] = useState(false);
  const [filterOffline, setFilterOffline] = useState(false);
  const [filterMoving, setFilterMoving] = useState(false);
  const [searchPlate, setSearchPlate] = useState("");

  useEffect(() => {
    if (user) {
      fetchVehicles();
    }
  }, [user]);

  // Atualização em tempo real das posições usando Rastrosystem
  const hasVehiclesRef = useRef(false);
  
  useEffect(() => {
    hasVehiclesRef.current = vehicles.length > 0;
  }, [vehicles.length]);

  useEffect(() => {
    if (!user) return;

    const updatePositionsFromRastrosystem = async () => {
      if (!hasVehiclesRef.current) return;
      
      try {
        console.log('Atualizando posições via Rastrosystem...');
        
        // Login no Rastrosystem
        const loginRes = await fetch('https://locaki.rastrosystem.com.br/api_v2/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login: '54858795000100', senha: '123456', app: 9 })
        });
        
        if (!loginRes.ok) {
          console.error('Falha no login Rastrosystem');
          return;
        }
        
        const login = await loginRes.json();
        const token = login.token;
        const cliente_id = login.cliente_id;

        // Buscar veículos
        const vRes = await fetch(`https://locaki.rastrosystem.com.br/api_v2/veiculos/${cliente_id}/`, {
          method: 'GET',
          headers: { 
            'Authorization': `token ${token}`, 
            'Content-Type': 'application/json' 
          }
        });
        
        if (!vRes.ok) {
          console.error('Falha ao buscar veículos no Rastrosystem');
          return;
        }
        
        const vJson = await vRes.json();
        const dispositivos = vJson.dispositivos || vJson || [];
        
        console.log(`Atualizando ${dispositivos.length} veículos do Rastrosystem`);
        
        setVehicles(prevVehicles => {
          // Se não houver veículos anteriores, não atualiza
          if (!prevVehicles || prevVehicles.length === 0) {
            console.log('Nenhum veículo anterior para atualizar');
            return prevVehicles;
          }

          // Se não houver dispositivos, mantém os veículos atuais
          if (!dispositivos || dispositivos.length === 0) {
            console.log('Nenhum dispositivo recebido, mantendo veículos atuais');
            return prevVehicles;
          }

          return prevVehicles.map(vehicle => {
            // Encontra o dispositivo correspondente pela placa ou IMEI
            const device = dispositivos.find((d: any) => 
              d.placa === vehicle.plate || 
              d.imei === vehicle.imei ||
              d.unique_id === vehicle.imei
            );
            
            // Valida se as coordenadas são válidas antes de atualizar
            if (device) {
              const lat = typeof device.latitude === 'number' ? device.latitude : Number(device.latitude);
              const lng = typeof device.longitude === 'number' ? device.longitude : Number(device.longitude);
              
              // Só atualiza se as coordenadas forem válidas (não nulas, não NaN, não zero)
              const hasValidCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
              
              if (hasValidCoords) {
                console.log(`Atualizando ${vehicle.plate}:`, {
                  lat,
                  lng,
                  speed: device.speed || device.velocidade || 0
                });
                
                return {
                  ...vehicle,
                  latitude: lat,
                  longitude: lng,
                  status: device.status ? 'online' : 'offline',
                  speed: device.speed || device.velocidade || 0,
                  velocidade: device.velocidade || device.speed || 0,
                  last_update: device.server_time || device.time,
                  address: device.address || vehicle.address
                };
              }
            }
            
            // Mantém o veículo sem alterações se não encontrou ou coordenadas inválidas
            return vehicle;
          });
        });
      } catch (error) {
        console.error('Erro ao atualizar posições do Rastrosystem:', error);
      }
    };

    // Atualiza a cada 15 segundos
    const interval = setInterval(updatePositionsFromRastrosystem, 15000);

    return () => clearInterval(interval);
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
        console.log('Dispositivos recebidos do banco:', updatedDevices);
        
        // Map devices to vehicle format expected by GoogleMapComponent
        const mappedVehicles = updatedDevices.map(device => {
          console.log('Processando device:', {
            plate: device.vehicle_plate,
            lat: device.latitude,
            lng: device.longitude,
            status: device.status
          });
          
          return {
            id: device.id,
            imei: device.imei,
            plate: device.vehicle_plate,
            brand: device.name.split(' ')[0] || 'Veículo',
            model: device.name,
            latitude: device.latitude ? Number(device.latitude) : null,
            longitude: device.longitude ? Number(device.longitude) : null,
            status: device.status === 'online' ? 'online' : 'offline',
            speed: (device as any).speed || 0,
            velocidade: (device as any).velocidade || 0,
            last_update: device.last_update,
            address: device.address
          };
        });
        
        console.log('Veículos mapeados para o mapa:', mappedVehicles);
        console.log('Veículos com coordenadas válidas:', mappedVehicles.filter(v => v.latitude && v.longitude).length);
        
        setVehicles(mappedVehicles);
      } else {
        console.log('Usando dados de fallback, dispositivos:', devicesData);
        // Use fallback data
        const mappedDevices = (devicesData || []).map(device => ({
          id: device.id,
          imei: device.imei,
          plate: device.vehicle_plate,
          brand: device.name.split(' ')[0] || 'Veículo',
          model: device.name,
          latitude: device.latitude ? Number(device.latitude) : null,
          longitude: device.longitude ? Number(device.longitude) : null,
          status: device.status === 'online' ? 'online' : 'offline',
          speed: (device as any).speed || 0,
          velocidade: (device as any).velocidade || 0,
          last_update: device.last_update,
          address: device.address
        }));
        
        setVehicles(mappedDevices);
        console.log('Veículos de fallback:', mappedDevices);
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
  const movingVehicles = vehicles.filter(v => {
    const speed = Number(v.speed || v.velocidade || 0);
    return speed > 0 && v.status === 'online';
  }).length;
  
  // Aplica os filtros - se nenhum filtro estiver ativo, mostra todos os veículos
  const filteredVehicles = vehicles.filter(v => {
    // Primeiro filtra pela placa se houver pesquisa
    if (searchPlate.trim()) {
      const plate = (v.plate ?? '').toString().toLowerCase();
      const term = searchPlate.trim().toLowerCase();
      if (!plate.includes(term)) return false;
    }
    
    // Se nenhum filtro está ativo, mostra todos os veículos
    const hasAnyFilter = filterOnline || filterOffline || filterMoving;
    if (!hasAnyFilter) return true;
    
    const speed = Number(v.speed || v.velocidade || 0);
    const isMoving = speed > 0 && v.status === 'online';
    const isOnline = v.status === 'online';
    const isOffline = v.status !== 'online';
    
    // Se algum filtro está ativo, verifica se o veículo corresponde a algum dos filtros ativos
    if (isMoving && filterMoving) return true;
    if (isOnline && !isMoving && filterOnline) return true;
    if (isOffline && filterOffline) return true;
    
    return false;
  });

  // Fallback: se não houver coordenadas no banco, busca diretamente no Rastrosystem
  const fallbackTriedRef = useRef(false);
  useEffect(() => {
    const tryFallback = async () => {
      if (fallbackTriedRef.current) return;
      if (loading) return;
      if (!user?.id) return;

      const validCount = vehicles.filter(v => v.latitude != null && v.longitude != null && !isNaN(Number(v.latitude)) && !isNaN(Number(v.longitude))).length;
      if (validCount === 0) {
        fallbackTriedRef.current = true;
        try {
          console.log('Tentando fallback Rastrosystem para obter posições...');
          const loginRes = await fetch('https://locaki.rastrosystem.com.br/api_v2/login/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: '54858795000100', senha: '123456', app: 9 })
          });
          if (!loginRes.ok) throw new Error('Falha no login Rastrosystem');
          const login = await loginRes.json();
          const token = login.token;
          const cliente_id = login.cliente_id;

          const vRes = await fetch(`https://locaki.rastrosystem.com.br/api_v2/veiculos/${cliente_id}/`, {
            method: 'GET',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }
          });
          if (!vRes.ok) throw new Error('Falha ao buscar veículos no Rastrosystem');
          const vJson = await vRes.json();
          const dispositivos = vJson.dispositivos || vJson || [];
          const mapped = dispositivos.map((d: any) => ({
            id: d.unique_id || String(d.id),
            imei: d.imei || d.unique_id,
            plate: d.placa || d.name || 'Sem placa',
            brand: d.modelo ? String(d.modelo).split(' ')[0] : (d.name?.split(' ')[0] || 'Veículo'),
            model: d.name || d.modelo || 'Dispositivo',
            latitude: typeof d.latitude === 'number' ? d.latitude : Number(d.latitude),
            longitude: typeof d.longitude === 'number' ? d.longitude : Number(d.longitude),
            status: d.status ? 'online' : 'offline',
            speed: d.speed || d.velocidade || 0,
            velocidade: d.velocidade || d.speed || 0,
            last_update: d.server_time || d.time,
            address: d.address || null
          })).filter((v: any) => !isNaN(Number(v.latitude)) && !isNaN(Number(v.longitude)));

          console.log('Fallback Rastrosystem mapeou veículos:', mapped.length, mapped);
          if (mapped.length > 0) {
            setVehicles(mapped);
          }
        } catch (err) {
          console.error('Fallback Rastrosystem falhou:', err);
        }
      }
    };

    tryFallback();
  }, [vehicles, loading, user?.id]);

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
                <p className="text-2xl font-bold text-accent">{movingVehicles}</p>
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
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Pesquisar por placa..." 
                    value={searchPlate}
                    onChange={(e) => setSearchPlate(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                {searchPlate && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSearchPlate("")}
                  >
                    Limpar
                  </Button>
                )}
                 <Popover>
                   <PopoverTrigger asChild>
                     <Button variant="outline" size="sm">
                       <Filter className="h-4 w-4 mr-2" />
                       Filtros
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-64">
                     <div className="space-y-4">
                       <h4 className="font-medium text-sm">Filtrar veículos</h4>
                       <div className="space-y-3">
                         <div className="flex items-center space-x-2">
                           <Checkbox 
                             id="filter-online" 
                             checked={filterOnline}
                             onCheckedChange={(checked) => setFilterOnline(checked as boolean)}
                           />
                           <label
                             htmlFor="filter-online"
                             className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                           >
                             <div className="h-3 w-3 rounded-full bg-success"></div>
                             Veículos Online ({onlineVehicles - movingVehicles})
                           </label>
                         </div>
                         <div className="flex items-center space-x-2">
                           <Checkbox 
                             id="filter-offline" 
                             checked={filterOffline}
                             onCheckedChange={(checked) => setFilterOffline(checked as boolean)}
                           />
                           <label
                             htmlFor="filter-offline"
                             className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                           >
                             <div className="h-3 w-3 rounded-full bg-destructive"></div>
                             Veículos Offline ({offlineVehicles})
                           </label>
                         </div>
                         <div className="flex items-center space-x-2">
                           <Checkbox 
                             id="filter-moving" 
                             checked={filterMoving}
                             onCheckedChange={(checked) => setFilterMoving(checked as boolean)}
                           />
                           <label
                             htmlFor="filter-moving"
                             className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                           >
                             <div className="h-3 w-3 rounded-full bg-accent"></div>
                             Em Movimento ({movingVehicles})
                           </label>
                         </div>
                       </div>
                     </div>
                   </PopoverContent>
                 </Popover>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-96 rounded-lg overflow-hidden relative">
              <GoogleMapComponent 
                vehicles={filteredVehicles} 
                onVehicleClick={(vehicle) => setSelectedVehicle(vehicle)}
              />
              {selectedVehicle && (
                <div className="absolute top-4 right-4 w-80 max-h-[calc(100%-2rem)] overflow-y-auto z-10">
                  <VehicleMapCard
                    vehicle={selectedVehicle}
                    onClose={() => setSelectedVehicle(null)}
                  />
                </div>
              )}
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
               {filteredVehicles.filter(v => v.latitude && v.longitude).map((vehicle) => (
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