'use client';

import { useState } from 'react';
import {
  reauthenticateWithCredential,
  updatePassword,
  EmailAuthProvider,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plane, ArrowRight, Lock, Shield } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!auth?.currentUser || !db) {
        throw new Error('Not authenticated');
      }

      // Validate passwords match
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }

      // Validate password length
      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      // Reauthenticate user with current password
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email!,
        currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, newPassword);

      // Update user profile to remove requirePasswordChange flag
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        requirePasswordChange: false,
      });

      toast({ title: 'Password changed successfully!' });
      router.push('/dashboard');
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      let errorMessage = firebaseError.message || 'Failed to change password';

      if (firebaseError.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
      } else if (firebaseError.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password';
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // If user is not required to change password, redirect to dashboard
  if (user && userProfile && !userProfile.requirePasswordChange) {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row h-[600px]">
      {/* Left Side - Visual */}
      <div className="w-full md:w-1/2 bg-slate-900 text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-20">
          <Image src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=1000" alt="Travel" fill style={{ objectFit: 'cover' }} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-primary font-bold text-xl mb-4">
            <Plane className="w-6 h-6" />
            <span>WanderNest</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Secure your <span className="text-primary">account</span>
          </h1>
          <p className="text-slate-400">
            Please create a new password to continue. Your account security is important to us.
          </p>
        </div>

        <div className="relative z-10 flex gap-2 items-center">
          <Shield className="w-5 h-5 text-emerald-400" />
          <p className="text-xs text-slate-400 py-1.5">Your password is encrypted and secure</p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
        <div className="max-w-xs mx-auto w-full">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-amber-100 p-2 rounded-full">
              <Lock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Change Your Password
          </h2>
          <p className="text-slate-500 mb-8 text-sm">
            Your account was created with a temporary password. Please set a new password to continue.
          </p>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="current-password" className="block text-xs font-medium text-slate-700 mb-1">
                Temporary Password
              </Label>
              <Input
                id="current-password"
                type="password"
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                placeholder="Enter temporary password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="new-password" className="block text-xs font-medium text-slate-700 mb-1">
                New Password
              </Label>
              <Input
                id="new-password"
                type="password"
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="confirm-password" className="block text-xs font-medium text-slate-700 mb-1">
                Confirm New Password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground p-3 rounded-lg font-medium transition-colors flex items-center justify-center group"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  Change Password
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
