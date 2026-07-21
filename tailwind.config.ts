import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        body: ['"PT Sans"', 'sans-serif'],
        headline: ['"PT Sans"', 'sans-serif'],
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // Raw palette scales (defined as CSS vars in globals.css). Tailwind v3
        // doesn't auto-generate these from the vars, so they're wired up here.
        brand: {
          50: 'hsl(var(--brand-50))',
          100: 'hsl(var(--brand-100))',
          200: 'hsl(var(--brand-200))',
          300: 'hsl(var(--brand-300))',
          400: 'hsl(var(--brand-400))',
          500: 'hsl(var(--brand-500))',
          600: 'hsl(var(--brand-600))',
          700: 'hsl(var(--brand-700))',
          800: 'hsl(var(--brand-800))',
          900: 'hsl(var(--brand-900))',
          subtle: 'hsl(var(--brand-subtle))',
        },
        danger: {
          50: 'hsl(var(--danger-50))',
          100: 'hsl(var(--danger-100))',
          200: 'hsl(var(--danger-200))',
          300: 'hsl(var(--danger-300))',
          400: 'hsl(var(--danger-400))',
          500: 'hsl(var(--danger-500))',
          600: 'hsl(var(--danger-600))',
          700: 'hsl(var(--danger-700))',
          800: 'hsl(var(--danger-800))',
          900: 'hsl(var(--danger-900))',
        },
        // DESIGN.md "Light Neutral" ramp — exact hex matches.
        neutral: {
          50: 'hsl(var(--neutral-50))',
          100: 'hsl(var(--neutral-100))',
          200: 'hsl(var(--neutral-200))',
          300: 'hsl(var(--neutral-300))',
          400: 'hsl(var(--neutral-400))',
          500: 'hsl(var(--neutral-500))',
          600: 'hsl(var(--neutral-600))',
          700: 'hsl(var(--neutral-700))',
          800: 'hsl(var(--neutral-800))',
          900: 'hsl(var(--neutral-900))',
        },
        // Fixed dark decorative surfaces (stay dark regardless of theme).
        'neutral-dark': {
          50: 'hsl(var(--neutral-dark-50))',
          100: 'hsl(var(--neutral-dark-100))',
          200: 'hsl(var(--neutral-dark-200))',
          300: 'hsl(var(--neutral-dark-300))',
          400: 'hsl(var(--neutral-dark-400))',
          500: 'hsl(var(--neutral-dark-500))',
          600: 'hsl(var(--neutral-dark-600))',
          700: 'hsl(var(--neutral-dark-700))',
          800: 'hsl(var(--neutral-dark-800))',
          900: 'hsl(var(--neutral-dark-900))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          soft: 'hsl(var(--primary-soft))',
          accent: 'hsl(var(--primary-accent))',
        },
        info: {
          soft: 'hsl(var(--info-soft))',
          accent: 'hsl(var(--info-accent))',
          foreground: 'hsl(var(--info-foreground))',
        },
        success: {
          soft: 'hsl(var(--success-soft))',
          accent: 'hsl(var(--success-accent))',
          50: 'hsl(var(--success-50))',
          100: 'hsl(var(--success-100))',
          200: 'hsl(var(--success-200))',
          300: 'hsl(var(--success-300))',
          400: 'hsl(var(--success-400))',
          500: 'hsl(var(--success-500))',
          600: 'hsl(var(--success-600))',
          700: 'hsl(var(--success-700))',
          800: 'hsl(var(--success-800))',
          900: 'hsl(var(--success-900))',
        },
        warning: {
          soft: 'hsl(var(--warning-soft))',
          accent: 'hsl(var(--warning-accent))',
          50: 'hsl(var(--warning-50))',
          100: 'hsl(var(--warning-100))',
          200: 'hsl(var(--warning-200))',
          300: 'hsl(var(--warning-300))',
          400: 'hsl(var(--warning-400))',
          500: 'hsl(var(--warning-500))',
          600: 'hsl(var(--warning-600))',
          700: 'hsl(var(--warning-700))',
          800: 'hsl(var(--warning-800))',
          900: 'hsl(var(--warning-900))',
        },
        mono: {
          DEFAULT: 'hsl(var(--mono))',
          foreground: 'hsl(var(--mono-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
          50: 'hsl(var(--secondary-50))',
          100: 'hsl(var(--secondary-100))',
          200: 'hsl(var(--secondary-200))',
          300: 'hsl(var(--secondary-300))',
          400: 'hsl(var(--secondary-400))',
          500: 'hsl(var(--secondary-500))',
          600: 'hsl(var(--secondary-600))',
          700: 'hsl(var(--secondary-700))',
          800: 'hsl(var(--secondary-800))',
          900: 'hsl(var(--secondary-900))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          // DESIGN.md "Accent Color" raw scale (purple, #8b5cf6) — distinct
          // from the shadcn DEFAULT/foreground hover-state slot above.
          50: 'hsl(var(--accent-50))',
          100: 'hsl(var(--accent-100))',
          200: 'hsl(var(--accent-200))',
          300: 'hsl(var(--accent-300))',
          400: 'hsl(var(--accent-400))',
          500: 'hsl(var(--accent-500))',
          600: 'hsl(var(--accent-600))',
          700: 'hsl(var(--accent-700))',
          800: 'hsl(var(--accent-800))',
          900: 'hsl(var(--accent-900))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      // DESIGN.md Drop Shadows — distinct keys only; `xl` is left untouched
      // since Tailwind's default `shadow-xl` already has 138+ existing call
      // sites across the app unrelated to this design system.
      boxShadow: {
        xs: '0 1px 2px rgba(32,31,33,0.05)',
        s: '0 1px 3px rgba(32,31,33,0.08)',
        m: '0 4px 6px -1px rgba(32,31,33,0.08)',
        l: '0 10px 15px -3px rgba(32,31,33,0.04)',
        xsl: '0 25px 50px -12px rgba(32,31,33,0.15)',
        tabs: '0 1px 3px rgba(32,31,33,0.05)',
        button: '0 1px 2px rgba(32,31,33,0.04)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        in: 'in 0.2s ease-out',
        'zoom-in-95': 'zoom-in-95 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
} satisfies Config;
