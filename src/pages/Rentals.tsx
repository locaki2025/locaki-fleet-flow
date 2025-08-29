import { useState, useEffect } from "react";
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
  CheckCircle2,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PDFExportDialog from "@/components/PDFExportDialog";
import FilterDialog from "@/components/FilterDialog";
import ContractDialog from "@/components/ContractDialog";
import RentalDetailsDialog from "@/components/RentalDetailsDialog";
import LoginDialog from "@/components/LoginDialog";

const Rentals = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfExportOpen, setPdfExportOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contractsRes, customersRes, vehiclesRes] = await Promise.all([
        supabase.from('contratos').select('*').eq('user_id', user.id),
        supabase.from('customers').select('*').eq('user_id', user.id),
        supabase.from('vehicles').select('*').eq('user_id', user.id)
      ]);

      if (contractsRes.error) throw contractsRes.error;
      if (customersRes.error) throw customersRes.error;
      if (vehiclesRes.error) throw vehiclesRes.error;

      setContracts(contractsRes.data || []);
      setCustomers(customersRes.data || []);
      setVehicles(vehiclesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os contratos de locação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Cliente não encontrado';
  };

  const getVehicleInfo = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.brand} ${vehicle.model} - ${vehicle.plate}` : 'Veículo não encontrado';
  };

  // Listen for real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('contratos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contratos',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Calculate stats from real contracts data
  const activeRentals = contracts.filter(c => c.status === 'ativo').length;
  const finishedRentals = contracts.filter(c => c.status === 'finalizado').length;
  const overdueRentals = contracts.filter(c => c.status === 'atrasado').length;
  const totalRevenue = contracts.reduce((sum, contract) => {
    const valor = Number(contract.valor_mensal) || 0;
    return sum + valor;
  }, 0);

  const handleViewDetails = (contract: any) => {
    setSelectedRental(contract);
    setIsDetailsDialogOpen(true);
  };

  const handleNewContract = () => {
    if (!user) {
      setShowLoginDialog(true);
      return;
    }
    setIsContractDialogOpen(true);
  };

  const handleDownloadContract = async (contractId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-contract-pdf', {
        body: { 
          contract_id: contractId, 
          user_id: user?.id 
        }
      });

      if (error) throw error;

      // Create a blob and download
      const blob = new Blob([data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrato-${contractId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Contrato gerado!",
        description: "O arquivo foi baixado com sucesso",
      });
    } catch (error) {
      console.error('Error downloading contract:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o contrato",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Veículos para Locação</h1>
          <p className="text-muted-foreground">Veículos disponíveis para novas locações</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90"
          onClick={handleNewContract}
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
            <Button variant="outline" onClick={() => setFilterOpen(true)}>
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <Button className="bg-gradient-primary hover:opacity-90" onClick={() => setPdfExportOpen(true)}>
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Vehicles List */}
      <div className="space-y-4">
        {!user ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Faça login para visualizar os veículos disponíveis
            </p>
            <Button onClick={() => setShowLoginDialog(true)}>
              Fazer Login
            </Button>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando veículos...</p>
          </div>
        ) : vehicles.filter(v => v.status === 'disponivel').length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Nenhum veículo disponível para locação
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.filter(v => v.status === 'disponivel').map((vehicle) => (
              <Card key={vehicle.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-16 w-16 rounded-lg bg-gradient-primary/10 flex items-center justify-center">
                        <Car className="h-8 w-8 text-primary" />
                      </div>
                      <Badge className="bg-success text-success-foreground">
                        Disponível
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">{vehicle.brand} {vehicle.model}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium">Placa:</span>
                        <span>{vehicle.plate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium">Ano:</span>
                        <span>{vehicle.year}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium">Cor:</span>
                        <span>{vehicle.color}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium">Categoria:</span>
                        <span>{vehicle.category}</span>
                      </div>
                      {vehicle.odometer && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium">Odômetro:</span>
                          <span>{vehicle.odometer.toLocaleString()} km</span>
                        </div>
                      )}
                      {vehicle.observations && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Observações:</span>
                          <p className="mt-1">{vehicle.observations}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button 
                        className="flex-1 bg-gradient-primary hover:opacity-90"
                        onClick={handleNewContract}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Contrato
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Contracts Section */}
      {contracts.length > 0 && (
        <>
          <div className="border-t pt-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">Contratos Existentes</h2>
          </div>
          
          <div className="space-y-4">
            {contracts.map((contract) => (
              <Card key={contract.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-lg bg-gradient-primary/10 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">Contrato #{contract.id.slice(-8)}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{contract.cliente_nome}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Car className="h-4 w-4" />
                          <span>{contract.moto_modelo}</span>
                        </div>
                        {contract.diaria && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span>Diária: R$ {Number(contract.diaria).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {contract.local_entrega && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>📍 {contract.local_entrega}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {new Date(contract.data_inicio).toLocaleDateString('pt-BR')} - 
                            {contract.data_fim ? new Date(contract.data_fim).toLocaleDateString('pt-BR') : 'Indefinido'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">
                            R$ {Number(contract.valor_mensal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={
                            contract.status === 'ativo' ? 'default' :
                            contract.status === 'finalizado' ? 'secondary' :
                            contract.status === 'atrasado' ? 'destructive' : 'outline'
                          }
                          className={
                            contract.status === 'ativo' ? 'bg-accent text-accent-foreground' :
                            contract.status === 'finalizado' ? 'bg-success text-success-foreground' :
                            contract.status === 'atrasado' ? 'bg-warning text-warning-foreground' : ''
                          }
                        >
                          {contract.status === 'ativo' ? 'Ativo' :
                           contract.status === 'finalizado' ? 'Finalizado' :
                           contract.status === 'atrasado' ? 'Atrasado' : contract.status}
                        </Badge>

                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDetails(contract)}
                          >
                            Ver Detalhes
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadContract(contract.id)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Dialogs */}
      <ContractDialog 
        open={isContractDialogOpen} 
        onOpenChange={setIsContractDialogOpen} 
      />

      <RentalDetailsDialog 
        open={isDetailsDialogOpen} 
        onOpenChange={setIsDetailsDialogOpen}
        rental={selectedRental}
      />

      <PDFExportDialog 
        open={pdfExportOpen}
        onOpenChange={setPdfExportOpen}
        type="contracts"
        data={contracts}
      />

      <FilterDialog 
        open={filterOpen}
        onOpenChange={setFilterOpen}
        type="contracts"
        onApplyFilters={(filters) => {
          console.log('Applied filters:', filters);
          toast({ title: "Filtros aplicados", description: "Os contratos foram filtrados com sucesso" });
        }}
      />

      <LoginDialog 
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
      />
    </div>
  );
};

export default Rentals;