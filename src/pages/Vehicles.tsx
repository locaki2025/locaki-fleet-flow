import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Car, MapPin, Gauge, Calendar } from "lucide-react";
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
  useEffect(() => {
    if (user) {
      fetchVehicles();
      fetchContracts();
    }
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

  const handleViewDetails = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setIsDetailsDialogOpen(true);
  };

  const handleFilters = () => {
    toast({
      title: "Filtros",
      description: "Funcionalidade de filtros será implementada em breve",
    });
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
                placeholder="Buscar por placa, modelo..."
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={handleFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Grid */}
      <div className="flex gap-6 overflow-x-auto pb-4">
        {loading ? (
          <div className="col-span-full text-center py-8">
            <p className="text-muted-foreground">Carregando veículos...</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <p className="text-muted-foreground">Nenhum veículo cadastrado.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setIsVehicleDialogOpen(true)}
            >
              Cadastrar primeiro veículo
            </Button>
          </div>
        ) : (
          vehicles.map((vehicle) => (
          <Card key={vehicle.id} className="min-w-[300px] hover:shadow-lg transition-all hover:scale-[1.02]">
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
        )}
      </div>

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