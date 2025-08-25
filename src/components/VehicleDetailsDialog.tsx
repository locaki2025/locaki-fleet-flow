import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, MapPin, Gauge, Calendar, FileText, Settings, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import VehicleDialog from "./VehicleDialog";

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!vehicle) return null;

  const handleViewOnMap = () => {
    navigate('/map');
    onOpenChange(false);
    toast({
      title: "Redirecionando para o mapa",
      description: `Mostrando localização de ${vehicle.plate}`,
    });
  };

  const handleCreateContract = () => {
    navigate('/rentals');
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

  const confirmDelete = () => {
    toast({
      title: "Veículo excluído",
      description: `${vehicle.brand} ${vehicle.model} - ${vehicle.plate} foi removido da frota.`,
      variant: "destructive",
    });
    setDeleteDialogOpen(false);
    onOpenChange(false);
    onVehicleUpdate?.();
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
              <Car className="h-6 w-6 text-primary" />
            </div>
            {vehicle.brand} {vehicle.model} - {vehicle.plate}
          </DialogTitle>
        </DialogHeader>
        
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
                      vehicle.status === 'disponivel' ? 'default' :
                      vehicle.status === 'alugado' ? 'secondary' :
                      vehicle.status === 'manutencao' ? 'destructive' : 'outline'
                    }
                    className={
                      vehicle.status === 'disponivel' ? 'bg-success text-success-foreground' :
                      vehicle.status === 'alugado' ? 'bg-accent text-accent-foreground' :
                      vehicle.status === 'manutencao' ? 'bg-warning text-warning-foreground' : ''
                    }
                  >
                    {vehicle.status === 'disponivel' ? 'Disponível' :
                     vehicle.status === 'alugado' ? 'Alugada' :
                     vehicle.status === 'manutencao' ? 'Manutenção' : vehicle.status}
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
              {vehicle.lastLocation ? (
                <div className="p-3 bg-accent/10 rounded-lg">
                  <p className="text-sm font-medium">Última localização</p>
                  <p className="text-sm text-muted-foreground">{vehicle.lastLocation.address}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(vehicle.lastLocation.updatedAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Localização não disponível</p>
                </div>
              )}
              
              <div className="space-y-3">
                <Button 
                  className="w-full bg-gradient-primary hover:opacity-90"
                  onClick={handleViewOnMap}
                  disabled={!vehicle.lastLocation}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Ver no Mapa
                </Button>
                
                {vehicle.status === 'disponivel' && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleCreateContract}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Criar Contrato
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleScheduleMaintenance}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Agendar Manutenção
                </Button>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleEdit}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
              Tem certeza que deseja excluir o veículo <strong>{vehicle.brand} {vehicle.model} - {vehicle.plate}</strong>? 
              Esta ação não pode ser desfeita.
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