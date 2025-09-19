import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useUIStore } from '@/store/uiSlice';
import { useEffect } from 'react';

// Layouts
import SiteLayout from '@/app/layouts/SiteLayout';
import AdminLayout from '@/app/layouts/AdminLayout';
import OwnerLayout from '@/app/layouts/OwnerLayout';

// Pages
import Home from '@/pages/Home';
import Search from '@/pages/Search';
import BusinessProfile from '@/pages/BusinessProfile';
import SignIn from '@/pages/Auth/SignIn';
import SignUp from '@/pages/Auth/SignUp';
import Otp from '@/pages/Auth/Otp';
import Lists from '@/pages/Account/Lists';
import Notifications from '@/pages/Account/Notifications';
import Claim from '@/pages/Owner/Claim';
import Register from '@/pages/Owner/Register';
import Dashboard from '@/pages/Owner/Dashboard';
import Admin from '@/pages/Admin';
import Pricing from '@/pages/Pricing';
import NotFound from '@/pages/NotFound';

function App() {
  const { theme, locale } = useUIStore();

  useEffect(() => {
    // Apply theme
    document.documentElement.classList.toggle('dark', theme === 'dark');
    
    // Apply locale direction
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }, [theme, locale]);

  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground">
        <Routes>
          {/* Public routes with site layout */}
          <Route path="/" element={<SiteLayout />}>
            <Route index element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route path="business/:slug" element={<BusinessProfile />} />
            <Route path="pricing" element={<Pricing />} />
          </Route>

          {/* Auth routes */}
          <Route path="/auth" element={<SiteLayout />}>
            <Route path="signin" element={<SignIn />} />
            <Route path="signup" element={<SignUp />} />
            <Route path="otp" element={<Otp />} />
          </Route>

          {/* Account routes */}
          <Route path="/account" element={<SiteLayout />}>
            <Route path="lists" element={<Lists />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>

          {/* Owner routes */}
          <Route path="/owner" element={<OwnerLayout />}>
            <Route path="claim" element={<Claim />} />
            <Route path="register" element={<Register />} />
            <Route path="dashboard" element={<Dashboard />} />
          </Route>

          {/* Admin routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Admin />} />
          </Route>

          {/* 404 route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        
        <Toaster position="top-right" />
      </div>
    </Router>
  );
}

export default App;
