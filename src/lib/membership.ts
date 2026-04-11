export const membershipTypes = [
  { value: "free", label: "Membro Free" },
  { value: "star", label: "Membro Star" },
  { value: "pro", label: "Membro Pro" },
  { value: "hero", label: "Membro Hero" },
] as const;

export const membershipDescriptions: Record<string, string> = {
  star: "O Membro Star tem direito a uma mistery box com brindes de nossos parceiros. Valor: R$ 20,00/mês",
  pro: "O Membro Pro tem direito a uma mistery box com brindes de nossos parceiros e desconto de 50% no ingresso de eventos do portal. Valor: R$ 50,00/mês",
  hero: "O Membro Hero tem direito a uma mistery box com brindes de nossos parceiros e entrada free nos eventos do portal. Valor: R$ 100,00/mês",
};

export const membershipPaymentInfo: Record<string, { label: string; price: string; qrCodeImage: string; pixCode?: string }> = {
  star: { label: "Membro Star", price: "R$ 20,00/mês", qrCodeImage: "/qrcode-star.png", pixCode: "00020126440014br.gov.bcb.pix0122contato3dlux@gmail.com27600016BR.COM.PAGSEGURO0136547301CD-C237-4E21-9A3F-4E96440EE79A520489995303986540520.005802BR5922THIAGO DE MORAES SOUZA6010Ananindeua62290525PAGS0000020002604111652196304CCB8" },
  pro: { label: "Membro Pro", price: "R$ 50,00/mês", qrCodeImage: "/qrcode-pro.png" },
  hero: { label: "Membro Hero", price: "R$ 100,00/mês", qrCodeImage: "/qrcode-hero.png" },
};

export const membershipBadges: Record<string, string> = {
  star: "membro ⭐",
  pro: "membro 🤩",
  hero: "membro 🥇",
};

export function getMembershipBadge(type: string | null | undefined): string | null {
  if (!type || type === "free") return null;
  return membershipBadges[type] || null;
}
