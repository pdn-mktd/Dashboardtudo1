-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create Security Definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
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

-- Create function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

-- RLS policy for user_roles: users can read their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can manage all roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Drop existing permissive policies on clients
DROP POLICY IF EXISTS "Allow public read clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public insert clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public update clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public delete clients" ON public.clients;

-- New secure policies for clients (authenticated users only)
CREATE POLICY "Authenticated users can read clients"
ON public.clients
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete clients"
ON public.clients
FOR DELETE
TO authenticated
USING (true);

-- Drop existing permissive policies on products
DROP POLICY IF EXISTS "Allow public read products" ON public.products;
DROP POLICY IF EXISTS "Allow public insert products" ON public.products;
DROP POLICY IF EXISTS "Allow public update products" ON public.products;
DROP POLICY IF EXISTS "Allow public delete products" ON public.products;

-- New secure policies for products (public read, authenticated write)
CREATE POLICY "Anyone can read products"
ON public.products
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (true);

-- Drop existing permissive policies on expenses
DROP POLICY IF EXISTS "Allow public read expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow public insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow public update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow public delete expenses" ON public.expenses;

-- New secure policies for expenses (authenticated only)
CREATE POLICY "Authenticated users can read expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert expenses"
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update expenses"
ON public.expenses
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete expenses"
ON public.expenses
FOR DELETE
TO authenticated
USING (true);

-- Create trigger to auto-assign 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();