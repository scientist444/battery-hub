import { requireAdmin } from '@/lib/admin-session';
import { backendFile } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/** Trax air waybill (shipping label) PDF for one parcel, fetched with the admin key. */
export async function GET(_request: Request, { params }: { params: { id: string; index: string } }) {
  await requireAdmin();
  const response = await backendFile('admin', `manage/orders/${encodeURIComponent(params.id)}/shipments/${encodeURIComponent(params.index)}/label`);
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    return new Response(data.error ?? `Could not get the Trax label (${response.status}).`, { status: response.status });
  }
  return new Response(await response.arrayBuffer(), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': response.headers.get('Content-Disposition') ?? 'inline' },
  });
}
