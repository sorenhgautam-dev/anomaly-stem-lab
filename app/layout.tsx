import type { Metadata, Viewport } from "next";
import { Archivo, Geist, Geist_Mono } from "next/font/google";
import { FxLayer } from "@/components/fx/FxLayer";
import { Preloader } from "@/components/loading/Preloader";
import { SiteCanvasMount } from "@/components/three/SiteCanvasMount";
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
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

// Instrument readouts and numbers.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ANOMALY",
  description:
    "A virtual STEM lab where you build chemistry and robotics experiments, and Ano finds the wrong belief behind each mistake.",
};

export const viewport: Viewport = {
  themeColor: "#FFFBF6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${geist.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <SiteCanvasMount />
        <Toaster />
        <FxLayer />
        <Preloader />
      </body>
    </html>
  );
}
