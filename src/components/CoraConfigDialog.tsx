import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Settings, CreditCard, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";

interface CoraConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CoraConfig {
  payment_types: string[];
  billing_start_day: number;
  cora_account_id: string;
}

const CoraConfigDialog = ({ open, onOpenChange }: CoraConfigDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  
  const [config, setConfig] = useState<CoraConfig>({
    payment_types: ['pix'],
    billing_start_day: 1,
    cora_account_id: '',
  });

  useEffect(() => {
    if (open && user) {
      loadConfig();
      loadLogs();
    }
  }, [open, user]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenant_config')
        .select('*')
        .eq('user_id', user?.id)
        .eq('config_key', 'cora_settings')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig(data.config_value as unknown as CoraConfig);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('integration_logs')
        .select('*')
        .eq('user_id', user?.id)
        .eq('service', 'cora')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tenant_config')
        .upsert({
          user_id: user.id,
          config_key: 'cora_settings',
          config_value: config as any,
        });

      if (error) throw error;

      toast({
        title: "Configurações salvas!",
        description: "As configurações do Banco Cora foram atualizadas",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!config.cora_account_id) {
      toast({
        title: "Configuração incompleta",
        description: "Preencha o ID da conta Cora primeiro",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Test with a minimal invoice creation call
      const { data, error } = await supabase.functions.invoke('generate-recurring-invoices', {
        body: { test: true, user_id: user?.id }
      });

      if (error) throw error;

      toast({
        title: "Conexão testada!",
        description: "A integração com o Banco Cora está funcionando",
      });

      loadLogs(); // Refresh logs
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: "Erro na conexão",
        description: "Verifique suas configurações e tente novamente",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-success text-success-foreground">Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações do Banco Cora
          </DialogTitle>
          <DialogDescription>
            Configure a integração com o Banco Cora para faturas recorrentes
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="p-6 text-center">
            <p>Carregando configurações...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Configurações básicas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Configurações de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cora_account_id">ID da Conta Cora</Label>
                  <Input
                    id="cora_account_id"
                    value={config.cora_account_id}
                    onChange={(e) => setConfig(prev => ({ ...prev, cora_account_id: e.target.value }))}
                    placeholder="Digite o ID da sua conta no Banco Cora"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipos de Pagamento Habilitados</Label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="pix"
                        checked={config.payment_types.includes('pix')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setConfig(prev => ({
                              ...prev,
                              payment_types: [...prev.payment_types.filter(t => t !== 'pix'), 'pix']
                            }));
                          } else {
                            setConfig(prev => ({
                              ...prev,
                              payment_types: prev.payment_types.filter(t => t !== 'pix')
                            }));
                          }
                        }}
                      />
                      <Label htmlFor="pix">PIX</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="boleto"
                        checked={config.payment_types.includes('boleto')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setConfig(prev => ({
                              ...prev,
                              payment_types: [...prev.payment_types.filter(t => t !== 'boleto'), 'boleto']
                            }));
                          } else {
                            setConfig(prev => ({
                              ...prev,
                              payment_types: prev.payment_types.filter(t => t !== 'boleto')
                            }));
                          }
                        }}
                      />
                      <Label htmlFor="boleto">Boleto</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billing_start_day">Dia de Início da Cobrança</Label>
                  <Select
                    value={config.billing_start_day.toString()}
                    onValueChange={(value) => setConfig(prev => ({ ...prev, billing_start_day: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dia" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          Dia {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={testConnection}
                    disabled={saving}
                  >
                    {saving ? "Testando..." : "Testar Conexão"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Logs de integração */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Logs de Integração
                </CardTitle>
                <CardDescription>
                  Últimas 10 operações com o Banco Cora
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {logs.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhum log disponível</p>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-2 border rounded text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {log.status === 'success' ? (
                              <CheckCircle2 className="h-3 w-3 text-success" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-destructive" />
                            )}
                            <span className="font-medium">{log.operation}</span>
                          </div>
                          {getStatusBadge(log.status)}
                        </div>
                        <span className="text-muted-foreground">
                          {new Date(log.created_at).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(log.created_at).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-gradient-primary hover:opacity-90"
          >
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CoraConfigDialog;