import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isAuthed } from '@/lib/adminAuth';
import Sidebar from './Sidebar';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';
export const metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  
  // Create a mock request-like object to check auth
  const mockRequest = {
    cookies: {
      get: (name: string) => cookieStore.get(name),
    },
  };
  
  // Check if authenticated
  const authed = isAuthed(mockRequest);

  if (!authed) {
    return <LoginForm />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

