import type { ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" aria-label="WanderNest home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/legal/privacy" className="hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link href="/legal/terms" className="hover:text-primary transition-colors">
              Terms
            </Link>
            <Link href="/legal/contact" className="hover:text-primary transition-colors">
              Contact
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 prose prose-slate dark:prose-invert prose-headings:font-bold prose-h1:text-3xl md:prose-h1:text-4xl prose-h2:mt-10 prose-h2:text-xl md:prose-h2:text-2xl prose-h3:text-lg prose-p:leading-relaxed">
        {children}
      </main>
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} WanderNest. All rights reserved.
      </footer>
    </div>
  );
}
