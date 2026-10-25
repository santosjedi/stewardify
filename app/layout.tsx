import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

// The church brand font, loaded by Next.js itself.
const sans = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stewardify",
  description: "Simple expense tracking",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
