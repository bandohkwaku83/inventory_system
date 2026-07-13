'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy route — redirects to the Warehouses page. */
export default function LocationsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/warehouses');
  }, [router]);
  return null;
}
