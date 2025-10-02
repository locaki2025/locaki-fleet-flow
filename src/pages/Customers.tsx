import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Filter, User, Building2, Phone, Mail, Eye, Calendar, CreditCard, Edit, Trash2 } from "lucide-react";
import CustomerDialog from "@/components/CustomerDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Customers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch customers from Supabase
  const fetchCustomers = async () => {
    if (!user?.id) {
      console.warn('No user ID found, skipping customers fetch');
      setCustomers([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching customers:', error);
        throw new Error(`Erro ao carregar clientes: ${error.message}`);
      }
      
      setCustomers(data || []);
      console.log('Customers loaded successfully:', data?.length || 0);

      // Auto-trigger backend sync if empty and not attempted yet (bypass CORS via Edge Function)
      if ((data?.length || 0) === 0 && user?.id && !sessionStorage.getItem('customers_sync_attempted')) {
        const ok = await syncCustomersFromRastrosystem();
        if (ok) {
          sessionStorage.setItem('customers_sync_attempted', '1');
        } else {
          // Permite tentar novamente caso tenha falhado
          sessionStorage.removeItem('customers_sync_attempted');
        }
        // Recarrega após tentativa de sync
        const { data: dataAfter } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setCustomers(dataAfter || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Erro ao carregar clientes",
        description: error instanceof Error ? error.message : "Erro desconhecido ao carregar clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Edge function call to sync customers server-side (avoids CORS)
  const syncCustomersFromRastrosystem = async (): Promise<boolean> => {
    try {
      if (!user?.id) return false;
      toast({ title: 'Sincronizando clientes...', description: 'Importando clientes do Rastrosystem', duration: 2000 });
      const { data, error } = await supabase.functions.invoke('rastrosystem-customers-sync', {
        body: { user_id: user.id },
      });
      if (error) throw error;
      console.log('Clientes sincronizados (edge):', data);
      toast({ title: 'Clientes sincronizados', description: `${data?.inserted ?? 0} clientes importados`, duration: 2000 });
      return true;
    } catch (err) {
      console.error('Falha ao sincronizar clientes (edge):', err);
      toast({ title: 'Erro ao sincronizar clientes', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
      return false;
    }
  };

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCustomer) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', selectedCustomer.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Cliente excluído",
        description: `${selectedCustomer.name} foi removido com sucesso.`,
        variant: "destructive",
      });

      setDeleteDialogOpen(false);
      setIsDetailsOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: "Erro ao excluir",
        description: error instanceof Error ? error.message : "Não foi possível excluir o cliente",
        variant: "destructive",
      });
    }
  };

  const handleCustomerUpdated = () => {
    setEditDialogOpen(false);
    fetchCustomers();
    toast({
      title: "Cliente atualizado",
      description: `${selectedCustomer.name} foi atualizado com sucesso.`,
    });
  };

  useEffect(() => {
    fetchCustomers();
  }, [user]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchCustomers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes pessoa física e jurídica</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={async () => {
              setLoading(true);
              const ok = await syncCustomersFromRastrosystem();
              await fetchCustomers();
              setLoading(false);
            }}
          >
            Sincronizar
          </Button>
          <Button 
            className="bg-gradient-primary hover:opacity-90"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome, CPF/CNPJ..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando clientes...</p>
        </div>
      ) : customers.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {customers.map((customer) => (
          <Card key={customer.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    {customer.type === 'PF' ? (
                      <User className="h-6 w-6 text-primary" />
                    ) : (
                      <Building2 className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                <CardTitle className="text-lg">{customer.name}</CardTitle>
                <CardDescription>{customer.cpf_cnpj}</CardDescription>
                  </div>
                </div>
                <Badge 
                  variant={
                    customer.status === 'ativo' ? 'default' :
                    customer.status === 'inadimplente' ? 'destructive' : 'secondary'
                  }
                  className={
                    customer.status === 'ativo' ? 'bg-success text-success-foreground' :
                    customer.status === 'inadimplente' ? 'bg-destructive text-destructive-foreground' : ''
                  }
                >
                  {customer.status === 'ativo' ? 'Ativo' :
                   customer.status === 'inadimplente' ? 'Inadimplente' : 
                   customer.status === 'bloqueado' ? 'Bloqueado' : customer.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{customer.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{customer.phone}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {customer.city}, {customer.state}
              </div>
              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-xs text-muted-foreground">
                  Cliente desde {new Date(customer.created_at).toLocaleDateString('pt-BR')}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setIsDetailsOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Cadastre seu primeiro cliente para começar
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button 
                variant="outline"
                onClick={async () => {
                  setLoading(true);
                  const ok = await syncCustomersFromRastrosystem();
                  await fetchCustomers();
                  setLoading(false);
                }}
              >
                Sincronizar Clientes
              </Button>
              <Button 
                className="bg-gradient-primary hover:opacity-90"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Cliente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add more customers button for when there are existing customers */}
      {customers.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Adicione mais clientes</h3>
            <p className="text-muted-foreground mb-4">
              Cadastre novos clientes para expandir sua base
            </p>
            <Button 
              className="bg-gradient-primary hover:opacity-90"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Cliente
            </Button>
          </CardContent>
        </Card>
      )}

      <CustomerDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
      />

      {/* Customer Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
            <DialogDescription>
              Informações completas do cliente
            </DialogDescription>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Informações Básicas</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nome:</span>
                      <span>{selectedCustomer.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo:</span>
                      <Badge variant="outline">
                        {selectedCustomer.type === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CPF/CNPJ:</span>
                      <span>{selectedCustomer.cpf_cnpj}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={selectedCustomer.status === 'ativo' ? 'default' : 'destructive'}>
                        {selectedCustomer.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Contato</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedCustomer.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedCustomer.phone}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h4 className="font-semibold mb-2">Endereço</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedCustomer.street}, {selectedCustomer.number}<br/>
                  {selectedCustomer.city}, {selectedCustomer.state}<br/>
                  CEP: {selectedCustomer.zip_code}
                </p>
              </div>

              {/* CNH Info */}
              {(selectedCustomer.cnh_category || selectedCustomer.cnh_expiry_date) && (
                <div>
                  <h4 className="font-semibold mb-2">Informações da CNH</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedCustomer.cnh_category && (
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span>Categoria: {selectedCustomer.cnh_category}</span>
                      </div>
                    )}
                    {selectedCustomer.cnh_expiry_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Vencimento: {new Date(selectedCustomer.cnh_expiry_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  {selectedCustomer.cnh_attachment_url && (
                    <div className="mt-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={selectedCustomer.cnh_attachment_url} target="_blank" rel="noopener noreferrer">
                          Ver CNH Anexada
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Observations */}
              {selectedCustomer.observations && (
                <div>
                  <h4 className="font-semibold mb-2">Observações</h4>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.observations}</p>
                </div>
              )}

              {/* Dates */}
              <div className="text-xs text-muted-foreground border-t pt-4">
                Cliente desde {new Date(selectedCustomer.created_at).toLocaleDateString('pt-BR')}
                {selectedCustomer.updated_at !== selectedCustomer.created_at && (
                  <span> • Última atualização: {new Date(selectedCustomer.updated_at).toLocaleDateString('pt-BR')}</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleEdit}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CustomerDialog 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen}
        customer={selectedCustomer}
        onCustomerUpdated={handleCustomerUpdated}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente <strong>{selectedCustomer?.name}</strong>? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Customers;