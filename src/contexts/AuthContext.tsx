import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";

export type AppRole = "student" | "teacher";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  specialization?: string | null;
  level?: string | null;
  semester?: string | null;
  student_id?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: AppRole,
    specialization?: string,
    level?: string,
    semester?: string
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    profile: null,
    loading: true,
    initialized: false,
  });

  const syncInProgress = useRef<string | null>(null);

  const fetchProfileAndRole = useCallback(async (userId: string) => {
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase
          .from("profiles" as any)
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),

        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      return {
        profile: profileRes.data as unknown as Profile | null,
        role: (roleRes.data?.role as AppRole) || null,
      };
    } catch (err) {
      console.error("[Auth] Unexpected error:", err);
      return { profile: null, role: null };
    }
  }, []);

  const syncSession = useCallback(
    async (session: Session | null, event?: AuthChangeEvent) => {
      const userId = session?.user?.id || null;

      if (syncInProgress.current === userId && !event) return;
      syncInProgress.current = userId;

      try {
        if (!session) {
          setState({
            user: null,
            session: null,
            role: null,
            profile: null,
            loading: false,
            initialized: true,
          });
          return;
        }

        const { profile, role } = await fetchProfileAndRole(session.user.id);

        setState({
          user: session.user,
          session,
          role: role || (session.user.user_metadata?.role as AppRole) || null,
          profile,
          loading: false,
          initialized: true,
        });
      } catch (err) {
        console.error("Sync error:", err);
        setState((prev) => ({
          ...prev,
          loading: false,
          initialized: true,
        }));
      } finally {
        syncInProgress.current = null;
      }
    },
    [fetchProfileAndRole]
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      syncSession(session, event);
    });

    const timeout = setTimeout(() => {
      setState((prev) => {
        if (prev.loading) {
          return { ...prev, loading: false, initialized: true };
        }
        return prev;
      });
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [syncSession]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: AppRole,
    specialization?: string,
    level?: string,
    semester?: string
  ) => {
    try {
      const studentId = email.split("@")[0];

      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role,
              specialization: role === "student" ? specialization : null,
              level: role === "student" ? level : null,
              semester: role === "student" ? semester : null,
              student_id: role === "student" ? studentId : null,
            },
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });

      if (authError) throw authError;

      if (authData.user) {
        const profileData: any = {
          user_id: authData.user.id,
          full_name: fullName,
          email,
          specialization: role === "student" ? specialization : null,
          level: role === "student" ? level : null,
          semester: role === "student" ? semester : null,
          student_id: role === "student" ? studentId : null,
        };

        const { data: existingProfile } = await supabase
          .from("profiles" as any)
          .select("id")
          .eq("user_id", authData.user.id)
          .maybeSingle();

        if ((existingProfile as any)?.id) {
          const { error: updateError } = await supabase
            .from("profiles" as any)
            .update(profileData)
            .eq("user_id", authData.user.id);

          if (updateError) {
            console.error("Profile Update Error:", updateError);
          }
        } else {
          const { error: insertError } = await supabase
            .from("profiles" as any)
            .insert(profileData);

          if (insertError) {
            console.error("Profile Insert Error:", insertError);
          }
        }

        const { data: existingRole } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("user_id", authData.user.id)
          .maybeSingle();

        if ((existingRole as any)?.user_id) {
          const { error: updateRoleError } = await supabase
            .from("user_roles")
            .update({ role })
            .eq("user_id", authData.user.id);

          if (updateRoleError) {
            console.error("Role Update Error:", updateRoleError);
          }
        } else {
          const { error: insertRoleError } = await supabase
            .from("user_roles")
            .insert({
              user_id: authData.user.id,
              role,
            });

          if (insertRoleError) {
            console.error("Role Insert Error:", insertRoleError);
          }
        }
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?type=recovery`,
    });

    return { error };
  };

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }

  return context;
};