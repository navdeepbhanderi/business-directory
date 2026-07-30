import { Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authSlice';
import { Navigate } from 'react-router-dom';

export default function OwnerLayout() {
  const { role } = useAuthStore();

  if (role !== 'owner' && role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r">
          <div className="p-6">
            <h2 className="text-xl font-bold">Business Owner</h2>
          </div>
          <nav className="px-4">
            <ul className="space-y-2">
              <li>
                <a href="/owner/dashboard" className="block px-4 py-2 rounded hover:bg-accent">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="/owner/claim" className="block px-4 py-2 rounded hover:bg-accent">
                  Claim Business
                </a>
              </li>
              <li>
                <a href="/owner/register" className="block px-4 py-2 rounded hover:bg-accent">
                  Register Business
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