import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthGuard } from "@/components/auth/auth-guard";
import AnimatedIntelBackground from "@/components/AnimatedIntelBackground";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"], display: 'swap' });
const outfit = Outfit({ subsets: ["latin"], display: 'swap', variable: '--font-outfit' });

export const metadata: Metadata = {
  title: "Claim Hawk Intelligence Console",
  description: "AI-Powered Fraud Intelligence Operations Console",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
       try {
        let isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        let theme = localStorage.getItem('theme');
        if (theme === 'dark' || (!theme && isDark)) {
         document.documentElement.classList.add('dark');
        } else {
         document.documentElement.classList.remove('dark');
        }
       } catch (_) {}
      `,
          }}
        />
      </head>
      <body className={`${inter.className} ${outfit.variable} min-h-screen text-[var(--text-primary)] antialiased selection:bg-[var(--accent-color)] selection:text-white`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AnimatedIntelBackground />
          <div className="relative">
            <QueryProvider>
              <TooltipProvider>
                <AuthGuard>{children}</AuthGuard>
              </TooltipProvider>
            </QueryProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

