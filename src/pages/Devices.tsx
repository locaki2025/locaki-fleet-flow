import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Cpu, 
  Plus, 
  MapPin, 
  Battery,
  Wifi,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Power,
  Signal
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DeviceDialog from "@/components/DeviceDialog";

// Mock data para rastreadores
const mockDevices = [
  {
    id: "TRACK001",
    name: "Rastreador Honda CG 160",
    imei: "123456789012345",
    vehiclePlate: "ABC-1234",
    status: "online",
    lastUpdate: "2024-08-24T10:30:00Z",
    battery: 85,
    signal: 4,
    location: {
      lat: -23.5505,
      lng: -46.6333,
      address: "Av. Paulista, 1000 - São Paulo, SP"
    }
  },
  {
    id: "TRACK002",
    name: "Rastreador Yamaha Factor",
    imei: "987654321098765",
    vehiclePlate: "DEF-5678",
    status: "online",
    lastUpdate: "2024-08-24T10:25:00Z",
    battery: 92,
    signal: 3,
    location: {
      lat: -23.5489,
      lng: -46.6388,
      address: "Rua Augusta, 500 - São Paulo, SP"
    }
  },
  {
    id: "TRACK003",
    name: "Rastreador Honda Hornet",
    imei: "456789012345678",
    vehiclePlate: "GHI-9012",
    status: "offline",
    lastUpdate: "2024-08-23T15:20:00Z",
    battery: 23,
    signal: 0,
    location: {
      lat: -23.5617,
      lng: -46.6564,
      address: "Oficina Central - São Paulo, SP"
    }
  },
  {
    id: "TRACK004",
    name: "Rastreador Kawasaki Ninja",
    imei: "789012345678901",
    vehiclePlate: "JKL-3456",
    status: "maintenance",
    lastUpdate: "2024-08-24T08:15:00Z",
    battery: 78,
    signal: 2,
    location: {
      lat: -23.5505,
      lng: -46.6333,
      address: "Centro de Manutenção - São Paulo, SP"
    }
  }
];

const Devices = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [devices, setDevices] = useState(mockDevices);
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false);

  const filteredDevices = devices.filter(device =>
    device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.imei.includes(searchTerm)
  );

  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const offlineDevices = devices.filter(d => d.status === 'offline').length;
  const maintenanceDevices = devices.filter(d => d.status === 'maintenance').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-success text-success-foreground';
      case 'offline':
        return 'bg-destructive text-destructive-foreground';
      case 'maintenance':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'maintenance':
        return 'Manutenção';
      default:
        return status;
    }
  };

  const getBatteryColor = (battery: number) => {
    if (battery > 50) return 'text-success';
    if (battery > 20) return 'text-warning';
    return 'text-destructive';
  };

  const getSignalBars = (signal: number) => {
    return Array.from({ length: 4 }, (_, i) => (
      <div
        key={i}
        className={`w-1 h-3 ${i < signal ? 'bg-success' : 'bg-muted'} rounded-sm`}
      />
    ));
  };

  const handleDeviceAction = async (action: string, deviceId: string) => {
    try {
      if (action === "Ver localização") {
        // Always try to open Traccar monitoring system
        try {
          const { data: configData } = await supabase
            .from('tenant_config')
            .select('config_value')
            .eq('user_id', user?.id)
            .eq('config_key', 'traccar_settings')
            .maybeSingle();

          if (configData?.config_value && typeof configData.config_value === 'object') {
            const traccarConfig = configData.config_value as any;
            
            if (traccarConfig.api_url) {
              // Open Traccar web interface in new tab
              const traccarWebUrl = traccarConfig.api_url.replace('/api', '');
              window.open(traccarWebUrl, '_blank');
              
              toast({
                title: "Abrindo Traccar",
                description: "Sistema de monitoramento Traccar aberto em nova aba",
              });
              return;
            }
          }
          
          // If no Traccar configured, show message to configure it
          toast({
            title: "Traccar não configurado",
            description: "Configure o Traccar nas integrações para acessar o monitoramento em tempo real",
            variant: "destructive",
          });
          
        } catch (error) {
          console.error('Error getting Traccar config:', error);
          toast({
            title: "Erro de configuração",
            description: "Configure o Traccar nas integrações para acessar o monitoramento",
            variant: "destructive",
          });
        }
        return;
      }
      
      if (action === "Editar") {
        setIsDeviceDialogOpen(true);
        return;
      }
      
      if (action === "Reiniciar" || action === "Remover") {
        const { data, error } = await supabase.functions.invoke('rastrosystem-sync', {
          body: { action: action.toLowerCase(), deviceId }
        });
        
        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: `${action} executado com sucesso no dispositivo ${deviceId}`,
        });
        return;
      }
      
      toast({
        title: `${action} executado`,
        description: `Ação "${action}" executada no dispositivo ${deviceId}`,
      });
    } catch (error) {
      console.error('Error executing device action:', error);
      toast({
        title: "Erro",
        description: `Erro ao executar "${action}" no dispositivo ${deviceId}`,
        variant: "destructive",
      });
    }
  };

  const handleDeviceCreated = () => {
    // In a real app, this would refetch devices from the API
    toast({
      title: "Sucesso",
      description: "Dispositivo adicionado com sucesso!",
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
          <Cpu className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Rastreadores</h1>
            <p className="text-muted-foreground">Monitore e gerencie dispositivos GPS da frota</p>
          </div>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90"
          onClick={() => setIsDeviceDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Dispositivo
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Dispositivos</CardTitle>
            <Cpu className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devices.length}</div>
            <p className="text-xs text-muted-foreground">Dispositivos registrados</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{onlineDevices}</div>
            <p className="text-xs text-muted-foreground">Funcionando normalmente</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{offlineDevices}</div>
            <p className="text-xs text-muted-foreground">Sem comunicação</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manutenção</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{maintenanceDevices}</div>
            <p className="text-xs text-muted-foreground">Em manutenção</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, placa ou IMEI..."
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
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todos ({devices.length})</TabsTrigger>
          <TabsTrigger value="online">Online ({onlineDevices})</TabsTrigger>
          <TabsTrigger value="offline">Offline ({offlineDevices})</TabsTrigger>
          <TabsTrigger value="maintenance">Manutenção ({maintenanceDevices})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Dispositivos</CardTitle>
              <CardDescription>
                Visualize e gerencie todos os rastreadores cadastrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {filteredDevices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Cpu className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{device.name}</p>
                          <Badge className={getStatusColor(device.status)}>
                            {getStatusText(device.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {device.vehiclePlate} • IMEI: {device.imei}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {device.location.address}
                          </div>
                          <div className="flex items-center gap-1">
                            <Battery className={`h-3 w-3 ${getBatteryColor(device.battery)}`} />
                            {device.battery}%
                          </div>
                          <div className="flex items-center gap-1">
                            <Signal className="h-3 w-3" />
                            <div className="flex gap-px">
                              {getSignalBars(device.signal)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-right text-xs text-muted-foreground">
                        Última atualização:<br />
                        {new Date(device.lastUpdate).toLocaleString('pt-BR')}
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDeviceAction("Ver localização", device.id)}>
                            <MapPin className="h-4 w-4 mr-2" />
                            Ver no Mapa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeviceAction("Editar", device.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeviceAction("Reiniciar", device.id)}>
                            <Power className="h-4 w-4 mr-2" />
                            Reiniciar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeviceAction("Remover", device.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="online" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dispositivos Online</CardTitle>
              <CardDescription>Dispositivos ativos e transmitindo dados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {filteredDevices.filter(d => d.status === 'online').map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-success" />
                      </div>
                      <div>
                        <p className="font-medium">{device.name}</p>
                        <p className="text-sm text-muted-foreground">{device.vehiclePlate}</p>
                      </div>
                    </div>
                     <Button variant="outline" size="sm" onClick={() => handleDeviceAction("Ver localização", device.id)}>
                       Localizar
                     </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dispositivos Offline</CardTitle>
              <CardDescription>Dispositivos sem comunicação recente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {filteredDevices.filter(d => d.status === 'offline').map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg bg-destructive/5">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-destructive" />
                      </div>
                      <div>
                        <p className="font-medium">{device.name}</p>
                        <p className="text-sm text-destructive">Sem comunicação há {Math.floor((Date.now() - new Date(device.lastUpdate).getTime()) / (1000 * 60 * 60))} horas</p>
                      </div>
                    </div>
                     <Button variant="outline" size="sm" onClick={() => {
                       toast({
                         title: "Diagnóstico",
                         description: `Executando diagnóstico do dispositivo ${device.name}...`,
                       });
                     }}>
                       Diagnosticar
                     </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dispositivos em Manutenção</CardTitle>
              <CardDescription>Dispositivos que requerem atenção técnica</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {filteredDevices.filter(d => d.status === 'maintenance').map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg bg-warning/5">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-warning" />
                      </div>
                      <div>
                        <p className="font-medium">{device.name}</p>
                        <p className="text-sm text-warning">Em manutenção programada</p>
                      </div>
                    </div>
                     <Button variant="outline" size="sm" onClick={() => {
                       const newStatus = device.status === 'maintenance' ? 'online' : 'maintenance';
                       const updatedDevices = devices.map(d => 
                         d.id === device.id ? { ...d, status: newStatus } : d
                       );
                       setDevices(updatedDevices);
                       toast({
                         title: "Status atualizado",
                         description: `Status do dispositivo ${device.name} atualizado para ${newStatus}`,
                       });
                     }}>
                       Atualizar Status
                     </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeviceDialog 
        open={isDeviceDialogOpen}
        onOpenChange={setIsDeviceDialogOpen}
        onDeviceCreated={handleDeviceCreated}
      />
    </div>
  );
};

export default Devices;