import { useEffect, useState, useCallback } from "react";
import { Smartphone, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    if (("standalone" in window.navigator) && window.navigator.standalone === true) {
      setInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  if (installed) {
    return (
      <p className="text-sm text-muted-foreground">Aplicativo instalado.</p>
    );
  }

  return (
    <div className="space-y-3">
      {deferredPrompt ? (
        <Button
          variant="outline"
          className="w-full justify-start gap-2 rounded-lg"
          onClick={handleInstall}
        >
          <Download className="h-4 w-4" />
          Instalar Aplicativo
        </Button>
      ) : isIOS ? (
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <Smartphone className="h-4 w-4" />
            Instale no iPhone
          </p>
          <p>Toque em <span className="font-semibold text-foreground">Compartilhar</span> e depois em <span className="font-semibold text-foreground">Adicionar à Tela de Início</span>.</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Para instalar, use o menu do navegador ou compartilhe a página e selecione "Adicionar à tela inicial".
        </p>
      )}
    </div>
  );
}
