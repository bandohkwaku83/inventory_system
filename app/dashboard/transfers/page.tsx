'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy route — redirects to warehouse transfers list. */
export default function TransfersRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/warehouse-transfers');
  }, [router]);
  return null;
}
