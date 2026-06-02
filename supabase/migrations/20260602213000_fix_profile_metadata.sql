-- ==============================================================
-- MIGRATION TO FIX NULL VALUES IN STUDENT PROFILES
-- ==============================================================

-- 1. Ensure all columns exist on the profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS semester TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_id TEXT;

-- 2. Update the handle_new_user trigger function to populate all fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role public.app_role;
BEGIN
  -- Extract role from metadata or default to student
  default_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student');

  -- Insert into profiles table with all metadata fields from sign up
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    email, 
    role, 
    specialization, 
    level, 
    semester, 
    student_id
  )
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 
    NEW.email,
    default_role,
    NEW.raw_user_meta_data->>'specialization',
    NEW.raw_user_meta_data->>'level',
    NEW.raw_user_meta_data->>'semester',
    NEW.raw_user_meta_data->>'student_id'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    specialization = COALESCE(profiles.specialization, EXCLUDED.specialization),
    level = COALESCE(profiles.level, EXCLUDED.level),
    semester = COALESCE(profiles.semester, EXCLUDED.semester),
    student_id = COALESCE(profiles.student_id, EXCLUDED.student_id);

  -- Insert into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, default_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Backfill existing profile rows using auth.users metadata
UPDATE public.profiles p
SET 
    specialization = COALESCE(p.specialization, u.raw_user_meta_data->>'specialization'),
    level = COALESCE(p.level, u.raw_user_meta_data->>'level'),
    semester = COALESCE(p.semester, u.raw_user_meta_data->>'semester'),
    student_id = COALESCE(p.student_id, u.raw_user_meta_data->>'student_id')
FROM auth.users u
WHERE p.user_id = u.id;

-- 4. Correct the RLS policies to check user_id correctly (fixing id vs user_id mismatch)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles 
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 5. Reload Schema cache
NOTIFY pgrst, 'reload schema';
