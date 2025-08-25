import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Car, 
  Users, 
  DollarSign, 
  Wrench, 
  TrendingUp, 
  AlertTriangle,
  MapPin,
  Clock,
  Plus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const [vehiclesData, customersData, contractsData, devicesData] = await Promise.all([
        supabase.from('vehicles').select('*').eq('user_id', user?.id),
        supabase.from('customers').select('*').eq('user_id', user?.id),
        supabase.from('contratos').select('*').eq('user_id', user?.id),
        supabase.from('devices').select('*').eq('user_id', user?.id)
      ]);

      setVehicles(vehiclesData.data || []);
      setCustomers(customersData.data || []);
      setContracts(contractsData.data || []);
      setDevices(devicesData.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do dashboard.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate KPIs
  const totalVehicles = vehicles.length;
  const availableVehicles = vehicles.filter(v => v.status === 'disponivel').length;
  const rentedVehicles = vehicles.filter(v => v.status === 'alugado').length;
  const maintenanceVehicles = vehicles.filter(v => v.status === 'manutencao').length;
  
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'ativo').length;
  const defaultingCustomers = customers.filter(c => c.status === 'inadimplente').length;
  
  const totalRevenue = contracts.reduce((sum, contract) => sum + (contract.valor_mensal || 0), 0);
  const activeContracts = contracts.filter(c => c.status === 'ativo').length;
  const expiredContracts = contracts.filter(c => c.status === 'vencido').length;
  
  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const offlineDevices = devices.filter(d => d.status === 'offline').length;
  
  const occupationRate = totalVehicles > 0 ? ((rentedVehicles / totalVehicles) * 100).toFixed(1) : '0';

  if (!user) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Faça login para acessar o dashboard</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu negócio de locação de motos</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90"
          onClick={() => navigate('/rentals')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frota Total</CardTitle>
            <Car className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVehicles}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-success border-success">
                {availableVehicles} disponíveis
              </Badge>
              <Badge variant="outline" className="text-warning border-warning">
                {rentedVehicles} alugadas
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Ocupação</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupationRate}%</div>
            <p className="text-xs text-muted-foreground">
              {rentedVehicles} de {totalVehicles} motos alugadas
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeContracts} contratos ativos
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              {activeCustomers} ativos, {defaultingCustomers} inadimplentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              Status da Frota
            </CardTitle>
            <CardDescription>
              Visão geral dos veículos por status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum veículo cadastrado.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate('/vehicles')}
                >
                  Cadastrar primeiro veículo
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {vehicles.slice(0, 4).map((vehicle) => (
                  <div key={vehicle.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Car className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{vehicle.brand} {vehicle.model}</p>
                        <p className="text-sm text-muted-foreground">{vehicle.plate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate('/map')}
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                Alertas Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Dispositivos offline</p>
                  <p className="text-xs text-muted-foreground">{offlineDevices} dispositivos</p>
                </div>
              </div>
              {expiredContracts > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Contratos vencidos</p>
                    <p className="text-xs text-muted-foreground">{expiredContracts} contratos</p>
                  </div>
                </div>
              )}
              {maintenanceVehicles > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/10">
                  <Wrench className="h-4 w-4 text-accent" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Manutenção pendente</p>
                    <p className="text-xs text-muted-foreground">{maintenanceVehicles} veículos</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Dispositivos GPS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{onlineDevices}</div>
                <p className="text-sm text-muted-foreground">online de {devices.length} total</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => navigate('/devices')}
                >
                  Ver dispositivos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;