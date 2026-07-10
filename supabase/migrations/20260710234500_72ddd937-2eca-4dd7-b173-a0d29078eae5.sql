CREATE TABLE public.usuarios_recuperacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_login TEXT NOT NULL UNIQUE,
  email_recuperacao TEXT NOT NULL,
  senha_temporaria BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.usuarios_recuperacao TO authenticated;
GRANT ALL ON public.usuarios_recuperacao TO service_role;

ALTER TABLE public.usuarios_recuperacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário lê sua própria linha"
  ON public.usuarios_recuperacao
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX usuarios_recuperacao_email_login_idx
  ON public.usuarios_recuperacao (lower(email_login));

-- Tabela de rate limiting para /recuperar-senha
CREATE TABLE public.recuperacao_tentativas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.recuperacao_tentativas TO service_role;

ALTER TABLE public.recuperacao_tentativas ENABLE ROW LEVEL SECURITY;

CREATE INDEX recuperacao_tentativas_ip_created_idx
  ON public.recuperacao_tentativas (ip, created_at DESC);
