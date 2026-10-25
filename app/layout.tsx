import type { Metadata } from "next";
import { Figtree, JetBrains_Mono, Sora } from "next/font/google";
import { Toaster } from "./feedback";
import "./globals.css";

// Sora for headings and big numbers, Figtree for everything else, and
// JetBrains Mono for small uppercase labels and timestamps. Loaded by Next.js itself.
const heading = Sora({
  variable: "--font-heading",
  subsets: ["latin"],
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
});

const label = JetBrains_Mono({
  variable: "--font-label",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stewardify",
  description: "Simple expense tracking",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} ${label.variable}`}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
