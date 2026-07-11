'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Loader from './Loader';

export type ActionStatus = 'idle' | 'loading' | 'success';

interface ActionLoaderContextValue {
  /** Full-screen splash on first app load */
  isBootLoading: boolean;
  /** In-progress mutation (shown under dashboard header) */
  isActionLoading: boolean;
  /** idle | loading | success — success flashes briefly after a completed action */
  actionStatus: ActionStatus;
  runWithLoader: <T>(fn: () => Promise<T>) => Promise<T>;
}

const ActionLoaderContext = createContext<ActionLoaderContextValue | null>(null);

export function useActionLoader() {
  const ctx = useContext(ActionLoaderContext);
  if (!ctx) throw new Error('useActionLoader must be used within LoaderProvider');
  return ctx;
}

interface LoaderProviderProps {
  children: React.ReactNode;
}

const SUCCESS_FLASH_MS = 1800;

export default function LoaderProvider({ children }: LoaderProviderProps) {
  // Start loading on both server and client so the first paint matches.
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState<ActionStatus>('idle');
  const pendingRef = useRef(0);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBootLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const runWithLoader = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }

    pendingRef.current += 1;
    setActionStatus('loading');
    try {
      const result = await fn();
      pendingRef.current = Math.max(0, pendingRef.current - 1);
      if (pendingRef.current === 0) {
        setActionStatus('success');
        successTimerRef.current = setTimeout(() => {
          setActionStatus('idle');
          successTimerRef.current = null;
        }, SUCCESS_FLASH_MS);
      }
      return result;
    } catch (error) {
      pendingRef.current = Math.max(0, pendingRef.current - 1);
      if (pendingRef.current === 0) {
        setActionStatus('idle');
      }
      throw error;
    }
  }, []);

  const isActionLoading = actionStatus === 'loading';

  const value = useMemo(
    () => ({ isBootLoading, isActionLoading, actionStatus, runWithLoader }),
    [isBootLoading, isActionLoading, actionStatus, runWithLoader]
  );

  return (
    <ActionLoaderContext.Provider value={value}>
      <Loader isLoading={isBootLoading} />
      <div
        className={`min-h-viewport min-h-screen w-full min-w-0 transition-opacity duration-500 ease-out ${
          isBootLoading ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {children}
      </div>
    </ActionLoaderContext.Provider>
  );
}
