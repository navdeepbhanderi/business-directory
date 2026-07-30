import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from '@/i18n';

export default function Otp() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock OTP verification
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('auth.otp.title')}</CardTitle>
          <CardDescription>
            {t('auth.otp.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('auth.otp.code')}</label>
              <Input
                value={code}
                onChange={(e: any) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              {t('auth.otp.verify')}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Button variant="outline" className="w-full">
              {t('auth.otp.resend')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}