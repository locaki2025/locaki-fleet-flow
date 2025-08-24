import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LoginDialog = ({ open, onOpenChange }: LoginDialogProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        toast({
          title: "Erro de autenticação",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: isSignUp ? "Conta criada!" : "Login realizado!",
          description: isSignUp 
            ? "Verifique seu email para confirmar a conta" 
            : "Bem-vindo ao LOCAKI"
        });
        onOpenChange(false);
        setEmail('');
        setPassword('');
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isSignUp ? 'Criar Conta' : 'Entrar no LOCAKI'}</DialogTitle>
          <DialogDescription>
            {isSignUp 
              ? 'Crie sua conta para gerenciar sua locadora' 
              : 'Entre com suas credenciais para continuar'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              required
              minLength={6}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-primary hover:opacity-90"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSignUp ? 'Criar Conta' : 'Entrar'}
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp 
              ? 'Já tem uma conta? Faça login' 
              : 'Não tem conta? Crie uma'
            }
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;