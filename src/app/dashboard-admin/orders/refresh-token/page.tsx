import { Suspense } from 'react';
import RefreshTokenClient from './RefreshTokenClient';

export default function RefreshTokenPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <RefreshTokenClient />
    </Suspense>
  );
}

