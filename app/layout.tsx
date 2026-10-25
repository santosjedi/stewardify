import type { Metadata } from "next";
import { Epilogue, Fraunces } from "next/font/google";
import { Toaster } from "./feedback";
import "./globals.css";

// Fraunces for headings and big numbers (with its "soft" rounded style available),
// Epilogue for everything else. Both are loaded by Next.js itself.
const heading = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  axes: ["SOFT"],
});

const body = Epilogue({
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
