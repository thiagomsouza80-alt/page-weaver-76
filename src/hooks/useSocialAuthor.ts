import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AuthorType = "artist" | "entrepreneur" | "organizer" | "fan";

export interface SocialAuthor {
  userId: string;
  name: string;
  avatarUrl: string | null;
  type: AuthorType;
  entityId: string | null;
}

export const useSocialAuthor = () => {
  const [author, setAuthor] = useState<SocialAuthor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async (userId: string, email?: string | null) => {
      const [{ data: artist }, { data: ent }, { data: org }, { data: profile }] = await Promise.all([
        supabase.from("artists").select("id, name, profile_image_url").eq("user_id", userId).maybeSingle(),
        supabase.from("entrepreneurs").select("id, name, image_url").eq("user_id", userId).maybeSingle(),
        (supabase as any).from("organizers").select("id, name, organization_name, logo_url").eq("user_id", userId).maybeSingle(),
        (supabase as any).from("user_profiles").select("display_name, username, avatar_url").eq("user_id", userId).maybeSingle(),
      ]);

      const p: any = profile;
      const profileAvatar = p?.avatar_url || null;
      const profileName = p?.display_name || p?.username || null;

      if (artist) {
        setAuthor({ userId, name: artist.name, avatarUrl: artist.profile_image_url || profileAvatar, type: "artist", entityId: artist.id });
      } else if (ent) {
        setAuthor({ userId, name: ent.name, avatarUrl: ent.image_url || profileAvatar, type: "entrepreneur", entityId: ent.id });
      } else if (org) {
        const o: any = org;
        setAuthor({
          userId,
          name: o.organization_name || o.name || profileName || (email?.split("@")[0] ?? "Organizador"),
          avatarUrl: o.logo_url || profileAvatar,
          type: "organizer",
          entityId: o.id,
        });
      } else {
        setAuthor({ userId, name: profileName || (email?.split("@")[0] ?? "Fã"), avatarUrl: profileAvatar, type: "fan", entityId: null });
      }
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
