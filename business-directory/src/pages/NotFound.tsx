import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLocale } from '@/i18n';

export default function NotFound() {
  const { t } = useLocale();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center">
          <div className="text-6xl font-bold text-muted-foreground mb-4">404</div>
          <h1 className="text-2xl font-bold mb-2">{t('notFound.title')}</h1>
          <p className="text-muted-foreground mb-6">{t('notFound.subtitle')}</p>
          <Button asChild>
            <Link to="/">{t('notFound.goHome')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}