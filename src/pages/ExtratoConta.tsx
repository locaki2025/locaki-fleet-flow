import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Receipt, 
  Download,
  FileSpreadsheet,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FinancialEntry {
  id: string;
  data: string;
  descricao: string;
  identificador: string;
  situacao: 'pago' | 'pendente' | 'vencido';
  valor: number;
  tipo: 'entrada' | 'saida';
  cliente?: string;
  placa?: string;
  contrato_id?: string;
}

const ExtratoConta = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [dataInicio, setDataInicio] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [dataFim, setDataFim] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [contaSelecionada, setContaSelecionada] = useState("BANCO CORA");
  const [lancamentos, setLancamentos] = useState<FinancialEntry[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLancamentos();
    }
  }, [user, dataInicio, dataFim]);

  // Auto sync with Cora every time page loads
  useEffect(() => {
    if (user) {
      syncCoraTransactions();
    }
  }, [user]);

  const syncCoraTransactions = async () => {
    if (!user?.id) return;
    
    try {
      // Get Cora configuration
      const { data: config, error: configError } = await supabase
        .from('tenant_config')
        .select('config_value')
        .eq('user_id', user.id)
        .eq('config_key', 'cora_settings')
        .single();

      if (configError || !config?.config_value) {
        console.log('Cora configuration not found');
        return;
      }

      // Sync transactions for the current date range
      const { data, error } = await supabase.functions.invoke('cora-webhook', {
        body: {
          action: 'sync_transactions',
          user_id: user.id,
          config: config.config_value,
          start_date: dataInicio,
          end_date: dataFim
        }
      });

      if (error) {
        console.error('Cora sync error:', error);
        return;
      }

      if (data?.success) {
        console.log('Cora sync completed:', data);
        // Refresh data after sync
        fetchLancamentos();
      }

    } catch (error) {
      console.error('Error syncing Cora transactions:', error);
    }
  };

  const fetchLancamentos = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Buscar faturas (entradas)
      const { data: faturas, error: faturaError } = await supabase
        .from('boletos')
        .select('*')
        .eq('user_id', user.id)
        .gte('vencimento', dataInicio)
        .lte('vencimento', dataFim)
        .order('vencimento', { ascending: false });

      if (faturaError) throw faturaError;

      // Buscar despesas (saídas)
      const { data: despesas, error: despesaError } = await supabase
        .from('financial_expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('due_date', dataInicio)
        .lte('due_date', dataFim)
        .order('due_date', { ascending: false });

      if (despesaError) throw despesaError;

      // Buscar transações do Cora
      const { data: coraTransactions, error: coraError } = await supabase
        .from('cora_transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('transaction_date', dataInicio + 'T00:00:00')
        .lte('transaction_date', dataFim + 'T23:59:59')
        .order('transaction_date', { ascending: false });

      if (coraError) throw coraError;

      // Combinar e formatar dados
      const lancamentosFormatados: FinancialEntry[] = [
        // Faturas internas
        ...(faturas || []).map(fatura => ({
          id: fatura.id,
          data: fatura.vencimento,
          descricao: fatura.descricao || 'Fatura',
          identificador: `${fatura.fatura_id} | ${fatura.cliente_nome}${fatura.placa ? ` | ${fatura.placa}` : ''}`,
          situacao: fatura.status as 'pago' | 'pendente' | 'vencido',
          valor: Number(fatura.valor) || 0,
          tipo: 'entrada' as const,
          cliente: fatura.cliente_nome,
          placa: fatura.placa
        })),
        // Despesas internas
        ...(despesas || []).map(despesa => ({
          id: despesa.id,
          data: despesa.due_date || despesa.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          descricao: despesa.description || 'Despesa',
          identificador: `${despesa.type} | ${despesa.plate}`,
          situacao: despesa.is_paid ? 'pago' : (new Date(despesa.due_date || '') < new Date() ? 'vencido' : 'pendente') as 'pago' | 'pendente' | 'vencido',
          valor: Number(despesa.amount) || 0,
          tipo: 'saida' as const,
          placa: despesa.plate
        })),
        // Transações do Banco Cora
        ...(coraTransactions || []).map(transaction => ({
          id: transaction.id,
          data: transaction.transaction_date.split('T')[0],
          descricao: `${transaction.description} ${transaction.conciliated ? '(Conciliado)' : '(Banco Cora)'}`,
          identificador: `Cora ID: ${transaction.cora_transaction_id}${transaction.conciliated_boleto_id ? ' | Conciliado' : ' | Pendente'}`,
          situacao: transaction.status === 'settled' ? 'pago' : 'pendente' as 'pago' | 'pendente',
          valor: Number(transaction.amount) || 0,
          tipo: transaction.type === 'credit' ? 'entrada' : 'saida' as const
        }))
      ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      setLancamentos(lancamentosFormatados);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os lançamentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calcular resumos
  const pagos = lancamentos.filter(l => l.situacao === 'pago');
  const aPagar = lancamentos.filter(l => l.situacao === 'pendente' && l.tipo === 'saida');
  const recebidos = lancamentos.filter(l => l.situacao === 'pago' && l.tipo === 'entrada');
  const aReceber = lancamentos.filter(l => l.situacao === 'pendente' && l.tipo === 'entrada');
  const vencidos = lancamentos.filter(l => l.situacao === 'vencido');

  const totalPagos = pagos.reduce((sum, l) => sum + (l.tipo === 'saida' ? l.valor : 0), 0);
  const totalAPagar = aPagar.reduce((sum, l) => sum + l.valor, 0);
  const totalRecebidos = recebidos.reduce((sum, l) => sum + l.valor, 0);
  const totalAReceber = aReceber.reduce((sum, l) => sum + l.valor, 0);
  const totalVencidos = vencidos.reduce((sum, l) => sum + l.valor, 0);

  const saldoDia = lancamentos.reduce((sum, l) => {
    if (l.situacao === 'pago') {
      return l.tipo === 'entrada' ? sum + l.valor : sum - l.valor;
    }
    return sum;
  }, 0);

  const saldoAcumulado = saldoDia; // Simplificado - em produção viria do banco

  const getSituacaoColor = (situacao: string) => {
    switch (situacao) {
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

  const getSituacaoText = (situacao: string) => {
    switch (situacao) {
      case 'pago':
        return 'Pago';
      case 'pendente':
        return 'Pendente';
      case 'vencido':
        return 'Vencido';
      default:
        return situacao;
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(lancamentos.map(l => l.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, id]);
    } else {
      setSelectedItems(prev => prev.filter(item => item !== id));
    }
  };

  const handleExportExcel = async () => {
    toast({
      title: "Exportando Excel",
      description: "Funcionalidade em desenvolvimento",
    });
  };

  const handleExportPDF = async () => {
    toast({
      title: "Exportando PDF",
      description: "Funcionalidade em desenvolvimento",
    });
  };

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p>Você precisa estar logado para acessar esta página.</p>
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
            <h1 className="text-3xl font-bold text-foreground">Extrato de Conta</h1>
            <p className="text-muted-foreground">Visualize e gerencie todos os lançamentos financeiros</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={syncCoraTransactions}
            disabled={loading}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Sincronizar Cora
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filtros e Resumo - Coluna da Esquerda */}
        <div className="lg:col-span-1 space-y-6">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="periodo">Período</Label>
                <div className="grid grid-cols-1 gap-2">
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    placeholder="Data inicial"
                  />
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    placeholder="Data final"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Conta</Label>
                <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANCO CORA">BANCO CORA</SelectItem>
                    <SelectItem value="CONTA CORRENTE">CONTA CORRENTE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Resumo dos Lançamentos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumo dos Lançamentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pagos</span>
                <span className="font-medium">R$ {totalPagos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">A Pagar</span>
                <span className="font-medium">R$ {totalAPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Recebidos</span>
                <span className="font-medium">R$ {totalRecebidos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">A Receber</span>
                <span className="font-medium">R$ {totalAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Vencidos</span>
                <span className="font-medium text-destructive">R$ {totalVencidos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <hr />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Quantidade</span>
                <span className="font-medium">{lancamentos.length}</span>
              </div>
              <div className="flex justify-between items-center font-bold">
                <span>Total</span>
                <span>R$ {Math.abs(saldoAcumulado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Lançamentos - Coluna da Direita */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lançamentos</CardTitle>
                  <CardDescription>
                    Período selecionado: {new Date(dataInicio).toLocaleDateString('pt-BR')} à {new Date(dataFim).toLocaleDateString('pt-BR')}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedItems.length === lancamentos.length && lancamentos.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label className="text-sm">Selecionar todos</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Carregando lançamentos...</p>
                </div>
              ) : lancamentos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum lançamento encontrado no período selecionado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Cabeçalho da tabela */}
                  <div className="grid grid-cols-12 gap-4 p-3 bg-muted/50 rounded-lg font-medium text-sm">
                    <div className="col-span-1"></div>
                    <div className="col-span-2">DATA</div>
                    <div className="col-span-4">DESCRIÇÃO</div>
                    <div className="col-span-2">SITUAÇÃO</div>
                    <div className="col-span-3 text-right">VALOR</div>
                  </div>

                  {/* Linhas da tabela */}
                  {lancamentos.map((lancamento) => (
                    <div 
                      key={lancamento.id} 
                      className="grid grid-cols-12 gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="col-span-1 flex items-center">
                        <Checkbox
                          checked={selectedItems.includes(lancamento.id)}
                          onCheckedChange={(checked) => handleSelectItem(lancamento.id, checked as boolean)}
                        />
                      </div>
                      
                      <div className="col-span-2 flex items-center">
                        <div className="flex items-center gap-2">
                          {lancamento.tipo === 'entrada' ? (
                            <TrendingUp className="h-4 w-4 text-success" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-destructive" />
                          )}
                          <span className="text-sm">
                            {new Date(lancamento.data).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      <div className="col-span-4">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{lancamento.descricao}</p>
                          <p className="text-xs text-muted-foreground">{lancamento.identificador}</p>
                        </div>
                      </div>

                      <div className="col-span-2 flex items-center">
                        <Badge className={getSituacaoColor(lancamento.situacao)}>
                          {getSituacaoText(lancamento.situacao)}
                        </Badge>
                      </div>

                      <div className="col-span-3 text-right">
                        <p className={`font-bold ${
                          lancamento.tipo === 'entrada' 
                            ? 'text-success' 
                            : 'text-destructive'
                        }`}>
                          {lancamento.tipo === 'entrada' ? '+' : '-'}R$ {lancamento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Rodapé com saldos */}
                  <div className="border-t pt-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
                        <span className="font-medium">Saldo do Dia:</span>
                        <span className={`font-bold ${saldoDia >= 0 ? 'text-success' : 'text-destructive'}`}>
                          R$ {saldoDia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
                        <span className="font-medium">Saldo Acumulado:</span>
                        <span className={`font-bold ${saldoAcumulado >= 0 ? 'text-success' : 'text-destructive'}`}>
                          R$ {saldoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ExtratoConta;