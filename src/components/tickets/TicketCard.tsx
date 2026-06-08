import { QRCodeSVG } from "qrcode.react";
import { CalendarDays, MapPin, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadTicketPdf } from "@/lib/ticketPdf";

interface Props {
  code: string;
  qrToken: string;
  status?: string;
  holderName?: string;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  issuedAt?: string;
  variant?: "full" | "compact";
}

const statusLabel: Record<string, { label: string; cls: string }> = {
  active: { label: "Ativo", cls: "bg-green-500/10 text-green-600 dark:text-green-400" },
  used: { label: "Utilizado", cls: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelado", cls: "bg-destructive/10 text-destructive" },
};

const TicketCard = ({
  code, qrToken, status = "active", holderName,
  eventTitle, eventDate, eventLocation, issuedAt, variant = "full",
}: Props) => {
  const s = statusLabel[status] || statusLabel.active;
  const handleDownload = () =>
    downloadTicketPdf({ code, qrToken, holderName, eventTitle, eventDate, eventLocation, issuedAt });

  return (
    <div className="bg-background border border-border/50 rounded-xl p-5 flex flex-col sm:flex-row gap-5 items-center">
      <div className="bg-white p-3 rounded-lg shrink-0">
        <QRCodeSVG value={qrToken} size={variant === "full" ? 160 : 120} level="M" />
      </div>
      <div className="flex-1 text-center sm:text-left min-w-0 w-full">
        {eventTitle && <h4 className="font-bold truncate">{eventTitle}</h4>}
        {eventDate && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 justify-center sm:justify-start mt-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {new Date(eventDate).toLocaleString("pt-BR", {
              day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </p>
        )}
        {eventLocation && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 justify-center sm:justify-start">
            <MapPin className="h-3.5 w-3.5" />
            {eventLocation}
          </p>
        )}
        {holderName && (
          <p className="text-xs text-muted-foreground mt-1">Participante: <strong>{holderName}</strong></p>
        )}
        <p className="text-lg font-bold tracking-widest mt-2">{code}</p>
        <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>
          {s.label}
        </span>
        <div className="mt-3 flex justify-center sm:justify-start">
          <Button size="sm" variant="outline" onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" /> Baixar PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TicketCard;
