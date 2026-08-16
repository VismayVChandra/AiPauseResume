import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PauseResume — Pause. Refine. Resume.",
  description:
    "Pause on your old resume, let AI refine it against the job you actually want, and resume your job search with something sharper. Import LinkedIn, score it, improve it, export to PDF or DOCX.",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f7f4ee",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable} bg-background`}
    >
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
