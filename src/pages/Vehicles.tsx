import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Car, MapPin, Gauge, Calendar, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import VehicleDialog from "@/components/VehicleDialog";
import VehicleDetailsDialog from "@/components/VehicleDetailsDialog";

const Vehicles = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  useEffect(() => {
    if (user) {
      fetchVehicles();
      fetchContracts();
    }
  }, [user]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('vehicles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('Veículo atualizado, recarregando lista...');
          fetchVehicles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchVehicles = async () => {
    if (!user?.id) {
      console.warn('No user ID found, skipping vehicles fetch');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching vehicles:', error);
        throw new Error(`Erro ao carregar veículos: ${error.message}`);
      }
      
      setVehicles(data || []);
      console.log('Vehicles loaded successfully:', data?.length || 0);
    } catch (error) {
      console.error('Erro ao buscar veículos:', error);
      toast({
        title: "Erro no carregamento",
        description: error instanceof Error ? error.message : "Não foi possível carregar os veículos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchContracts = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'ativo');

      if (error) {
        console.error('Error fetching contracts:', error);
        return;
      }
      
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const handleVehicleCreated = () => {
    fetchVehicles(); // Atualiza a lista após criar um veículo
    fetchContracts(); // Atualiza a lista de contratos também
  };

  const getVehicleStatus = (vehicle: any) => {
    // Verifica se existe um contrato ativo para esta placa
    const activeContract = contracts.find(contract => 
      contract.moto_id === vehicle.id && contract.status === 'ativo'
    );
    
    return activeContract ? 'alugado' : vehicle.status;
  };

  const handleViewOnMap = (vehicle: any) => {
    navigate('/map');
    toast({
      title: "Redirecionando para o mapa",
      description: `Mostrando localização de ${vehicle.plate}`,
    });
  };

  const handleViewDetails = async (vehicle: any) => {
    // Buscar localização do Rastrosystem se disponível
    let vehicleWithLocation = { ...vehicle };
    
    if (vehicle.rastrosystem_id) {
      try {
        const { data: config } = await supabase
          .from('tenant_config')
          .select('config_value')
          .eq('user_id', user?.id)
          .eq('config_key', 'rastrosystem')
          .single();

        if (config?.config_value) {
          const rastroConfig = config.config_value as any;
          
          // Fazer login no Rastrosystem
          const loginResponse = await fetch('https://rastrosystem.com.br/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              login: rastroConfig.username,
              senha: rastroConfig.password
            })
          });
          
          if (loginResponse.ok) {
            const { token } = await loginResponse.json();
            
            // Buscar posição do veículo
            const positionResponse = await fetch(`https://rastrosystem.com.br/api/posicoes/${vehicle.rastrosystem_id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (positionResponse.ok) {
              const position = await positionResponse.json();
              
              if (position.latitude && position.longitude) {
                vehicleWithLocation.lastLocation = {
                  lat: parseFloat(position.latitude),
                  lng: parseFloat(position.longitude),
                  address: position.endereco || 'Endereço não disponível',
                  updatedAt: position.data_hora || new Date().toISOString()
                };
              }
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar localização:', error);
      }
    }
    
    setSelectedVehicle(vehicleWithLocation);
    setIsDetailsDialogOpen(true);
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilters(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const clearFilters = () => {
    setStatusFilters([]);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Veículos</h1>
          <p className="text-muted-foreground">Gerencie sua frota de motocicletas</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90"
          onClick={() => setIsVehicleDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Veículo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{vehicles.length}</p>
              </div>
              <Car className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Disponíveis</p>
                <p className="text-2xl font-bold text-success">{vehicles.filter(v => getVehicleStatus(v) === 'disponivel').length}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-success/20 flex items-center justify-center">
                <Car className="h-4 w-4 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alugadas</p>
                <p className="text-2xl font-bold text-accent">{vehicles.filter(v => getVehicleStatus(v) === 'alugado').length}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                <Car className="h-4 w-4 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Manutenção</p>
                <p className="text-2xl font-bold text-warning">{vehicles.filter(v => getVehicleStatus(v) === 'manutencao').length}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-warning/20 flex items-center justify-center">
                <Car className="h-4 w-4 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome, marca, placa ou modelo..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                  {statusFilters.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {statusFilters.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Filtrar por Status</h4>
                    {statusFilters.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-auto p-1 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Limpar
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="disponivel"
                        checked={statusFilters.includes('disponivel')}
                        onCheckedChange={() => toggleStatusFilter('disponivel')}
                      />
                      <Label 
                        htmlFor="disponivel" 
                        className="text-sm font-normal cursor-pointer flex items-center gap-2"
                      >
                        <div className="h-2 w-2 rounded-full bg-success" />
                        Disponíveis
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="alugado"
                        checked={statusFilters.includes('alugado')}
                        onCheckedChange={() => toggleStatusFilter('alugado')}
                      />
                      <Label 
                        htmlFor="alugado" 
                        className="text-sm font-normal cursor-pointer flex items-center gap-2"
                      >
                        <div className="h-2 w-2 rounded-full bg-accent" />
                        Alugados
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="manutencao"
                        checked={statusFilters.includes('manutencao')}
                        onCheckedChange={() => toggleStatusFilter('manutencao')}
                      />
                      <Label 
                        htmlFor="manutencao" 
                        className="text-sm font-normal cursor-pointer flex items-center gap-2"
                      >
                        <div className="h-2 w-2 rounded-full bg-warning" />
                        Em Manutenção
                      </Label>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Grid */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando veículos...</p>
        </div>
      ) : vehicles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum veículo cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Cadastre seu primeiro veículo para começar
            </p>
            <Button 
              className="bg-gradient-primary hover:opacity-90"
              onClick={() => setIsVehicleDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Veículo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {vehicles
            .filter((vehicle) => {
              const search = searchTerm.toLowerCase();
              const matchesSearch = vehicle.plate.toLowerCase().includes(search) || 
                     vehicle.brand.toLowerCase().includes(search) ||
                     vehicle.model.toLowerCase().includes(search) ||
                     (vehicle.category && vehicle.category.toLowerCase().includes(search));
              
              const vehicleStatus = getVehicleStatus(vehicle);
              const matchesStatus = statusFilters.length === 0 || statusFilters.includes(vehicleStatus);
              
              return matchesSearch && matchesStatus;
            })
            .map((vehicle) => (
          <Card key={vehicle.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-lg bg-gradient-primary/10 flex items-center justify-center">
                    <Car className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{vehicle.brand} {vehicle.model}</CardTitle>
                    <CardDescription className="font-mono text-lg">{vehicle.plate}</CardDescription>
                  </div>
                </div>
                 <Badge 
                  variant={
                    getVehicleStatus(vehicle) === 'disponivel' ? 'default' :
                    getVehicleStatus(vehicle) === 'alugado' ? 'secondary' :
                    getVehicleStatus(vehicle) === 'manutencao' ? 'destructive' : 'outline'
                  }
                  className={
                    getVehicleStatus(vehicle) === 'disponivel' ? 'bg-success text-success-foreground' :
                    getVehicleStatus(vehicle) === 'alugado' ? 'bg-accent text-accent-foreground' :
                    getVehicleStatus(vehicle) === 'manutencao' ? 'bg-warning text-warning-foreground' : ''
                  }
                >
                  {getVehicleStatus(vehicle) === 'disponivel' ? 'Disponível' :
                   getVehicleStatus(vehicle) === 'alugado' ? 'Alugada' :
                   getVehicleStatus(vehicle) === 'manutencao' ? 'Manutenção' : getVehicleStatus(vehicle)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Ano</p>
                  <p className="font-medium">{vehicle.year}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cor</p>
                  <p className="font-medium">{vehicle.color}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Categoria</p>
                  <p className="font-medium">{vehicle.category}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{vehicle.odometer.toLocaleString()} km</span>
                </div>
              </div>
              
              {vehicle.lastLocation && (
                <div className="flex items-center gap-2 p-2 bg-accent/10 rounded-lg">
                  <MapPin className="h-4 w-4 text-accent" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Última localização</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(vehicle.lastLocation.updatedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleViewOnMap(vehicle)}
                  >
                    Ver no Mapa
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-xs text-muted-foreground">
                  {vehicle.tracker ? `Rastreador: ${vehicle.tracker}` : 'Sem rastreador'}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewDetails(vehicle)}
                >
                  Ver Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
          ))
          }
        </div>
      )}

      <VehicleDialog 
        open={isVehicleDialogOpen} 
        onOpenChange={setIsVehicleDialogOpen}
        onVehicleUpdated={handleVehicleCreated}
      />

      <VehicleDetailsDialog 
        open={isDetailsDialogOpen} 
        onOpenChange={setIsDetailsDialogOpen}
        vehicle={selectedVehicle}
        onVehicleUpdate={handleVehicleCreated}
      />
    </div>
  );
};

export default Vehicles;