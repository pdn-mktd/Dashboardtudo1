-- Add payment_type column to products table
-- Default to 'recorrente' for backwards compatibility
ALTER TABLE public.products 
ADD COLUMN payment_type text NOT NULL DEFAULT 'recorrente';

-- Add check constraint to ensure valid values
ALTER TABLE public.products 
ADD CONSTRAINT products_payment_type_check 
CHECK (payment_type IN ('recorrente', 'unico'));