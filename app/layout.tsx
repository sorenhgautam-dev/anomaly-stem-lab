import type { Metadata, Viewport } from "next";
import { Archivo, Martian_Mono, Schibsted_Grotesk } from "next/font/google";
import { FxLayer } from "@/components/fx/FxLayer";
import { Preloader } from "@/components/loading/Preloader";
import { SiteCanvasMount } from "@/components/three/SiteCanvasMount";
import { ScrollHoverGuard } from "@/components/ui/ScrollHoverGuard";
import { Toaster } from "@/components/ui/Toast";
import "./globals.css";

// Fonts (DESIGN.md §4), self-hosted at build time by next/font, so type works
// offline too. All three are OFL-1.1.

// Giant headlines and headings: Archivo with its width axis, set condensed.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

// Body and UI.
const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  display: "swap",
});

// Instrument readouts and numbers, with its width axis so the HUD can set it a little narrower.
const martianMono = Martian_Mono({
  variable: "--font-martian",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ANOMALY",
  description:
    "A science lab where you guess first. Build chemistry and robotics experiments, and Ano helps you find out why a guess went wrong.",
};

export const viewport: Viewport = {
  themeColor: "#FFFBF6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${schibsted.variable} ${martianMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <SiteCanvasMount />
        <Toaster />
        <FxLayer />
        <ScrollHoverGuard />
        <Preloader />
      </body>
    </html>
  );
}
