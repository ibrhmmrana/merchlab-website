import EmailInboxClient from './EmailInboxClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  robots: { index: false, follow: false },
};

export default function EmailInboxPage() {
  return <EmailInboxClient />;
}

