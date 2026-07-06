'use client';

import { Logo } from '@/components/logo';
import Link from 'next/link';

export function LandingFooter() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-300 py-10 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Logo & Description */}
          <div className="col-span-2">
            <div className="mb-4">
              <Logo className="text-white" />
            </div>
            <p className="text-sm text-slate-400 max-w-md">
              The collaborative travel binder modern families trust.
              Plan better trips together.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-white mb-3">Product</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => scrollToSection('features')}
                  className="hover:text-white transition-colors min-h-[44px] flex items-center"
                >
                  Features
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('pricing')}
                  className="hover:text-white transition-colors min-h-[44px] flex items-center"
                >
                  Pricing
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="hover:text-white transition-colors min-h-[44px] flex items-center"
                >
                  How It Works
                </button>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors min-h-[44px] flex items-center">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-white mb-3">Legal</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/legal/privacy" className="hover:text-white transition-colors min-h-[44px] flex items-center">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="hover:text-white transition-colors min-h-[44px] flex items-center">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/legal/contact" className="hover:text-white transition-colors min-h-[44px] flex items-center">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} WanderNest. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
