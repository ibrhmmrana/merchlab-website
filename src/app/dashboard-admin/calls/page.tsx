import CallsClient from './CallsClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  robots: { index: false, follow: false },
};

export default function CallsPage() {
  return <CallsClient />;
}
