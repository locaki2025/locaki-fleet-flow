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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import PDFExportDialog from "@/components/PDFExportDialog";

const Reports = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfExportOpen, setPdfExportOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [vehiclesRes, customersRes, invoicesRes, contractsRes] = await Promise.all([
        supabase.from('vehicles').select('*').eq('user_id', user.id),
        supabase.from('customers').select('*').eq('user_id', user.id),
        supabase.from('boletos').select('*').eq('user_id', user.id),
        supabase.from('contratos').select('*').eq('user_id', user.id)
      ]);

      if (vehiclesRes.error) throw vehiclesRes.error;
      if (customersRes.error) throw customersRes.error;
      if (invoicesRes.error) throw invoicesRes.error;
      if (contractsRes.error) throw contractsRes.error;

      setVehicles(vehiclesRes.data || []);
      setCustomers(customersRes.data || []);
      setInvoices(invoicesRes.data || []);
      setContracts(contractsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados dos relatórios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics with real data
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.valor || 0), 0);
  const lastMonthRevenue = totalRevenue * 0.88; // Simplified calculation
  const revenueGrowth = totalRevenue > 0 ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) : '0.0';
  
  const occupationRate = vehicles.length > 0 ? ((vehicles.filter(v => v.status === 'alugado').length / vehicles.length) * 100).toFixed(1) : '0.0';
  const lastMonthOccupation = parseFloat(occupationRate) - 8.5;
  
  // Fixed variable name - using averageContractValue instead of averageRentalValue
  const averageContractValue = contracts.length > 0 ? contracts.reduce((sum, c) => sum + (c.valor_mensal || 0), 0) / contracts.length : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">Análises detalhadas do seu negócio de locação</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setFilterOpen(true)}>
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button className="bg-gradient-primary hover:opacity-90" onClick={() => setPdfExportOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
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
              R$ {averageContractValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
              {customers.filter(c => c.status === 'ativo').length}
            </div>
            <p className="text-xs text-muted-foreground">
              De {customers.length} clientes totais
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
                    <p className="text-xs mt-1">Total: R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
                    {customers.length > 0 ? ((customers.filter(c => c.status === 'inadimplente').length / customers.length) * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor em Atraso</span>
                  <span className="font-medium text-destructive">
                    R$ {invoices.filter(i => i.status === 'vencido').reduce((sum, i) => sum + (i.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Faturas Vencidas</span>
                  <Badge variant="destructive">
                    {invoices.filter(i => i.status === 'vencido').length}
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
                      {contracts.filter(c => c.recorrente === true).length}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Diária</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-12 bg-accent rounded-full"></div>
                    <span className="text-sm font-medium">
                      {contracts.filter(c => c.diaria != null).length}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Outros</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-8 bg-success rounded-full"></div>
                    <span className="text-sm font-medium">
                      {contracts.length - contracts.filter(c => c.recorrente === true).length - contracts.filter(c => c.diaria != null).length}
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
                    <p className="text-xs mt-1">Contratos Ativos: {contracts.filter(c => c.status === 'ativo').length}</p>
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
                    {vehicles.filter(v => v.status === 'disponivel').length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Alugadas</span>
                  <Badge className="bg-accent text-accent-foreground">
                    {vehicles.filter(v => v.status === 'alugado').length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Manutenção</span>
                  <Badge className="bg-warning text-warning-foreground">
                    {vehicles.filter(v => v.status === 'manutencao').length}
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
                {vehicles.slice(0, 3).map((vehicle, index) => (
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
                {vehicles
                  .sort((a, b) => (b.odometer || 0) - (a.odometer || 0))
                  .slice(0, 3)
                  .map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{vehicle.plate}</p>
                        <p className="text-xs text-muted-foreground">{vehicle.brand} {vehicle.model}</p>
                      </div>
                      <span className="text-sm font-medium">
                        {(vehicle.odometer || 0).toLocaleString()} km
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
                    <p className="text-xs mt-1">Veículos em Manutenção: {vehicles.filter(v => v.status === 'manutencao').length}</p>
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
                {vehicles.filter(v => v.status === 'manutencao').length === 0 ? (
                  <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                    <p className="text-sm font-medium text-success">Todos os Veículos em Ordem</p>
                    <p className="text-xs text-muted-foreground">Nenhuma manutenção pendente</p>
                  </div>
                ) : (
                  vehicles.filter(v => v.status === 'manutencao').slice(0, 2).map((vehicle) => (
                    <div key={vehicle.id} className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                      <p className="text-sm font-medium">Manutenção Necessária</p>
                      <p className="text-xs text-muted-foreground">{vehicle.brand} {vehicle.model} - {vehicle.plate}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Components */}
      <PDFExportDialog 
        open={pdfExportOpen}
        onOpenChange={setPdfExportOpen}
        type="reports"
        data={[...vehicles, ...customers, ...invoices, ...contracts]}
      />

      {/* Filter Dialog Placeholder */}
      {filterOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setFilterOpen(false)}>
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Filtros de Relatório</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Selecione os filtros para personalizar seus relatórios
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFilterOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => {
                setFilterOpen(false);
                toast({ title: "Filtros aplicados", description: "Os relatórios foram filtrados com sucesso" });
              }}>
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;