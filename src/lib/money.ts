export const centsToBRL = (cents: number | null | undefined): string => {
  const value = (cents ?? 0) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const brlToCents = (input: string): number => {
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
};

export const formatBRLInput = (cents: number): string =>
  (cents / 100).toFixed(2).replace(".", ",");
