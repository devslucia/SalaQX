"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSanatorioConfig, getIniciales } from "@/lib/sanatorio-config-context";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
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
  ShieldCheck,
  Stethoscope,
  Briefcase,
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
  { label: "Configuración", href: "/admin/sanatorio", icon: <Settings size={18} />, roles: ["admin"] },
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

const ROL_CONFIG: Record<string, { label: string; avatarBg: string; pillClass: string; Icon: React.ComponentType<{ size?: number }> }> = {
  admin: {
    label: "Administrador",
    avatarBg: "bg-admin text-white",
    pillClass: "bg-admin/20 text-white border-admin/40",
    Icon: ShieldCheck,
  },
  encargada: {
    label: "Encargada",
    avatarBg: "bg-encargada text-[#1C2833] dark:text-[#0D1117]",
    pillClass: "bg-encargada/20 text-white border-encargada/40",
    Icon: Briefcase,
  },
  medico: {
    label: "Médico",
    avatarBg: "bg-medico text-white",
    pillClass: "bg-medico/20 text-white border-medico/40",
    Icon: Stethoscope,
  },
};

export function Sidebar() {
  const { user, loading } = useAuth();
  const { config: sanatorio } = useSanatorioConfig();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const supabase = createClient();

  const filteredItems = navItems.filter((item) =>
    user ? item.roles.includes(user.rol) : false,
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    router.push("/login");
  };

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  if (loading) return null;

  const rolConfig = user ? ROL_CONFIG[user.rol] : null;

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div
      className="flex h-full flex-col text-white bg-sidebar"
    >
      <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border">
        {sanatorio.logo_url ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-lg ring-1 ring-white/20 bg-card">
            <Image
              src={sanatorio.logo_url}
              alt={sanatorio.nombre}
              width={44}
              height={44}
              className="h-full w-full object-contain"
              unoptimized
              priority
            />
          </div>
        ) : (
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-lg ring-1 ring-white/20 bg-gradient-to-br from-primary to-info text-primary-foreground"
          >
            <span className="text-sm font-bold tracking-wide">
              {getIniciales(sanatorio.nombre)}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-white leading-tight truncate">
            {sanatorio.nombre}
          </h1>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/65 mt-0.5">
            Gestión Quirúrgica
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-white/50">
          Navegación
        </p>
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98]",
                isActive ? "shadow-sm" : "hover:bg-white/10",
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
                <motion.span
                  layoutId="sidebar-active-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-white"
                  aria-hidden
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span
                className={cn(
                  "transition-transform",
                  isActive && "scale-110",
                )}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {user && rolConfig && (
        <div className="border-t border-sidebar-border p-3 space-y-2">
          <div className="flex items-center gap-3 px-2 py-2">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shadow-sm shrink-0 ring-2 ring-white/15",
                rolConfig.avatarBg,
              )}
            >
              {getInitials(user.nombre)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {user.nombre}
              </p>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border mt-1",
                  rolConfig.pillClass,
                )}
              >
                <rolConfig.Icon size={10} />
                {rolConfig.label}
              </span>
            </div>
            <ThemeToggle variant="on-sidebar" />
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors active:scale-[0.98]"
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
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-card text-foreground shadow-md md:hidden active:scale-95 transition-transform"
        aria-label="Abrir menú"
      >
        <Menu size={18} />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 left-0 z-50 w-72 shadow-2xl md:hidden"
          >
            <div className="absolute right-3 top-3 z-10">
              <button
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Cerrar menú"
              >
                <X size={16} />
              </button>
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </motion.aside>
        )}
      </AnimatePresence>

      <aside className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 shadow-xl border-r border-sidebar-border">
        <SidebarContent />
      </aside>
    </>
  );
}
