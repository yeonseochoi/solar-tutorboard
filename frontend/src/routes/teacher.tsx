import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useRole } from "@/lib/role";
import { useEffect } from "react";

export const Route = createFileRoute("/teacher")({
  component: TeacherLayout,
});

function TeacherLayout() {
  const { role } = useRole();
  const navigate = useNavigate();
  useEffect(() => {
    // role 컨텍스트는 localStorage hydrate 이후 결정됨. 빈 값이면 잠시 대기.
    const t = setTimeout(() => {
      const stored = typeof window !== "undefined" ? localStorage.getItem("demo_role") : null;
      if (stored !== "teacher") navigate({ to: "/" });
    }, 50);
    return () => clearTimeout(t);
  }, [role, navigate]);
  return <Outlet />;
}
