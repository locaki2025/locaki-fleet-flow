import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Signal,
  Loader2
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const RASTROSYSTEM_API_URL = 'https://locaki.rastrosystem.com.br/api_v2';

interface Device {
  id: string;
  name: string;
  imei: string;
  vehiclePlate: string;
  status: string;
  lastUpdate: string;
  battery: number;
  signal: number;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
}

const Devices = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null);
  const [deviceToEdit, setDeviceToEdit] = useState<any | null>(null);

  // Fetch devices from Supabase (vehicles table)
  useEffect(() => {
    if (user?.id) {
      fetchDevices();
    }
  }, [user?.id]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('devices-vehicles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('Veículo atualizado, recarregando dispositivos...');
          fetchDevices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const clearAndReloadDevices = async () => {
    setDevices([]);
    await fetchDevices();
    toast({
      title: "Dados recarregados",
      description: "Lista de rastreadores atualizada com sucesso",
    });
  };

  const fetchDevices = async () => {
    if (!user?.id) {
      console.warn('No user ID found, skipping devices fetch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Buscar veículos do Supabase
      const { data: vehiclesData, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching vehicles:', error);
        throw new Error(`Erro ao carregar dispositivos: ${error.message}`);
      }

      if (!vehiclesData || vehiclesData.length === 0) {
        console.log('Nenhum veículo encontrado');
        setDevices([]);
        return;
      }

      // Transformar veículos em formato de dispositivos
      const devicesData: Device[] = vehiclesData.map((vehicle) => {
        // Calcular status baseado em dados reais se disponível
        const status = vehicle.status === 'disponivel' ? 'online' : 
                      vehicle.status === 'manutencao' ? 'maintenance' : 'offline';

        return {
          id: vehicle.id,
          name: `${vehicle.brand} ${vehicle.model}`,
          imei: vehicle.tracker_id || 'N/A',
          vehiclePlate: vehicle.plate,
          status: status,
          lastUpdate: vehicle.updated_at || new Date().toISOString(),
          battery: 85, // Valor padrão - pode ser atualizado com dados reais
          signal: 3,   // Valor padrão - pode ser atualizado com dados reais
          location: {
            lat: 0,
            lng: 0,
            address: `${vehicle.brand} ${vehicle.model} - ${vehicle.plate}`
          }
        };
      });

      setDevices(devicesData);
      console.log('Devices loaded successfully:', devicesData.length);
    } catch (error) {
      console.error('Erro ao buscar dispositivos:', error);
      setDevices([]);
      toast({
        title: "Erro ao carregar dispositivos",
        description: error instanceof Error ? error.message : "Não foi possível carregar os dispositivos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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

  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return;

    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', deviceToDelete)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Rastreador excluído",
        description: "O rastreador foi removido com sucesso",
      });

      // Recarregar a lista
      await fetchDevices();
    } catch (error) {
      console.error('Error deleting device:', error);
      toast({
        title: "Erro ao excluir",
        description: error instanceof Error ? error.message : "Não foi possível excluir o rastreador",
        variant: "destructive",
      });
    } finally {
      setDeviceToDelete(null);
    }
  };

  const handleDeviceAction = async (action: string, deviceId: string) => {
    try {
      if (action === "Ver localização") {
        // Encontra o dispositivo selecionado
        const device = devices.find(d => d.id === deviceId);
        if (device) {
          // Navega para a página do mapa com a placa do veículo como parâmetro
          navigate(`/map?plate=${encodeURIComponent(device.vehiclePlate)}`);
        }
        return;
      }
      
      if (action === "Editar") {
        // Buscar dados do veículo do banco de dados
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', deviceId)
          .eq('user_id', user?.id)
          .single();
        
        if (error || !data) {
          toast({
            title: "Erro",
            description: "Não foi possível carregar os dados do dispositivo",
            variant: "destructive",
          });
          return;
        }
        
        // Transformar dados do vehicle para formato de device
        const deviceData = {
          id: data.id,
          name: `${data.brand} ${data.model}`,
          imei: data.tracker_id || '',
          vehicle_plate: data.plate,
          chip_number: data.chip_number,
          tracker_model: data.tracker_model,
          status: data.status === 'disponivel' ? 'online' : data.status === 'manutencao' ? 'maintenance' : 'offline'
        };
        
        setDeviceToEdit(deviceData);
        setIsDeviceDialogOpen(true);
        return;
      }
      
      if (action === "Remover") {
        setDeviceToDelete(deviceId);
        return;
      }
      
      if (action === "Reiniciar") {
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

  const handleDeviceCreated = async () => {
    await fetchDevices();
    toast({
      title: "Sucesso",
      description: deviceToEdit ? "Dispositivo atualizado com sucesso!" : "Dispositivo adicionado com sucesso!",
    });
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
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando dispositivos...</p>
        </div>
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
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={clearAndReloadDevices}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Power className="h-4 w-4 mr-2" />
            )}
            Recarregar
          </Button>
          <Button 
            className="bg-gradient-primary hover:opacity-90"
            onClick={() => setIsDeviceDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Dispositivo
          </Button>
        </div>
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
        onOpenChange={(open) => {
          setIsDeviceDialogOpen(open);
          if (!open) setDeviceToEdit(null);
        }}
        onDeviceCreated={handleDeviceCreated}
        device={deviceToEdit}
      />

      <AlertDialog open={!!deviceToDelete} onOpenChange={() => setDeviceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este rastreador? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDevice} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Devices;