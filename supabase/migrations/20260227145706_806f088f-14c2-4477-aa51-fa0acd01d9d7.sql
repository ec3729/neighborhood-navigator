
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (user_id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'surveyor');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
