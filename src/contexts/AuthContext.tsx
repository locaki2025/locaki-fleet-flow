import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  rastrosystemSyncing: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rastrosystemSyncing, setRastrosystemSyncing] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          throw error;
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          console.log('Initial session loaded:', session ? 'authenticated' : 'not authenticated');
        }
      } catch (error) {
        console.error('Failed to get initial session:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session ? 'authenticated' : 'not authenticated');
      
      if (!mounted) return;

      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
      } else if (event === 'SIGNED_IN') {
        console.log('User signed in');
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      // Trigger Rastrosystem sync when user signs in
      if (event === 'SIGNED_IN' && session?.user) {
        performRastrosystemSync(session.user);
      }
      
      if (!loading) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Rastrosystem sync function
  const performRastrosystemSync = async (currentUser: User) => {
    // Check if sync was already done in this session
    const lastSync = sessionStorage.getItem('rastrosystem_last_sync');
    if (lastSync) {
      console.log('Sincronização Rastrosystem já realizada nesta sessão');
      return;
    }

    setRastrosystemSyncing(true);

    try {
      console.log('Iniciando sincronização com Rastrosystem...');
      
      // Step 1: Authenticate
      const authResponse = await fetch('https://locaki.rastrosystem.com.br/api_v2/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: '54858795000100',
          senha: '123456',
          app: 9,
        }),
      });

      if (!authResponse.ok) throw new Error('Falha na autenticação Rastrosystem');
      
      const authData = await authResponse.json();
      sessionStorage.setItem('rastrosystem_token', authData.token);
      sessionStorage.setItem('rastrosystem_cliente_id', authData.cliente_id);

      // Step 2: Sync vehicles
      const vehiclesResponse = await fetch(
        `https://locaki.rastrosystem.com.br/api_v2/veiculos/${authData.cliente_id}/`,
        {
          headers: {
            'Authorization': `token ${authData.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (vehiclesResponse.ok) {
        const vehiclesData = await vehiclesResponse.json();
        const vehicles = vehiclesData.dispositivos || [];
        
        console.log(`Sincronizando ${vehicles.length} veículos do Rastrosystem...`);
        
        for (const vehicle of vehicles) {
          if (!vehicle.placa) continue;
          
          const { data: existing } = await supabase
            .from('vehicles')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('plate', vehicle.placa)
            .maybeSingle();

          if (!existing) {
            const { error } = await supabase.from('vehicles').insert({
              user_id: currentUser.id,
              plate: vehicle.placa,
              brand: 'Não informado',
              model: vehicle.name || vehicle.placa,
              color: 'Não informado',
              year: new Date().getFullYear(),
              category: 'moto',
              status: 'disponivel',
              odometer: parseInt(vehicle.odometer) || 0,
              observations: `Importado do Rastrosystem - IMEI: ${vehicle.imei}`,
            });
            
            if (error) {
              console.error('Erro ao inserir veículo:', error);
            } else {
              console.log('Veículo sincronizado:', vehicle.placa);
            }
          }
        }
      }

      // Step 3: Sync customers
      const customersResponse = await fetch(
        'https://locaki.rastrosystem.com.br/api_v2/list-pessoas',
        {
          headers: {
            'Authorization': `token ${authData.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (customersResponse.ok) {
        const customers = await customersResponse.json();
        console.log(`Sincronizando ${customers.length} clientes do Rastrosystem...`);
        
        for (const customer of customers) {
          const cpfCnpj = customer.cpf || customer.cnpj || '';
          if (!cpfCnpj) continue;

          const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('cpf_cnpj', cpfCnpj)
            .maybeSingle();

          if (!existing) {
            const { error } = await supabase.from('customers').insert({
              user_id: currentUser.id,
              name: customer.nome || customer.razao_social || 'Não informado',
              type: customer.cpf ? 'PF' : 'PJ',
              cpf_cnpj: cpfCnpj,
              email: customer.email || 'nao-informado@email.com',
              phone: customer.telefone || customer.celular || '(00) 00000-0000',
              street: customer.endereco || 'Não informado',
              number: customer.numero || 'S/N',
              city: customer.cidade || 'Não informado',
              state: customer.estado || 'XX',
              zip_code: customer.cep || '00000-000',
              status: 'ativo',
              observations: `Importado do Rastrosystem - ID: ${customer.id}`,
            });
            
            if (error) {
              console.error('Erro ao inserir cliente:', error);
            } else {
              console.log('Cliente sincronizado:', customer.nome);
            }
          }
        }
      }

      sessionStorage.setItem('rastrosystem_last_sync', new Date().toISOString());
      console.log('✅ Sincronização Rastrosystem concluída com sucesso');
      console.log('📊 Verifique as páginas de Veículos e Clientes para ver os dados importados');
    } catch (error) {
      console.error('❌ Erro na sincronização Rastrosystem:', error);
    } finally {
      setRastrosystemSyncing(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      return { error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    rastrosystemSyncing,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};