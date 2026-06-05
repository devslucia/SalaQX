import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SanatorioConfigProvider } from "@/lib/sanatorio-config-context";
import { AppFooter } from "@/components/app-footer";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SalaQX — Gestión de Turnos Quirúrgicos",
  description: "Sistema cerrado de gestión de turnos quirúrgicos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className={inter.variable}>
      <body className="h-full antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
          storageKey="salaqx-theme"
        >
          <SanatorioConfigProvider>
            {children}
            <AppFooter />
            <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{
                classNames: {
                  toast: "rounded-lg border",
                },
              }}
            />
          </SanatorioConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
