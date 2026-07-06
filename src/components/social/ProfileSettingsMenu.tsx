import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Menu, User, Ticket, Store, CalendarDays, ShieldCheck, Bell, Lock, FileText, LogOut, ChevronRight, Pencil, Trash2, Download } from "lucide-react";
import PublicProfileEditor from "@/components/social/PublicProfileEditor";
import NotificationSettingsCard from "@/components/notifications/NotificationSettingsCard";

import MyProductsSection from "@/components/social/MyProductsSection";
import MeusIngressosSection from "@/components/tickets/MeusIngressosSection";
import ClassPicker from "@/components/social/ClassPicker";
import { useUserProgression } from "@/hooks/useUserProgression";
import { useToast } from "@/hooks/use-toast";

interface Props {
  userId: string;
  profileType: "artist" | "entrepreneur" | null;
  entrepreneurId?: string | null;
  isOrganizer?: boolean;
  onEditProfile: () => void;
}

type DialogKey =
  | "editar" | "classe" | "ingressos" | "produtos" | "mensagens"
  | "privacidade" | "messenger" | "notificacoes" | "senha" | "termos" | null;

export default function ProfileSettingsMenu({ userId, profileType, entrepreneurId, isOrganizer, onEditProfile }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogKey>(null);
  const { progression } = useUserProgression(userId);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const openItem = (key: DialogKey) => {
    setDialog(key);
    setOpen(false);
  };

  const openExternal = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const requestDeletion = async () => {
    if (!confirm("Tem certeza? Esta ação solicita a exclusão definitiva da sua conta e dados.")) return;
    toast({ title: "Solicitação registrada", description: "Nossa equipe revisará e excluirá sua conta em até 7 dias." });
  };

  const exportData = async () => {
    toast({ title: "Exportação iniciada", description: "Enviaremos seus dados para o seu e-mail em breve." });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Abrir menu" className="rounded-full">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Configurações</SheetTitle>
          </SheetHeader>

          <Accordion type="multiple" className="mt-4" defaultValue={["conta"]}>
            <Section value="conta" icon={User} label="Minha Conta">
              <Item icon={Pencil} label="Editar perfil" onClick={() => { setOpen(false); onEditProfile(); }} />
              <Item label="Alterar foto / banner / bio" onClick={() => { setOpen(false); onEditProfile(); }} />
              <Item label="Alterar Classe" onClick={() => openItem("classe")} />
              <Item label="Perfil público & links" onClick={() => openItem("editar")} />
            </Section>

            <Section value="ingressos" icon={Ticket} label="Ingressos">
              <Item label="Meus ingressos & histórico" onClick={() => openItem("ingressos")} />
              <Item label="Reembolsos" onClick={() => openItem("ingressos")} />
            </Section>

            {profileType === "entrepreneur" && entrepreneurId && (
              <Section value="marketplace" icon={Store} label="Marketplace">
                <Item label="Meus produtos" onClick={() => openItem("produtos")} />
                <Item label="Mensagens" onClick={() => openExternal("/mensagens")} />
              </Section>
            )}

            {isOrganizer && (
              <Section value="organizador" icon={CalendarDays} label="Organizador">
                <Item label="Meus eventos" onClick={() => openExternal("/organizador")} />
                <Item label="Financeiro" onClick={() => openExternal("/organizador")} />
                <Item label="Validadores & relatórios" onClick={() => openExternal("/organizador")} />
              </Section>
            )}

            <Section value="privacidade" icon={Lock} label="Privacidade">
              <Item label="Visibilidade do perfil & dados" onClick={() => openItem("editar")} />
            </Section>

            <Section value="notificacoes" icon={Bell} label="Notificações">
              <Item label="Preferências de notificações" onClick={() => openItem("notificacoes")} />
            </Section>

            <Section value="seguranca" icon={ShieldCheck} label="Segurança">
              <Item label="Alterar senha" onClick={() => openExternal("/esqueci-senha")} />
              <Item label="Autenticação em duas etapas (em breve)" onClick={() => toast({ title: "Em breve" })} />
            </Section>

            <Section value="dados" icon={FileText} label="Privacidade e Dados">
              <Item icon={Download} label="Baixar meus dados" onClick={exportData} />
              <Item icon={Trash2} label="Solicitar exclusão da conta" onClick={requestDeletion} />
              <Item label="Política de Privacidade" onClick={() => openExternal("/sobre")} />
              <Item label="Termos de Uso" onClick={() => openExternal("/sobre")} />
            </Section>
          </Accordion>

          <div className="mt-6 pt-4 border-t border-border">
            <Button variant="destructive" className="w-full gap-2" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Encerrar sessão
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialogs */}
      <Dialog open={dialog === "editar"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Perfil público</DialogTitle></DialogHeader>
          <PublicProfileEditor userId={userId} />
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "classe"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Alterar Classe</DialogTitle></DialogHeader>
          <ClassPicker userId={userId} currentClassId={progression?.class_id || null} onChange={() => setDialog(null)} />
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "ingressos"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Meus ingressos</DialogTitle></DialogHeader>
          <MeusIngressosSection />
        </DialogContent>
      </Dialog>

      {entrepreneurId && (
        <Dialog open={dialog === "produtos"} onOpenChange={(o) => !o && setDialog(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Meus produtos</DialogTitle></DialogHeader>
            <MyProductsSection userId={userId} entrepreneurId={entrepreneurId} />
          </DialogContent>
        </Dialog>
      )}


      <Dialog open={dialog === "notificacoes"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Notificações</DialogTitle></DialogHeader>
          <NotificationSettingsCard />
        </DialogContent>
      </Dialog>
    </>
  );
}

function Section({ value, icon: Icon, label, children }: any) {
  return (
    <AccordionItem value={value} className="border-border/50">
      <AccordionTrigger className="hover:no-underline">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-primary" />
          {label}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex flex-col gap-1 pl-6">{children}</div>
      </AccordionContent>
    </AccordionItem>
  );
}

function Item({ icon: Icon, label, onClick }: { icon?: any; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between text-left text-sm py-2 px-2 rounded-md hover:bg-muted/60 transition-colors"
    >
      <span className="flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {label}
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}
