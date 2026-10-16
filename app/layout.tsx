import type { Metadata, Viewport } from "next";
import { Host_Grotesk, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { FxLayer } from "@/components/fx/FxLayer";
import "./globals.css";

// Self-hosted at build time by next/font, so type works offline too.

// Everything: headlines, UI, body. Set big and in regular weights.
const hostGrotesk = Host_Grotesk({
  variable: "--font-host-grotesk",
  subsets: ["latin"],
  display: "swap",
});

// Single accent words in headlines ("Which falls faster?").
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

// Only for live instrument readouts (voltmeter, scale, thermometer).
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ANOMALY",
  description:
    "A virtual STEM lab where you build chemistry and robotics experiments, and Ano finds the wrong belief behind each mistake.",
};

export const viewport: Viewport = {
  themeColor: "#05060A",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${hostGrotesk.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <FxLayer />
      </body>
    </html>
  );
}
