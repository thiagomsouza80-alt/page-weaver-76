import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AuthorType = "artist" | "entrepreneur" | "fan";

export interface SocialAuthor {
  userId: string;
  name: string;
  avatarUrl: string | null;
  type: AuthorType;
}

export const useSocialAuthor = () => {
  const [author, setAuthor] = useState<SocialAuthor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async (userId: string, email?: string | null) => {
      const { data: artist } = await supabase
        .from("artists")
        .select("name, profile_image_url")
        .eq("user_id", userId)
        .maybeSingle();
      if (artist) {
        setAuthor({ userId, name: artist.name, avatarUrl: artist.profile_image_url, type: "artist" });
        setLoading(false);
        return;
      }
      const { data: ent } = await supabase
        .from("entrepreneurs")
        .select("name, image_url")
        .eq("user_id", userId)
        .maybeSingle();
      if (ent) {
        setAuthor({ userId, name: ent.name, avatarUrl: ent.image_url, type: "entrepreneur" });
        setLoading(false);
        return;
      }
      setAuthor({ userId, name: email?.split("@")[0] ?? "Fã", avatarUrl: null, type: "fan" });
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) load(session.user.id, session.user.email);
      else { setAuthor(null); setLoading(false); }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) load(session.user.id, session.user.email);
      else setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { author, loading };
};
