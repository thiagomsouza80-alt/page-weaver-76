import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Noticias from "./pages/Noticias.tsx";
import Artistas from "./pages/Artistas.tsx";
import Eventos from "./pages/Eventos.tsx";
import Sobre from "./pages/Sobre.tsx";
import Contato from "./pages/Contato.tsx";
import Nivel99GeekStore from "./pages/Nivel99GeekStore.tsx";
import NakamaTemakeria from "./pages/NakamaTemakeria.tsx";
import AtelieCosmaker from "./pages/AtelieCosmaker.tsx";
import Cadastro from "./pages/Cadastro.tsx";
import Login from "./pages/Login.tsx";
import MeuPerfil from "./pages/MeuPerfil.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import NoticiaDetalhe from "./pages/NoticiaDetalhe.tsx";
import EventoDetalhe from "./pages/EventoDetalhe.tsx";
import ArtistaDetalhe from "./pages/ArtistaDetalhe.tsx";
import EmpreendedorDetalhe from "./pages/EmpreendedorDetalhe.tsx";
import Empreendedores from "./pages/Empreendedores.tsx";
import SocialPop from "./pages/SocialPop.tsx";
import Organizador from "./pages/Organizador.tsx";
import OrganizadorEvento from "./pages/OrganizadorEvento.tsx";
import Validador from "./pages/Validador.tsx";
import ValidadorEvento from "./pages/ValidadorEvento.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/noticias" element={<Noticias />} />
          <Route path="/noticias/:slug" element={<NoticiaDetalhe />} />
          <Route path="/artistas" element={<Artistas />} />
          <Route path="/artistas/:slug" element={<ArtistaDetalhe />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/cadastro-artista" element={<Cadastro />} />
          <Route path="/eventos" element={<Eventos />} />
          <Route path="/eventos/:slug" element={<EventoDetalhe />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/contato" element={<Contato />} />
          <Route path="/empreendedores" element={<Empreendedores />} />
          <Route path="/empreendedores/nivel-99-geek-store" element={<Nivel99GeekStore />} />
          <Route path="/empreendedores/nakama-temakeria" element={<NakamaTemakeria />} />
          <Route path="/empreendedores/atelie-cosmaker" element={<AtelieCosmaker />} />
          <Route path="/empreendedores/:slug" element={<EmpreendedorDetalhe />} />
          <Route path="/cadastro-empreendedor" element={<Cadastro />} />
          <Route path="/login" element={<Login />} />
          <Route path="/meu-perfil" element={<MeuPerfil />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/social" element={<SocialPop />} />
          <Route path="/cadastro-organizador" element={<Cadastro />} />
          <Route path="/organizador" element={<Organizador />} />
          <Route path="/organizador/eventos/:id" element={<OrganizadorEvento />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;