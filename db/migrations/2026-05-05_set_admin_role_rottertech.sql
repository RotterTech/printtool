-- Migration: Set info@rottertech.nl as admin
-- Date: 2026-05-05
-- Description: Ensures the main admin account has role = 'admin' so they can view audit logs

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'info@rottertech.nl';
