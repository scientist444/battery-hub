'use client';

import { useEffect } from 'react';

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
 */
export function AdminAppRegister() {
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
