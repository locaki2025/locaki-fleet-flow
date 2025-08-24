import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, User, Car, Calendar, DollarSign, MapPin, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mockCustomers, mockVehicles } from "@/data/mockData";

interface Rental {
  id: string;
  customerId: string;
  vehicleId: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  totalValue: number;
}

interface RentalDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rental: Rental | null;
}

const RentalDetailsDialog = ({ open, onOpenChange, rental }: RentalDetailsDialogProps) => {
  const { toast } = useToast();

  if (!rental) return null;

  const customer = mockCustomers.find(c => c.id === rental.customerId);
  const vehicle = mockVehicles.find(v => v.id === rental.vehicleId);

  const handlePrintContract = () => {
    toast({
      title: "Imprimindo contrato",
      description: `PDF do contrato #${rental.id} será gerado`,
    });
  };

  const handleEditContract = () => {
    toast({
      title: "Editando contrato",
      description: "Funcionalidade de edição será implementada em breve",
    });
  };

  const handleFinalizeContract = () => {
    toast({
      title: "Finalizando contrato",
      description: `Contrato #${rental.id} será finalizado`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-primary/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            Contrato #{rental.id}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contract Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informações do Contrato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge 
                    variant={
                      rental.status === 'ativo' ? 'default' :
                      rental.status === 'finalizado' ? 'secondary' :
                      rental.status === 'atrasado' ? 'destructive' : 'outline'
                    }
                    className={
                      rental.status === 'ativo' ? 'bg-accent text-accent-foreground' :
                      rental.status === 'finalizado' ? 'bg-success text-success-foreground' :
                      rental.status === 'atrasado' ? 'bg-warning text-warning-foreground' : ''
                    }
                  >
                    {rental.status === 'ativo' ? 'Ativo' :
                     rental.status === 'finalizado' ? 'Finalizado' :
                     rental.status === 'atrasado' ? 'Atrasado' : rental.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                  <Badge variant="outline">
                    {rental.type === 'diaria' ? 'Diária' :
                     rental.type === 'semanal' ? 'Semanal' :
                     rental.type === 'mensal' ? 'Mensal' : 'Longo Prazo'}
                  </Badge>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Período
                </p>
                <p className="font-medium">
                  {new Date(rental.startDate).toLocaleDateString('pt-BR')} - {new Date(rental.endDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Valor Total
                </p>
                <p className="font-bold text-primary text-lg">
                  R$ {rental.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Customer & Vehicle Info */}
          <div className="space-y-4">
            {/* Customer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{customer?.name}</p>
                <p className="text-sm text-muted-foreground">{customer?.cpfCnpj}</p>
                <p className="text-sm text-muted-foreground">{customer?.email}</p>
                <p className="text-sm text-muted-foreground">{customer?.phone}</p>
              </CardContent>
            </Card>

            {/* Vehicle */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Car className="h-4 w-4" />
                  Veículo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{vehicle?.brand} {vehicle?.model}</p>
                <p className="text-sm text-muted-foreground">Placa: {vehicle?.plate}</p>
                <p className="text-sm text-muted-foreground">Ano: {vehicle?.year}</p>
                <p className="text-sm text-muted-foreground">Cor: {vehicle?.color}</p>
                {vehicle?.lastLocation && (
                  <div className="flex items-center gap-2 mt-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Localização disponível</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-4 border-t">
          <Button className="bg-gradient-primary hover:opacity-90" onClick={handlePrintContract}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Contrato
          </Button>
          
          {rental.status === 'ativo' && (
            <>
              <Button variant="outline" onClick={handleEditContract}>
                Editar Contrato
              </Button>
              <Button variant="outline" onClick={handleFinalizeContract}>
                Finalizar Contrato
              </Button>
            </>
          )}
          
          <Button variant="outline">
            Histórico
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RentalDetailsDialog;