import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Calendar, 
  User, 
  Car,
  DollarSign,
  Clock,
  CheckCircle2
} from "lucide-react";
import { mockRentals, mockCustomers, mockVehicles } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import ContractDialog from "@/components/ContractDialog";
import RentalDetailsDialog from "@/components/RentalDetailsDialog";

const Rentals = () => {
  const { toast } = useToast();
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const getCustomerName = (customerId: string) => {
    const customer = mockCustomers.find(c => c.id === customerId);
    return customer?.name || 'Cliente não encontrado';
  };

  const getVehicleInfo = (vehicleId: string) => {
    const vehicle = mockVehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.brand} ${vehicle.model} - ${vehicle.plate}` : 'Veículo não encontrado';
  };

  const activeRentals = mockRentals.filter(r => r.status === 'ativo').length;
  const finishedRentals = mockRentals.filter(r => r.status === 'finalizado').length;
  const overdueRentals = mockRentals.filter(r => r.status === 'atrasado').length;
  const totalRevenue = mockRentals.reduce((sum, rental) => sum + rental.totalValue, 0);

  const handleViewDetails = (rental: any) => {
    setSelectedRental(rental);
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
          <h1 className="text-3xl font-bold text-foreground">Contratos</h1>
          <p className="text-muted-foreground">Gerencie contratos de locação e acompanhe prazos</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90"
          onClick={() => setIsContractDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-accent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contratos Ativos</p>
                <p className="text-2xl font-bold text-accent">{activeRentals}</p>
              </div>
              <FileText className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-success">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Finalizados</p>
                <p className="text-2xl font-bold text-success">{finishedRentals}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-warning">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Em Atraso</p>
                <p className="text-2xl font-bold text-warning">{overdueRentals}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
                <p className="text-2xl font-bold text-primary">
                  R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
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
                placeholder="Buscar por cliente, placa..."
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

      {/* Rental List */}
      <div className="space-y-4">
        {mockRentals.map((rental) => (
          <Card key={rental.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-lg bg-gradient-primary/10 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">Contrato #{rental.id}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{getCustomerName(rental.customerId)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Car className="h-4 w-4" />
                      <span>{getVehicleInfo(rental.vehicleId)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {new Date(rental.startDate).toLocaleDateString('pt-BR')} - {new Date(rental.endDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">
                        R$ {rental.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={
                        rental.status === 'ativo' ? 'default' :
                        rental.status === 'finalizado' ? 'secondary' :
                        rental.status === 'atrasado' ? 'destructive' : 'outline'
                      }
                      className={
                        rental.status === 'ativo' ? 'bg-accent text-accent-foreground' :
                        rental.status === 'finalizado' ? 'bg-success text-success-foreground' :
                        rental.status === 'atrasado' ? 'bg-warning text-warning-foreground' : ''
                      }
                    >
                      {rental.status === 'ativo' ? 'Ativo' :
                       rental.status === 'finalizado' ? 'Finalizado' :
                       rental.status === 'atrasado' ? 'Atrasado' : rental.status}
                    </Badge>

                    <Badge variant="outline">
                      {rental.type === 'diaria' ? 'Diária' :
                       rental.type === 'semanal' ? 'Semanal' :
                       rental.type === 'mensal' ? 'Mensal' : 'Longo Prazo'}
                    </Badge>

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(rental)}
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state for demo */}
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Wizard de Contrato</h3>
          <p className="text-muted-foreground mb-4">
            Use nosso wizard inteligente para criar contratos rapidamente
          </p>
          <Button 
            className="bg-gradient-primary hover:opacity-90"
            onClick={() => setIsContractDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Iniciar Wizard
          </Button>
        </CardContent>
      </Card>

      <ContractDialog 
        open={isContractDialogOpen} 
        onOpenChange={setIsContractDialogOpen} 
      />

      <RentalDetailsDialog 
        open={isDetailsDialogOpen} 
        onOpenChange={setIsDetailsDialogOpen}
        rental={selectedRental}
      />
    </div>
  );
};

export default Rentals;