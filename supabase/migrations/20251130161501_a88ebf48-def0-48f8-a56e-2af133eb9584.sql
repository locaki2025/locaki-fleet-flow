-- Add admin role for first user (edutm2010@hotmail.com)
INSERT INTO public.user_roles (user_id, role)
VALUES ('9f2caa5a-0d6d-4b0c-9e22-f248f7473c7c', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;