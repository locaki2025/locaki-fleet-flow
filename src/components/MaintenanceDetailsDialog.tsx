import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Wrench, 
  Car, 
  Calendar, 
  DollarSign, 
  User, 
  MapPin, 
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Printer
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mockVehicles } from "@/data/mockData";

interface MaintenanceOrder {
  id: string;
  vehicleId: string;
  type: string;
  priority: string;
  description: string;
  cost: number;
  status: string;
  scheduledDate: string;
  completedDate?: string;
  mechanic?: string;
  location?: string;
  notes?: string;
  createdAt: string;
}

interface MaintenanceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: MaintenanceOrder | null;
}

const MaintenanceDetailsDialog = ({ open, onOpenChange, order }: MaintenanceDetailsDialogProps) => {
  const { toast } = useToast();

  if (!order) return null;

  const vehicle = mockVehicles.find(v => v.id === order.vehicleId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberta':
        return 'bg-blue-500 text-blue-50';
      case 'em_andamento':
        return 'bg-yellow-500 text-yellow-50';
      case 'finalizada':
        return 'bg-green-500 text-green-50';
      case 'cancelada':
        return 'bg-red-500 text-red-50';
      default:
        return 'bg-gray-500 text-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aberta':
        return 'Aberta';
      case 'em_andamento':
        return 'Em Andamento';
      case 'finalizada':
        return 'Finalizada';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta':
        return 'bg-red-500 text-red-50';
      case 'media':
        return 'bg-yellow-500 text-yellow-50';
      case 'baixa':
        return 'bg-green-500 text-green-50';
      default:
        return 'bg-gray-500 text-gray-50';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'alta':
        return 'Alta';
      case 'media':
        return 'Média';
      case 'baixa':
        return 'Baixa';
      default:
        return priority;
    }
  };

  const handlePrintOrder = async () => {
    try {
      // Simular geração de PDF da ordem de manutenção
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Ordem impressa",
        description: `PDF da ordem #${order.id} foi gerado com sucesso`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível gerar o PDF da ordem",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = () => {
    const newStatus = order.status === 'aberta' ? 'em_andamento' : 
                     order.status === 'em_andamento' ? 'finalizada' : 'aberta';
    
    toast({
      title: "Status atualizado",
      description: `Status da ordem #${order.id} atualizado para ${getStatusText(newStatus)}`,
    });
  };

  const handleViewHistory = () => {
    toast({
      title: "Visualizando histórico",
      description: "Histórico da ordem será exibido",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-primary/10 flex items-center justify-center">
              <Wrench className="h-6 w-6 text-primary" />
            </div>
            Ordem de Serviço #{order.id}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informações da Ordem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(order.status)}>
                    {getStatusText(order.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Prioridade</p>
                  <Badge className={getPriorityColor(order.priority)}>
                    {getPriorityText(order.priority)}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                  <Badge variant="outline" className="capitalize">
                    {order.type}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Custo
                  </p>
                  <p className="font-bold text-primary text-lg">
                    R$ {order.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data Agendada
                </p>
                <p className="font-medium">
                  {new Date(order.scheduledDate).toLocaleDateString('pt-BR')}
                </p>
              </div>

              {order.completedDate && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Data de Conclusão
                  </p>
                  <p className="font-medium text-success">
                    {new Date(order.completedDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Descrição</p>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">
                  {order.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle & Service Info */}
          <div className="space-y-4">
            {/* Vehicle */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Car className="h-4 w-4" />
                  Veículo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {vehicle ? (
                  <>
                    <p className="font-medium">{vehicle.brand} {vehicle.model}</p>
                    <p className="text-sm text-muted-foreground">Placa: {vehicle.plate}</p>
                    <p className="text-sm text-muted-foreground">Ano: {vehicle.year}</p>
                    <p className="text-sm text-muted-foreground">Cor: {vehicle.color}</p>
                    <p className="text-sm text-muted-foreground">
                      Odômetro: {vehicle.odometer.toLocaleString()} km
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Veículo não encontrado</p>
                )}
              </CardContent>
            </Card>

            {/* Service Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Detalhes do Serviço
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {order.mechanic && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Mecânico</p>
                    <p className="font-medium">{order.mechanic}</p>
                  </div>
                )}
                
                {order.location && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Local
                    </p>
                    <p className="font-medium">{order.location}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Criado em
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>

                {order.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Observações</p>
                    <p className="text-sm bg-muted/50 p-2 rounded">
                      {order.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-4 border-t">
          <Button className="bg-gradient-primary hover:opacity-90" onClick={handlePrintOrder}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Ordem
          </Button>
          
          {order.status !== 'finalizada' && order.status !== 'cancelada' && (
            <Button variant="outline" onClick={handleUpdateStatus}>
              <Wrench className="h-4 w-4 mr-2" />
              Atualizar Status
            </Button>
          )}
          
          <Button variant="outline" onClick={handleViewHistory}>
            <FileText className="h-4 w-4 mr-2" />
            Histórico
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceDetailsDialog;