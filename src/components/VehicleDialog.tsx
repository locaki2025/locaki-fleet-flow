import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
}

interface VehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: Vehicle | null;
  onVehicleUpdated?: () => void;
}

const VehicleDialog = ({ open, onOpenChange, vehicle, onVehicleUpdated }: VehicleDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditing = !!vehicle;
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    plate: vehicle?.plate || "",
    brand: vehicle?.brand || "",
    model: vehicle?.model || "",
    year: vehicle?.year?.toString() || "",
    color: vehicle?.color || "",
    category: vehicle?.category || "",
    renavam: "",
    chassis: "",
    odometer: vehicle?.odometer?.toString() || "",
    observations: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para cadastrar veículos.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('vehicles')
          .update({
            plate: formData.plate,
            brand: formData.brand,
            model: formData.model,
            year: parseInt(formData.year),
            color: formData.color,
            category: formData.category,
            renavam: formData.renavam || null,
            chassis: formData.chassis || null,
            odometer: parseInt(formData.odometer) || 0,
            observations: formData.observations || null,
          })
          .eq('id', vehicle?.id);

        if (error) throw error;

        toast({
          title: "Veículo atualizado!",
          description: `${formData.brand} ${formData.model} - ${formData.plate} foi atualizado.`,
        });
      } else {
        const { error } = await supabase
          .from('vehicles')
          .insert({
            user_id: user.id,
            plate: formData.plate,
            brand: formData.brand,
            model: formData.model,
            year: parseInt(formData.year),
            color: formData.color,
            category: formData.category,
            renavam: formData.renavam || null,
            chassis: formData.chassis || null,
            odometer: parseInt(formData.odometer) || 0,
            observations: formData.observations || null,
            status: 'disponivel',
          });

        if (error) throw error;

        toast({
          title: "Veículo cadastrado com sucesso!",
          description: `${formData.brand} ${formData.model} - ${formData.plate} foi adicionado à frota.`,
        });
        
        setFormData({
          plate: "",
          brand: "",
          model: "",
          year: "",
          color: "",
          category: "",
          renavam: "",
          chassis: "",
          odometer: "",
          observations: ""
        });
      }

      onVehicleUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar veículo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o veículo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Veículo' : 'Novo Veículo'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Edite as informações do veículo' : 'Cadastre um novo veículo na frota'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plate">Placa *</Label>
              <Input
                id="plate"
                value={formData.plate}
                onChange={(e) => handleInputChange('plate', e.target.value.toUpperCase())}
                placeholder="ABC-1234"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scooter">Scooter</SelectItem>
                  <SelectItem value="street">Street</SelectItem>
                  <SelectItem value="naked">Naked</SelectItem>
                  <SelectItem value="sport">Sport</SelectItem>
                  <SelectItem value="trail">Trail</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Marca *</Label>
              <Select value={formData.brand} onValueChange={(value) => handleInputChange('brand', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Honda">Honda</SelectItem>
                  <SelectItem value="Yamaha">Yamaha</SelectItem>
                  <SelectItem value="Suzuki">Suzuki</SelectItem>
                  <SelectItem value="Kawasaki">Kawasaki</SelectItem>
                  <SelectItem value="BMW">BMW</SelectItem>
                  <SelectItem value="Harley-Davidson">Harley-Davidson</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model">Modelo *</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
                placeholder="CG 160"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Ano *</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => handleInputChange('year', e.target.value)}
                placeholder="2024"
                min="1990"
                max="2025"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="color">Cor *</Label>
              <Select value={formData.color} onValueChange={(value) => handleInputChange('color', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a cor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Branco">Branco</SelectItem>
                  <SelectItem value="Preto">Preto</SelectItem>
                  <SelectItem value="Prata">Prata</SelectItem>
                  <SelectItem value="Vermelho">Vermelho</SelectItem>
                  <SelectItem value="Azul">Azul</SelectItem>
                  <SelectItem value="Verde">Verde</SelectItem>
                  <SelectItem value="Amarelo">Amarelo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="renavam">RENAVAM</Label>
              <Input
                id="renavam"
                value={formData.renavam}
                onChange={(e) => handleInputChange('renavam', e.target.value)}
                placeholder="00000000000"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="chassis">Chassi</Label>
              <Input
                id="chassis"
                value={formData.chassis}
                onChange={(e) => handleInputChange('chassis', e.target.value.toUpperCase())}
                placeholder="9BWZZZ377VT004251"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="odometer">Odômetro (km)</Label>
            <Input
              id="odometer"
              type="number"
              value={formData.odometer}
              onChange={(e) => handleInputChange('odometer', e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => handleInputChange('observations', e.target.value)}
              placeholder="Informações adicionais sobre o veículo"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-primary hover:opacity-90"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Cadastrar Veículo')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleDialog;