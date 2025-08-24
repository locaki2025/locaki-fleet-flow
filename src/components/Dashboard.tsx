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
import { mockVehicles, mockCustomers, mockInvoices, mockMaintenanceOrders } from "@/data/mockData";

const Dashboard = () => {
  // Calculate KPIs
  const totalVehicles = mockVehicles.length;
  const availableVehicles = mockVehicles.filter(v => v.status === 'disponivel').length;
  const rentedVehicles = mockVehicles.filter(v => v.status === 'alugado').length;
  const maintenanceVehicles = mockVehicles.filter(v => v.status === 'manutencao').length;
  
  const totalCustomers = mockCustomers.length;
  const activeCustomers = mockCustomers.filter(c => c.status === 'ativo').length;
  const defaultingCustomers = mockCustomers.filter(c => c.status === 'inadimplente').length;
  
  const totalRevenue = mockInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const pendingInvoices = mockInvoices.filter(inv => inv.status === 'pendente').length;
  const overdueInvoices = mockInvoices.filter(inv => inv.status === 'vencido').length;
  
  const openMaintenances = mockMaintenanceOrders.filter(m => m.status === 'aberta' || m.status === 'em_andamento').length;
  
  const occupationRate = ((rentedVehicles / totalVehicles) * 100).toFixed(1);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu negócio de locação de motos</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90">
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
            <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              +12% em relação ao mês anterior
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inadimplência</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{defaultingCustomers}</div>
            <p className="text-xs text-muted-foreground">
              {overdueInvoices} faturas em atraso
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
            <div className="space-y-4">
              {mockVehicles.slice(0, 4).map((vehicle) => (
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
                    {vehicle.lastLocation && (
                      <Button variant="ghost" size="sm">
                        <MapPin className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
                  <p className="text-sm font-medium">Revisão pendente</p>
                  <p className="text-xs text-muted-foreground">Honda CG 160 - ABC-1234</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Fatura vencida</p>
                  <p className="text-xs text-muted-foreground">João Silva - R$ 850,00</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/10">
                <Clock className="h-4 w-4 text-accent" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Contrato vencendo</p>
                  <p className="text-xs text-muted-foreground">Maria Santos - 7 dias</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                Manutenções
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">{openMaintenances}</div>
                <p className="text-sm text-muted-foreground">ordens em andamento</p>
                <Button variant="outline" size="sm" className="mt-3">
                  Ver todas
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