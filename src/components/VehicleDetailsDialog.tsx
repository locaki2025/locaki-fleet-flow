import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bike, MapPin, Gauge, Calendar, FileText, Settings, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import VehicleDialog from "./VehicleDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GoogleMapComponent from "./GoogleMap";

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  category: string;
  status: string;
  odometer: number;
  tracker?: string;
  lastLocation?: {
    lat: number;
    lng: number;
    address: string;
    updatedAt: string;
  };
}

interface VehicleDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  onVehicleUpdate?: () => void;
}

const VehicleDetailsDialog = ({ open, onOpenChange, vehicle, onVehicleUpdate }: VehicleDetailsDialogProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Dados do mapa seguindo a mesma lógica da página de Mapa (devices)
  const [mapVehicle, setMapVehicle] = useState<any | null>(null);

  // Carrega a localização inicial
  useEffect(() => {
    const loadLocation = async () => {
      if (!open || !vehicle || !user?.id) return;
      console.log("[VehicleDetailsDialog] Carregando localização para placa:", vehicle.plate);

      try {
        // Tenta sincronizar (mesma lógica do Map.tsx), mas não bloqueia em caso de erro
        try {
          await supabase.functions.invoke("rastrosystem-sync", {
            body: { action: "sync_devices", user_id: user.id },
          });
        } catch (syncErr) {
          console.warn("[VehicleDetailsDialog] Sync Rastrosystem falhou (segue com fallback):", syncErr);
        }

        // Busca o device correspondente pela placa
        const { data: device, error } = await supabase
          .from("devices")
          .select("*")
          .eq("user_id", user.id)
          .eq("vehicle_plate", vehicle.plate)
          .maybeSingle();

        if (!error && device) {
          console.log(
            "[VehicleDetailsDialog] Device encontrado no banco:",
            device?.id,
            device?.vehicle_plate,
            device?.latitude,
            device?.longitude,
          );
        }

        if (!error && device && device.latitude != null && device.longitude != null) {
          const lat = Number(device.latitude);
          const lng = Number(device.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            const mapped = {
              id: device.id,
              plate: device.vehicle_plate,
              brand: (device.name || "Veículo").split(" ")[0],
              model: device.model,
              name: device.name,
              latitude: lat,
              longitude: lng,
              status: device.status === "online" ? "online" : "offline",
              last_update: device.last_update || new Date().toISOString(),
              address: device.address || undefined,
            };
            console.log("[VehicleDetailsDialog] Localização via DB:", mapped);
            setMapVehicle(mapped);
            return;
          }
        }

        // FALLBACK: Busca diretamente no Rastrosystem (mesma lógica do Map.tsx)
        console.log("[VehicleDetailsDialog] Device não encontrado no banco, tentando fallback Rastrosystem...");
        try {
          const loginRes = await fetch("https://locaki.rastrosystem.com.br/api_v2/login/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ login: "54858795000100", senha: "123456", app: 9 }),
          });

          if (!loginRes.ok) throw new Error("Falha no login Rastrosystem");

          const login = await loginRes.json();
          const token = login.token;
          const cliente_id = login.cliente_id;

          const vRes = await fetch(`https://locaki.rastrosystem.com.br/api_v2/veiculos/${cliente_id}/`, {
            method: "GET",
            headers: {
              Authorization: `token ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (!vRes.ok) throw new Error("Falha ao buscar veículos no Rastrosystem");

          const vJson = await vRes.json();
          const dispositivos = vJson.dispositivos || vJson || [];
          console.log("[VehicleDetailsDialog] Dispositivos recebidos (fallback):", dispositivos?.length);

          // Procura o dispositivo pela placa
          const rastroDevice = dispositivos.find(
            (d: any) =>
              d.placa === vehicle.plate || d.name?.includes(vehicle.plate) || d.modelo?.includes(vehicle.plate),
          );

          if (rastroDevice) {
            const lat =
              typeof rastroDevice.latitude === "number" ? rastroDevice.latitude : Number(rastroDevice.latitude);
            const lng =
              typeof rastroDevice.longitude === "number" ? rastroDevice.longitude : Number(rastroDevice.longitude);

            if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
              const mapped = {
                id: rastroDevice.unique_id || String(rastroDevice.id),
                plate: vehicle.plate,
                brand: vehicle.brand,
                model: vehicle.model,
                name: `${vehicle.brand} ${vehicle.model}`,
                latitude: lat,
                longitude: lng,
                status: rastroDevice.status ? "online" : "offline",
                last_update: rastroDevice.server_time || rastroDevice.time || new Date().toISOString(),
                address: rastroDevice.address || undefined,
              };
              console.log("[VehicleDetailsDialog] Localização via Rastrosystem (fallback):", mapped);
              setMapVehicle(mapped);
              return;
            } else {
              console.warn(
                "[VehicleDetailsDialog] Coordenadas inválidas no fallback:",
                rastroDevice?.latitude,
                rastroDevice?.longitude,
              );
            }
          } else {
            console.warn(
              "[VehicleDetailsDialog] Nenhum dispositivo encontrado para a placa no fallback:",
              vehicle.plate,
            );
          }
        } catch (fallbackError) {
          console.error("[VehicleDetailsDialog] Fallback Rastrosystem falhou:", fallbackError);
        }

        console.warn("[VehicleDetailsDialog] Localização não encontrada. mapVehicle = null");
        setMapVehicle(null);
      } catch (e) {
        console.error("[VehicleDetailsDialog] Falha ao carregar localização do veículo:", e);
        setMapVehicle(null);
      }
    };

    loadLocation();
  }, [open, vehicle?.plate, user?.id]);

  // Atualização periódica da localização (a cada 15 segundos) - mesma lógica do Map.tsx
  useEffect(() => {
    if (!open || !vehicle || !user?.id) return;

    const updateLocation = async () => {
      try {
        console.log("[VehicleDetailsDialog] Atualizando localização para placa:", vehicle.plate);

        // Login no Rastrosystem
        const loginRes = await fetch("https://locaki.rastrosystem.com.br/api_v2/login/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login: "54858795000100", senha: "123456", app: 9 }),
        });

        if (!loginRes.ok) {
          console.error("[VehicleDetailsDialog] Falha no login Rastrosystem");
          return;
        }

        const login = await loginRes.json();
        const token = login.token;
        const cliente_id = login.cliente_id;

        // Buscar veículos
        const vRes = await fetch(`https://locaki.rastrosystem.com.br/api_v2/veiculos/${cliente_id}/`, {
          method: "GET",
          headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!vRes.ok) {
          console.error("[VehicleDetailsDialog] Falha ao buscar veículos no Rastrosystem");
          return;
        }

        const vJson = await vRes.json();
        const dispositivos = vJson.dispositivos || vJson || [];

        // Procura o dispositivo pela placa
        const device = dispositivos.find(
          (d: any) => d.placa === vehicle.plate || d.name?.includes(vehicle.plate) || d.modelo?.includes(vehicle.plate),
        );

        if (device) {
          const lat = typeof device.latitude === "number" ? device.latitude : Number(device.latitude);
          const lng = typeof device.longitude === "number" ? device.longitude : Number(device.longitude);

          // Só atualiza se as coordenadas forem válidas
          if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
            console.log("[VehicleDetailsDialog] Localização atualizada:", { lat, lng });

            setMapVehicle((prev: any) => ({
              ...prev,
              latitude: lat,
              longitude: lng,
              status: device.status ? "online" : "offline",
              last_update: device.server_time || device.time || new Date().toISOString(),
              address: device.address || prev?.address,
            }));
          }
        }
      } catch (error) {
        console.error("[VehicleDetailsDialog] Erro ao atualizar localização:", error);
      }
    };

    // Atualiza a cada 15 segundos
    const interval = setInterval(updateLocation, 15000);

    return () => clearInterval(interval);
  }, [open, vehicle?.plate, user?.id]);

  if (!vehicle) return null;

  const handleViewOnMap = () => {
    navigate("/map");
    onOpenChange(false);
    toast({
      title: "Redirecionando para o mapa",
      description: `Mostrando localização de ${vehicle.plate}`,
    });
  };

  const handleCreateContract = () => {
    navigate("/rentals");
    onOpenChange(false);
    toast({
      title: "Criando novo contrato",
      description: `Veículo ${vehicle.plate} selecionado`,
    });
  };

  const handleScheduleMaintenance = () => {
    toast({
      title: "Agendando manutenção",
      description: `Manutenção agendada para ${vehicle.plate}`,
    });
  };

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!vehicle) return;

    try {
      const { error } = await supabase.from("vehicles").delete().eq("id", vehicle.id).eq("user_id", user?.id);

      if (error) throw error;

      toast({
        title: "Veículo excluído",
        description: `${vehicle.brand} ${vehicle.model} - ${vehicle.plate} foi removido da frota.`,
        variant: "destructive",
      });

      setDeleteDialogOpen(false);
      onOpenChange(false);
      onVehicleUpdate?.();
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast({
        title: "Erro ao excluir",
        description: error instanceof Error ? error.message : "Não foi possível excluir o veículo",
        variant: "destructive",
      });
    }
  };

  const handleVehicleUpdated = () => {
    setEditDialogOpen(false);
    onVehicleUpdate?.();
    toast({
      title: "Veículo atualizado",
      description: `${vehicle.brand} ${vehicle.model} - ${vehicle.plate} foi atualizado com sucesso.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-primary/10 flex items-center justify-center">
              <Bike className="h-6 w-6 text-primary" />
            </div>
            {vehicle.brand} {vehicle.model} - {vehicle.plate}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vehicle Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Informações do Veículo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge
                      variant={
                        vehicle.status === "disponivel"
                          ? "default"
                          : vehicle.status === "alugado"
                            ? "secondary"
                            : vehicle.status === "manutencao"
                              ? "destructive"
                              : "outline"
                      }
                      className={
                        vehicle.status === "disponivel"
                          ? "bg-success text-success-foreground"
                          : vehicle.status === "alugado"
                            ? "bg-accent text-accent-foreground"
                            : vehicle.status === "manutencao"
                              ? "bg-warning text-warning-foreground"
                              : ""
                      }
                    >
                      {vehicle.status === "disponivel"
                        ? "Disponível"
                        : vehicle.status === "alugado"
                          ? "Alugada"
                          : vehicle.status === "manutencao"
                            ? "Manutenção"
                            : vehicle.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Categoria</p>
                    <p className="font-medium">{vehicle.category}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ano</p>
                    <p className="font-medium">{vehicle.year}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cor</p>
                    <p className="font-medium">{vehicle.color}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    Odômetro
                  </p>
                  <p className="font-medium">{vehicle.odometer.toLocaleString()} km</p>
                </div>

                {vehicle.tracker && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Rastreador</p>
                    <p className="font-medium">{vehicle.tracker}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location & Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Localização e Ações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mapVehicle ? (
                  <>
                    <div className="p-3 bg-accent/10 rounded-lg">
                      <p className="text-sm font-medium">Última localização</p>
                      {mapVehicle.address && <p className="text-sm text-muted-foreground">{mapVehicle.address}</p>}
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(mapVehicle.last_update).toLocaleString("pt-BR")}
                      </p>
                    </div>

                    <div className="h-[200px] rounded-lg overflow-hidden border">
                      <GoogleMapComponent
                        vehicles={[mapVehicle]}
                        initialCenter={{ lat: mapVehicle.latitude, lng: mapVehicle.longitude }}
                        initialZoom={17}
                        forceCenterOnLoad
                      />
                    </div>
                  </>
                ) : (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Localização não disponível</p>
                  </div>
                )}

                <div className="space-y-3">
                  {vehicle.status === "disponivel" && (
                    <Button variant="outline" className="w-full" onClick={handleCreateContract}>
                      <FileText className="h-4 w-4 mr-2" />
                      Criar Contrato
                    </Button>
                  )}

                  <Button variant="outline" className="w-full" onClick={handleScheduleMaintenance}>
                    <Settings className="h-4 w-4 mr-2" />
                    Agendar Manutenção
                  </Button>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={handleEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>

                    <Button variant="destructive" className="flex-1" onClick={handleDelete}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>

      <VehicleDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        vehicle={vehicle}
        onVehicleUpdated={handleVehicleUpdated}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o veículo{" "}
              <strong>
                {vehicle.brand} {vehicle.model} - {vehicle.plate}
              </strong>
              ? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default VehicleDetailsDialog;
