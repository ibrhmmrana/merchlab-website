import OrdersClient from './OrdersClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return <OrdersClient />;
}

