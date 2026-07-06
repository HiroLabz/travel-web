'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-md'
          : 'bg-transparent'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo */}
            <Logo />

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection('features')}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                How It Works
              </button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/login?mode=signup">Get Started</Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-3 -mr-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed top-16 left-0 right-0 z-50 md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-lg animate-in slide-in-from-top duration-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col space-y-1">
              <button
                onClick={() => scrollToSection('features')}
                className="text-left px-4 py-3 min-h-[48px] text-base font-medium hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="text-left px-4 py-3 min-h-[48px] text-base font-medium hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center"
              >
                Pricing
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-left px-4 py-3 min-h-[48px] text-base font-medium hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center"
              >
                How It Works
              </button>
              <div className="pt-3 mt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                <Button variant="outline" className="w-full min-h-[48px] text-base" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button className="w-full min-h-[48px] text-base" asChild>
                  <Link href="/login?mode=signup">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
