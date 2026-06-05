"use client";

import { AuthProvider } from "@/lib/auth-context";
import { Sidebar } from "@/components/sidebar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showBreadcrumbs = pathname !== "/dashboard";

  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 md:ml-72">
          <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-20 sm:px-6 md:px-10 md:pt-8">
            {showBreadcrumbs && (
              <div className="mb-5">
                <Breadcrumbs />
              </div>
            )}
            <OnboardingWizard />
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </AuthProvider>
  );
}
