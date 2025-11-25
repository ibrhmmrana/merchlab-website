import { cookies } from 'next/headers';
import { isAuthed } from '@/lib/adminAuth';
import LoginForm from './LoginForm';
import DashboardLayoutClient from './DashboardLayoutClient';

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

  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}

