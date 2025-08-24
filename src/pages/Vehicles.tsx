import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Car, MapPin, Gauge, Calendar } from "lucide-react";
import { mockVehicles } from "@/data/mockData";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import VehicleDialog from "@/components/VehicleDialog";
import VehicleDetailsDialog from "@/components/VehicleDetailsDialog";

const Vehicles = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
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
                <p className="text-2xl font-bold">{mockVehicles.length}</p>
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
                <p className="text-2xl font-bold text-success">{mockVehicles.filter(v => v.status === 'disponivel').length}</p>
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
                <p className="text-2xl font-bold text-accent">{mockVehicles.filter(v => v.status === 'alugado').length}</p>
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
                <p className="text-2xl font-bold text-warning">{mockVehicles.filter(v => v.status === 'manutencao').length}</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockVehicles.map((vehicle) => (
          <Card key={vehicle.id} className="hover:shadow-lg transition-all hover:scale-[1.02]">
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
                    vehicle.status === 'disponivel' ? 'default' :
                    vehicle.status === 'alugado' ? 'secondary' :
                    vehicle.status === 'manutencao' ? 'destructive' : 'outline'
                  }
                  className={
                    vehicle.status === 'disponivel' ? 'bg-success text-success-foreground' :
                    vehicle.status === 'alugado' ? 'bg-accent text-accent-foreground' :
                    vehicle.status === 'manutencao' ? 'bg-warning text-warning-foreground' : ''
                  }
                >
                  {vehicle.status === 'disponivel' ? 'Disponível' :
                   vehicle.status === 'alugado' ? 'Alugada' :
                   vehicle.status === 'manutencao' ? 'Manutenção' : vehicle.status}
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
        ))}
      </div>

      <VehicleDialog 
        open={isVehicleDialogOpen} 
        onOpenChange={setIsVehicleDialogOpen} 
      />

      <VehicleDetailsDialog 
        open={isDetailsDialogOpen} 
        onOpenChange={setIsDetailsDialogOpen}
        vehicle={selectedVehicle}
      />
    </div>
  );
};

export default Vehicles;