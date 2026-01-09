import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { Loader2, LogIn, UserPlus, Mail } from 'lucide-react';

const authSchema = z.object({
  email: z.string().trim().email({ message: 'Email inválido' }).max(255, { message: 'Email muito longo' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }).max(72, { message: 'Senha muito longa' }),
});

const resetSchema = z.object({
  email: z.string().trim().email({ message: 'Email inválido' }).max(255, { message: 'Email muito longo' }),
  password: z.string().optional(),
});

type AuthFormData = z.infer<typeof authSchema>;

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, resetPassword, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const form = useForm<AuthFormData>({
    resolver: zodResolver(isReset ? resetSchema : authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true);

    try {
      if (isReset) {
        const { error } = await resetPassword(data.email);
        if (error) {
          toast({ title: error.message, variant: 'destructive' });
          return;
        }
        toast({ title: 'Email de recuperação enviado!', description: 'Verifique sua caixa de entrada.' });
        setIsReset(false);
        setIsLogin(true);
      } else if (isLogin) {
        const { error } = await signIn(data.email, data.password!);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({ title: 'Email ou senha incorretos', variant: 'destructive' });
          } else {
            toast({ title: error.message, variant: 'destructive' });
          }
          return;
        }
        toast({ title: 'Login realizado com sucesso!' });
        navigate('/');
      } else {
        const { error } = await signUp(data.email, data.password!);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast({ title: 'Este email já está cadastrado', variant: 'destructive' });
          } else {
            toast({ title: error.message, variant: 'destructive' });
          }
          return;
        }
        toast({ title: 'Conta criada com sucesso!' });
        navigate('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">T1</span>
            </div>
            <span className="text-2xl font-bold text-foreground">tudo1</span>
          </div>
          <CardTitle className="text-2xl">
            {isReset
              ? 'Recuperar Senha'
              : isLogin
                ? 'Entrar na sua conta'
                : 'Criar uma conta'}
          </CardTitle>
          <CardDescription>
            {isReset
              ? 'Digite seu email para receber o link de recuperação'
              : isLogin
                ? 'Digite seu email e senha para acessar o dashboard'
                : 'Preencha os dados para criar sua conta'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isReset && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete={isLogin ? 'current-password' : 'new-password'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : isReset ? (
                  <Mail className="h-4 w-4 mr-2" />
                ) : isLogin ? (
                  <LogIn className="h-4 w-4 mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                {isReset
                  ? 'Enviar Link'
                  : isLogin
                    ? 'Entrar'
                    : 'Criar conta'}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center space-y-2">
            {!isReset && isLogin && (
              <button
                type="button"
                onClick={() => {
                  setIsReset(true);
                  form.reset();
                }}
                className="text-sm text-primary hover:underline block w-full"
              >
                Esqueceu a senha?
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (isReset) {
                  setIsReset(false);
                  setIsLogin(true);
                } else {
                  setIsLogin(!isLogin);
                }
                form.reset();
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isReset
                ? 'Voltar para o login'
                : isLogin
                  ? 'Não tem uma conta? Criar agora'
                  : 'Já tem uma conta? Fazer login'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
