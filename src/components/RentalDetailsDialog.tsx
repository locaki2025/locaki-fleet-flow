import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, User, Car, Calendar, DollarSign, MapPin, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface Contract {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_cpf: string;
  cliente_email: string;
  moto_id: string;
  moto_modelo: string;
  moto_placa?: string;
  status: string;
  data_inicio: string;
  data_fim: string | null;
  valor_mensal: number;
  descricao?: string;
  user_id?: string;
}

interface RentalDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rental: Contract | null;
}

const RentalDetailsDialog = ({ open, onOpenChange, rental }: RentalDetailsDialogProps) => {
  const { toast } = useToast();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  if (!rental) return null;

  const handlePrintContract = async () => {
    try {
      console.log('Printing contract:', { rental_id: rental.id, user_id: rental.user_id });
      
      const { data, error } = await supabase.functions.invoke('generate-contract-pdf', {
        body: { contract_id: rental.id, user_id: rental.user_id }
      });

      console.log('Print contract response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from edge function');
      }

      if (!data.pdf) {
        console.error('Response data:', data);
        throw new Error('pdf not found in response');
      }

      console.log('pdf length:', data.pdf.length);

      // Decode base64 and create PDF blob
      const byteCharacters = atob(data.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      console.log('Blob created, size:', blob.size);
      
      const url = window.URL.createObjectURL(blob);
      
      const element = document.createElement('a');
      element.href = url;
      element.download = `contrato-${rental.id}.pdf`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Contrato gerado",
        description: `PDF do contrato foi baixado com sucesso`,
      });
    } catch (error) {
      console.error('Error generating contract PDF:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível gerar o PDF do contrato",
        variant: "destructive",
      });
    }
  };

  const handleEditContract = () => {
    toast({
      title: "Editando contrato",
      description: "Funcionalidade de edição será implementada em breve",
    });
  };

  const handleFinalizeContract = async () => {
    try {
      // Update contract status to 'finalizado' and set data_fim to today
      const { error } = await supabase
        .from('contratos')
        .update({ 
          status: 'finalizado',
          data_fim: new Date().toISOString().split('T')[0]
        })
        .eq('id', rental.id);

      if (error) throw error;

      toast({
        title: "Contrato finalizado",
        description: `Contrato #${rental.id} foi finalizado com sucesso`,
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível finalizar o contrato",
        variant: "destructive"
      });
    }
  };

  const handleDeleteContract = async () => {
    try {
      const { error } = await supabase
        .from('contratos')
        .delete()
        .eq('id', rental.id);

      if (error) throw error;

      toast({
        title: "Contrato excluído",
        description: `Contrato #${rental.id} foi excluído com sucesso`,
      });
      
      setShowDeleteAlert(false);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o contrato",
        variant: "destructive"
      });
    }
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
                    Mensal
                  </Badge>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Período
                </p>
                <p className="font-medium">
                  {new Date(rental.data_inicio).toLocaleDateString('pt-BR')} - {rental.data_fim ? new Date(rental.data_fim).toLocaleDateString('pt-BR') : 'Indefinido'}
                </p>
              </div>
              
              {rental.status === 'finalizado' && rental.data_fim && (
                <div>
                  <p className="text-sm font-medium text-red-600 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data de Encerramento
                  </p>
                  <p className="font-medium text-red-600">
                    {new Date(rental.data_fim).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Valor Total
                </p>
                <p className="font-bold text-primary text-lg">
                  R$ {Number(rental.valor_mensal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <p className="font-medium">{rental.cliente_nome}</p>
                <p className="text-sm text-muted-foreground">{rental.cliente_cpf}</p>
                <p className="text-sm text-muted-foreground">{rental.cliente_email}</p>
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
                <p className="font-medium">{rental.moto_modelo}</p>
                {rental.moto_placa && (
                  <p className="text-sm text-muted-foreground">Placa: {rental.moto_placa}</p>
                )}
                <p className="text-sm text-muted-foreground">ID: {rental.moto_id}</p>
                {rental.descricao && (
                  <p className="text-sm text-muted-foreground">Obs: {rental.descricao}</p>
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
          
          <Button variant="outline" onClick={() => {
            toast({
              title: "Faturamento",
              description: "Visualizando faturas do contrato",
            });
          }}>
            <FileText className="h-4 w-4 mr-2" />
            Ver Faturas
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
          
          <Button variant="outline" onClick={() => {
            toast({
              title: "Histórico",
              description: "Funcionalidade de histórico será implementada em breve",
            });
          }}>
            Histórico
          </Button>
          
          <Button variant="destructive" onClick={() => setShowDeleteAlert(true)}>
            Excluir Contrato
          </Button>
        </div>
      </DialogContent>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O contrato #{rental.id} será permanentemente excluído do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContract} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default RentalDetailsDialog;