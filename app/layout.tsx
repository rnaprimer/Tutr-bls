import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} scroll-smooth`}>
      <body className="min-h-screen flex flex-col bg-white text-navy font-sans selection:bg-sky selection:text-navy antialiased">
        {children}
      </body>
    </html>
  );
}
