import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Send, Mail, MessageCircle } from "lucide-react";

const Contato = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ nome: "", contato: "", assunto: "", texto: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = { nome: form.nome.trim(), contato: form.contato.trim(), assunto: form.assunto.trim(), texto: form.texto.trim() };
    if (!trimmed.nome || !trimmed.contato || !trimmed.assunto || !trimmed.texto) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("https://formspree.io/f/mpqyejab", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          nome: trimmed.nome,
          email: trimmed.contato,
          assunto: trimmed.assunto,
          message: trimmed.texto,
        }),
      });
      const data = await res.json().catch(() => null);
      console.log("Formspree response:", res.status, data);
      if (res.ok) {
        setForm({ nome: "", contato: "", assunto: "", texto: "" });
        toast({ title: "Mensagem enviada!", description: "Entraremos em contato em breve." });
      } else {
        const errorMsg = data?.errors?.[0]?.message || "Tente novamente mais tarde.";
        toast({ title: "Erro ao enviar", description: errorMsg, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao enviar", description: "Verifique sua conexão.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-28 pb-20 px-6 md:px-12 max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 animate-fade-up">Fale Conosco</h1>
        <p className="text-muted-foreground mb-8 animate-fade-up-delay-1">Envie sua mensagem, dúvida ou sugestão para a equipe Amazônia Pop.</p>
        <div className="grid sm:grid-cols-2 gap-3 mb-10 animate-fade-up-delay-1">
          <a
            href="https://wa.me/5591993554881"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border hover:border-primary hover:bg-primary/5 transition-all"
          >
            <MessageCircle className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">WhatsApp</p>
              <p className="text-sm font-medium">(91) 9355-4881</p>
            </div>
          </a>
          <a
            href="mailto:contatoamazoniapop@gmail.com"
            className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border hover:border-primary hover:bg-primary/5 transition-all"
          >
            <Mail className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">E-mail</p>
              <p className="text-sm font-medium break-all">contatoamazoniapop@gmail.com</p>
            </div>
          </a>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-up-delay-2">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" placeholder="Seu nome completo" maxLength={100} value={form.nome} onChange={handleChange} className="bg-card border-border focus:ring-primary" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contato">Contato</Label>
            <Input id="contato" name="contato" placeholder="E-mail ou telefone" maxLength={100} value={form.contato} onChange={handleChange} className="bg-card border-border focus:ring-primary" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assunto">Assunto</Label>
            <Input id="assunto" name="assunto" placeholder="Sobre o que deseja falar?" maxLength={150} value={form.assunto} onChange={handleChange} className="bg-card border-border focus:ring-primary" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="texto">Mensagem</Label>
            <Textarea id="texto" name="texto" placeholder="Escreva sua mensagem aqui..." maxLength={2000} rows={6} value={form.texto} onChange={handleChange} className="bg-card border-border focus:ring-primary resize-none" />
            <p className="text-xs text-muted-foreground text-right">{form.texto.length}/2000</p>
          </div>
          <Button type="submit" variant="hero" size="lg" disabled={loading} className="w-full gap-2">
            <Send className="h-4 w-4" />{loading ? "Enviando..." : "Enviar Mensagem"}
          </Button>
        </form>
      </section>
      <Footer />
    </div>
  );
};

export default Contato;
