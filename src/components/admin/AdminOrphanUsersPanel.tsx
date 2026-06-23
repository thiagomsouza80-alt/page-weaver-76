import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface OrphanUser {
  id: string;
  email: string;
  created_at: string;
}

const AdminOrphanUsersPanel = () => {
  const [orphans, setOrphans] = useState<OrphanUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchOrphans = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("manage-orphan-users?action=list", {
        method: "GET",
      });

      if (error) throw error;
      setOrphans(data.orphans ?? []);
    } catch (err: any) {
      toast.error("Erro ao carregar usuários órfãos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrphans();
  }, []);

  const handleDelete = async (userId: string) => {
    setDeletingId(userId);
    try {
      const { data, error } = await supabase.functions.invoke("manage-orphan-users", {
        method: "POST",
        body: { user_id: userId },
      });

      if (error) throw error;
      toast.success("Usuário deletado com sucesso!");
      setOrphans((prev) => prev.filter((o) => o.id !== userId));
    } catch (err: any) {
      toast.error("Erro ao deletar: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">E-mails Órfãos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Contas de autenticação sem perfil de artista ou empreendedor vinculado. Podem ter sido criadas por cadastros que falharam.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrphans}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {orphans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum e-mail órfão encontrado.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 text-sm font-medium">E-mail</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Criado em</th>
                <th className="text-right px-4 py-3 text-sm font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {orphans.map((orphan) => (
                <tr key={orphan.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm">{orphan.email}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(orphan.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deletingId === orphan.id}
                        >
                          {deletingId === orphan.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-1" />
                          )}
                          Deletar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Deseja realmente deletar a conta <strong>{orphan.email}</strong>? Isso permitirá que o e-mail seja utilizado em um novo cadastro.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(orphan.id)}>
                            Deletar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminOrphanUsersPanel;
