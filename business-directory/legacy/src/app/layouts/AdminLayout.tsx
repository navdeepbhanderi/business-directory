import { Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authSlice';
import { Navigate } from 'react-router-dom';

export default function AdminLayout() {
  const { role } = useAuthStore();

  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r">
          <div className="p-6">
            <h2 className="text-xl font-bold">Admin Panel</h2>
          </div>
          <nav className="px-4">
            <ul className="space-y-2">
              <li>
                <a href="/admin" className="block px-4 py-2 rounded hover:bg-accent">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="/admin/users" className="block px-4 py-2 rounded hover:bg-accent">
                  Users
                </a>
              </li>
              <li>
                <a href="/admin/listings" className="block px-4 py-2 rounded hover:bg-accent">
                  Listings
                </a>
              </li>
              <li>
                <a href="/admin/reviews" className="block px-4 py-2 rounded hover:bg-accent">
                  Reviews
                </a>
              </li>
              <li>
                <a href="/admin/pricing" className="block px-4 py-2 rounded hover:bg-accent">
                  Pricing
                </a>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}