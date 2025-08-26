import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CoraConfigDialog from "./CoraConfigDialog";
import RastrosystemConfigDialog from "./RastrosystemConfigDialog";
import { Settings, CreditCard, Satellite, FileText } from "lucide-react";

interface IntegrationsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const IntegrationsConfigDialog = ({ open, onOpenChange }: IntegrationsConfigDialogProps) => {
  const [coraDialogOpen, setCoraDialogOpen] = useState(false);
  const [rastrosystemDialogOpen, setRastrosystemDialogOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações de Integrações
            </DialogTitle>
            <DialogDescription>
              Configure as integrações do sistema com APIs externas
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="payment">Pagamentos</TabsTrigger>
              <TabsTrigger value="tracking">Rastreamento</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" 
                     onClick={() => setCoraDialogOpen(true)}>
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold">Banco Cora</h3>
                      <p className="text-sm text-muted-foreground">
                        Integração para geração de boletos e PIX
                      </p>
                      <p className="text-xs text-primary mt-1">Clique para configurar</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                     onClick={() => setRastrosystemDialogOpen(true)}>
                  <div className="flex items-start gap-3">
                    <Satellite className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold">Rastrosystem</h3>
                      <p className="text-sm text-muted-foreground">
                        Sistema de rastreamento GPS
                      </p>
                      <p className="text-xs text-primary mt-1">Clique para configurar</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-start gap-3">
                    <FileText className="h-6 w-6 text-muted-foreground mt-1" />
                    <div>
                      <h3 className="font-semibold text-muted-foreground">Geração de PDF</h3>
                      <p className="text-sm text-muted-foreground">
                        Contratos automáticos em PDF
                      </p>
                      <p className="text-xs text-success mt-1">✓ Configurado automaticamente</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="payment" className="space-y-4">
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Configurar Banco Cora</h3>
                <p className="text-muted-foreground mb-4">
                  Configure a integração com o Banco Cora para gerar boletos e PIX automaticamente
                </p>
                <button 
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  onClick={() => setCoraDialogOpen(true)}
                >
                  Abrir Configurações do Cora
                </button>
              </div>
            </TabsContent>

            <TabsContent value="tracking" className="space-y-4">
              <div className="text-center py-8">
                <Satellite className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Configurar Rastrosystem</h3>
                <p className="text-muted-foreground mb-4">
                  Configure a integração com o sistema de rastreamento GPS
                </p>
                <button 
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  onClick={() => setRastrosystemDialogOpen(true)}
                >
                  Abrir Configurações do Rastrosystem
                </button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs */}
      <CoraConfigDialog 
        open={coraDialogOpen} 
        onOpenChange={setCoraDialogOpen} 
      />
      <RastrosystemConfigDialog 
        open={rastrosystemDialogOpen} 
        onOpenChange={setRastrosystemDialogOpen} 
      />
    </>
  );
};

export default IntegrationsConfigDialog;