import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, User, Building2, Phone, Mail } from "lucide-react";
import { mockCustomers } from "@/data/mockData";

const Customers = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes pessoa física e jurídica</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockCustomers.map((customer) => (
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
                    <CardDescription>{customer.cpfCnpj}</CardDescription>
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
                {customer.address.city}, {customer.address.state}
              </div>
              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-xs text-muted-foreground">
                  Cliente desde {new Date(customer.createdAt).toLocaleDateString('pt-BR')}
                </span>
                <Button variant="outline" size="sm">
                  Ver Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add more customers placeholder */}
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Adicione mais clientes</h3>
          <p className="text-muted-foreground mb-4">
            Cadastre novos clientes para expandir sua base
          </p>
          <Button className="bg-gradient-primary hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />
            Cadastrar Cliente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Customers;