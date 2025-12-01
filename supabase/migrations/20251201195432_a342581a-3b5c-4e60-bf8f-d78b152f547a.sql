-- Allow all authenticated users to view all data (not just their own)

-- Update boletos policies
DROP POLICY IF EXISTS "Users can view their own boletos" ON public.boletos;
CREATE POLICY "Authenticated users can view all boletos" 
ON public.boletos 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update contratos policies
DROP POLICY IF EXISTS "Users can view their own contratos" ON public.contratos;
CREATE POLICY "Authenticated users can view all contratos" 
ON public.contratos 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update customers policies
DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
CREATE POLICY "Authenticated users can view all customers" 
ON public.customers 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update financial_entries policies
DROP POLICY IF EXISTS "Users can view their own financial entries" ON public.financial_entries;
CREATE POLICY "Authenticated users can view all financial entries" 
ON public.financial_entries 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update financial_expenses policies
DROP POLICY IF EXISTS "Users can view their own financial expenses" ON public.financial_expenses;
CREATE POLICY "Authenticated users can view all financial expenses" 
ON public.financial_expenses 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update multas_transito policies
DROP POLICY IF EXISTS "Users can view their own traffic fines" ON public.multas_transito;
CREATE POLICY "Authenticated users can view all traffic fines" 
ON public.multas_transito 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update expense_types policies
DROP POLICY IF EXISTS "Users can view their own expense types" ON public.expense_types;
CREATE POLICY "Authenticated users can view all expense types" 
ON public.expense_types 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update profiles policies - users can view all profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Authenticated users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update cora_transactions policies
DROP POLICY IF EXISTS "Users can view their own Cora transactions" ON public.cora_transactions;
CREATE POLICY "Authenticated users can view all Cora transactions" 
ON public.cora_transactions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);