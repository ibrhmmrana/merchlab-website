import { Suspense } from "react";
import CartClient from "./CartClient";

export const dynamic = 'force-dynamic';

export default function CartPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-6">Loading cart…</div>}>
      <CartClient />
    </Suspense>
  );
}
