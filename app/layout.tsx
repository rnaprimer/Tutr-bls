import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Caveat } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const caveat = Caveat({
  variable: "--font-handwritten",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Tutr — Find Local Tutors in Balasore, Odisha",
  description:
    "Find the right tutor. Learn better, locally. Connecting students and trusted tutors across Balasore, Odisha.",
  keywords: [
    "Tutr",
    "Balasore tutor",
    "Tuition Balasore",
    "Home tutor Balasore",
    "Odisha tutoring",
    "Local teachers Balasore",
  ],
  authors: [{ name: "Tutr" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${caveat.variable} scroll-smooth`}>
      <body className="min-h-screen flex flex-col bg-canvas-lavender text-ink font-sans selection:bg-purple-accent selection:text-ink antialiased">
        {children}
      </body>
    </html>
  );
}

