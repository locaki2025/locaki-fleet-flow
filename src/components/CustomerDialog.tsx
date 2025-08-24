import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CustomerDialog = ({ open, onOpenChange }: CustomerDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    type: "PF",
    cpfCnpj: "",
    email: "",
    phone: "",
    address: {
      street: "",
      number: "",
      city: "",
      state: "",
      zipCode: ""
    },
    observations: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate saving customer
    toast({
      title: "Cliente cadastrado com sucesso!",
      description: `${formData.name} foi adicionado ao sistema.`,
    });
    
    // Reset form and close dialog
    setFormData({
      name: "",
      type: "PF",
      cpfCnpj: "",
      email: "",
      phone: "",
      address: {
        street: "",
        number: "",
        city: "",
        state: "",
        zipCode: ""
      },
      observations: ""
    });
    onOpenChange(false);
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
          <DialogDescription>
            Cadastre um novo cliente no sistema
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nome completo"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Pessoa *</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PF">Pessoa Física</SelectItem>
                  <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpfCnpj">{formData.type === 'PF' ? 'CPF' : 'CNPJ'} *</Label>
              <Input
                id="cpfCnpj"
                value={formData.cpfCnpj}
                onChange={(e) => handleInputChange('cpfCnpj', e.target.value)}
                placeholder={formData.type === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="(11) 99999-9999"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="cliente@email.com"
              required
            />
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Endereço</h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="street">Rua</Label>
                <Input
                  id="street"
                  value={formData.address.street}
                  onChange={(e) => handleInputChange('address.street', e.target.value)}
                  placeholder="Nome da rua"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  value={formData.address.number}
                  onChange={(e) => handleInputChange('address.number', e.target.value)}
                  placeholder="123"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  value={formData.address.zipCode}
                  onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                  placeholder="00000-000"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.address.city}
                  onChange={(e) => handleInputChange('address.city', e.target.value)}
                  placeholder="São Paulo"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.address.state}
                  onChange={(e) => handleInputChange('address.state', e.target.value)}
                  placeholder="SP"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => handleInputChange('observations', e.target.value)}
              placeholder="Informações adicionais sobre o cliente"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90">
              Cadastrar Cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDialog;