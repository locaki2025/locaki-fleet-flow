import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Satellite, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

interface RastrosystemConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RastrosystemConfig {
  api_base_url: string;
  username: string;
  password: string;
  sync_interval: number;
}

const RastrosystemConfigDialog = ({ open, onOpenChange }: RastrosystemConfigDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  
  const [config, setConfig] = useState<RastrosystemConfig>({
    api_base_url: 'https://teste.rastrosystem.com.br',
    username: '',
    password: '',
    sync_interval: 60,
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
        .eq('config_key', 'rastrosystem_settings')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig(data.config_value as unknown as RastrosystemConfig);
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
        .eq('service', 'rastrosystem')
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
          config_key: 'rastrosystem_settings',
          config_value: config as any,
        });

      if (error) throw error;

      toast({
        title: "Configurações salvas!",
        description: "As configurações do Rastrosystem foram atualizadas",
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
    if (!config.username || !config.password) {
      toast({
        title: "Configuração incompleta",
        description: "Preencha usuário e senha primeiro",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('rastrosystem-sync', {
        body: { 
          action: 'test_connection', 
          user_id: user?.id 
        }
      });

      if (error) throw error;

      toast({
        title: "Conexão testada!",
        description: "A integração com o Rastrosystem está funcionando",
      });

      loadLogs(); // Refresh logs
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: "Erro na conexão",
        description: "Verifique suas credenciais e tente novamente",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const syncDevices = async () => {
    if (!config.username || !config.password) {
      toast({
        title: "Configuração incompleta",
        description: "Configure as credenciais primeiro",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('rastrosystem-sync', {
        body: { 
          action: 'sync_devices', 
          user_id: user?.id 
        }
      });

      if (error) throw error;

      toast({
        title: "Sincronização concluída!",
        description: `${data.count} dispositivos foram sincronizados`,
      });

      loadLogs(); // Refresh logs
    } catch (error) {
      console.error('Error syncing devices:', error);
      toast({
        title: "Erro na sincronização",
        description: "Ocorreu um erro durante a sincronização",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
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
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Satellite className="h-5 w-5" />
            Configurações do Rastrosystem
          </DialogTitle>
          <DialogDescription>
            Configure a integração com o sistema de rastreamento Rastrosystem
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="p-6 text-center">
            <p>Carregando configurações...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Configurações de API */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configurações de API
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api_base_url">URL Base da API</Label>
                  <Input
                    id="api_base_url"
                    value={config.api_base_url}
                    onChange={(e) => setConfig(prev => ({ ...prev, api_base_url: e.target.value }))}
                    placeholder="https://teste.rastrosystem.com.br"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Usuário</Label>
                    <Input
                      id="username"
                      value={config.username}
                      onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Seu usuário do Rastrosystem"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={config.password}
                      onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Sua senha do Rastrosystem"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sync_interval">Intervalo de Sincronização (minutos)</Label>
                  <Input
                    id="sync_interval"
                    type="number"
                    value={config.sync_interval}
                    onChange={(e) => setConfig(prev => ({ ...prev, sync_interval: parseInt(e.target.value) || 60 }))}
                    min="5"
                    max="1440"
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={testConnection}
                    disabled={saving}
                  >
                    {saving ? "Testando..." : "Testar Conexão"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={syncDevices}
                    disabled={syncing}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? "Sincronizando..." : "Sincronizar Dispositivos"}
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
                  Últimas 10 operações com o Rastrosystem
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

export default RastrosystemConfigDialog;