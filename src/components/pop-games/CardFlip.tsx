import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { JOANO_DEFAULT_BACK } from "@/lib/joano";

interface CardFlipProps {
  frontUrl?: string | null;
  backUrl?: string | null;
  /** Verso padrão do jogo (ex.: `games.default_card_back_url`). Usado como fallback antes do padrão do Joano. */
  gameBackUrl?: string | null;
  alt?: string;
  className?: string;
  /** Se true, inicia mostrando o verso. */
  startFlipped?: boolean;
  /** Se true, vira ao clicar. Se false, o pai controla via `flipped`. */
  interactive?: boolean;
  flipped?: boolean;
  onFlipChange?: (flipped: boolean) => void;
}

/**
 * Card com animação 3D de virar (frente/verso). Suporta touch e clique.
 * Fallback do verso: back_image_url → games.default_card_back_url → verso padrão do Joano.
 */
export default function CardFlip({
  frontUrl,
  backUrl,
  gameBackUrl,
  alt = "Carta",
  className,
  startFlipped = false,
  interactive = true,
  flipped: flippedProp,
  onFlipChange,
}: CardFlipProps) {
  const [internal, setInternal] = useState(startFlipped);
  const flipped = flippedProp ?? internal;

  const back = backUrl || gameBackUrl || JOANO_DEFAULT_BACK;

  const toggle = useCallback(() => {
    if (!interactive) return;
    const next = !flipped;
    if (flippedProp === undefined) setInternal(next);
    onFlipChange?.(next);
  }, [interactive, flipped, flippedProp, onFlipChange]);

  return (
    <div
      className={cn("relative aspect-[3/4] w-full select-none", interactive && "cursor-pointer", className)}
      style={{ perspective: "1000px" }}
      onClick={toggle}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(e) => { if (interactive && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggle(); } }}
      aria-label={interactive ? `Virar ${alt}` : alt}
    >
      <div
        className="relative w-full h-full transition-transform duration-500 ease-out"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Frente */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden border border-border bg-secondary"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
        >
          {frontUrl ? (
            <img src={frontUrl} alt={alt} className="w-full h-full object-cover" draggable={false} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🎴</div>
          )}
        </div>
        {/* Verso */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden border border-border bg-secondary"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <img src={back} alt="Verso" className="w-full h-full object-cover" draggable={false} />
        </div>
      </div>
    </div>
  );
}
