import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { User, Store, ArrowLeft } from "lucide-react";
import CadastroArtistaForm from "@/components/cadastro/CadastroArtistaForm";
import CadastroEmpreendedorForm from "@/components/cadastro/CadastroEmpreendedorForm";

type CadastroType = null | "artista" | "empreendedor";

const Cadastro = () => {
  const [tipo, setTipo] = useState<CadastroType>(null);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-3xl mx-auto">
        {tipo === null ? (
          <div className="animate-fade-up text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Fazer Cadastro</h1>
            <p className="text-muted-foreground mb-12">
              Escolha o tipo de cadastro que deseja realizar no portal Amazônia Pop.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl mx-auto">
              <button
                onClick={() => setTipo("artista")}
                className="group flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-border hover:border-primary/60 bg-card transition-all hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-1">Cadastro de Artista</h2>
                  <p className="text-sm text-muted-foreground">
                    Cosplayers, ilustradores, músicos e outros artistas da cultura pop
                  </p>
                </div>
              </button>
              <button
                onClick={() => setTipo("empreendedor")}
                className="group flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-border hover:border-primary/60 bg-card transition-all hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Store className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-1">Cadastro de Empreendedor</h2>
                  <p className="text-sm text-muted-foreground">
                    Lojas, ateliês, restaurantes e outros negócios geek
                  </p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTipo(null)}
              className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar à escolha
            </Button>
            {tipo === "artista" ? <CadastroArtistaForm /> : <CadastroEmpreendedorForm />}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Cadastro;
