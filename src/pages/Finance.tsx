import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import InvoiceDialog from "@/components/InvoiceDialog";

const Finance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchInvoices();
      fetchCustomers();
    }
  }, [user]);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('boletos')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar faturas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  // Calculate financial metrics
  const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.valor) || 0), 0);
  const paidInvoices = invoices.filter(inv => inv.status === 'pago');
  const pendingInvoices = invoices.filter(inv => inv.status === 'pendente');
  const overdueInvoices = invoices.filter(inv => inv.status === 'vencido');
  
  const paidAmount = paidInvoices.reduce((sum, inv) => sum + (Number(inv.valor) || 0), 0);
  const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + (Number(inv.valor) || 0), 0);
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (Number(inv.valor) || 0), 0);

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.cliente_id === customerId);
    return customer?.name || 'Cliente não encontrado';
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
          <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground">Controle suas receitas, faturas e cobrança</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90"
          onClick={() => setIsInvoiceDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Fatura
        </Button>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-success" />
              <span className="text-xs text-success">+12% no mês</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recebido</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {paidInvoices.length} faturas pagas
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Aberto</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingInvoices.length} faturas pendentes
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Atraso</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {overdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {overdueInvoices.length} faturas vencidas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">Faturas</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Faturas</CardTitle>
              <CardDescription>
                Gerencie suas faturas e cobrança de clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma fatura encontrada
                  </div>
                ) : (
                  invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{invoice.cliente_nome}</p>
                          <p className="text-sm text-muted-foreground">{invoice.descricao}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">
                            R$ {(Number(invoice.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Venc. {new Date(invoice.vencimento).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        
                        <Badge 
                          variant={
                            invoice.status === 'pago' ? 'default' :
                            invoice.status === 'pendente' ? 'secondary' :
                            invoice.status === 'vencido' ? 'destructive' : 'outline'
                          }
                          className={
                            invoice.status === 'pago' ? 'bg-success text-success-foreground' :
                            invoice.status === 'pendente' ? 'bg-warning text-warning-foreground' :
                            invoice.status === 'vencido' ? 'bg-destructive text-destructive-foreground' : ''
                          }
                        >
                          {invoice.status === 'pago' ? 'Pago' :
                           invoice.status === 'pendente' ? 'Pendente' :
                           invoice.status === 'vencido' ? 'Vencido' : invoice.status}
                        </Badge>
                        
                        <Button variant="outline" size="sm">
                          {invoice.status === 'pendente' ? 'Cobrar' : 'Ver Detalhes'}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Pagamentos</CardTitle>
              <CardDescription>
                Visualize todos os pagamentos recebidos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paidInvoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum pagamento encontrado
                  </div>
                ) : (
                  paidInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                          <CheckCircle2 className="h-6 w-6 text-success" />
                        </div>
                        <div>
                          <p className="font-medium">{invoice.cliente_nome}</p>
                          <p className="text-sm text-muted-foreground">{invoice.descricao}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium text-success">
                            R$ {(Number(invoice.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {invoice.metodo_pagamento?.toUpperCase()} - {new Date(invoice.data_pagamento || invoice.vencimento).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        
                        <Button variant="ghost" size="sm">
                          Ver Comprovante
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Receita por Período</CardTitle>
                <CardDescription>
                  Análise de receita dos últimos meses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-32 flex items-center justify-center text-muted-foreground">
                  Gráfico de receita seria exibido aqui
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Taxa de Inadimplência</CardTitle>
                <CardDescription>
                  Acompanhe os índices de pagamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-destructive">
                    {invoices.length > 0 ? ((overdueInvoices.length / invoices.length) * 100).toFixed(1) : '0'}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Taxa de inadimplência atual
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <InvoiceDialog 
        open={isInvoiceDialogOpen} 
        onOpenChange={setIsInvoiceDialogOpen}
        onInvoiceCreated={fetchInvoices}
      />
    </div>
  );
};

export default Finance;