import InvoicesClient from './InvoicesClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  robots: { index: false, follow: false },
};

export default function InvoicesPage() {
  return <InvoicesClient />;
}

