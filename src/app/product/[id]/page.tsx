import { redirect } from 'next/navigation';

export default function LegacyProductPage({ params }: { params: { id: string } }) {
  redirect(`/products/${params.id}`);
}
