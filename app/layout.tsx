import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/providers/app-providers";
import { RootBackground } from "@/layouts/root-background";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "FLUXA", template: "%s | FLUXA" },
  description: "Enterprise multi-tenant print management SaaS platform.",
  applicationName: "FLUXA",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#000000" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-black text-slate-100 min-h-screen antialiased">
        <AppProviders>
          <RootBackground />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
