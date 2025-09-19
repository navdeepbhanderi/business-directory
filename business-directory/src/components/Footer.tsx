import { Link } from 'react-router-dom';
import { useLocale } from '@/i18n';

export default function Footer() {
  const { t } = useLocale();

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">BD</span>
              </div>
              <span className="font-bold text-xl">Business Directory</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Discover the best businesses in Bahrain. Find restaurants, shops, services, and more.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link to="/search" className="text-muted-foreground hover:text-primary">
                  {t('nav.search')}
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-primary">
                  {t('nav.pricing')}
                </Link>
              </li>
            </ul>
          </div>

          {/* For Business */}
          <div className="space-y-4">
            <h3 className="font-semibold">For Business</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/owner/claim" className="text-muted-foreground hover:text-primary">
                  Claim Your Business
                </Link>
              </li>
              <li>
                <Link to="/owner/register" className="text-muted-foreground hover:text-primary">
                  Register Business
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-primary">
                  Pricing Plans
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="font-semibold">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-primary">
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary">
                  {t('nav.contact')}
                </Link>
              </li>
              <li>
                <span className="text-muted-foreground">
                  {t('demo.notice')}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Business Directory. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}