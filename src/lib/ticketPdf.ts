import { jsPDF } from "jspdf";

export interface TicketPdfData {
  code: string;
  qrToken: string;
  holderName?: string;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  issuedAt?: string;
}

const renderQrDataUrl = async (value: string, size = 512): Promise<string> => {
  const { QRCodeSVG } = await import("qrcode.react");
  const ReactDOMServer = (await import("react-dom/server")).default;
  const React = (await import("react")).default;
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(QRCodeSVG, { value, size, level: "M", includeMargin: true }) as any
  );
  // Convert SVG to PNG via canvas
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = rej;
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const downloadTicketPdf = async (t: TicketPdfData) => {
  const qr = await renderQrDataUrl(t.qrToken, 600);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("AMAZÔNIA POP", 15, 19);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Ingresso Oficial", W - 15, 19, { align: "right" });

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  const title = doc.splitTextToSize(t.eventTitle || "Evento", W - 30);
  doc.text(title, 15, 48);

  // Meta
  let y = 48 + title.length * 8 + 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  if (t.eventDate) {
    doc.text(`Data: ${new Date(t.eventDate).toLocaleString("pt-BR")}`, 15, y); y += 7;
  }
  if (t.eventLocation) {
    const loc = doc.splitTextToSize(`Local: ${t.eventLocation}`, W - 30);
    doc.text(loc, 15, y); y += loc.length * 6 + 1;
  }
  if (t.holderName) {
    doc.text(`Participante: ${t.holderName}`, 15, y); y += 7;
  }
  if (t.issuedAt) {
    doc.text(`Emitido em: ${new Date(t.issuedAt).toLocaleString("pt-BR")}`, 15, y); y += 7;
  }

  // QR
  const qrSize = 90;
  const qrX = (W - qrSize) / 2;
  const qrY = y + 8;
  doc.setDrawColor(220);
  doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 3, 3);
  doc.addImage(qr, "PNG", qrX, qrY, qrSize, qrSize);

  // Code
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(15, 23, 42);
  doc.text(t.code, W / 2, qrY + qrSize + 18, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text("Apresente este QR Code na entrada do evento.", W / 2, qrY + qrSize + 26, { align: "center" });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Ingresso pessoal e intransferível • Amazônia Pop", W / 2, 287, { align: "center" });

  doc.save(`ingresso-${t.code}.pdf`);
};
