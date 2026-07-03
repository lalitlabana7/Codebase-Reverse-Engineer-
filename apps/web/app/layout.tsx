import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/providers";
import { EffectsProvider } from "@/components/effects/effects-provider";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ACRE | AI Codebase Reverse Engineer",
    template: "%s | ACRE",
  },
  description:
    "AI-powered cybersecurity terminal for analyzing codebases, repositories, and websites. Get instant security insights, documentation, and architecture diagrams.",
  keywords: [
    "cybersecurity",
    "code analysis",
    "security scanning",
    "repository analyzer",
    "AI security",
    "vulnerability detection",
    "source code analysis",
  ],
  authors: [{ name: "ACRE" }],
  creator: "ACRE",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "ACRE",
    title: "ACRE | AI Codebase Reverse Engineer",
    description:
      "AI-powered cybersecurity platform for analyzing codebases, repositories, and websites.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      afterSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: "#818cf8",
          colorBackground: "#0b1120",
          colorInputBackground: "#111827",
          colorText: "#e2e8f0",
          colorTextSecondary: "rgba(148, 163, 184, 0.65)",
          colorInputText: "#e2e8f0",
          colorNeutral: "rgba(148, 163, 184, 0.12)",
          borderRadius: "0.5rem",
          fontSize: "0.75rem",
        },
        elements: {
          card: "terminal-panel-elevated !shadow-none",
          headerTitle: "text-primary text-sm font-mono font-semibold tracking-wider",
          headerSubtitle: "text-muted-foreground font-mono text-[11px]",
          socialButtonsBlockButton:
            "terminal-btn-outline text-sm",
          formButtonPrimary:
            "terminal-btn-primary !text-xs !font-mono !tracking-wider !h-8",
          formFieldInput:
            "terminal-input !text-xs !font-mono",
          footerActionLink: "text-primary font-mono text-[11px] hover:text-primary-hover",
          dividerLine: "bg-border",
          dividerText: "text-muted-foreground font-mono text-[10px]",
          identityPreviewText: "text-foreground font-mono text-xs",
          identityPreviewEditButton: "text-primary font-mono text-[11px]",
        },
      }}
    >
      <html lang="en" className={`${jetbrainsMono.variable}`}>
        <body className="bg-background text-foreground font-mono antialiased">
          <Providers>
            <EffectsProvider>
              {children}
            </EffectsProvider>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
