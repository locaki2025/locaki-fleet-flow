import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Save, TestTube, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface CoraConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CoraConfig {
  client_id: string;
  certificate: string;
  private_key: string;
  base_url: string;
  environment: 'production' | 'stage';
}

const CoraConfigDialog = ({ open, onOpenChange }: CoraConfigDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const [config, setConfig] = useState<CoraConfig>({
    client_id: '',
    certificate: '',
    private_key: '',
    base_url: 'https://matls-clients.api.stage.cora.com.br',
    environment: 'stage'
  });

  const handleCertificateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setConfig({ ...config, certificate: content });
        toast({
          title: "Certificado carregado",
          description: "O certificado foi carregado com sucesso",
        });
      };
      reader.onerror = () => {
        toast({
          title: "Erro ao carregar certificado",
          description: "Não foi possível ler o arquivo do certificado",
          variant: "destructive",
        });
      };
      reader.readAsText(file);
    }
  };

  const handlePrivateKeyUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setConfig({ ...config, private_key: content });
        toast({
          title: "Chave privada carregada",
          description: "A chave privada foi carregada com sucesso",
        });
      };
      reader.onerror = () => {
        toast({
          title: "Erro ao carregar chave privada",
          description: "Não foi possível ler o arquivo da chave privada",
          variant: "destructive",
        });
      };
      reader.readAsText(file);
    }
  };

  // Load configuration when dialog opens
  useEffect(() => {
    if (open && user) {
      loadConfig();
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
        .eq('config_key', 'cora_settings')
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error is ok
        throw error;
      }

      if (data && data.config_value) {
        const loadedConfig = data.config_value as any as CoraConfig;
        // Normalize environment and base_url
        const env: 'production' | 'stage' = loadedConfig.environment === 'production' ? 'production' : 'stage';
        const correctBaseUrl = env === 'production'
          ? 'https://matls-clients.api.cora.com.br'
          : 'https://matls-clients.api.stage.cora.com.br';
        setConfig({
          ...loadedConfig,
          environment: env,
          base_url: correctBaseUrl
        });
      }
    } catch (error) {
      console.error('Error loading Cora config:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações do Cora",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
          config_value: config as any
        });

      if (error) throw error;

      toast({
        title: "Configurações salvas",
        description: "Configurações do Cora foram salvas com sucesso",
      });
    } catch (error) {
      console.error('Error saving Cora config:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações do Cora",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!user) return;
    
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('cora-webhook', {
        body: {
          action: 'test_connection',
          user_id: user.id,
          config
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Conexão testada",
          description: "Conexão com o Cora estabelecida com sucesso",
        });
      } else {
        throw new Error(data?.message || 'Erro na conexão');
      }
    } catch (error) {
      console.error('Cora test connection error:', error);
      toast({
        title: "Erro na conexão",
        description: error.message || "Não foi possível conectar com o Cora. Verifique as credenciais.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col p-0">
        <div className="px-6 pt-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Configurações do Banco Cora
            </DialogTitle>
            <DialogDescription>
              Configure sua integração com o Banco Cora para automatizar a geração de boletos e PIX
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[50vh] overflow-y-auto px-6">
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client ID</Label>
              <Input
                id="client_id"
                placeholder="Seu Client ID da API Cora"
                value={config.client_id}
                onChange={(e) => setConfig({ ...config, client_id: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="certificate">Certificado (arquivo .pem ou .crt)</Label>
              <div className="flex flex-col gap-2">
                <Input
                  id="certificate"
                  type="file"
                  accept=".pem,.crt"
                  onChange={handleCertificateUpload}
                  className="cursor-pointer"
                />
                {config.certificate && (
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    ✓ Certificado carregado ({config.certificate.length} caracteres)
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="private_key">Chave Privada (arquivo .key ou .pem)</Label>
              <div className="flex flex-col gap-2">
                <Input
                  id="private_key"
                  type="file"
                  accept=".key,.pem"
                  onChange={handlePrivateKeyUpload}
                  className="cursor-pointer"
                />
                {config.private_key && (
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    ✓ Chave privada carregada ({config.private_key.length} caracteres)
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="environment">Ambiente</Label>
              <select
                id="environment"
                className="w-full p-2 border rounded-md bg-background"
                value={config.environment}
                onChange={(e) => {
                  const env = e.target.value as 'production' | 'stage';
                  setConfig({ 
                    ...config, 
                    environment: env,
                    base_url: env === 'production' 
                      ? 'https://matls-clients.api.cora.com.br'
                      : 'https://matls-clients.api.stage.cora.com.br'
                  });
                }}
              >
                <option value="stage">Stage (Testes)</option>
                <option value="production">Produção</option>
              </select>
            </div>

            <div className="bg-muted/50 p-3 rounded-md text-xs space-y-1">
              <p className="font-semibold">ℹ️ Informação</p>
              <p className="text-muted-foreground">
                Os certificados são enviados ao proxy mTLS para autenticação com a API do Cora.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={testing || !config.client_id || !config.certificate || !config.private_key}
                className="flex-1"
              >
                {testing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="mr-2 h-4 w-4" />
                )}
                Testar Conexão
              </Button>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 px-6 pb-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !config.client_id}
            className="bg-gradient-primary hover:opacity-90"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar Configurações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CoraConfigDialog;