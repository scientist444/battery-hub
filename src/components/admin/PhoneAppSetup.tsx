'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Bell, BellOff, CheckCircle2, Download, Send, Smartphone, Trash2 } from 'lucide-react';
import {
  getPushStatus,
  removePushSubscription,
  savePushSubscription,
  sendTestPush,
  type PushDevice,
} from '@/app/admin/backend-actions';
import { Button } from '@/components/ui/Button';

type Result = { ok: boolean; message: string };

function base64UrlToBytes(value: string) {
  const base64 = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function deviceLabel() {
  const ua = navigator.userAgent;
  const kind = /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android phone' : /Windows/.test(ua) ? 'Windows PC' : /Mac/.test(ua) ? 'Mac' : 'Device';
  return `${kind}, added ${new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

async function getRegistration() {
  return (await navigator.serviceWorker.getRegistration('/admin')) ?? navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' });
}

export function PhoneAppSetup() {
  const [installed, setInstalled] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null | undefined>(undefined);
  const [devices, setDevices] = useState<PushDevice[]>([]);
  const [loadError, setLoadError] = useState<string>();
  const [result, setResult] = useState<Result>();
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    const status = await getPushStatus();
    if ('error' in status) {
      setLoadError(status.error);
      return;
    }
    setLoadError(undefined);
    setPublicKey(status.publicKey);
    setDevices(status.devices);
  }, []);

  useEffect(() => {
    setInstalled(window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true);
    setIsIos(/iPhone|iPad|iPod/.test(navigator.userAgent));
    setCanPrompt(Boolean(window.bhInstallPrompt));
    const onReady = () => setCanPrompt(true);
    const onInstalled = () => setInstalled(true);
    window.addEventListener('bh-install-ready', onReady);
    window.addEventListener('appinstalled', onInstalled);

    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(ok);
    if (ok) {
      setPermission(Notification.permission);
      getRegistration()
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setEndpoint(sub?.endpoint ?? null))
        .catch(() => undefined);
    }
    refresh();
    return () => {
      window.removeEventListener('bh-install-ready', onReady);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [refresh]);

  const install = async () => {
    const prompt = window.bhInstallPrompt;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    window.bhInstallPrompt = undefined;
    setCanPrompt(false);
    if (outcome === 'accepted') setInstalled(true);
  };

  const turnOn = () =>
    startTransition(async () => {
      setResult(undefined);
      if (!publicKey) return;
      const granted = await Notification.requestPermission();
      setPermission(granted);
      if (granted !== 'granted') {
        setResult({ ok: false, message: 'Notifications were blocked. Allow them in the browser settings for this site, then try again.' });
        return;
      }
      try {
        const reg = await getRegistration();
        await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        // A subscription made with an old key cannot receive pushes; replace it.
        if (sub && sub.options.applicationServerKey) {
          const current = new Uint8Array(sub.options.applicationServerKey);
          const wanted = base64UrlToBytes(publicKey);
          if (current.length !== wanted.length || current.some((b, i) => b !== wanted[i])) {
            await sub.unsubscribe();
            sub = null;
          }
        }
        sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) });
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        const saved = await savePushSubscription({ endpoint: json.endpoint, keys: json.keys }, deviceLabel());
        setResult(saved);
        if (saved.ok) setEndpoint(json.endpoint);
        await refresh();
      } catch (error) {
        setResult({ ok: false, message: `Could not turn on notifications: ${error instanceof Error ? error.message : String(error)}` });
      }
    });

  const turnOff = () =>
    startTransition(async () => {
      setResult(undefined);
      const reg = await getRegistration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setEndpoint(null);
      setResult({ ok: true, message: 'Notifications are off for this phone.' });
      await refresh();
    });

  const removeDevice = (device: PushDevice) =>
    startTransition(async () => {
      setResult(await removePushSubscription(device.endpoint));
      if (device.endpoint === endpoint) setEndpoint(null);
      await refresh();
    });

  const test = () => startTransition(async () => setResult(await sendTestPush()));

  const thisDeviceOn = Boolean(endpoint && devices.some((d) => d.endpoint === endpoint));

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-950">
          <Smartphone className="h-5 w-5" /> 1. Install the app
        </h2>
        {installed ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Installed. You are using the Battery HUB Admin app.
          </p>
        ) : canPrompt ? (
          <div className="mt-3">
            <Button onClick={install}>
              <Download className="h-4 w-4" /> Install app
            </Button>
          </div>
        ) : isIos ? (
          <p className="mt-2 text-sm text-slate-600">
            In Safari, tap the Share button, then <b>Add to Home Screen</b>. Open the app from the home screen, then come back to
            this page to turn on notifications (iPhone only allows notifications inside the installed app).
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            Open this page in Chrome on your phone, tap the menu (three dots), then <b>Install app</b> or <b>Add to Home screen</b>.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-950">
          <Bell className="h-5 w-5" /> 2. Order notifications
        </h2>
        {loadError ? (
          <p className="mt-2 text-sm text-red-700">{loadError}</p>
        ) : publicKey === undefined ? (
          <p className="mt-2 text-sm text-slate-500">Checking…</p>
        ) : publicKey === null ? (
          <p className="mt-2 text-sm text-amber-700">
            Not set up yet: the notification keys (vapid-public-key and vapid-private-key) are missing in Azure Key Vault.
          </p>
        ) : !supported ? (
          <p className="mt-2 text-sm text-amber-700">
            This browser cannot get notifications.{isIos ? ' Install the app to the home screen first, then open it from there.' : ' Use Chrome on your phone.'}
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-slate-600">
              {thisDeviceOn
                ? 'This phone gets a notification for every new order, even when the app is closed.'
                : 'Get a notification on this phone for every new order, even when the app is closed.'}
            </p>
            {permission === 'denied' && (
              <p className="text-sm text-amber-700">
                Notifications are blocked for this site. Open the site settings (lock icon or app info), allow Notifications, then reload.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {thisDeviceOn ? (
                <>
                  <Button variant="outline" disabled={pending} onClick={test}>
                    <Send className="h-4 w-4" /> Send test
                  </Button>
                  <Button variant="ghost" disabled={pending} onClick={turnOff}>
                    <BellOff className="h-4 w-4" /> Turn off
                  </Button>
                </>
              ) : (
                <Button disabled={pending || permission === 'denied'} onClick={turnOn}>
                  <Bell className="h-4 w-4" /> Turn on notifications
                </Button>
              )}
            </div>
          </div>
        )}
        {result && <p className={result.ok ? 'mt-3 text-sm text-emerald-700' : 'mt-3 text-sm text-red-700'}>{result.message}</p>}
      </section>

      {devices.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-950">Devices getting notifications</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {devices.map((device) => (
              <li key={device.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-slate-700">
                  {device.label}
                  {device.endpoint === endpoint && <span className="ml-2 text-xs font-semibold text-emerald-700">this device</span>}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => removeDevice(device)}
                  className="flex items-center gap-1 text-slate-500 hover:text-red-600"
                  aria-label={`Remove ${device.label}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
