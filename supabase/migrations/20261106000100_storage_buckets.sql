-- Storage buckets cho ảnh chứng từ (DX-021)
-- App dùng getPublicUrl nên hai bucket này là public: ai có link đều xem được ảnh.
-- Chỉ user đã đăng nhập mới được upload.

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('payment_proofs', 'payment_proofs', true),
  ('confirmation_proofs', 'confirmation_proofs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Auth upload payment proofs" ON storage.objects;
CREATE POLICY "Auth upload payment proofs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment_proofs');

DROP POLICY IF EXISTS "Auth upload confirmation proofs" ON storage.objects;
CREATE POLICY "Auth upload confirmation proofs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'confirmation_proofs');
