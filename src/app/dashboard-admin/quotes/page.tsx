import QuotesClient from './QuotesClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  robots: { index: false, follow: false },
};

export default function QuotesPage() {
  return <QuotesClient />;
}

