export function parsePrice(price: string): number {
  const digits = price.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

export function formatRupees(amount: number): string {
  return 'Rs. ' + amount.toLocaleString('en-PK');
}
