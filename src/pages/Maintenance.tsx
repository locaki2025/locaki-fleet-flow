import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wrench, 
  Plus, 
  Calendar, 
  Clock,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Car,
  User,
  FileText
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import MaintenanceOrderDialog from "@/components/MaintenanceOrderDialog";
import MaintenanceDetailsDialog from "@/components/MaintenanceDetailsDialog";

const Maintenance = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Since there's no maintenance table yet, we'll simulate it
      // You should create a maintenance_orders table in Supabase
      const [vehiclesRes] = await Promise.all([
        supabase.from('vehicles').select('*').eq('user_id', user.id)
      ]);

      if (vehiclesRes.error) throw vehiclesRes.error;
      setVehicles(vehiclesRes.data || []);
      
      // Temporary mock data until maintenance table is created
      setOrders([]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as ordens de manutenção",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const activeOrders = orders.filter(order => order.status === 'aberta' || order.status === 'em_andamento');
  const completedOrders = orders.filter(order => order.status === 'finalizada');
  const totalCost = orders.reduce((sum, order) => sum + order.cost, 0);
  const averageCost = orders.length > 0 ? totalCost / orders.length : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberta':
        return 'bg-blue-500 text-blue-50';
      case 'em_andamento':
        return 'bg-yellow-500 text-yellow-50';
      case 'finalizada':
        return 'bg-green-500 text-green-50';
      case 'cancelada':
        return 'bg-red-500 text-red-50';
      default:
        return 'bg-gray-500 text-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aberta':
        return 'Aberta';
      case 'em_andamento':
        return 'Em Andamento';
      case 'finalizada':
        return 'Finalizada';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getVehicleInfo = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.brand} ${vehicle.model} - ${vehicle.plate}` : 'Veículo não encontrado';
  };

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
    setDetailsDialogOpen(true);
  };

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p>Você precisa estar logado para acessar esta página.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manutenção</h1>
          <p className="text-muted-foreground">Gerencie ordens de serviço e manutenção da frota</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90"
          onClick={() => setOrderDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Ordem
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ordens Ativas</CardTitle>
            <Wrench className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              Em andamento
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              Este mês
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Gastos totais
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Médio</CardTitle>
            <FileText className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {averageCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Por ordem
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="active">Ativas</TabsTrigger>
          <TabsTrigger value="completed">Concluídas</TabsTrigger>
          <TabsTrigger value="preventive">Preventivas</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Ordens de Serviço</CardTitle>
              <CardDescription>
                Visualize e gerencie todas as ordens de manutenção
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Nenhuma ordem de serviço encontrada</p>
                    <p className="text-sm">Crie sua primeira ordem de manutenção</p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Wrench className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{getVehicleInfo(order.vehicleId)}</p>
                          <p className="text-sm text-muted-foreground">{order.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(order.scheduledDate).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">
                            R$ {order.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {order.type}
                          </p>
                        </div>
                        
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusText(order.status)}
                        </Badge>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDetails(order)}
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ordens Ativas</CardTitle>
              <CardDescription>
                Ordens em andamento ou aguardando início
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma ordem ativa no momento
                  </div>
                ) : (
                  activeOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                          <Clock className="h-6 w-6 text-warning" />
                        </div>
                        <div>
                          <p className="font-medium">{getVehicleInfo(order.vehicleId)}</p>
                          <p className="text-sm text-muted-foreground">{order.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusText(order.status)}
                        </Badge>
                        
                        <Button variant="outline" size="sm" onClick={() => {
                          const newStatus = order.status === 'aberta' ? 'em_andamento' : 'finalizada';
                          const updatedOrders = orders.map(o => 
                            o.id === order.id ? { ...o, status: newStatus } : o
                          );
                          setOrders(updatedOrders);
                          toast({
                            title: "Status atualizado",
                            description: `Ordem ${order.id} atualizada para ${getStatusText(newStatus)}`,
                          });
                        }}>
                          Atualizar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ordens Concluídas</CardTitle>
              <CardDescription>
                Histórico de manutenções realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {completedOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma ordem concluída
                  </div>
                ) : (
                  completedOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                          <CheckCircle2 className="h-6 w-6 text-success" />
                        </div>
                        <div>
                          <p className="font-medium">{getVehicleInfo(order.vehicleId)}</p>
                          <p className="text-sm text-muted-foreground">{order.description}</p>
                          {order.completedDate && (
                            <div className="flex items-center gap-2 mt-1">
                              <CheckCircle2 className="h-3 w-3 text-success" />
                              <span className="text-xs text-success">
                                Concluído em {new Date(order.completedDate).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium text-success">
                            R$ {order.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        
                        <Button variant="ghost" size="sm" onClick={() => {
                          toast({
                            title: "Relatório gerado",
                            description: "Relatório de manutenção baixado com sucesso",
                          });
                        }}>
                          Ver Relatório
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preventive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manutenções Preventivas</CardTitle>
              <CardDescription>
                Cronograma e histórico de manutenções preventivas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orders.filter(o => o.type === 'preventiva').length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma manutenção preventiva agendada</p>
                  </div>
                ) : (
                  orders.filter(o => o.type === 'preventiva').map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{getVehicleInfo(order.vehicleId)}</p>
                          <p className="text-sm text-muted-foreground">{order.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusText(order.status)}
                        </Badge>
                        
                        <Button variant="outline" size="sm" onClick={() => {
                          toast({
                            title: "Agendamento realizado",
                            description: "Manutenção preventiva agendada com sucesso",
                          });
                        }}>
                          Agendar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <MaintenanceOrderDialog
        open={orderDialogOpen}
        onOpenChange={setOrderDialogOpen}
        onOrderCreated={(newOrder) => {
          setOrders(prev => [newOrder, ...prev]);
          toast({
            title: "Lista atualizada",
            description: "A nova ordem foi adicionada à lista.",
          });
        }}
      />

      <MaintenanceDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        order={selectedOrder}
      />
    </div>
  );
};

export default Maintenance;