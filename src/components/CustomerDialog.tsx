import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Customer {
  id: string;
  name: string;
  type: string;
  cpf_cnpj: string;
  email: string;
  phone: string;
  street: string;
  number: string;
  city: string;
  state: string;
  zip_code: string;
  observations?: string;
  cnh_expiry_date?: string;
  cnh_category?: string;
  cnh_attachment_url?: string;
}

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onCustomerUpdated?: () => void;
}

const CustomerDialog: React.FC<CustomerDialogProps> = ({ open, onOpenChange, customer, onCustomerUpdated }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditing = !!customer;
  const [customerData, setCustomerData] = useState({
    name: "",
    type: "",
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
    observations: "",
    cnhExpiryDate: "",
    cnhCategory: "",
    cnhAttachmentUrl: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (customer) {
      setCustomerData({
        name: customer.name || "",
        type: customer.type || "",
        cpfCnpj: customer.cpf_cnpj || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: {
          street: customer.street || "",
          number: customer.number || "",
          city: customer.city || "",
          state: customer.state || "",
          zipCode: customer.zip_code || ""
        },
        observations: customer.observations || "",
        cnhExpiryDate: customer.cnh_expiry_date || "",
        cnhCategory: customer.cnh_category || "",
        cnhAttachmentUrl: customer.cnh_attachment_url || ""
      });
    } else {
      setCustomerData({
        name: "",
        type: "",
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
        observations: "",
        cnhExpiryDate: "",
        cnhCategory: "",
        cnhAttachmentUrl: ""
      });
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para cadastrar clientes",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let cnhUrl = customerData.cnhAttachmentUrl;

      // Upload file if selected
      if (selectedFile) {
        setUploading(true);
        
        // For new customers, we'll need to create first to get the ID
        let customerId = customer?.id;
        
        if (!customerId) {
          // Insert customer first to get ID
          const { data: newCustomer, error: insertError } = await supabase
            .from('customers')
            .insert([
              {
                user_id: user.id,
                name: customerData.name,
                type: customerData.type,
                cpf_cnpj: customerData.cpfCnpj,
                email: customerData.email,
                phone: customerData.phone,
                street: customerData.address.street,
                number: customerData.address.number,
                city: customerData.address.city,
                state: customerData.address.state,
                zip_code: customerData.address.zipCode,
                observations: customerData.observations,
                cnh_expiry_date: customerData.cnhExpiryDate || null,
                cnh_category: customerData.cnhCategory || null,
                cnh_attachment_url: null
              }
            ])
            .select()
            .single();

          if (insertError) throw insertError;
          customerId = newCustomer.id;
        }

        // Get file extension
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${user.id}/${customerId}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('cnh-clientes')
          .upload(filePath, selectedFile, { upsert: true });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('cnh-clientes')
          .getPublicUrl(filePath);

        cnhUrl = urlData.publicUrl;
        setUploading(false);

        // Update with file URL
        const { error: updateError } = await supabase
          .from('customers')
          .update({ cnh_attachment_url: cnhUrl })
          .eq('id', customerId);

        if (updateError) throw updateError;

        toast({
          title: "Cliente cadastrado",
          description: "Cliente e arquivo CNH salvos com sucesso!",
        });
        
        onCustomerUpdated?.();
        onOpenChange(false);
        return;
      }

      // Normal flow without file upload
      if (isEditing) {
        const { error } = await supabase
          .from('customers')
          .update({
            name: customerData.name,
            type: customerData.type,
            cpf_cnpj: customerData.cpfCnpj,
            email: customerData.email,
            phone: customerData.phone,
            street: customerData.address.street,
            number: customerData.address.number,
            city: customerData.address.city,
            state: customerData.address.state,
            zip_code: customerData.address.zipCode,
            observations: customerData.observations,
            cnh_expiry_date: customerData.cnhExpiryDate || null,
            cnh_category: customerData.cnhCategory || null,
            cnh_attachment_url: cnhUrl || null
          })
          .eq('id', customer?.id);

        if (error) {
          console.error('Supabase error updating customer:', error);
          throw new Error(`Erro ao atualizar cliente: ${error.message}`);
        }

        toast({
          title: "Cliente atualizado",
          description: "Cliente atualizado com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([
            {
              user_id: user.id,
              name: customerData.name,
              type: customerData.type,
              cpf_cnpj: customerData.cpfCnpj,
              email: customerData.email,
              phone: customerData.phone,
              street: customerData.address.street,
              number: customerData.address.number,
              city: customerData.address.city,
              state: customerData.address.state,
              zip_code: customerData.address.zipCode,
              observations: customerData.observations,
              cnh_expiry_date: customerData.cnhExpiryDate || null,
              cnh_category: customerData.cnhCategory || null,
              cnh_attachment_url: cnhUrl || null
            }
          ]);

        if (error) {
          console.error('Supabase error creating customer:', error);
          throw new Error(`Erro ao cadastrar cliente: ${error.message}`);
        }

        toast({
          title: "Cliente cadastrado",
          description: "Cliente cadastrado com sucesso!",
        });
      }
      
      onCustomerUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving customer:', error);
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Não foi possível salvar o cliente",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(txt|pdf|doc|docx)$/i)) {
        toast({
          title: "Tipo de arquivo inválido",
          description: "Por favor, selecione um arquivo TXT, PDF, DOC ou DOCX",
          variant: "destructive"
        });
        return;
      }
      
      setSelectedFile(file);
      handleInputChange('cnhAttachmentUrl', file.name);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setCustomerData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setCustomerData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const resetForm = () => {
    setCustomerData({
      name: "",
      type: "",
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
      observations: "",
      cnhExpiryDate: "",
      cnhCategory: "",
      cnhAttachmentUrl: ""
    });
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDialogChange = (open: boolean) => {
    if (!open && !isEditing) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações do cliente' : 'Cadastre um novo cliente no sistema'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={customerData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nome completo"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Pessoa *</Label>
              <Select value={customerData.type} onValueChange={(value) => handleInputChange('type', value)}>
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
              <Label htmlFor="cpfCnpj">{customerData.type === 'PF' ? 'CPF' : 'CNPJ'} *</Label>
              <Input
                id="cpfCnpj"
                value={customerData.cpfCnpj}
                onChange={(e) => handleInputChange('cpfCnpj', e.target.value)}
                placeholder={customerData.type === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={customerData.phone}
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
              value={customerData.email}
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
                  value={customerData.address.street}
                  onChange={(e) => handleInputChange('address.street', e.target.value)}
                  placeholder="Nome da rua"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  value={customerData.address.number}
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
                  value={customerData.address.zipCode}
                  onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                  placeholder="00000-000"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={customerData.address.city}
                  onChange={(e) => handleInputChange('address.city', e.target.value)}
                  placeholder="São Paulo"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={customerData.address.state}
                  onChange={(e) => handleInputChange('address.state', e.target.value)}
                  placeholder="SP"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Documentação CNH</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cnhExpiryDate">Data Vencimento CNH</Label>
                <Input
                  id="cnhExpiryDate"
                  type="date"
                  value={customerData.cnhExpiryDate}
                  onChange={(e) => handleInputChange('cnhExpiryDate', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cnhCategory">Categoria CNH</Label>
                <Select value={customerData.cnhCategory} onValueChange={(value) => handleInputChange('cnhCategory', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A - Motocicleta</SelectItem>
                    <SelectItem value="B">B - Automóvel</SelectItem>
                    <SelectItem value="C">C - Veículo de carga</SelectItem>
                    <SelectItem value="D">D - Ônibus</SelectItem>
                    <SelectItem value="E">E - Caminhão com reboque</SelectItem>
                    <SelectItem value="AB">AB - A + B</SelectItem>
                    <SelectItem value="AC">AC - A + C</SelectItem>
                    <SelectItem value="AD">AD - A + D</SelectItem>
                    <SelectItem value="AE">AE - A + E</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cnhAttachment">Anexar CNH</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex gap-2">
                <Input
                  id="cnhAttachment"
                  value={customerData.cnhAttachmentUrl}
                  onChange={(e) => handleInputChange('cnhAttachmentUrl', e.target.value)}
                  placeholder="URL ou caminho do arquivo CNH"
                  readOnly={!!selectedFile}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Selecionar Arquivo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anexe uma cópia da CNH do cliente (TXT, PDF, DOC, DOCX)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              value={customerData.observations}
              onChange={(e) => handleInputChange('observations', e.target.value)}
              placeholder="Informações adicionais sobre o cliente"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-primary hover:opacity-90"
              disabled={isSubmitting || uploading}
            >
              {uploading ? "Enviando arquivo..." : isSubmitting ? (isEditing ? "Atualizando..." : "Cadastrando...") : (isEditing ? "Atualizar Cliente" : "Cadastrar Cliente")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDialog;