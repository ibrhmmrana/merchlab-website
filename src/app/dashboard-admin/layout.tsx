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
  const authed = await isAuthed();

  if (!authed) {
    return <LoginForm />;
  }

  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}

