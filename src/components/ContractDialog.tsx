import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { mockCustomers, mockVehicles } from "@/data/mockData";
import { CalendarIcon, User, Car, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ContractDialog = ({ open, onOpenChange }: ContractDialogProps) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    customerId: "",
    vehicleId: "",
    type: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    dailyRate: "",
    totalValue: "",
    observations: ""
  });

  const availableVehicles = mockVehicles.filter(v => v.status === 'disponivel');
  const activeCustomers = mockCustomers.filter(c => c.status === 'ativo');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    toast({
      title: "Contrato criado com sucesso!",
      description: "O novo contrato foi registrado no sistema.",
    });
    
    // Reset form
    setFormData({
      customerId: "",
      vehicleId: "",
      type: "",
      startDate: undefined,
      endDate: undefined,
      dailyRate: "",
      totalValue: "",
      observations: ""
    });
    setCurrentStep(1);
    onOpenChange(false);
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
    return mockCustomers.find(c => c.id === formData.customerId);
  };

  const getSelectedVehicle = () => {
    return mockVehicles.find(v => v.id === formData.vehicleId);
  };

  const canProceedStep1 = formData.customerId && formData.vehicleId;
  const canProceedStep2 = formData.type && formData.startDate && formData.endDate;
  const canSubmit = canProceedStep1 && canProceedStep2 && formData.dailyRate;

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
                        {activeCustomers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} - {customer.cpfCnpj}
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
                      <Car className="h-5 w-5" />
                      Veículo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select value={formData.vehicleId} onValueChange={(value) => handleInputChange('vehicleId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um veículo" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVehicles.map((vehicle) => (
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

          {/* Step 2: Período e Tipo */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Período de Locação</h3>
                <p className="text-muted-foreground">Defina o tipo e período do contrato</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Tipo de Contrato</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diaria">Diária</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="longo_prazo">Longo Prazo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data de Início</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.startDate ? format(formData.startDate, "PPP", { locale: ptBR }) : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.startDate}
                          onSelect={(date) => handleInputChange('startDate', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Data de Término</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.endDate ? format(formData.endDate, "PPP", { locale: ptBR }) : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.endDate}
                          onSelect={(date) => handleInputChange('endDate', date)}
                          initialFocus
                          disabled={(date) => formData.startDate ? date < formData.startDate : false}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Valores e Finalização */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Valores e Finalização</h3>
                <p className="text-muted-foreground">Configure os valores do contrato</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor Diário (R$)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.dailyRate}
                      onChange={(e) => handleInputChange('dailyRate', e.target.value)}
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label>Valor Total (R$)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.totalValue}
                      onChange={(e) => handleInputChange('totalValue', e.target.value)}
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                </div>
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
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Cliente:</span>
                    <span className="font-medium">{getSelectedCustomer()?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Veículo:</span>
                    <span className="font-medium">{getSelectedVehicle()?.brand} {getSelectedVehicle()?.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tipo:</span>
                    <span className="font-medium">{formData.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Período:</span>
                    <span className="font-medium">
                      {formData.startDate && formData.endDate && 
                        `${format(formData.startDate, "dd/MM/yyyy")} - ${format(formData.endDate, "dd/MM/yyyy")}`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Valor Total:</span>
                    <span className="font-semibold text-primary">
                      R$ {formData.totalValue ? Number(formData.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                    </span>
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