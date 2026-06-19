import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Camera, StopCircle, Play, Pause, RefreshCw, Volume2, VolumeX,
  Zap, ZapOff, Search, CheckCircle, AlertCircle, XCircle, Loader2, Users,
  ShieldAlert, Gift,
} from "lucide-react";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Result =
  | { kind: "valid"; ticket: any }
  | { kind: "used"; ticket: any }
  | { kind: "cancelled"; ticket: any }
  | { kind: "notfound"; code: string }
  | { kind: "pending"; ticket: any; category: any }
  | null;

interface Props {
  eventId: string;
}

const KIND_LABEL: Record<string, { label: string; icon: string }> = {
  full: { label: "Inteira", icon: "🎫" },
  half: { label: "Meia", icon: "🎟️" },
  solidarity: { label: "Solidário", icon: "🎁" },
  pcd: { label: "PCD", icon: "♿" },
  elderly: { label: "Idoso", icon: "👴" },
  courtesy: { label: "Cortesia", icon: "✨" },
};

const beep = (audioCtx: AudioContext, freq: number, duration = 120) => {
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  o.connect(g);
  g.connect(audioCtx.destination);
  g.gain.setValueAtTime(0.001, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration / 1000);
  o.start();
  o.stop(audioCtx.currentTime + duration / 1000);
};

const ContinuousScanner = ({ eventId }: Props) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "continuous-scanner-container";
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastScansRef = useRef<Map<string, number>>(new Map());
  const currentCamRef = useRef<string | null>(null);
  const cooldownRef = useRef<boolean>(false);
  const resultTimeoutRef = useRef<number | null>(null);

  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [soundOn, setSoundOn] = useState<boolean>(() => localStorage.getItem("scanner-sound") !== "0");
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [stats, setStats] = useState({ total: 0, validated: 0, remaining: 0 });
  const [manualCode, setManualCode] = useState("");
  const [docChecked, setDocChecked] = useState(false);
  const [donationChecked, setDonationChecked] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const playSound = (kind: "valid" | "used" | "notfound" | "pending") => {
    if (!soundOn) return;
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return; }
    }
    const ctx = audioCtxRef.current!;
    if (kind === "valid") beep(ctx, 880, 120);
    if (kind === "pending") beep(ctx, 700, 200);
    if (kind === "used") {
      beep(ctx, 660, 100);
      setTimeout(() => beep(ctx, 660, 100), 150);
    }
    if (kind === "notfound") {
      beep(ctx, 200, 150);
      setTimeout(() => beep(ctx, 180, 150), 170);
      setTimeout(() => beep(ctx, 160, 200), 340);
    }
  };

  const refreshStats = useCallback(async () => {
    const { data } = await supabase.rpc("validator_event_summary", { _event_id: eventId });
    if (data && data[0]) {
      setStats({
        total: data[0].tickets_total ?? 0,
        validated: data[0].tickets_validated ?? 0,
        remaining: data[0].tickets_remaining ?? 0,
      });
    }
  }, [eventId]);

  useEffect(() => {
    refreshStats();
    const ch = supabase
      .channel(`scanner-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets", filter: `event_id=eq.${eventId}` },
        () => refreshStats(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [eventId, refreshStats]);

  const pauseSafe = async (yes: boolean) => {
    try {
      if (!scannerRef.current) return;
      if (yes && !paused) { await scannerRef.current.pause(true); setPaused(true); }
      if (!yes && paused) { await scannerRef.current.resume(); setPaused(false); }
    } catch {}
  };

  const finalizeUsed = async (ticketId: string, extra: Record<string, any> = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: updated, error } = await supabase
      .from("tickets" as any)
      .update({
        status: "used",
        used_at: new Date().toISOString(),
        used_by: session?.user.id,
        ...extra,
      } as any)
      .eq("id", ticketId)
      .select("*, events:event_id(title,event_date,location)")
      .single();
    if (error) throw error;
    return updated;
  };

  const validate = useCallback(async (decoded: string) => {
    const value = (decoded || "").trim();
    if (!value) return;

    const last = lastScansRef.current.get(value);
    const now = Date.now();
    if (last && now - last < 3000) return;
    lastScansRef.current.set(value, now);
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 400);

    setBusy(true);
    try {
      const isUuid = UUID_RE.test(value);
      const query = supabase
        .from("tickets" as any)
        .select("*, events:event_id(title,event_date,location), category:category_id(id,name,kind,requires_document,requires_donation,donation_description)")
        .eq("event_id", eventId);
      const { data: t } = isUuid
        ? await query.eq("qr_token", value).maybeSingle()
        : await query.eq("code", value.toUpperCase()).maybeSingle();

      let res: Result;
      let logResult: "valid" | "used" | "cancelled" | "notfound" = "notfound";
      let ticketId: string | null = null;
      let participant: string | null = null;

      if (!t) {
        res = { kind: "notfound", code: value };
      } else {
        ticketId = (t as any).id;
        participant = (t as any).holder_name;
        const status = (t as any).status;
        const cat = (t as any).category;
        const needsVerification = cat && (cat.requires_document || cat.requires_donation);

        if (status === "used") {
          res = { kind: "used", ticket: t };
          logResult = "used";
        } else if (status === "cancelled") {
          res = { kind: "cancelled", ticket: t };
          logResult = "cancelled";
        } else if (needsVerification) {
          // 2-step: pause scan, await human confirmation
          setDocChecked(false);
          setDonationChecked(false);
          await pauseSafe(true);
          res = { kind: "pending", ticket: t, category: cat };
          playSound("pending");
          setResult(res);
          setBusy(false);
          return;
        } else {
          const updated = await finalizeUsed((t as any).id);
          res = { kind: "valid", ticket: updated };
          logResult = "valid";
        }
      }

      await supabase.rpc("log_validation", {
        _event_id: eventId,
        _ticket_id: ticketId,
        _participant_name: participant,
        _scanned_code: value,
        _result: logResult,
        _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      });

      playSound(logResult === "valid" ? "valid" : logResult === "used" ? "used" : "notfound");
      setResult(res);
      if (resultTimeoutRef.current) window.clearTimeout(resultTimeoutRef.current);
      resultTimeoutRef.current = window.setTimeout(() => setResult(null), 2000);
      refreshStats();
    } catch {
      // silently keep scanning
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, refreshStats, soundOn, paused]);

  const confirmPending = async () => {
    if (!result || result.kind !== "pending") return;
    const cat = result.category;
    if (cat.requires_document && !docChecked) return;
    if (cat.requires_donation && !donationChecked) return;
    setConfirming(true);
    try {
      const extra: Record<string, any> = {};
      if (cat.requires_document) extra.document_verified_at = new Date().toISOString();
      if (cat.requires_donation) extra.donation_verified_at = new Date().toISOString();
      const updated = await finalizeUsed(result.ticket.id, extra);
      await supabase.rpc("log_validation", {
        _event_id: eventId,
        _ticket_id: result.ticket.id,
        _participant_name: result.ticket.holder_name,
        _scanned_code: result.ticket.code,
        _result: "valid",
        _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      });
      playSound("valid");
      setResult({ kind: "valid", ticket: updated });
      if (resultTimeoutRef.current) window.clearTimeout(resultTimeoutRef.current);
      resultTimeoutRef.current = window.setTimeout(() => setResult(null), 2000);
      refreshStats();
    } catch {
      // ignore
    } finally {
      setConfirming(false);
      await pauseSafe(false);
    }
  };

  const cancelPending = async () => {
    setResult(null);
    await pauseSafe(false);
  };

  const startScan = async (deviceId?: string) => {
    setResult(null);
    setRunning(true);
    setPaused(false);
    setTimeout(async () => {
      try {
        if (cameras.length === 0) {
          try {
            const devs = await Html5Qrcode.getCameras();
            setCameras(devs.map((d) => ({ id: d.id, label: d.label || "Câmera" })));
          } catch {}
        }
        const s = new Html5Qrcode(containerId);
        scannerRef.current = s;
        const config = { fps: 12, qrbox: { width: 260, height: 260 } };
        const cameraConfig: any = deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "environment" };
        await s.start(
          cameraConfig,
          config,
          (decoded) => { validate(decoded); },
          () => {},
        );
        currentCamRef.current = deviceId || null;
        try { setTorchSupported(true); } catch { setTorchSupported(false); }
      } catch {
        setRunning(false);
      }
    }, 50);
  };

  const stopScan = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
    } catch {}
    setRunning(false);
    setPaused(false);
    setTorchOn(false);
  };

  const pauseScan = async () => {
    try {
      if (scannerRef.current && !paused) {
        await scannerRef.current.pause(true);
        setPaused(true);
      } else if (scannerRef.current && paused) {
        await scannerRef.current.resume();
        setPaused(false);
      }
    } catch {}
  };

  const restartScan = async () => {
    await stopScan();
    setTimeout(() => startScan(currentCamRef.current || undefined), 200);
  };

  const switchCamera = async () => {
    if (cameras.length < 2) return;
    const idx = cameras.findIndex((c) => c.id === currentCamRef.current);
    const next = cameras[(idx + 1) % cameras.length];
    await stopScan();
    setTimeout(() => startScan(next.id), 200);
  };

  const toggleTorch = async () => {
    try {
      const video: HTMLVideoElement | null = document.querySelector(`#${containerId} video`);
      const stream = (video?.srcObject as MediaStream | null);
      const track = stream?.getVideoTracks?.()[0];
      if (!track) return;
      // @ts-ignore
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(!torchOn);
    } catch {
      setTorchSupported(false);
    }
  };

  const toggleSound = () => {
    const v = !soundOn;
    setSoundOn(v);
    localStorage.setItem("scanner-sound", v ? "1" : "0");
  };

  useEffect(() => () => {
    if (scannerRef.current) scannerRef.current.stop().catch(() => {});
    if (resultTimeoutRef.current) window.clearTimeout(resultTimeoutRef.current);
  }, []);

  const renderModalityBadge = (ticket: any) => {
    const kind = ticket?.category_kind || ticket?.category?.kind;
    const name = ticket?.category_name || ticket?.category?.name;
    if (!kind) return null;
    const meta = KIND_LABEL[kind] || { label: name, icon: "🎫" };
    return (
      <p className="text-xs opacity-90">
        {meta.icon} {name || meta.label}
        {ticket?.batch_name ? ` • ${ticket.batch_name}` : ""}
      </p>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" /> Total</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-center">
          <div className="text-xs text-green-700 dark:text-green-400">✅ Validados</div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.validated}</div>
        </div>
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-center">
          <div className="text-xs text-yellow-700 dark:text-yellow-400">⏳ Restantes</div>
          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.remaining}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!running ? (
          <Button onClick={() => startScan()} className="gap-2">
            <Camera className="h-4 w-4" /> Iniciar Scanner
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={pauseScan} className="gap-2">
              {paused ? <><Play className="h-4 w-4" /> Retomar</> : <><Pause className="h-4 w-4" /> Pausar</>}
            </Button>
            <Button variant="outline" onClick={restartScan} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Reiniciar
            </Button>
            {cameras.length > 1 && (
              <Button variant="outline" onClick={switchCamera} className="gap-2">
                <Camera className="h-4 w-4" /> Trocar
              </Button>
            )}
            {torchSupported && (
              <Button variant="outline" onClick={toggleTorch} className="gap-2">
                {torchOn ? <ZapOff className="h-4 w-4" /> : <Zap className="h-4 w-4" />} Flash
              </Button>
            )}
            <Button variant="destructive" onClick={stopScan} className="gap-2">
              <StopCircle className="h-4 w-4" /> Parar
            </Button>
          </>
        )}
        <Button variant="ghost" onClick={toggleSound} className="gap-2 ml-auto">
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          {soundOn ? "Som ativo" : "Som mudo"}
        </Button>
      </div>

      <div className="relative bg-card border border-border rounded-xl overflow-hidden">
        <div id={containerId} className="w-full min-h-[320px]" />
        {!running && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            Clique em "Iniciar Scanner" para abrir a câmera.
          </div>
        )}
        {busy && (
          <div className="absolute top-3 right-3 bg-background/80 rounded-full p-2">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}

        {result && result.kind !== "pending" && (
          <div
            className={`absolute inset-x-0 bottom-0 p-4 text-center backdrop-blur-md border-t-4 animate-in fade-in slide-in-from-bottom duration-200 ${
              result.kind === "valid"
                ? "bg-green-500/90 border-green-700 text-white"
                : result.kind === "used"
                ? "bg-yellow-400/95 border-yellow-600 text-black"
                : "bg-red-500/95 border-red-700 text-white"
            }`}
          >
            {result.kind === "valid" && (
              <>
                <div className="flex items-center justify-center gap-2 font-bold text-lg"><CheckCircle className="h-6 w-6" /> Ingresso Válido</div>
                <p className="text-sm mt-1"><strong>{result.ticket.holder_name}</strong></p>
                {renderModalityBadge(result.ticket)}
                <p className="text-xs opacity-90">{result.ticket.events?.title} • {new Date().toLocaleTimeString("pt-BR")}</p>
                <p className="text-xs opacity-90">Código: {result.ticket.code}</p>
              </>
            )}
            {result.kind === "used" && (
              <>
                <div className="flex items-center justify-center gap-2 font-bold text-lg"><AlertCircle className="h-6 w-6" /> Ingresso Já Utilizado</div>
                <p className="text-sm mt-1"><strong>{result.ticket.holder_name}</strong></p>
                {renderModalityBadge(result.ticket)}
                <p className="text-xs opacity-90">Validado em {result.ticket.used_at ? new Date(result.ticket.used_at).toLocaleString("pt-BR") : "—"}</p>
              </>
            )}
            {result.kind === "cancelled" && (
              <>
                <div className="flex items-center justify-center gap-2 font-bold text-lg"><XCircle className="h-6 w-6" /> Ingresso Cancelado</div>
                <p className="text-xs opacity-90">Código: {result.ticket.code}</p>
              </>
            )}
            {result.kind === "notfound" && (
              <>
                <div className="flex items-center justify-center gap-2 font-bold text-lg"><XCircle className="h-6 w-6" /> Ingresso Não Encontrado</div>
                <p className="text-xs opacity-90">Código lido: {result.code}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* 2-step verification modal-like card */}
      {result && result.kind === "pending" && (
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border-2 border-yellow-500 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300 font-bold">
            <ShieldAlert className="h-5 w-5" /> Verificação Obrigatória
          </div>
          <div className="text-sm space-y-1">
            <p><strong>{result.ticket.holder_name}</strong></p>
            <p className="text-muted-foreground">
              Modalidade: <strong>{KIND_LABEL[result.category.kind]?.icon} {result.category.name}</strong>
            </p>
            <p className="text-xs text-muted-foreground">Código: {result.ticket.code}</p>
          </div>

          <div className="space-y-3 border-t border-yellow-300/50 pt-3">
            {result.category.requires_document && (
              <label className="flex items-start gap-2 cursor-pointer text-sm">
                <Checkbox checked={docChecked} onCheckedChange={(v) => setDocChecked(!!v)} className="mt-0.5" />
                <span>
                  <strong>Conferir documento</strong> que comprove a modalidade
                  {result.category.kind === "half" && " (carteira de estudante, etc.)"}
                  {result.category.kind === "pcd" && " (laudo/CIPCD)"}
                  {result.category.kind === "elderly" && " (RG / documento com idade)"}
                  .
                </span>
              </label>
            )}
            {result.category.requires_donation && (
              <label className="flex items-start gap-2 cursor-pointer text-sm">
                <Checkbox checked={donationChecked} onCheckedChange={(v) => setDonationChecked(!!v)} className="mt-0.5" />
                <span className="flex items-start gap-1">
                  <Gift className="h-4 w-4 text-pink-600 mt-0.5" />
                  <span>
                    <strong>Receber doação:</strong>{" "}
                    {result.category.donation_description || "conforme descrição da modalidade"}.
                  </span>
                </span>
              </label>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={cancelPending} disabled={confirming}>
              Cancelar
            </Button>
            <Button
              onClick={confirmPending}
              disabled={
                confirming ||
                (result.category.requires_document && !docChecked) ||
                (result.category.requires_donation && !donationChecked)
              }
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              {confirming && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle className="h-4 w-4" /> Confirmar e Validar
            </Button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Search className="h-4 w-4" /> Buscar por código
        </div>
        <div className="flex gap-2">
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="AP-000001"
            onKeyDown={(e) => { if (e.key === "Enter" && manualCode.trim()) { validate(manualCode.trim()); setManualCode(""); } }}
          />
          <Button
            onClick={() => { if (manualCode.trim()) { validate(manualCode.trim()); setManualCode(""); } }}
            disabled={!manualCode.trim() || busy}
          >
            Validar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContinuousScanner;
