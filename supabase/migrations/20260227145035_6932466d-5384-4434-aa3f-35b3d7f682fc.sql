
-- Fix: restrict photo insert to the survey's surveyor
DROP POLICY "Surveyors can insert photos" ON public.survey_photos;
CREATE POLICY "Surveyors can insert photos" ON public.survey_photos FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.surveys WHERE surveys.id = survey_photos.survey_id AND surveys.surveyor_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);
