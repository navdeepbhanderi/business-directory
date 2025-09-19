import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from '@/i18n';
import { useAuthStore } from '@/store/authSlice';

export default function SignUp() {
  const { t } = useLocale();
  const { signIn } = useAuthStore();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    occupation: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock sign up
    signIn('user', 'user1');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('auth.signUp.title')}</CardTitle>
          <CardDescription>
            Create your account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('auth.signUp.name')}</label>
              <Input
                value={formData.name}
                  onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('auth.signUp.email')}</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('auth.signUp.password')}</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e: any) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('auth.signUp.confirmPassword')}</label>
              <Input
                type="password"
                value={formData.confirmPassword}
                onChange={(e: any) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('auth.signUp.age')}</label>
              <Input
                type="number"
                value={formData.age}
                onChange={(e: any) => setFormData({ ...formData, age: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('auth.signUp.occupation')}</label>
              <Input
                value={formData.occupation}
                onChange={(e: any) => setFormData({ ...formData, occupation: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full">
              {t('auth.signUp.title')}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t('auth.signUp.hasAccount')}{' '}
              <Link to="/auth/signin" className="text-primary hover:underline">
                {t('auth.signUp.signIn')}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}