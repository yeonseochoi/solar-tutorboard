import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/teacher/students")({
  component: StudentsLayout,
});

function StudentsLayout() {
  return <Outlet />;
}
