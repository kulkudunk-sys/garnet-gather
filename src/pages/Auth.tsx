import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

type AuthFormData = {
  email: string;
  password: string;
  username?: string;
  displayName?: string;
};

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const signInForm = useForm<AuthFormData>();
  const signUpForm = useForm<AuthFormData>();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          navigate('/');
        }
      }
    );

    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkUser();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (data: AuthFormData) => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username: data.username,
            full_name: data.displayName
          }
        }
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage('Проверьте вашу электронную почту для подтверждения аккаунта');
        signUpForm.reset();
      }
    } catch (err) {
      setError('Произошла непредвиденная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (data: AuthFormData) => {
    console.log('=== SIGN IN ATTEMPT ===');
    console.log('Data:', data);
    
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      console.log('Calling signInWithPassword...');
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      console.log('SignIn result:', { error });

      if (error) {
        console.error('SignIn error:', error);
        setError('Неверный email или пароль');
      } else {
        console.log('SignIn successful, navigating to /');
        navigate('/');
      }
    } catch (err) {
      console.error('SignIn catch error:', err);
      setError('Произошла непредвиденная ошибка');
    } finally {
      setLoading(false);
      console.log('=== SIGN IN COMPLETE ===');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Добро пожаловать</CardTitle>
          <CardDescription>
            Войдите в аккаунт или создайте новый
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Вход</TabsTrigger>
              <TabsTrigger value="signup">Регистрация</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <form 
                className="space-y-4" 
                noValidate
                onSubmit={signInForm.handleSubmit(
                  (data) => {
                    console.log('=== SIGNIN VALIDATION SUCCESS ===');
                    console.log('Valid data:', data);
                    handleSignIn(data);
                  },
                  (errors) => {
                    console.log('=== SIGNIN VALIDATION ERRORS ===');
                    console.log('Validation errors:', errors);
                  }
                )}
              >
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    {...signInForm.register('email', { required: 'Email обязателен' })}
                  />
                  {signInForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{signInForm.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Пароль"
                    {...signInForm.register('password', { required: 'Пароль обязателен' })}
                  />
                  {signInForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{signInForm.formState.errors.password.message}</p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                  onClick={(e) => {
                    console.log('=== SIGNIN BUTTON CLICKED ===');
                    console.log('Form errors:', signInForm.formState.errors);
                    console.log('Loading state:', loading);
                  }}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Войти
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Имя пользователя"
                    {...signUpForm.register('username', { required: 'Имя пользователя обязательно' })}
                  />
                  {signUpForm.formState.errors.username && (
                    <p className="text-sm text-destructive">{signUpForm.formState.errors.username.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Отображаемое имя"
                    {...signUpForm.register('displayName')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    {...signUpForm.register('email', { required: 'Email обязателен' })}
                  />
                  {signUpForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{signUpForm.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Пароль (минимум 6 символов)"
                    {...signUpForm.register('password', { 
                      required: 'Пароль обязателен',
                      minLength: { value: 6, message: 'Пароль должен содержать минимум 6 символов' }
                    })}
                  />
                  {signUpForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{signUpForm.formState.errors.password.message}</p>
                  )}
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Зарегистрироваться
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          {error && (
            <Alert className="mt-4 border-destructive">
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}
          
          {message && (
            <Alert className="mt-4 border-green-500">
              <AlertDescription className="text-green-700">{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}