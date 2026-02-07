'use client';

import React, { useState, useEffect } from 'react';
import Loader from './Loader';

interface LoaderProviderProps {
  children: React.ReactNode;
}

export default function LoaderProvider({ children }: LoaderProviderProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Loader isLoading={isLoading} />
      <div
        className={`min-h-screen transition-opacity duration-500 ease-out ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {children}
      </div>
    </>
  );
}
