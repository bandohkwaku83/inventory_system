'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy route — redirects to Stock Management transfers tab. */
export default function TransfersRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/stock?tab=history');
  }, [router]);
  return null;
}
