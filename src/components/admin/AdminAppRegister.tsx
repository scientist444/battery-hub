'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    bhInstallPrompt?: InstallPromptEvent;
  }
}

/**
 * Registers the admin app's service worker (makes the admin installable and shows order notifications),
 * and keeps Chrome's install prompt so the Phone app page can offer an Install button later.
 * Also reloads the page's data when the app comes back to the screen or a new order arrives.
 */
export function AdminAppRegister() {
  const router = useRouter();

  useEffect(() => {
    let last = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 30_000) return;
      last = Date.now();
      router.refresh();
    };
    const onMessage = (event: MessageEvent) => {
      if ((event.data as { type?: string })?.type === 'new-order') router.refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, [router]);

  useEffect(() => {
    const keepPrompt = (event: Event) => {
      event.preventDefault();
      window.bhInstallPrompt = event as InstallPromptEvent;
      window.dispatchEvent(new Event('bh-install-ready'));
    };
    window.addEventListener('beforeinstallprompt', keepPrompt);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' }).catch((error) => console.error('Admin app service worker failed', error));
    }
    return () => window.removeEventListener('beforeinstallprompt', keepPrompt);
  }, []);
  return null;
}
