-- Add admin role to usuarioteste2000@bol.com.br
INSERT INTO public.user_roles (user_id, role)
VALUES ('1019969d-2a6e-4191-b43c-14a227dfc392', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Remove admin role from edutm2010@hotmail.com
DELETE FROM public.user_roles WHERE user_id = '9f2caa5a-0d6d-4b0c-9e22-f248f7473c7c';