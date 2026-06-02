-- Add role column to profiles table which was missed in previous migrations
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.app_role;
