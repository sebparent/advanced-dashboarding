"use client";

import { createContext, useContext, useEffect, useState } from "react";
import supabase from "@/lib/supabaseBrowser";

const AuthCtx = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading }}>{children}</AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
