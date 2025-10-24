-- Storage policies for videos bucket

-- Create the videos bucket (run this manually in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', false);

-- Policy for students to upload to their own path
CREATE POLICY "Students can upload videos to their own path" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'videos' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy for students to view their own videos
CREATE POLICY "Students can view their own videos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'videos' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy for students to update/delete their own videos
CREATE POLICY "Students can update their own videos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'videos' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Students can delete their own videos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'videos' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy for TAs and admins to view all videos (via signed URLs)
CREATE POLICY "TAs can view all videos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'videos' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('ta', 'admin')
        )
    );