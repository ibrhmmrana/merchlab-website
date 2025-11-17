import CustomersClient from './CustomersClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  robots: { index: false, follow: false },
};

export default function CustomersPage() {
  return <CustomersClient />;
}

