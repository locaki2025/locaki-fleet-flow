import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, DollarSign, FileText, MapPin, User, AlertTriangle, Clock, Receipt } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";

interface TrafficFine {
  id: string;
  placa: string;
  infracao: string;
  motivo: string;
  data_infracao: string;
  valor_multa: number;
  valor_com_desconto?: number;
  situacao: string;
  gravidade?: string;
  pontuacao: number;
  orgao_autuador?: string;
  tipo_infracao?: string;
  condutor?: string;
  endereco?: string;
  auto_infracao?: string;
  data_limite_recurso?: string;
  prazo_indicacao_condutor?: string;
  recebimento_infracao?: string;
  habilitado_faturar: boolean;
  faturado: boolean;
  em_recurso: boolean;
  em_posse_cliente: boolean;
  justificativa?: string;
  observacoes?: string;
  origem?: string;
  created_at: string;
}

interface TrafficFineDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fine: TrafficFine;
  onUpdate: () => void;
}

export const TrafficFineDetailsDialog = ({
  open,
  onOpenChange,
  fine,
  onUpdate
}: TrafficFineDetailsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [localFine, setLocalFine] = useState(fine);
  const { toast } = useToast();

  const getSituationBadgeVariant = (situacao: string) => {
    switch (situacao.toLowerCase()) {
      case 'aberta':
        return 'destructive';
      case 'paga':
        return 'default';
      case 'em recurso':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getGravityBadgeVariant = (gravidade?: string) => {
    switch (gravidade?.toLowerCase()) {
      case 'leve':
        return 'secondary';
      case 'média':
        return 'default';
      case 'grave':
        return 'destructive';
      case 'gravíssima':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const updateFineStatus = async (field: string, value: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('multas_transito')
        .update({ [field]: value })
        .eq('id', fine.id);

      if (error) throw error;

      setLocalFine(prev => ({ ...prev, [field]: value }));
      
      toast({
        title: "Status atualizado",
        description: "O status da multa foi atualizado com sucesso.",
      });

      onUpdate();
    } catch (error) {
      console.error('Error updating fine status:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o status da multa.",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsReceived = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('multas_transito')
        .update({ 
          recebimento_infracao: new Date().toISOString().split('T')[0],
          em_posse_cliente: true 
        })
        .eq('id', fine.id);

      if (error) throw error;

      toast({
        title: "Multa recebida",
        description: "A multa foi marcada como recebida automaticamente.",
      });

      onUpdate();
    } catch (error) {
      console.error('Error marking fine as received:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível marcar a multa como recebida.",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSituation = async (newSituation: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('multas_transito')
        .update({ situacao: newSituation })
        .eq('id', fine.id);

      if (error) throw error;

      setLocalFine(prev => ({ ...prev, situacao: newSituation }));
      
      toast({
        title: "Situação atualizada",
        description: `A multa foi marcada como ${newSituation}.`,
      });

      onUpdate();
    } catch (error) {
      console.error('Error updating fine situation:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar a situação da multa.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl">Detalhes da Multa</DialogTitle>
              <p className="text-muted-foreground mt-1">
                Auto de Infração: {fine.auto_infracao || 'Não informado'}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant={getSituationBadgeVariant(localFine.situacao)}>
                {localFine.situacao}
              </Badge>
              {fine.gravidade && (
                <Badge variant={getGravityBadgeVariant(fine.gravidade)}>
                  {fine.gravidade}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informações da Infração
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Placa do Veículo</Label>
                  <p className="text-lg font-semibold">{fine.placa}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tipo de Infração</Label>
                  <p className="text-lg">{fine.tipo_infracao || 'Não informado'}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Infração</Label>
                <p className="text-lg">{fine.infracao}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Motivo</Label>
                <p className="text-base">{fine.motivo}</p>
              </div>

              {fine.endereco && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Local da Infração</Label>
                    <p className="text-base">{fine.endereco}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Datas Importantes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Datas Importantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data da Infração</Label>
                  <p className="text-base font-medium">
                    {format(new Date(fine.data_infracao), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                
                {fine.data_limite_recurso && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Limite para Recurso</Label>
                    <p className="text-base font-medium">
                      {format(new Date(fine.data_limite_recurso), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                )}

                {fine.prazo_indicacao_condutor && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Prazo Indicação Condutor</Label>
                    <p className="text-base font-medium">
                      {format(new Date(fine.prazo_indicacao_condutor), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                )}

                {fine.recebimento_infracao && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Recebimento</Label>
                    <p className="text-base font-medium">
                      {format(new Date(fine.recebimento_infracao), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Valores e Pontuação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Valores e Pontuação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Valor da Multa</Label>
                  <p className="text-xl font-bold text-destructive">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(Number(fine.valor_multa))}
                  </p>
                </div>
                
                {fine.valor_com_desconto && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Valor com Desconto</Label>
                    <p className="text-xl font-bold text-green-600">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(Number(fine.valor_com_desconto))}
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Pontuação</Label>
                  <p className="text-xl font-bold">
                    {fine.pontuacao} pontos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações Complementares */}
          {(fine.orgao_autuador || fine.condutor || fine.origem) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações Complementares
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {fine.orgao_autuador && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Órgão Autuador</Label>
                      <p className="text-base">{fine.orgao_autuador}</p>
                    </div>
                  )}
                  
                  {fine.condutor && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Condutor</Label>
                      <p className="text-base">{fine.condutor}</p>
                    </div>
                  )}

                  {fine.origem && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Origem</Label>
                      <p className="text-base">{fine.origem}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status de Controle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Controle e Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="habilitado_faturar">Habilitado para Faturar</Label>
                  <Switch
                    id="habilitado_faturar"
                    checked={localFine.habilitado_faturar}
                    onCheckedChange={(checked) => updateFineStatus('habilitado_faturar', checked)}
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="faturado">Faturado</Label>
                  <Switch
                    id="faturado"
                    checked={localFine.faturado}
                    onCheckedChange={(checked) => updateFineStatus('faturado', checked)}
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="em_recurso">Em Recurso</Label>
                  <Switch
                    id="em_recurso"
                    checked={localFine.em_recurso}
                    onCheckedChange={(checked) => updateFineStatus('em_recurso', checked)}
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="em_posse_cliente">Em Posse do Cliente</Label>
                  <Switch
                    id="em_posse_cliente"
                    checked={localFine.em_posse_cliente}
                    onCheckedChange={(checked) => updateFineStatus('em_posse_cliente', checked)}
                    disabled={loading}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex gap-2 flex-wrap">
                {!fine.recebimento_infracao && (
                  <Button 
                    onClick={markAsReceived}
                    disabled={loading}
                    variant="outline"
                  >
                    <Receipt className="mr-2 h-4 w-4" />
                    Marcar como Recebida
                  </Button>
                )}

                {localFine.situacao === 'aberta' && (
                  <>
                    <Button 
                      onClick={() => updateSituation('paga')}
                      disabled={loading}
                      variant="default"
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      Marcar como Paga
                    </Button>
                    
                    <Button 
                      onClick={() => updateSituation('em_recurso')}
                      disabled={loading}
                      variant="secondary"
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Colocar em Recurso
                    </Button>
                  </>
                )}

                {localFine.situacao === 'em_recurso' && (
                  <Button 
                    onClick={() => updateSituation('aberta')}
                    disabled={loading}
                    variant="outline"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Voltar para Aberta
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          {(fine.justificativa || fine.observacoes) && (
            <Card>
              <CardHeader>
                <CardTitle>Observações e Justificativas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fine.justificativa && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Justificativa</Label>
                    <p className="text-base mt-1 p-3 bg-muted rounded-md">{fine.justificativa}</p>
                  </div>
                )}
                
                {fine.observacoes && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Observações</Label>
                    <p className="text-base mt-1 p-3 bg-muted rounded-md">{fine.observacoes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};