
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'surveyor', 'viewer');

-- Location type enum
CREATE TYPE public.location_type AS ENUM ('residential', 'business', 'vacant', 'public_space');

-- Survey status enum
CREATE TYPE public.survey_status AS ENUM ('not_surveyed', 'in_progress', 'surveyed');

-- Property condition enum
CREATE TYPE public.property_condition AS ENUM ('excellent', 'good', 'fair', 'poor', 'critical');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Locations table
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  location_type location_type NOT NULL DEFAULT 'residential',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status survey_status NOT NULL DEFAULT 'not_surveyed',
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Surveys table
CREATE TABLE public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  surveyor_id UUID REFERENCES auth.users(id) NOT NULL,
  property_condition property_condition,
  condition_notes TEXT,
  resident_name TEXT,
  resident_contact TEXT,
  occupancy_status TEXT,
  business_name TEXT,
  business_type TEXT,
  business_hours TEXT,
  business_contact TEXT,
  custom_responses JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

-- Survey photos table
CREATE TABLE public.survey_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.survey_photos ENABLE ROW LEVEL SECURITY;

-- Custom survey templates (admin-defined questions)
CREATE TABLE public.survey_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'text', -- text, multiple_choice, rating, yes_no
  options JSONB, -- for multiple choice
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.survey_templates ENABLE ROW LEVEL SECURITY;

-- Storage bucket for survey photos
INSERT INTO storage.buckets (id, name, public) VALUES ('survey-photos', 'survey-photos', true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON public.surveys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'surveyor');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Profiles: users can read all profiles, update own
CREATE POLICY "Anyone authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- User roles: viewable by authenticated, manageable by admins
CREATE POLICY "Authenticated can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Locations: all authenticated can view, surveyors+ can create, admins can update/delete
CREATE POLICY "Authenticated can view locations" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Surveyors can create locations" ON public.locations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'surveyor') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update locations" ON public.locations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());
CREATE POLICY "Admins can delete locations" ON public.locations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Surveys: all authenticated can view, surveyors can create/update own
CREATE POLICY "Authenticated can view surveys" ON public.surveys FOR SELECT TO authenticated USING (true);
CREATE POLICY "Surveyors can create surveys" ON public.surveys FOR INSERT TO authenticated WITH CHECK (auth.uid() = surveyor_id);
CREATE POLICY "Surveyors can update own surveys" ON public.surveys FOR UPDATE TO authenticated USING (auth.uid() = surveyor_id OR public.has_role(auth.uid(), 'admin'));

-- Survey photos
CREATE POLICY "Authenticated can view photos" ON public.survey_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Surveyors can insert photos" ON public.survey_photos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can delete photos" ON public.survey_photos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Survey templates: all can view active, admins can manage
CREATE POLICY "Authenticated can view templates" ON public.survey_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage templates" ON public.survey_templates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update templates" ON public.survey_templates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete templates" ON public.survey_templates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Storage policies for survey-photos bucket
CREATE POLICY "Authenticated can view survey photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'survey-photos');
CREATE POLICY "Authenticated can upload survey photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'survey-photos');
CREATE POLICY "Admins can delete survey photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'survey-photos' AND public.has_role(auth.uid(), 'admin'));
