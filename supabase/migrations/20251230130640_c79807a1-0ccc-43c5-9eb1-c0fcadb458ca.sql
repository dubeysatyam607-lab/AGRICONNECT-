-- Create storage bucket for cattle images
INSERT INTO storage.buckets (id, name, public)
VALUES ('cattle-images', 'cattle-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for cattle images
CREATE POLICY "Anyone can view cattle images"
ON storage.objects FOR SELECT
USING (bucket_id = 'cattle-images');

CREATE POLICY "Authenticated users can upload cattle images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cattle-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own cattle images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'cattle-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own cattle images"
ON storage.objects FOR DELETE
USING (bucket_id = 'cattle-images' AND auth.uid()::text = (storage.foldername(name))[1]);