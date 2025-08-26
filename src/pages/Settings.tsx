import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Palette,
  Globe,
  Key,
  Database,
  Mail,
  Phone,
  Building,
  Zap
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import IntegrationsConfigDialog from "@/components/IntegrationsConfigDialog";

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [integrationsDialogOpen, setIntegrationsDialogOpen] = useState(false);
  
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    maintenance: true,
    payments: true,
    contracts: false
  });

  const [profile, setProfile] = useState({
    name: "Admin User",
    email: user?.email || "",
    phone: "",
    company: "Minha Empresa"
  });

  const handleSave = (section: string) => {
    toast({
      title: "Configurações salvas",
      description: `${section} foi atualizado com sucesso!`,
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
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">Gerencie suas preferências e configurações do sistema</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações do Perfil
              </CardTitle>
              <CardDescription>
                Atualize suas informações pessoais e de contato
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    placeholder="Seu nome completo"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                    placeholder="seu@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    value={profile.company}
                    onChange={(e) => setProfile({...profile, company: e.target.value})}
                    placeholder="Nome da empresa"
                  />
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={() => handleSave("Perfil")} className="bg-gradient-primary hover:opacity-90">
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Preferências de Notificação
              </CardTitle>
              <CardDescription>
                Configure quando e como receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Canais de Notificação</h4>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="email-notifications">Notificações por Email</Label>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={notifications.email}
                    onCheckedChange={(checked) => setNotifications({...notifications, email: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="sms-notifications">Notificações por SMS</Label>
                  </div>
                  <Switch
                    id="sms-notifications"
                    checked={notifications.sms}
                    onCheckedChange={(checked) => setNotifications({...notifications, sms: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="push-notifications">Notificações Push</Label>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={notifications.push}
                    onCheckedChange={(checked) => setNotifications({...notifications, push: checked})}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Tipos de Notificação</h4>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="maintenance-notifications">Manutenções Agendadas</Label>
                  <Switch
                    id="maintenance-notifications"
                    checked={notifications.maintenance}
                    onCheckedChange={(checked) => setNotifications({...notifications, maintenance: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="payment-notifications">Pagamentos e Cobranças</Label>
                  <Switch
                    id="payment-notifications"
                    checked={notifications.payments}
                    onCheckedChange={(checked) => setNotifications({...notifications, payments: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="contract-notifications">Contratos Vencendo</Label>
                  <Switch
                    id="contract-notifications"
                    checked={notifications.contracts}
                    onCheckedChange={(checked) => setNotifications({...notifications, contracts: checked})}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={() => handleSave("Notificações")} className="bg-gradient-primary hover:opacity-90">
                  Salvar Preferências
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Segurança da Conta
              </CardTitle>
              <CardDescription>
                Gerencie a segurança e autenticação da sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Alterar Senha</h4>
                    <p className="text-sm text-muted-foreground">Atualize sua senha regularmente</p>
                  </div>
                   <Button variant="outline" onClick={() => {
                     toast({
                       title: "Senha",
                       description: "Funcionalidade de alteração de senha será implementada em breve",
                     });
                   }}>Alterar</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Autenticação de Dois Fatores</h4>
                    <p className="text-sm text-muted-foreground">Adicione uma camada extra de segurança</p>
                  </div>
                   <Button variant="outline" onClick={() => {
                     toast({
                       title: "2FA",
                       description: "Funcionalidade de autenticação de dois fatores será implementada em breve",
                     });
                   }}>Configurar</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Sessões Ativas</h4>
                    <p className="text-sm text-muted-foreground">Visualize e gerencie sessões ativas</p>
                  </div>
                   <Button variant="outline" onClick={() => {
                     toast({
                       title: "Sessões",
                       description: "Funcionalidade de gerenciamento de sessões será implementada em breve",
                     });
                   }}>Gerenciar</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Configurações do Sistema
              </CardTitle>
              <CardDescription>
                Configurações avançadas e integrações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Backup de Dados</h4>
                    <p className="text-sm text-muted-foreground">Último backup: Hoje às 03:00</p>
                  </div>
                   <Button variant="outline" onClick={() => {
                     toast({
                       title: "Backup",
                       description: "Funcionalidade de backup será implementada em breve",
                     });
                   }}>Baixar Backup</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Integração API</h4>
                    <p className="text-sm text-muted-foreground">Configure integrações com sistemas externos</p>
                  </div>
                  <Button variant="outline" onClick={() => setIntegrationsDialogOpen(true)}>Configurar</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Logs do Sistema</h4>
                    <p className="text-sm text-muted-foreground">Visualize logs de atividade e erros</p>
                  </div>
                   <Button variant="outline" onClick={() => {
                     toast({
                       title: "Logs",
                       description: "Funcionalidade de visualização de logs será implementada em breve",
                     });
                   }}>Ver Logs</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <IntegrationsConfigDialog 
        open={integrationsDialogOpen} 
        onOpenChange={setIntegrationsDialogOpen} 
      />
    </div>
  );
};

export default Settings;