import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from '@/i18n';
import { useAuthStore } from '@/store/authSlice';

export default function SignIn() {
  const { t } = useLocale();
  const { signIn } = useAuthStore();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock sign in - use email to determine role
    if (formData.email === 'admin@demo.com') {
      signIn('admin', 'admin1');
    } else if (formData.email === 'owner@demo.com') {
      signIn('owner', 'owner1');
    } else {
      signIn('user', 'user1');
    }
    navigate('/');
  };

  const handleTestLogin = (role: 'user' | 'owner' | 'admin') => {
    if (role === 'admin') {
      signIn('admin', 'admin1');
    } else if (role === 'owner') {
      signIn('owner', 'owner1');
    } else {
      signIn('user', 'user1');
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('auth.signIn.title')}</CardTitle>
          <CardDescription>
            Enter your credentials to sign in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('auth.signIn.email')}</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('auth.signIn.password')}</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e: any) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              {t('auth.signIn.title')}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t('auth.signIn.noAccount')}{' '}
              <Link to="/auth/signup" className="text-primary hover:underline">
                {t('auth.signIn.signUp')}
              </Link>
            </p>
          </div>
          
          <div className="mt-4 text-center">
            <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
              {t('auth.signIn.guestContinue')}
            </Button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Demo Test Accounts
                </span>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => handleTestLogin('user')}
              >
                Login as User (Ahmed)
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => handleTestLogin('owner')}
              >
                Login as Owner (Fatima)
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => handleTestLogin('admin')}
              >
                Login as Admin (Mohammed)
              </Button>
            </div>
            
            <div className="mt-4 text-xs text-muted-foreground text-center">
              <p>Or use these emails in the form above:</p>
              <p>• user@demo.com (User)</p>
              <p>• owner@demo.com (Owner)</p>
              <p>• admin@demo.com (Admin)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}