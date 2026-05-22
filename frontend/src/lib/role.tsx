import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "teacher" | "parent" | null;

type Ctx = {
  role: Role;
  setRole: (r: Role) => void;
};

const RoleContext = createContext<Ctx>({ role: null, setRole: () => {} });

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("demo_role") : null;
    if (stored === "teacher" || stored === "parent") setRoleState(stored);
  }, []);

  const setRole = (r: Role) => {
    setRoleState(r);
    if (typeof window !== "undefined") {
      if (r) localStorage.setItem("demo_role", r);
      else localStorage.removeItem("demo_role");
    }
  };

  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export const useRole = () => useContext(RoleContext);
