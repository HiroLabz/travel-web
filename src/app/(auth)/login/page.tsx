'use client';

import { useState, Suspense } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plane, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!auth || !db) throw new Error("Firebase not initialized");

      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Create session cookie before navigating
        const idToken = await userCredential.user.getIdToken();
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
        toast({ title: 'Signed in successfully!' });
        // Use hard navigation to ensure AuthProvider initializes with fresh auth state
        window.location.href = callbackUrl;
      } else {
        if (name.length < 2) {
          throw new Error('Name must be at least 2 characters long.');
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });

        // Set user document
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: name,
            photoURL: null,
        }, { merge: true });

        // Create session cookie before navigating
        const idToken = await userCredential.user.getIdToken();
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });

        toast({ title: 'Account created successfully!' });
        // Use hard navigation to ensure AuthProvider initializes with fresh auth state
        // New users are redirected to onboarding to select a plan first
        window.location.href = '/onboarding/plan';
      }
    } catch (error: any) {
      toast({
        title: 'Authentication Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
      <div className="max-w-xs mx-auto w-full">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {isLogin ? 'Welcome back' : 'Create an account'}
        </h2>
        <p className="text-slate-500 mb-8 text-sm">
          {isLogin ? 'Enter your details to access your trips.' : 'Start planning your dream vacation today.'}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <Label htmlFor="name" className="block text-xs font-medium text-slate-700 mb-1">Full Name</Label>
              <Input
                id="name"
                type="text"
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <Label htmlFor="email" className="block text-xs font-medium text-slate-700 mb-1">Email Address</Label>
            <Input
              id="email"
              type="email"
              required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="password" className="block text-xs font-medium text-slate-700 mb-1">Password</Label>
            <Input
              id="password"
              type="password"
              required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground p-3 rounded-lg font-medium transition-colors flex items-center justify-center group"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>
            {isLogin ? 'Sign In' : 'Create Account'}
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </>}
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-semibold hover:underline"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>

      </div>
    </div>
  );
}

function LoginFormFallback() {
  return (
    <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
      <div className="max-w-xs mx-auto w-full flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row h-[600px]">

        {/* Left Side - Visual */}
        <div className="w-full md:w-1/2 bg-slate-900 text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-20">
             <Image src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=1000" alt="Travel" layout="fill" objectFit="cover" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 text-primary font-bold text-xl mb-4">
              <Plane className="w-6 h-6" />
              <span>WanderNest</span>
            </div>
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Plan your next <span className="text-primary">family adventure</span> together.
            </h1>
            <p className="text-slate-400">
              The collaborative travel binder for modern families. Itineraries, documents, and memories in one place.
            </p>
          </div>

          <div className="relative z-10 flex gap-2 items-center">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900" />
              <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900" />
              <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900" />
            </div>
            <p className="text-xs text-slate-400 py-1.5 ml-2">Trusted by 10,000+ families</p>
          </div>
        </div>

        {/* Right Side - Form */}
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>
      </div>
  );
}
