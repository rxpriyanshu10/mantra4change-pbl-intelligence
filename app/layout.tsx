import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PBL Program Intelligence",
  description: "Decision-support system for PBL program reviews and grant reporting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 min-h-screen flex flex-col`}>
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-8">
                <Link href="/" className="font-bold text-lg text-blue-600 tracking-tight">
                  Mantra4Change
                </Link>
                <div className="flex gap-6">
                  <Link href="/" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
                    Program Review
                  </Link>
                  <Link href="/grants" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
                    Grant Reporting
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main className="flex-grow">
          {children}
        </main>
      </body>
    </html>
  );
}
