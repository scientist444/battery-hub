import type { Metadata } from 'next';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-session';
import { LoginForm } from '@/components/admin/LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect('/admin');

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <Image src="/BH LOGO.png" alt="" width={40} height={40} className="h-10 w-10 rounded-lg object-contain" />
          <div>
            <p className="text-base font-bold text-slate-950">Battery HUB</p>
            <p className="text-xs text-slate-500">Admin sign in</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
