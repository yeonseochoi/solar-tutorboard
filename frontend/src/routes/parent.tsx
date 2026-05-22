import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useRole } from "@/lib/role";
import { useEffect } from "react";

export const Route = createFileRoute("/parent")({
  component: ParentLayout,
});

function ParentLayout() {
  const { role } = useRole();
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => {
      const stored = typeof window !== "undefined" ? localStorage.getItem("demo_role") : null;
      if (stored !== "parent") navigate({ to: "/" });
    }, 50);
    return () => clearTimeout(t);
  }, [role, navigate]);
  return <Outlet />;
}
