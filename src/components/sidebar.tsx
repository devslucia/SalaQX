"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";
import {
  LayoutDashboard,
  CalendarPlus,
  Calendar,
  CalendarDays,
  Users,
  Building2,
  Syringe,
  Heart,
  Clock,
  Settings,
  LogOut,
  Menu,
  X,
  Stethoscope,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: ("admin" | "encargada" | "medico")[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} />, roles: ["admin", "encargada", "medico"] },
  { label: "Calendario", href: "/calendario", icon: <CalendarDays size={18} />, roles: ["admin", "encargada", "medico"] },
  { label: "Solicitar Turno", href: "/solicitar-turno", icon: <CalendarPlus size={18} />, roles: ["medico"] },
  { label: "Turnos", href: "/turnos", icon: <Calendar size={18} />, roles: ["admin", "encargada", "medico"] },
  { label: "Usuarios", href: "/admin/usuarios", icon: <Users size={18} />, roles: ["admin"] },
  { label: "Quirófanos", href: "/admin/quirofanos", icon: <Building2 size={18} />, roles: ["admin", "encargada"] },
  { label: "Anestesia", href: "/admin/anestesia", icon: <Syringe size={18} />, roles: ["admin", "encargada"] },
  { label: "Obras Sociales", href: "/admin/obras-sociales", icon: <Heart size={18} />, roles: ["admin", "encargada"] },
  { label: "Horarios", href: "/admin/horarios", icon: <Clock size={18} />, roles: ["admin", "encargada"] },
  { label: "Config UTI", href: "/admin/config-uti", icon: <Settings size={18} />, roles: ["admin", "encargada"] },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const ROL_CONFIG: Record<string, { label: string; avatarBg: string; pillClass: string }> = {
  admin: {
    label: "Administrador",
    avatarBg: "bg-[#1E8449] text-white ring-2 ring-[#1E8449]/30",
    pillClass: "bg-[#1E8449]/20 text-white border-[#1E8449]/40",
  },
  encargada: {
    label: "Encargada",
    avatarBg: "bg-[#D4AC0D] text-[#1C2833] ring-2 ring-[#D4AC0D]/30",
    pillClass: "bg-[#D4AC0D]/20 text-white border-[#D4AC0D]/40",
  },
  medico: {
    label: "Médico",
    avatarBg: "bg-[#2E86AB] text-white ring-2 ring-[#2E86AB]/30",
    pillClass: "bg-[#2E86AB]/20 text-white border-[#2E86AB]/40",
  },
};

export function Sidebar() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createClient();

  const filteredItems = navItems.filter((item) =>
    user ? item.roles.includes(user.rol) : false
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    router.push("/login");
  };

  if (loading) return null;

  const rolConfig = user ? ROL_CONFIG[user.rol] : null;

  const SidebarContent = () => (
    <div
      className="flex h-full flex-col text-white"
      style={{ background: "var(--sidebar)" }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-3 px-5 py-6 border-b"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-lg ring-1 ring-white/20"
          style={{
            background: "linear-gradient(135deg, #FFFFFF 0%, #E8F4FD 100%)",
            color: "#1B4F72",
          }}
        >
          <Stethoscope size={22} strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-white leading-tight">
            SalaQX
          </h1>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/65 mt-0.5">
            Gestión Quirúrgica
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-white/50">
          Navegación
        </p>
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "shadow-sm"
                  : "hover:bg-white/10"
              )}
              style={
                isActive
                  ? {
                      background: "var(--sidebar-active)",
                      color: "var(--sidebar-active-foreground)",
                    }
                  : { color: "var(--sidebar-muted)" }
              }
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-white"
                  aria-hidden
                />
              )}
              <span className={cn("transition-transform", isActive && "scale-110")}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      {user && rolConfig && (
        <div
          className="border-t p-3 space-y-2"
          style={{ borderColor: "var(--sidebar-border)" }}
        >
          <div className="flex items-center gap-3 px-2 py-2">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shadow-sm shrink-0",
                rolConfig.avatarBg
              )}
            >
              {getInitials(user.nombre)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">{user.nombre}</p>
              <span
                className={cn(
                  "inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border mt-1",
                  rolConfig.pillClass
                )}
              >
                {rolConfig.label}
              </span>
            </div>
            <ThemeToggle variant="on-sidebar" />
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 rounded-lg border bg-card p-2.5 shadow-md md:hidden"
        aria-label="Menú"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 shadow-xl dark:border-r"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
