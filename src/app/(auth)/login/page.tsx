'use client';

import { useState, Suspense } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/motion/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, Eye, EyeOff, Mail, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'motion/react';

const formSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

type FormValues = z.infer<typeof formSchema>;

// Dark-theme field treatment for this page — DESIGN.md's Fields spec (bg
// surface-brand-subtler, #edf3fa) is a light-mode-only value that isn't
// legible against this app's dark card, so the field surface is repointed to
// the dark theme's --muted instead. Overridden per-Input via className,
// not in the shared motion/input.tsx default (that stays as-is for every
// other, still-light-styled call site).
const darkFieldClassName =
  'h-[52px] rounded-full border-neutral-dark-700 bg-muted px-5 text-foreground placeholder:text-muted-foreground focus:border-accent-500 focus:ring-accent-500/30';

/**
 * transitions.dev — "Success check with blur and rotate".
 * Full-screen overlay that reveals a spring-animated check when auth succeeds,
 * held briefly before the hard navigation kicks in.
 */
function SuccessOverlay({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/95 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0, filter: 'blur(8px)', rotate: -25 }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)', rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-success-500 text-white shadow-lg"
      >
        <Check className="h-8 w-8" strokeWidth={3} />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="text-sm font-medium text-foreground"
      >
        {label}
      </motion.p>
    </motion.div>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    defaultValues: { name: '', email: '', password: '' },
    resolver: zodResolver(formSchema),
  });

  // Exchange a fresh ID token for the server session cookie so the AuthProvider
  // initializes with fresh auth state after the hard navigation.
  const createSession = async (getIdToken: () => Promise<string>) => {
    const idToken = await getIdToken();
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
  };

  const finish = (label: string, destination: string) => {
    setSuccess(label);
    setTimeout(() => {
      window.location.href = destination;
    }, 900);
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      if (!auth || !db) throw new Error('Firebase not initialized');

      if (isLogin) {
        const cred = await signInWithEmailAndPassword(auth, data.email, data.password);
        await createSession(() => cred.user.getIdToken());
        finish('Signed in successfully', callbackUrl);
      } else {
        const name = (data.name ?? '').trim();
        if (name.length < 2) {
          form.setError('name', { message: 'Name must be at least 2 characters long.' });
          setLoading(false);
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
        await updateProfile(cred.user, { displayName: name });
        await setDoc(
          doc(db, 'users', cred.user.uid),
          {
            uid: cred.user.uid,
            email: cred.user.email,
            displayName: name,
            photoURL: null,
          },
          { merge: true }
        );
        await createSession(() => cred.user.getIdToken());
        // New users are redirected to onboarding to select a plan first
        finish('Account created successfully', '/onboarding/plan');
      }
    } catch (error: any) {
      toast({
        title: 'Authentication Failed',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      if (!auth || !db) throw new Error('Firebase not initialized');
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const isNewUser = getAdditionalUserInfo(result)?.isNewUser ?? false;
      await setDoc(
        doc(db, 'users', result.user.uid),
        {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
        },
        { merge: true }
      );
      await createSession(() => result.user.getIdToken());
      finish('Signed in successfully', isNewUser ? '/onboarding/plan' : callbackUrl);
    } catch (error: any) {
      // Ignore the user simply closing the popup.
      if (error?.code !== 'auth/popup-closed-by-user') {
        toast({
          title: 'Google sign-in failed',
          description: error.message,
          variant: 'destructive',
        });
      }
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>{success && <SuccessOverlay label={success} />}</AnimatePresence>

      <div className="relative m-auto w-full max-w-lg px-6">
        {/* Photo collage — peeks above the card's top edge. Placeholder
            assets: drop the real photos in public/assets/ under these two
            file names and they'll pick up automatically. */}
        <div className="relative z-10 mx-auto -mb-16 h-32 w-40">
          <div className="absolute left-0 top-6 h-28 w-28 -rotate-6 overflow-hidden rounded-3xl border-4 border-background shadow-lg">
            <Image
              src="/assets/auth-photo-1.jpg"
              alt=""
              fill
              sizes="112px"
              className="object-cover"
            />
          </div>
          <div className="absolute right-0 top-0 h-28 w-28 rotate-6 overflow-hidden rounded-3xl border-4 border-background shadow-lg">
            <Image
              src="/assets/auth-photo-2.jpg"
              alt=""
              fill
              sizes="112px"
              className="object-cover"
            />
          </div>
        </div>

        <div className="relative flex flex-col items-center rounded-[32px] border border-border bg-card px-8 pb-8 pt-20 shadow-xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            WanderNest
          </span>
          <h1 className="mt-2 text-center text-2xl font-semibold leading-snug text-foreground">
            {isLogin ? (
              <>
                Welcome back,
                <br />
                continue your journey!
              </>
            ) : (
              <>
                Start your travels
                <br />
                with us now!
              </>
            )}
          </h1>

          <form className="mt-6 w-full space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
            {!isLogin && (
              <Controller
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="name" className="sr-only">
                      Full name
                    </FieldLabel>
                    <Input
                      id="name"
                      aria-invalid={fieldState.invalid}
                      className={darkFieldClassName}
                      placeholder="Full name"
                      type="text"
                      disabled={loading}
                      {...field}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            )}

            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email" className="sr-only">
                    Email
                  </FieldLabel>
                  <Input
                    id="email"
                    aria-invalid={fieldState.invalid}
                    className={darkFieldClassName}
                    placeholder="Email"
                    leftIcon={<Mail />}
                    type="email"
                    disabled={loading}
                    {...field}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="password" className="sr-only">
                    Password
                  </FieldLabel>
                  <Input
                    id="password"
                    aria-invalid={fieldState.invalid}
                    className={darkFieldClassName}
                    placeholder="Password"
                    type="password"
                    disabled={loading}
                    {...field}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            {isLogin && (
              <Link
                href="/change-password"
                className="inline-block text-xs text-muted-foreground hover:text-foreground"
              >
                Forgot Password?
              </Link>
            )}

            <Button
              className="!mt-5 h-[58px] w-full rounded-full bg-accent-500 text-white hover:bg-accent-600"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setIsLogin((v) => !v);
                form.clearErrors();
              }}
              className="font-medium text-accent-500 hover:text-accent-600 hover:underline"
            >
              {isLogin ? 'Create account here' : 'Log in here'}
            </button>
          </p>
        </div>
      </div>
    </>
  );
}

function LoginFormFallback() {
  return (
    <div className="m-auto flex w-full max-w-sm items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-background">
      <div className="relative flex h-full w-full">
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

const GoogleLogo = () => (
  <svg
    className="inline-block size-4 shrink-0 align-sub text-inherit"
    fill="none"
    height="1.2em"
    id="icon-google"
    viewBox="0 0 16 16"
    width="1.2em"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0)">
      <path
        d="M15.6823 8.18368C15.6823 7.63986 15.6382 7.0931 15.5442 6.55811H7.99829V9.63876H12.3194C12.1401 10.6323 11.564 11.5113 10.7203 12.0698V14.0687H13.2983C14.8122 12.6753 15.6823 10.6176 15.6823 8.18368Z"
        fill="#4285F4"
      />
      <path
        d="M7.99812 16C10.1558 16 11.9753 15.2915 13.3011 14.0687L10.7231 12.0698C10.0058 12.5578 9.07988 12.8341 8.00106 12.8341C5.91398 12.8341 4.14436 11.426 3.50942 9.53296H0.849121V11.5936C2.2072 14.295 4.97332 16 7.99812 16Z"
        fill="#34A853"
      />
      <path
        d="M3.50665 9.53295C3.17154 8.53938 3.17154 7.4635 3.50665 6.46993V4.4093H0.849292C-0.285376 6.66982 -0.285376 9.33306 0.849292 11.5936L3.50665 9.53295Z"
        fill="#FBBC04"
      />
      <path
        d="M7.99812 3.16589C9.13867 3.14825 10.241 3.57743 11.067 4.36523L13.3511 2.0812C11.9048 0.723121 9.98526 -0.0235266 7.99812 -1.02057e-05C4.97332 -1.02057e-05 2.2072 1.70493 0.849121 4.40932L3.50648 6.46995C4.13848 4.57394 5.91104 3.16589 7.99812 3.16589Z"
        fill="#EA4335"
      />
    </g>
    <defs>
      <clipPath id="clip0">
        <rect fill="white" height="16" width="15.6825" />
      </clipPath>
    </defs>
  </svg>
);
