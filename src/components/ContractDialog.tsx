import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CalendarIcon, User, Bike, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ContractDialog = ({ open, onOpenChange }: ContractDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Cliente e Veículo
    customerId: "",
    vehicleId: "",
    
    // Valores
    valorDiaria: "",
    caucao: "",
    
    // Datas
    inicioLocacao: undefined as Date | undefined,
    terminoLocacao: undefined as Date | undefined,
    proximoPagamento: undefined as Date | undefined,
    
    // Entrega
    kmEntrega: "",
    localRetirada: "",
    localEntrega: "",
    
    // Detalhes
    nivelCombustivel: "",
    plano: "",
    perimetroCirculacao: "",
    franquiaKmDia: "",
    
    // Configurações
    frequenciaPagamentos: "",
    seguroTerceirosIncluido: "",
    atendente: "",
    
    // Checkboxes
    locacaoComPromessaCompra: false,
    valorCaucaoRecebido: false,
    valorCaucaoParcelado: false,
    bloqueioAutomatico: false,
    
    observations: ""
  });

  useEffect(() => {
    if (open && user) {
      fetchCustomers();
      fetchVehicles();
    }
  }, [open, user]);

  const fetchCustomers = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'ativo');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os clientes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'disponivel');

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os veículos",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para criar contratos.",
        variant: "destructive"
      });
      return;
    }

    try {
      const selectedCustomer = getSelectedCustomer();
      const selectedVehicle = getSelectedVehicle();
      
      if (!selectedCustomer || !selectedVehicle) {
        toast({
          title: "Erro",
          description: "Cliente ou veículo não encontrado.",
          variant: "destructive"
        });
        return;
      }

      // Calculate next billing date (7 days from start date by default)
      const nextBilling = new Date(formData.inicioLocacao!);
      nextBilling.setDate(nextBilling.getDate() + 7);

      const contractData = {
        user_id: user.id,
        cliente_id: selectedCustomer.id,
        cliente_nome: selectedCustomer.name,
        cliente_email: selectedCustomer.email,
        cliente_cpf: selectedCustomer.cpf_cnpj,
        moto_id: selectedVehicle.id,
        moto_modelo: `${selectedVehicle.brand} ${selectedVehicle.model}`,
        valor_mensal: parseFloat(formData.valorDiaria) || 0,
        data_inicio: formData.inicioLocacao?.toISOString().split('T')[0],
        data_fim: formData.terminoLocacao?.toISOString().split('T')[0],
        proxima_cobranca: formData.proximoPagamento?.toISOString().split('T')[0] || nextBilling.toISOString().split('T')[0],
        descricao: formData.observations,
        status: 'ativo'
      };

      const { data: insertedContract, error } = await supabase
        .from('contratos')
        .insert([contractData])
        .select()
        .single();

      if (error) {
        console.error('Error creating contract:', error);
        toast({
          title: "Erro ao criar contrato",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Contrato criado com sucesso!",
        description: "O novo contrato foi registrado no sistema.",
      });
      
      // Reset form
      setFormData({
        customerId: "",
        vehicleId: "",
        valorDiaria: "",
        caucao: "",
        inicioLocacao: undefined,
        terminoLocacao: undefined,
        proximoPagamento: undefined,
        kmEntrega: "",
        localRetirada: "",
        localEntrega: "",
        nivelCombustivel: "",
        plano: "",
        perimetroCirculacao: "",
        franquiaKmDia: "",
        frequenciaPagamentos: "",
        seguroTerceirosIncluido: "",
        atendente: "",
        locacaoComPromessaCompra: false,
        valorCaucaoRecebido: false,
        valorCaucaoParcelado: false,
        bloqueioAutomatico: false,
        observations: ""
      });
      setCurrentStep(1);
      onOpenChange(false);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao criar o contrato.",
        variant: "destructive"
      });
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getSelectedCustomer = () => {
    return customers.find(c => c.id === formData.customerId);
  };

  const getSelectedVehicle = () => {
    return vehicles.find(v => v.id === formData.vehicleId);
  };

  const canProceedStep1 = formData.customerId && formData.vehicleId;
  const canProceedStep2 = formData.valorDiaria && formData.inicioLocacao;
  const canSubmit = canProceedStep1 && canProceedStep2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Contrato de Locação</DialogTitle>
          <DialogDescription>
            Wizard para criação de contratos - Passo {currentStep} de 3
          </DialogDescription>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={cn(
                  "h-2 flex-1 rounded",
                  step <= currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Cliente e Veículo */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Selecione Cliente e Veículo</h3>
                <p className="text-muted-foreground">Escolha o cliente e o veículo para este contrato</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cliente */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select value={formData.customerId} onValueChange={(value) => handleInputChange('customerId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                       <SelectContent>
                         {customers.map((customer) => (
                           <SelectItem key={customer.id} value={customer.id}>
                             {customer.name} - {customer.cpf_cnpj}
                           </SelectItem>
                         ))}
                       </SelectContent>
                    </Select>

                    {formData.customerId && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="font-medium">{getSelectedCustomer()?.name}</p>
                        <p className="text-sm text-muted-foreground">{getSelectedCustomer()?.email}</p>
                        <p className="text-sm text-muted-foreground">{getSelectedCustomer()?.phone}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Veículo */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bike className="h-5 w-5" />
                      Veículo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select value={formData.vehicleId} onValueChange={(value) => handleInputChange('vehicleId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um veículo" />
                      </SelectTrigger>
                       <SelectContent>
                         {vehicles.map((vehicle) => (
                           <SelectItem key={vehicle.id} value={vehicle.id}>
                             {vehicle.brand} {vehicle.model} - {vehicle.plate}
                           </SelectItem>
                         ))}
                       </SelectContent>
                    </Select>

                    {formData.vehicleId && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="font-medium">{getSelectedVehicle()?.brand} {getSelectedVehicle()?.model}</p>
                        <p className="text-sm text-muted-foreground">Placa: {getSelectedVehicle()?.plate}</p>
                        <p className="text-sm text-muted-foreground">Ano: {getSelectedVehicle()?.year}</p>
                        <Badge className="bg-success text-success-foreground mt-2">
                          Disponível
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 2: Informações da Locação */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Informações da Locação</h3>
                <p className="text-muted-foreground">Preencha todos os detalhes do contrato</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Coluna Esquerda */}
                <div className="space-y-4">
                  <div>
                    <Label>Valor da Diária (R$)</Label>
                    <Input
                      type="text"
                      value={formData.valorDiaria}
                      onChange={(e) => handleInputChange('valorDiaria', e.target.value)}
                      placeholder="0,00"
                    />
                  </div>

                  <div>
                    <Label>Início da Locação</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.inicioLocacao && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.inicioLocacao ? format(formData.inicioLocacao, "dd/MM/yyyy") : "25/08/2025"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.inicioLocacao}
                          onSelect={(date) => handleInputChange('inicioLocacao', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>KM de Entrega</Label>
                    <Input
                      value={formData.kmEntrega}
                      onChange={(e) => handleInputChange('kmEntrega', e.target.value)}
                      placeholder="Ex: 85.000 KM"
                    />
                  </div>

                  <div>
                    <Label>Local de Retirada</Label>
                    <Input
                      value={formData.localRetirada}
                      onChange={(e) => handleInputChange('localRetirada', e.target.value)}
                      placeholder="Endereço ou ponto de retirada"
                    />
                  </div>

                  <div>
                    <Label>Nível de Combustível</Label>
                    <Select value={formData.nivelCombustivel} onValueChange={(value) => handleInputChange('nivelCombustivel', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Cheio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cheio">Cheio</SelectItem>
                        <SelectItem value="meio">Meio Tanque</SelectItem>
                        <SelectItem value="vazio">Vazio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Plano</Label>
                    <Input
                      value={formData.plano}
                      onChange={(e) => handleInputChange('plano', e.target.value)}
                      placeholder="Ex: Nome do plano"
                    />
                  </div>

                  <div>
                    <Label>Perímetro de Circulação Permitido</Label>
                    <Input
                      value={formData.perimetroCirculacao}
                      onChange={(e) => handleInputChange('perimetroCirculacao', e.target.value)}
                      placeholder="Ex: Região metropolitana de Fortaleza"
                    />
                  </div>
                </div>

                {/* Coluna Direita */}
                <div className="space-y-4">
                  <div>
                    <Label>Caução (R$)</Label>
                    <Input
                      type="text"
                      value={formData.caucao}
                      onChange={(e) => handleInputChange('caucao', e.target.value)}
                      placeholder="0,00"
                    />
                  </div>

                  <div>
                    <Label>Frequência de Pagamentos</Label>
                    <Select value={formData.frequenciaPagamentos} onValueChange={(value) => handleInputChange('frequenciaPagamentos', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Semanal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="quinzenal">Quinzenal</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Término de Locação</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.terminoLocacao && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.terminoLocacao ? format(formData.terminoLocacao, "dd/MM/yyyy") : "25/08/2025"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.terminoLocacao}
                          onSelect={(date) => handleInputChange('terminoLocacao', date)}
                          initialFocus
                          disabled={(date) => formData.inicioLocacao ? date < formData.inicioLocacao : false}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Próximo Pagamento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.proximoPagamento && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.proximoPagamento ? format(formData.proximoPagamento, "dd/MM/yyyy") : "25/08/2025"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.proximoPagamento}
                          onSelect={(date) => handleInputChange('proximoPagamento', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Local de Entrega</Label>
                    <Input
                      value={formData.localEntrega}
                      onChange={(e) => handleInputChange('localEntrega', e.target.value)}
                      placeholder="Endereço ou ponto de entrega"
                    />
                  </div>

                  <div>
                    <Label>Franquia KM/dia</Label>
                    <Input
                      value={formData.franquiaKmDia}
                      onChange={(e) => handleInputChange('franquiaKmDia', e.target.value)}
                      placeholder="Ex: 50 KM"
                    />
                  </div>

                  <div>
                    <Label>Seguro para terceiros incluído?</Label>
                    <Select value={formData.seguroTerceirosIncluido} onValueChange={(value) => handleInputChange('seguroTerceirosIncluido', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sim" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Atendente</Label>
                    <Input
                      value={formData.atendente}
                      onChange={(e) => handleInputChange('atendente', e.target.value)}
                      placeholder="Nome do atendente"
                    />
                  </div>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="locacaoPromessa"
                    checked={formData.locacaoComPromessaCompra}
                    onCheckedChange={(checked) => handleInputChange('locacaoComPromessaCompra', checked)}
                  />
                  <Label htmlFor="locacaoPromessa">Locação com Promessa de Compra</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="caucaoRecebido"
                    checked={formData.valorCaucaoRecebido}
                    onCheckedChange={(checked) => handleInputChange('valorCaucaoRecebido', checked)}
                  />
                  <Label htmlFor="caucaoRecebido">Valor Caução Recebido</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="caucaoParcelado"
                    checked={formData.valorCaucaoParcelado}
                    onCheckedChange={(checked) => handleInputChange('valorCaucaoParcelado', checked)}
                  />
                  <Label htmlFor="caucaoParcelado">Valor Caução Parcelado</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bloqueioAutomatico"
                    checked={formData.bloqueioAutomatico}
                    onCheckedChange={(checked) => handleInputChange('bloqueioAutomatico', checked)}
                  />
                  <Label htmlFor="bloqueioAutomatico">Bloqueio automático</Label>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Resumo e Finalização */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Resumo e Finalização</h3>
                <p className="text-muted-foreground">Revise as informações e finalize o contrato</p>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.observations}
                  onChange={(e) => handleInputChange('observations', e.target.value)}
                  placeholder="Informações adicionais sobre o contrato"
                  rows={4}
                />
              </div>

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumo do Contrato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cliente:</span>
                        <span className="font-medium">{getSelectedCustomer()?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Veículo:</span>
                        <span className="font-medium">{getSelectedVehicle()?.brand} {getSelectedVehicle()?.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor Diária:</span>
                        <span className="font-medium">R$ {formData.valorDiaria || '0,00'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Caução:</span>
                        <span className="font-medium">R$ {formData.caucao || '0,00'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">KM de Entrega:</span>
                        <span className="font-medium">{formData.kmEntrega || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Franquia KM/dia:</span>
                        <span className="font-medium">{formData.franquiaKmDia || '-'}</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Início:</span>
                        <span className="font-medium">
                          {formData.inicioLocacao ? format(formData.inicioLocacao, "dd/MM/yyyy") : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Término:</span>
                        <span className="font-medium">
                          {formData.terminoLocacao ? format(formData.terminoLocacao, "dd/MM/yyyy") : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Próximo Pagamento:</span>
                        <span className="font-medium">
                          {formData.proximoPagamento ? format(formData.proximoPagamento, "dd/MM/yyyy") : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Frequência:</span>
                        <span className="font-medium">{formData.frequenciaPagamentos || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Combustível:</span>
                        <span className="font-medium">{formData.nivelCombustivel || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Atendente:</span>
                        <span className="font-medium">{formData.atendente || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Checkboxes resumo */}
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-2">Opções selecionadas:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {formData.locacaoComPromessaCompra && (
                        <span className="text-green-600">✓ Locação com Promessa de Compra</span>
                      )}
                      {formData.valorCaucaoRecebido && (
                        <span className="text-green-600">✓ Valor Caução Recebido</span>
                      )}
                      {formData.valorCaucaoParcelado && (
                        <span className="text-green-600">✓ Valor Caução Parcelado</span>
                      )}
                      {formData.bloqueioAutomatico && (
                        <span className="text-green-600">✓ Bloqueio Automático</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <div>
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={handlePrevious}>
                  Anterior
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              
              {currentStep < 3 ? (
                <Button 
                  type="button" 
                  className="bg-gradient-primary hover:opacity-90"
                  onClick={handleNext}
                  disabled={
                    (currentStep === 1 && !canProceedStep1) ||
                    (currentStep === 2 && !canProceedStep2)
                  }
                >
                  Próximo
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  className="bg-gradient-primary hover:opacity-90"
                  disabled={!canSubmit}
                >
                  Criar Contrato
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContractDialog;