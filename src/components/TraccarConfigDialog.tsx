import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, Zap } from 'lucide-react';

interface TraccarConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TraccarConfig {
  api_url: string;
  username: string;
  password: string;
  sync_interval: number;
}

interface IntegrationLog {
  id: string;
  operation: string;
  status: string;
  error_message?: string;
  created_at: string;
}

const TraccarConfigDialog: React.FC<TraccarConfigDialogProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [config, setConfig] = useState<TraccarConfig>({
    api_url: '',
    username: '',
    password: '',
    sync_interval: 300, // 5 minutes in seconds
  });

  useEffect(() => {
    if (open && user) {
      loadConfig();
      loadLogs();
    }
  }, [open, user]);

  const loadConfig = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenant_config')
        .select('config_value')
        .eq('user_id', user.id)
        .eq('config_key', 'traccar_settings')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading config:', error);
        return;
      }

      if (data) {
        setConfig(data.config_value as unknown as TraccarConfig);
      }
    } catch (error) {
      console.error('Error loading Traccar config:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar configurações do Traccar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('integration_logs')
        .select('id, operation, status, error_message, created_at')
        .eq('user_id', user.id)
        .eq('service', 'traccar')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading logs:', error);
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error('Error loading integration logs:', error);
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
          config_key: 'traccar_settings',
          config_value: config as any,
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Configurações do Traccar salvas com sucesso",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações do Traccar",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!user || !config.api_url || !config.username || !config.password) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('traccar-sync', {
        body: { action: 'test_connection' }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Sucesso",
        description: "Conexão com Traccar testada com sucesso",
      });

      loadLogs();
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: "Erro",
        description: `Falha ao testar conexão: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncDevices = async () => {
    if (!user) return;

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('traccar-sync', {
        body: { action: 'sync_devices' }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Sucesso",
        description: data.message || "Dispositivos sincronizados com sucesso",
      });

      loadLogs();
    } catch (error) {
      console.error('Error syncing devices:', error);
      toast({
        title: "Erro",
        description: `Falha ao sincronizar dispositivos: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'success' ? (
      <Badge variant="default" className="bg-green-500">Sucesso</Badge>
    ) : (
      <Badge variant="destructive">Erro</Badge>
    );
  };

  const getOperationLabel = (operation: string) => {
    const labels: { [key: string]: string } = {
      'test_connection': 'Teste de Conexão',
      'sync_devices': 'Sincronização de Dispositivos',
      'send_command': 'Envio de Comando',
    };
    return labels[operation] || operation;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configuração do Traccar</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="api_url">URL da API *</Label>
              <Input
                id="api_url"
                type="url"
                placeholder="https://traccar.exemplo.com"
                value={config.api_url}
                onChange={(e) => setConfig(prev => ({ ...prev, api_url: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sync_interval">Intervalo de Sincronização (segundos)</Label>
              <Input
                id="sync_interval"
                type="number"
                min="60"
                value={config.sync_interval}
                onChange={(e) => setConfig(prev => ({ ...prev, sync_interval: parseInt(e.target.value) || 300 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário *</Label>
              <Input
                id="username"
                type="text"
                value={config.username}
                onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={config.password}
                onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={testConnection}
              disabled={loading || !config.api_url || !config.username || !config.password}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Testar Conexão
                </>
              )}
            </Button>

            <Button 
              variant="outline" 
              onClick={syncDevices}
              disabled={syncing || !config.api_url || !config.username || !config.password}
            >
              {syncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sincronizar Dispositivos
                </>
              )}
            </Button>
          </div>

          {logs.length > 0 && (
            <div className="space-y-2">
              <Label>Logs Recentes</Label>
              <div className="max-h-40 overflow-y-auto space-y-2 border rounded-lg p-3">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(log.status)}
                      <span>{getOperationLabel(log.operation)}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Configurações'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TraccarConfigDialog;