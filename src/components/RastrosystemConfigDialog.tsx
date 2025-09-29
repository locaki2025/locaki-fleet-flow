import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface RastrosystemConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigSaved?: () => void;
}

const RastrosystemConfigDialog = ({ open, onOpenChange, onConfigSaved }: RastrosystemConfigDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  
  const [config, setConfig] = useState({
    api_base_url: 'https://teste.rastrosystem.com.br',
    username: 'ronaldojunior@terra.com.br',
    password: '33881353@',
    sync_interval: 60,
  });

  useEffect(() => {
    if (open && user?.id) {
      loadConfig();
    }
  }, [open, user?.id]);

  const loadConfig = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('tenant_config')
        .select('config_value')
        .eq('user_id', user.id)
        .eq('config_key', 'rastrosystem_settings')
        .maybeSingle();

      if (error) {
        console.error('Error loading config:', error);
        return;
      }

      if (data?.config_value) {
        const savedConfig = typeof data.config_value === 'string' 
          ? JSON.parse(data.config_value) 
          : data.config_value;
        setConfig(savedConfig);
      }
    } catch (error) {
      console.error('Error parsing config:', error);
    }
  };

  const testConnection = async () => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Você precisa estar autenticado",
        variant: "destructive",
      });
      return;
    }

    if (!config.username || !config.password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha usuário e senha",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // First save the config temporarily so the edge function can use it
      await supabase
        .from('tenant_config')
        .upsert({
          user_id: user.id,
          config_key: 'rastrosystem_settings',
          config_value: config,
        });

      const { data, error } = await supabase.functions.invoke('rastrosystem-sync', {
        body: {
          action: 'test_connection',
          user_id: user.id,
        }
      });

      if (error) throw error;

      if (data?.success) {
        setTestResult('success');
        toast({
          title: "Sucesso",
          description: "Conexão com Rastrosystem estabelecida com sucesso!",
        });
      } else {
        setTestResult('error');
        toast({
          title: "Erro",
          description: "Não foi possível conectar com a Rastrosystem",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setTestResult('error');
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao testar conexão",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const saveConfig = async () => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Você precisa estar autenticado",
        variant: "destructive",
      });
      return;
    }

    if (!config.username || !config.password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('tenant_config')
        .upsert({
          user_id: user.id,
          config_key: 'rastrosystem_settings',
          config_value: config,
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso",
      });

      onOpenChange(false);
      if (onConfigSaved) {
        onConfigSaved();
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configurar Rastrosystem</DialogTitle>
          <DialogDescription>
            Configure as credenciais de acesso à API da Rastrosystem
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="api_url">URL da API</Label>
            <Input
              id="api_url"
              value={config.api_base_url}
              onChange={(e) => setConfig({ ...config, api_base_url: e.target.value })}
              placeholder="https://teste.rastrosystem.com.br"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Usuário (E-mail)</Label>
            <Input
              id="username"
              type="email"
              value={config.username}
              onChange={(e) => setConfig({ ...config, username: e.target.value })}
              placeholder="seu-email@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={config.password}
              onChange={(e) => setConfig({ ...config, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sync_interval">Intervalo de Sincronização (segundos)</Label>
            <Input
              id="sync_interval"
              type="number"
              value={config.sync_interval}
              onChange={(e) => setConfig({ ...config, sync_interval: parseInt(e.target.value) || 60 })}
              placeholder="60"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={testConnection}
              disabled={testing || !config.username || !config.password}
              className="flex-1"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : testResult === 'success' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2 text-success" />
                  Conectado
                </>
              ) : testResult === 'error' ? (
                <>
                  <XCircle className="h-4 w-4 mr-2 text-destructive" />
                  Erro
                </>
              ) : (
                'Testar Conexão'
              )}
            </Button>

            <Button 
              onClick={saveConfig}
              disabled={loading || !config.username || !config.password}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RastrosystemConfigDialog;
