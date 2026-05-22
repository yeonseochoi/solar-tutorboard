import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useRole } from "@/lib/role";
import { DEMO_TUTOR } from "@/lib/supabase";
import { clearParentSession, getParentAccountLabel } from "@/lib/parent-session";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  FileText,
  Wallet,
  MessageSquare,
  CalendarDays,
  LogOut,
  GraduationCap,
  User,
  ClipboardList,
  CalendarPlus,
  Menu,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof Users };

const teacherNav: NavItem[] = [
  { to: "/teacher", label: "대시보드", icon: LayoutDashboard },
  { to: "/teacher/students", label: "학생", icon: Users },
  { to: "/teacher/lesson-report", label: "수업 리포트", icon: FileText },
  { to: "/teacher/payments", label: "결제", icon: Wallet },
  { to: "/teacher/messages", label: "메시지", icon: MessageSquare },
  { to: "/teacher/schedule", label: "일정", icon: CalendarDays },
];

const parentNav: NavItem[] = [
  { to: "/parent", label: "대시보드", icon: LayoutDashboard },
  { to: "/parent/reports", label: "수업 리포트", icon: ClipboardList },
  { to: "/parent/schedule", label: "일정 요청", icon: CalendarPlus },
];

export function AppLayout({
  variant,
  title,
  subtitle,
  children,
}: {
  variant: "teacher" | "parent";
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const nav = variant === "teacher" ? teacherNav : parentNav;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { setRole } = useRole();
  const [open, setOpen] = useState(false);
  const accountLabel = variant === "teacher" ? DEMO_TUTOR.name : getParentAccountLabel();

  const handleLogout = () => {
    if (variant === "parent") clearParentSession();
    setRole(null);
    navigate({ to: "/" });
  };

  const isActive = (to: string) =>
    to === `/${variant}` ? pathname === to : pathname.startsWith(to);

  const Sidebar = (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-5 py-5 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GraduationCap className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Solar Tutorboard</div>
          <div className="text-[11px] text-muted-foreground">
            {variant === "teacher" ? "선생님 모드" : "학부모/학생 모드"}
          </div>
        </div>
      </div>
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto shrink-0 space-y-2 border-t p-3">
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{accountLabel}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          역할 변경
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="hidden md:flex">{Sidebar}</div>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full">{Sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-card/90 px-4 py-3 backdrop-blur md:px-6">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden rounded-md p-1.5 hover:bg-accent"
            aria-label="메뉴 열기"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold md:text-lg">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 xl:p-7">{children}</main>
      </div>
    </div>
  );
}
