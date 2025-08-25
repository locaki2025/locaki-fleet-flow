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

      {/* Forms for Adding Entries and Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cadastrar Entradas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Cadastrar Entradas</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div>
                <label className="text-sm font-medium">Tipo de Entrada</label>
                <select className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md">
                  <option>Locação</option>
                  <option>Manutenção</option>
                  <option>Outros</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Placa</label>
                <input 
                  type="text" 
                  placeholder="Digite o nome do veículo ou placa"
                  className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Locatário</label>
                <select className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md">
                  <option>Locação</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Valor R$</label>
                  <input 
                    type="text" 
                    placeholder="Valor (R$)"
                    className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Data de Vencimento</label>
                  <input 
                    type="date" 
                    defaultValue="2025-08-24"
                    className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <textarea 
                  placeholder="Descrição..."
                  className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md h-20 resize-none"
                />
              </div>
              
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded" />
                  Valor recebido
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded" />
                  Gerar Boleto
                </label>
              </div>
              
              <Button className="bg-primary hover:bg-primary/90">
                Salvar
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Cadastrar Saída */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Cadastrar Saída</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div>
                <label className="text-sm font-medium">Tipo de Saída</label>
                <select className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md">
                  <option>Manutenção</option>
                  <option>Combustível</option>
                  <option>Seguro</option>
                  <option>Outros</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Placa</label>
                <input 
                  type="text" 
                  placeholder="Digite o nome do veículo ou placa"
                  className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Locatário</label>
                <select className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md">
                  <option>Locação</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Valor R$</label>
                  <input 
                    type="text" 
                    placeholder="Valor (R$)"
                    className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Data de Vencimento</label>
                  <input 
                    type="date" 
                    defaultValue="2025-08-24"
                    className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <textarea 
                  placeholder="Descrição..."
                  className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md h-20 resize-none"
                />
              </div>
              
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded" />
                  Valor pago
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded" />
                  Anexar arquivos
                </label>
              </div>
              
              <Button className="bg-primary hover:bg-primary/90">
                Salvar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Financial Entries and Expenses History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Histórico de Entradas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Histórico de Entradas</CardTitle>
            <CardDescription>Registro de todas as receitas recebidas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                <div className="w-16">Status</div>
                <div className="flex-1">Tipo</div>
                <div className="w-32">Placa - Veículo - Locatário</div>
                <div className="w-24">Valor</div>
                <div className="w-24">Data</div>
                <div className="w-24">Descrição</div>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {/* Sample entry - replace with actual data */}
                <div className="flex gap-4 text-sm py-2 border-b">
                  <div className="w-16">
                    <span className="px-2 py-1 bg-success/10 text-success text-xs rounded">Pago</span>
                  </div>
                  <div className="flex-1">Locação RECORRENTE</div>
                  <div className="w-32 text-xs">TME0546 (DK 160) - ADRIANO MARTINS DE SOUZA</div>
                  <div className="w-24 font-medium">R$ 559,00</div>
                  <div className="w-24">27/08/2025</div>
                  <div className="w-24 text-xs">Fatura recorrente para locação #192</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Saídas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Histórico de Saídas</CardTitle>
            <CardDescription>Registro de todas as despesas pagas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                <div className="w-16">Status</div>
                <div className="flex-1">Tipo</div>
                <div className="w-32">Veículo</div>
                <div className="w-24">Valor</div>
                <div className="w-24">Data</div>
                <div className="w-24">Descrição</div>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {/* Sample expense - replace with actual data */}
                <div className="flex gap-4 text-sm py-2 border-b">
                  <div className="w-16">
                    <span className="px-2 py-1 bg-success/10 text-success text-xs rounded">Pago</span>
                  </div>
                  <div className="flex-1">Manutenção_Rec</div>
                  <div className="w-32">TMI2208 (DK 160)</div>
                  <div className="w-24 font-medium">R$ 0,00</div>
                  <div className="w-24">24/08/2025</div>
                  <div className="w-24 text-xs">(Sem Descrição)</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <InvoiceDialog 
        open={isInvoiceDialogOpen} 
        onOpenChange={setIsInvoiceDialogOpen}
        onInvoiceCreated={fetchInvoices}
      />
    </div>
  );
};

export default Finance;