import { Settings } from "lucide-react";

const AdminSettingsPanel = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <Settings className="h-5 w-5 text-primary" />
        Configurações Gerais
      </h2>
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div>
          <h3 className="font-semibold mb-1">Identidade da Plataforma</h3>
          <p className="text-sm text-muted-foreground">Amazônia Pop · Pará</p>
        </div>
        <div>
          <h3 className="font-semibold mb-1">Taxa Global da Plataforma</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie a taxa global no painel <strong>Gateway de Pagamento</strong>.
          </p>
        </div>
        <div>
          <h3 className="font-semibold mb-1">Banco de Dados</h3>
          <p className="text-sm text-muted-foreground">
            Acesse exportações e backups no painel <strong>Banco de Dados</strong>.
          </p>
        </div>
        <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
          Novas configurações serão adicionadas aqui conforme demanda.
        </p>
      </div>
    </div>
  );
};

export default AdminSettingsPanel;
