import * as React from "react";
import Link from "next/link";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl text-slate-900">Crinity Support</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">Home</Link>
            <Link href="/faq" className="text-sm font-medium text-slate-600 hover:text-slate-900">FAQ</Link>
            <Link href="/contact" className="text-sm font-medium text-slate-600 hover:text-slate-900">Contact</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-white border-t border-slate-200 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Crinity Support. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
