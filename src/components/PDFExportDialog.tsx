import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PDFExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'contracts' | 'maintenance' | 'reports' | 'invoices';
  data: any[];
}

const PDFExportDialog = ({ open, onOpenChange, type, data }: PDFExportDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [format, setFormat] = useState('detailed');
  const { toast } = useToast();

  const getExportTitle = () => {
    switch (type) {
      case 'contracts': return 'Exportar Contratos';
      case 'maintenance': return 'Exportar Ordens de Manutenção';
      case 'reports': return 'Exportar Relatórios';
      case 'invoices': return 'Exportar Faturas';
      default: return 'Exportar Dados';
    }
  };

  const getAvailableFields = () => {
    switch (type) {
      case 'contracts':
        return [
          { id: 'cliente', label: 'Cliente' },
          { id: 'veiculo', label: 'Veículo' },
          { id: 'valor', label: 'Valor' },
          { id: 'periodo', label: 'Período' },
          { id: 'status', label: 'Status' }
        ];
      case 'maintenance':
        return [
          { id: 'veiculo', label: 'Veículo' },
          { id: 'servico', label: 'Serviço' },
          { id: 'custo', label: 'Custo' },
          { id: 'data', label: 'Data' },
          { id: 'status', label: 'Status' }
        ];
      case 'invoices':
        return [
          { id: 'numero', label: 'Número' },
          { id: 'cliente', label: 'Cliente' },
          { id: 'valor', label: 'Valor' },
          { id: 'vencimento', label: 'Vencimento' },
          { id: 'status', label: 'Status' }
        ];
      default:
        return [];
    }
  };

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Determine the correct edge function based on type
      const functionName = type === 'contracts' ? 'generate-contract-pdf' : 'generate-pdf-export';
      
      // For contracts, we need to send contract_data and user_id
      const requestBody = type === 'contracts' 
        ? {
            user_id: user.id,
            contract_data: data[0], // Get first contract for now
            selectedFields,
            format
          }
        : {
            type,
            selectedFields,
            format,
            data: data.slice(0, 100) // Limit to first 100 records for performance
          };
      
      const { data: pdfData, error } = await supabase.functions.invoke(functionName, {
        body: requestBody
      });

      if (error) throw error;

      if (pdfData && (pdfData.pdfUrl || pdfData.pdf)) {
        if (pdfData.pdfUrl) {
          // Create download link from URL
          const element = document.createElement('a');
          element.href = pdfData.pdfUrl;
          element.download = `${type}_export_${new Date().getTime()}.pdf`;
          document.body.appendChild(element);
          element.click();
          document.body.removeChild(element);
        } else if (pdfData.pdf) {
          // Create download link from base64
          const byteCharacters = atob(pdfData.pdf);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          
          const element = document.createElement('a');
          element.href = url;
          element.download = `${type}_export_${new Date().getTime()}.pdf`;
          document.body.appendChild(element);
          element.click();
          document.body.removeChild(element);
          window.URL.revokeObjectURL(url);
        }

        toast({
          title: "Exportação concluída",
          description: `${type === 'contracts' ? 'Contratos' : type === 'maintenance' ? 'Ordens de manutenção' : type === 'invoices' ? 'Faturas' : 'Relatórios'} exportados em PDF com sucesso`,
        });
      } else {
        throw new Error('Resposta inválida do servidor');
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Erro na exportação",
        description: error?.message || "Não foi possível gerar o arquivo PDF",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fields = getAvailableFields();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {getExportTitle()}
          </DialogTitle>
          <DialogDescription>
            Configure as opções de exportação para PDF
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Format Selection */}
          <div>
            <Label htmlFor="format" className="text-sm font-medium">
              Formato do Relatório
            </Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione o formato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="detailed">Detalhado</SelectItem>
                <SelectItem value="summary">Resumido</SelectItem>
                <SelectItem value="compact">Compacto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Field Selection */}
          <div>
            <Label className="text-sm font-medium">
              Campos a incluir {data.length > 0 ? `(${data.length} registros)` : '(Template vazio)'}
            </Label>
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {fields.map((field) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.id}
                    checked={selectedFields.includes(field.id)}
                    onCheckedChange={() => handleFieldToggle(field.id)}
                  />
                  <Label
                    htmlFor={field.id}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={loading}
            className="bg-gradient-primary hover:opacity-90"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {loading ? 'Gerando PDF...' : 'Exportar PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PDFExportDialog;