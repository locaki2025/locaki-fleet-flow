-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Update RLS policies for all existing tables to allow admin access

-- Devices table
CREATE POLICY "Admins can view all devices" 
ON public.devices 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all devices" 
ON public.devices 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Vehicle positions table
CREATE POLICY "Admins can view all vehicle positions" 
ON public.vehicle_positions 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all vehicle positions" 
ON public.vehicle_positions 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Financial expenses table
CREATE POLICY "Admins can view all financial expenses" 
ON public.financial_expenses 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all financial expenses" 
ON public.financial_expenses 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Contratos table
CREATE POLICY "Admins can view all contratos" 
ON public.contratos 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all contratos" 
ON public.contratos 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Vehicles table
CREATE POLICY "Admins can view all vehicles" 
ON public.vehicles 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all vehicles" 
ON public.vehicles 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Expense types table
CREATE POLICY "Admins can view all expense types" 
ON public.expense_types 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all expense types" 
ON public.expense_types 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Traffic fines table
CREATE POLICY "Admins can view all traffic fines" 
ON public.multas_transito 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all traffic fines" 
ON public.multas_transito 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Boletos table
CREATE POLICY "Admins can view all boletos" 
ON public.boletos 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all boletos" 
ON public.boletos 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Customers table
CREATE POLICY "Admins can view all customers" 
ON public.customers 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all customers" 
ON public.customers 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Financial entries table
CREATE POLICY "Admins can view all financial entries" 
ON public.financial_entries 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all financial entries" 
ON public.financial_entries 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Cora transactions table
CREATE POLICY "Admins can view all cora transactions" 
ON public.cora_transactions 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all cora transactions" 
ON public.cora_transactions 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Tenant config table
CREATE POLICY "Admins can view all tenant config" 
ON public.tenant_config 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all tenant config" 
ON public.tenant_config 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Add trigger for updated_at on user_roles
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();