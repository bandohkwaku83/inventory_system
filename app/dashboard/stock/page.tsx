'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy route — redirects to stock movements ledger. */
export default function StockRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/stock-movements');
  }, [router]);
  return null;
}
