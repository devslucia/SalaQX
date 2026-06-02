"use client";

import { AuthProvider } from "@/lib/auth-context";
import { Sidebar } from "@/components/sidebar";

export default function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 md:ml-72">
          <div className="mx-auto w-full max-w-7xl p-4 pt-20 md:p-10 md:pt-10">
            {children}
          </div>
        </main>
      </div>
    </AuthProvider>
  );
}
