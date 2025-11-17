import OverviewClient from './OverviewClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardAdminPage() {
  return <OverviewClient />;
}

