import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Receipt, 
  Plus, 
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  Settings
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import InvoiceDialog from "@/components/InvoiceDialog";
import CoraConfigDialog from "@/components/CoraConfigDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Invoices = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isCoraConfigOpen, setIsCoraConfigOpen] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user) {
      fetchInvoices();
      fetchCustomers();
    }
  }, [user]);

  const fetchInvoices = async () => {
    if (!user?.id) {
      console.warn('No user ID found, skipping invoice fetch');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('boletos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Erro na consulta: ${error.message}`);
      }
      
      setInvoices(data || []);
      console.log('Invoices loaded successfully:', data?.length || 0);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "Erro ao carregar faturas",
        description: error instanceof Error ? error.message : "Erro desconhecido ao carregar faturas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    if (!user?.id) {
      console.warn('No user ID found, skipping customers fetch');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Supabase error fetching customers:', error);
        throw new Error(`Erro na consulta de clientes: ${error.message}`);
      }
      
      setCustomers(data || []);
      console.log('Customers loaded successfully:', data?.length || 0);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Erro ao carregar clientes",
        description: error instanceof Error ? error.message : "Erro desconhecido ao carregar clientes",
        variant: "destructive",
      });
    }
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.fatura_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate metrics
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(inv => inv.status === 'pago');
  const pendingInvoices = invoices.filter(inv => inv.status === 'pendente');
  const overdueInvoices = invoices.filter(inv => inv.status === 'vencido');
  
  const totalAmount = invoices.reduce((sum, inv) => sum + (Number(inv.valor) || 0), 0);
  const paidAmount = paidInvoices.reduce((sum, inv) => sum + (Number(inv.valor) || 0), 0);
  const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + (Number(inv.valor) || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago':
        return 'bg-success text-success-foreground';
      case 'pendente':
        return 'bg-warning text-warning-foreground';
      case 'vencido':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pago':
        return 'Pago';
      case 'pendente':
        return 'Pendente';
      case 'vencido':
        return 'Vencido';
      default:
        return status;
    }
  };

  const handleInvoiceAction = async (action: string, invoice: any) => {
    switch (action) {
      case 'Visualizar':
        // Open invoice details dialog
        toast({
          title: "Visualizar Fatura",
          description: `Visualizando fatura ${invoice.fatura_id}`,
        });
        break;
      
      case 'Editar':
        // Open edit dialog
        toast({
          title: "Editar Fatura",
          description: `Editando fatura ${invoice.fatura_id}`,
        });
        break;
      
      case 'Enviar':
        try {
          const { data, error } = await supabase.functions.invoke('cora-webhook', {
            body: {
              action: 'send_invoice',
              invoice_id: invoice.id,
              email: invoice.cliente_email
            }
          });

          if (error) throw error;

          toast({
            title: "Email enviado",
            description: `Fatura ${invoice.fatura_id} enviada por email`,
          });
        } catch (error) {
          toast({
            title: "Erro ao enviar email",
            description: "Não foi possível enviar a fatura por email",
            variant: "destructive",
          });
        }
        break;
      
      case 'Baixar':
        try {
          const { data, error } = await supabase.functions.invoke('generate-pdf-export', {
            body: {
              type: 'invoice',
              invoice_id: invoice.id,
              data: [invoice]
            }
          });

          if (error) throw error;

          if (data?.pdf) {
            const byteCharacters = atob(data.pdf);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            
            const element = document.createElement('a');
            element.href = url;
            element.download = `fatura_${invoice.fatura_id}.pdf`;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
            window.URL.revokeObjectURL(url);
          }

          toast({
            title: "PDF gerado",
            description: `Fatura ${invoice.fatura_id} baixada com sucesso`,
          });
        } catch (error) {
          toast({
            title: "Erro ao gerar PDF",
            description: "Não foi possível gerar o PDF da fatura",
            variant: "destructive",
          });
        }
        break;
      
      case 'Excluir':
        try {
          const { error } = await supabase
            .from('boletos')
            .delete()
            .eq('id', invoice.id)
            .eq('user_id', user?.id);

          if (error) throw error;

          toast({
            title: "Fatura excluída",
            description: `Fatura ${invoice.fatura_id} excluída com sucesso`,
          });
          
          fetchInvoices(); // Refresh list
        } catch (error) {
          toast({
            title: "Erro ao excluir",
            description: "Não foi possível excluir a fatura",
            variant: "destructive",
          });
        }
        break;
    }
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
        <div className="flex items-center gap-2">
          <Receipt className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Faturas</h1>
            <p className="text-muted-foreground">Gerencie todas as faturas e cobranças</p>
          </div>
        </div>
        <div className="flex gap-2">
        <Button 
          className="bg-gradient-primary hover:opacity-90"
          onClick={() => setIsInvoiceDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Fatura
        </Button>
        <Button 
          variant="outline"
          onClick={() => setIsCoraConfigOpen(true)}
        >
          <Settings className="h-4 w-4 mr-2" />
          Config. Cora
        </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Faturas</CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
            <p className="text-xs text-muted-foreground">
              Faturas cadastradas
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor total das faturas
            </p>
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
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
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
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar faturas por cliente, número ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={() => {
          toast({
            title: "Filtros",
            description: "Funcionalidade de filtros em desenvolvimento",
          });
        }}>
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
        <Button variant="outline" onClick={async () => {
          try {
            toast({
              title: "Exportando",
              description: "Gerando relatório PDF das faturas...",
            });
            // Implementar export PDF das faturas
          } catch (error) {
            toast({
              title: "Erro",
              description: "Erro ao exportar relatório",
              variant: "destructive",
            });
          }
        }}>
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todas ({totalInvoices})</TabsTrigger>
          <TabsTrigger value="pending">Pendentes ({pendingInvoices.length})</TabsTrigger>
          <TabsTrigger value="paid">Pagas ({paidInvoices.length})</TabsTrigger>
          <TabsTrigger value="overdue">Vencidas ({overdueInvoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Faturas</CardTitle>
              <CardDescription>
                Visualize e gerencie todas as faturas do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredInvoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'Nenhuma fatura encontrada com esse critério' : 'Nenhuma fatura cadastrada'}
                  </div>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Receipt className="h-6 w-6 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{invoice.fatura_id}</p>
                            <Badge className={getStatusColor(invoice.status)}>
                              {getStatusText(invoice.status)}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">{invoice.cliente_nome}</p>
                          <p className="text-sm text-muted-foreground">{invoice.descricao}</p>
                          {invoice.placa && (
                            <p className="text-sm font-medium text-primary">Placa: {invoice.placa}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Venc: {new Date(invoice.vencimento).toLocaleDateString('pt-BR')}
                            </div>
                            {invoice.data_pagamento && (
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-success" />
                                Pago: {new Date(invoice.data_pagamento).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            R$ {(Number(invoice.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          {invoice.valor_pago && invoice.valor_pago !== invoice.valor && (
                            <p className="text-sm text-muted-foreground">
                              Pago: R$ {(Number(invoice.valor_pago) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              Ações
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleInvoiceAction("Visualizar", invoice)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleInvoiceAction("Editar", invoice)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleInvoiceAction("Enviar", invoice)}>
                              <Send className="h-4 w-4 mr-2" />
                              Enviar por Email
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleInvoiceAction("Baixar", invoice)}>
                              <Download className="h-4 w-4 mr-2" />
                              Baixar PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleInvoiceAction("Excluir", invoice)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Faturas Pendentes</CardTitle>
              <CardDescription>Faturas aguardando pagamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingInvoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma fatura pendente
                  </div>
                ) : (
                  pendingInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg bg-warning/5">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                          <Clock className="h-6 w-6 text-warning" />
                        </div>
                        <div>
                          <p className="font-medium">{invoice.fatura_id}</p>
                          <p className="text-sm text-muted-foreground">{invoice.cliente_nome}</p>
                          {invoice.placa && (
                            <p className="text-xs font-medium text-primary">Placa: {invoice.placa}</p>
                          )}
                          <p className="text-xs text-warning">
                            Vence em {Math.ceil((new Date(invoice.vencimento).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-bold">
                            R$ {(Number(invoice.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                          Cobrar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paid" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Faturas Pagas</CardTitle>
              <CardDescription>Histórico de faturas quitadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paidInvoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma fatura paga
                  </div>
                ) : (
                  paidInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                          <CheckCircle2 className="h-6 w-6 text-success" />
                        </div>
                        <div>
                          <p className="font-medium">{invoice.fatura_id}</p>
                          <p className="text-sm text-muted-foreground">{invoice.cliente_nome}</p>
                          {invoice.placa && (
                            <p className="text-xs font-medium text-primary">Placa: {invoice.placa}</p>
                          )}
                          <p className="text-xs text-success">
                            Pago em {new Date(invoice.data_pagamento || invoice.vencimento).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-bold text-success">
                            R$ {(Number(invoice.valor_pago || invoice.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.metodo_pagamento?.toUpperCase() || 'N/A'}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
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

        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Faturas Vencidas</CardTitle>
              <CardDescription>Faturas em atraso que precisam de atenção</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overdueInvoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma fatura vencida
                  </div>
                ) : (
                  overdueInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg bg-destructive/5">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                          <AlertCircle className="h-6 w-6 text-destructive" />
                        </div>
                        <div>
                          <p className="font-medium">{invoice.fatura_id}</p>
                          <p className="text-sm text-muted-foreground">{invoice.cliente_nome}</p>
                          {invoice.placa && (
                            <p className="text-xs font-medium text-primary">Placa: {invoice.placa}</p>
                          )}
                          <p className="text-xs text-destructive">
                            Venceu há {Math.floor((Date.now() - new Date(invoice.vencimento).getTime()) / (1000 * 60 * 60 * 24))} dias
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-bold text-destructive">
                            R$ {(Number(invoice.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <Button variant="destructive" size="sm">
                          Cobrar Urgente
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

      <InvoiceDialog 
        open={isInvoiceDialogOpen} 
        onOpenChange={setIsInvoiceDialogOpen}
        onInvoiceCreated={fetchInvoices}
      />
      <CoraConfigDialog 
        open={isCoraConfigOpen} 
        onOpenChange={setIsCoraConfigOpen}
      />
    </div>
  );
};

export default Invoices;