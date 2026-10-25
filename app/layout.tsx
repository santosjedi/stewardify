import type { Metadata } from "next";
import { Figtree, Sora } from "next/font/google";
import { Toaster } from "./feedback";
import "./globals.css";

// Sora for headings and big numbers, Figtree for everything else
// (including small uppercase labels). Loaded by Next.js itself.
const heading = Sora({
  variable: "--font-heading",
  subsets: ["latin"],
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stewardify",
  description: "Simple expense tracking",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
