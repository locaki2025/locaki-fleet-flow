import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Car,
  Users,
  FileText,
  Filter
} from "lucide-react";
import { mockVehicles, mockCustomers, mockInvoices, mockRentals } from "@/data/mockData";

const Reports = () => {
  // Calculate some metrics for demonstration
  const totalRevenue = mockInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const lastMonthRevenue = totalRevenue * 0.88; // Mock 12% growth
  const revenueGrowth = ((totalRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1);
  
  const occupationRate = ((mockVehicles.filter(v => v.status === 'alugado').length / mockVehicles.length) * 100).toFixed(1);
  const lastMonthOccupation = parseFloat(occupationRate) - 8.5; // Mock growth
  
  const averageRentalValue = mockRentals.reduce((sum, r) => sum + r.totalValue, 0) / mockRentals.length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">Análises detalhadas do seu negócio de locação</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button className="bg-gradient-primary hover:opacity-90">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-success" />
              <span className="text-xs text-success">+{revenueGrowth}% vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Ocupação</CardTitle>
            <Car className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupationRate}%</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-success" />
              <span className="text-xs text-success">+{(parseFloat(occupationRate) - lastMonthOccupation).toFixed(1)}% vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {averageRentalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor médio por contrato
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockCustomers.filter(c => c.status === 'ativo').length}
            </div>
            <p className="text-xs text-muted-foreground">
              De {mockCustomers.length} clientes totais
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs defaultValue="financial" className="space-y-4">
        <TabsList>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="operational">Operacional</TabsTrigger>
          <TabsTrigger value="fleet">Frota</TabsTrigger>
          <TabsTrigger value="maintenance">Manutenção</TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Evolução da Receita</CardTitle>
                <CardDescription>
                  Receita mensal dos últimos 6 meses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground border-2 border-dashed border-muted-foreground/20 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                    <p>Gráfico de Receita Mensal</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inadimplência</CardTitle>
                <CardDescription>
                  Análise de clientes inadimplentes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Taxa de Inadimplência</span>
                  <span className="font-medium text-destructive">
                    {((mockCustomers.filter(c => c.status === 'inadimplente').length / mockCustomers.length) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor em Atraso</span>
                  <span className="font-medium text-destructive">
                    R$ {mockInvoices.filter(i => i.status === 'vencido').reduce((sum, i) => sum + i.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Faturas Vencidas</span>
                  <Badge variant="destructive">
                    {mockInvoices.filter(i => i.status === 'vencido').length}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operational" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Contratos por Tipo</CardTitle>
                <CardDescription>
                  Distribuição dos tipos de locação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Mensal</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 bg-primary rounded-full"></div>
                    <span className="text-sm font-medium">
                      {mockRentals.filter(r => r.type === 'mensal').length}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Semanal</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-12 bg-accent rounded-full"></div>
                    <span className="text-sm font-medium">
                      {mockRentals.filter(r => r.type === 'semanal').length}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Diária</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-8 bg-success rounded-full"></div>
                    <span className="text-sm font-medium">
                      {mockRentals.filter(r => r.type === 'diaria').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance por Período</CardTitle>
                <CardDescription>
                  Comparativo mensal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center text-muted-foreground border-2 border-dashed border-muted-foreground/20 rounded-lg">
                  <div className="text-center">
                    <Calendar className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Gráfico de Performance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fleet" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Status da Frota</CardTitle>
                <CardDescription>
                  Distribuição atual dos veículos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Disponíveis</span>
                  <Badge className="bg-success text-success-foreground">
                    {mockVehicles.filter(v => v.status === 'disponivel').length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Alugadas</span>
                  <Badge className="bg-accent text-accent-foreground">
                    {mockVehicles.filter(v => v.status === 'alugado').length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Manutenção</span>
                  <Badge className="bg-warning text-warning-foreground">
                    {mockVehicles.filter(v => v.status === 'manutencao').length}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Veículos Mais Rentáveis</CardTitle>
                <CardDescription>
                  Top 3 por receita gerada
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockVehicles.slice(0, 3).map((vehicle, index) => (
                  <div key={vehicle.id} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">#{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{vehicle.brand} {vehicle.model}</p>
                      <p className="text-xs text-muted-foreground">{vehicle.plate}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quilometragem</CardTitle>
                <CardDescription>
                  Veículos com maior rodagem
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockVehicles
                  .sort((a, b) => b.odometer - a.odometer)
                  .slice(0, 3)
                  .map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{vehicle.plate}</p>
                        <p className="text-xs text-muted-foreground">{vehicle.brand} {vehicle.model}</p>
                      </div>
                      <span className="text-sm font-medium">
                        {vehicle.odometer.toLocaleString()} km
                      </span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Custos de Manutenção</CardTitle>
                <CardDescription>
                  Evolução dos custos nos últimos meses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center text-muted-foreground border-2 border-dashed border-muted-foreground/20 rounded-lg">
                  <div className="text-center">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Gráfico de Custos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alertas de Manutenção</CardTitle>
                <CardDescription>
                  Veículos que precisam de atenção
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-sm font-medium">Revisão Preventiva</p>
                  <p className="text-xs text-muted-foreground">Honda CG 160 - 10.500 km</p>
                </div>
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm font-medium">Manutenção Urgente</p>
                  <p className="text-xs text-muted-foreground">Yamaha Factor - Sistema de freios</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;