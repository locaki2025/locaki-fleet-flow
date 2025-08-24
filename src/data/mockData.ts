// Mock data for LOCAKI system demonstration

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpfCnpj: string;
  type: 'PF' | 'PJ';
  status: 'ativo' | 'inadimplente' | 'bloqueado';
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  createdAt: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  category: string;
  odometer: number;
  status: 'disponivel' | 'alugado' | 'manutencao' | 'reservado';
  tracker?: string;
  lastLocation?: {
    lat: number;
    lng: number;
    updatedAt: string;
  };
}

export interface Rental {
  id: string;
  customerId: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  status: 'ativo' | 'finalizado' | 'atrasado' | 'cancelado';
  dailyRate: number;
  totalValue: number;
  type: 'diaria' | 'semanal' | 'mensal' | 'longo_prazo';
}

export interface Invoice {
  id: string;
  customerId: string;
  rentalId?: string;
  amount: number;
  dueDate: string;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado';
  paymentMethod?: 'pix' | 'boleto' | 'cartao';
  description: string;
}

export interface MaintenanceOrder {
  id: string;
  vehicleId: string;
  type: 'preventiva' | 'corretiva' | 'revisao';
  description: string;
  status: 'aberta' | 'em_andamento' | 'finalizada' | 'cancelada';
  cost: number;
  scheduledDate: string;
  completedDate?: string;
}

// Mock data
export const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'Maria Santos',
    email: 'maria.santos@email.com',
    phone: '(11) 99999-9999',
    cpfCnpj: '123.456.789-00',
    type: 'PF',
    status: 'ativo',
    address: {
      street: 'Rua das Flores, 123',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567'
    },
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'Empresa ABC Ltda',
    email: 'contato@empresaabc.com',
    phone: '(11) 3333-4444',
    cpfCnpj: '12.345.678/0001-90',
    type: 'PJ',
    status: 'ativo',
    address: {
      street: 'Av. Paulista, 1000',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100'
    },
    createdAt: '2024-02-20'
  },
  {
    id: '3',
    name: 'João Silva',
    email: 'joao.silva@email.com',
    phone: '(11) 98888-7777',
    cpfCnpj: '987.654.321-00',
    type: 'PF',
    status: 'inadimplente',
    address: {
      street: 'Rua dos Pinheiros, 456',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '05422-000'
    },
    createdAt: '2024-01-30'
  }
];

export const mockVehicles: Vehicle[] = [
  {
    id: '1',
    plate: 'ABC-1234',
    brand: 'Honda',
    model: 'CG 160 Start',
    year: 2023,
    color: 'Vermelha',
    category: 'Motocicleta Básica',
    odometer: 5420,
    status: 'alugado',
    tracker: 'TRACK001',
    lastLocation: {
      lat: -23.5505,
      lng: -46.6333,
      updatedAt: '2024-08-24T10:30:00Z'
    }
  },
  {
    id: '2',
    plate: 'DEF-5678',
    brand: 'Yamaha',
    model: 'Factor 125i',
    year: 2022,
    color: 'Azul',
    category: 'Motocicleta Básica',
    odometer: 12300,
    status: 'disponivel',
    tracker: 'TRACK002',
    lastLocation: {
      lat: -23.5489,
      lng: -46.6388,
      updatedAt: '2024-08-24T09:45:00Z'
    }
  },
  {
    id: '3',
    plate: 'GHI-9012',
    brand: 'Honda',
    model: 'CB 600F Hornet',
    year: 2024,
    color: 'Preta',
    category: 'Motocicleta Premium',
    odometer: 1500,
    status: 'manutencao',
    tracker: 'TRACK003'
  },
  {
    id: '4',
    plate: 'JKL-3456',
    brand: 'Kawasaki',
    model: 'Ninja 400',
    year: 2023,
    color: 'Verde',
    category: 'Motocicleta Esportiva',
    odometer: 8900,
    status: 'disponivel',
    tracker: 'TRACK004',
    lastLocation: {
      lat: -23.5617,
      lng: -46.6564,
      updatedAt: '2024-08-24T11:15:00Z'
    }
  }
];

export const mockRentals: Rental[] = [
  {
    id: '1',
    customerId: '1',
    vehicleId: '1',
    startDate: '2024-08-01',
    endDate: '2024-08-31',
    status: 'ativo',
    dailyRate: 45.00,
    totalValue: 1395.00,
    type: 'mensal'
  },
  {
    id: '2',
    customerId: '2',
    vehicleId: '2',
    startDate: '2024-08-15',
    endDate: '2024-08-22',
    status: 'finalizado',
    dailyRate: 40.00,
    totalValue: 320.00,
    type: 'semanal'
  }
];

export const mockInvoices: Invoice[] = [
  {
    id: '1',
    customerId: '1',
    rentalId: '1',
    amount: 1395.00,
    dueDate: '2024-08-31',
    status: 'pendente',
    description: 'Aluguel Mensal - Honda CG 160'
  },
  {
    id: '2',
    customerId: '2',
    rentalId: '2',
    amount: 320.00,
    dueDate: '2024-08-22',
    status: 'pago',
    paymentMethod: 'pix',
    description: 'Aluguel Semanal - Yamaha Factor 125i'
  },
  {
    id: '3',
    customerId: '3',
    amount: 850.00,
    dueDate: '2024-08-15',
    status: 'vencido',
    description: 'Aluguel Mensal - Moto Anterior'
  }
];

export const mockMaintenanceOrders: MaintenanceOrder[] = [
  {
    id: '1',
    vehicleId: '3',
    type: 'preventiva',
    description: 'Revisão dos 10.000 km - Troca de óleo e filtros',
    status: 'em_andamento',
    cost: 350.00,
    scheduledDate: '2024-08-25'
  },
  {
    id: '2',
    vehicleId: '1',
    type: 'corretiva',
    description: 'Reparo no sistema de freios',
    status: 'finalizada',
    cost: 280.00,
    scheduledDate: '2024-08-20',
    completedDate: '2024-08-21'
  }
];