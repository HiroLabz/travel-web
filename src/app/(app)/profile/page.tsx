'use client';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Save, Loader2, User, Mail, Camera, Upload, CreditCard, Sparkles, Calendar, ExternalLink } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { updateProfile } from 'firebase/auth';
import { auth, db, storage } from '@/lib/firebase';
import { doc, updateDoc, getDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAvatarUrl } from '@/lib/avatar';
import type { HouseholdMember } from '@/types';
import { PLAN_LIMITS } from '@/types';

export default function ProfilePage() {
  const { userProfile, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setPhotoURL(userProfile.photoURL || '');
    }
  }, [userProfile]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile || !storage) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (JPG, PNG, etc.)',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 5MB.',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      // Create a unique filename
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const storageRef = ref(storage, `profile-photos/${userProfile.uid}/${timestamp}.${extension}`);

      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update the local state
      setPhotoURL(downloadURL);

      // Update Firebase Auth profile
      if (auth?.currentUser) {
        await updateProfile(auth.currentUser, {
          photoURL: downloadURL
        });
      }

      // Update Firestore user profile
      if (db) {
        const userRef = doc(db, 'users', userProfile.uid);
        await updateDoc(userRef, {
          photoURL: downloadURL
        });
      }

      // Sync photo to all households where the user is a member (client-side for proper auth)
      try {
        const householdIds: string[] = userProfile.householdIds || [];
        // Also check legacy field
        if (householdIds.length === 0 && userProfile.householdId) {
          householdIds.push(userProfile.householdId);
        }

        if (householdIds.length > 0 && db) {
          const batch = writeBatch(db);

          for (const householdId of householdIds) {
            const householdRef = doc(db, 'households', householdId);
            const householdSnap = await getDoc(householdRef);

            if (householdSnap.exists()) {
              const householdData = householdSnap.data();
              const members: HouseholdMember[] = householdData.members || [];

              // Update the member's photoURL
              const updatedMembers = members.map((member) => {
                if (member.uid === userProfile.uid) {
                  return { ...member, photoURL: downloadURL };
                }
                return member;
              });

              batch.update(householdRef, { members: updatedMembers });
            }
          }

          await batch.commit();
        }

        toast({
          title: 'Photo uploaded',
          description: 'Your profile photo has been updated everywhere.'
        });
        // Force refresh to update server-rendered pages
        router.refresh();
      } catch (syncError) {
        console.error('Failed to sync photo to households:', syncError);
        toast({
          title: 'Photo uploaded',
          description: 'Profile updated, but failed to sync to travel groups.',
        });
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload photo. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!auth?.currentUser || !userProfile) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update your profile.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);

    try {
      // Update Firebase Auth profile
      if (auth?.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName || null,
          photoURL: photoURL || null
        });
      }

      // Update Firestore user profile
      if (db) {
        const userRef = doc(db, 'users', userProfile.uid);
        await updateDoc(userRef, {
          displayName: displayName || null,
          photoURL: photoURL || null
        });
      }

      toast({
        title: 'Profile updated',
        description: 'Your profile has been saved successfully.'
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleManageSubscription = () => {
    router.push('/onboarding/plan?manage=true');
  };

  // Helper to format trial end date
  const formatTrialEnd = (trialEnd?: string) => {
    if (!trialEnd) return null;
    const date = new Date(trialEnd);
    const now = new Date();
    if (date <= now) return null;

    const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 mr-3 text-slate-500 dark:text-slate-400"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">My Profile</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage your personal information
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="space-y-6">
            {/* Profile Picture */}
            <div className="flex items-center gap-6 pb-6 border-b border-slate-200 dark:border-slate-700">
              <div className="relative group">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="relative block rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed"
                >
                  <Image
                    src={getAvatarUrl(photoURL || userProfile?.photoURL, displayName || userProfile?.displayName, userProfile?.email)}
                    alt="Profile"
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-full border-2 border-slate-200 dark:border-slate-600 transition-opacity group-hover:opacity-75"
                    unoptimized
                  />
                  {uploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                  )}
                </button>
                <div className="absolute bottom-0 right-0 bg-indigo-500 rounded-full p-1.5 pointer-events-none">
                  <Camera className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {displayName || userProfile?.displayName || 'User'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {userProfile?.email}
                </p>
                <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">
                  Click photo to change
                </p>
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                Display Name
              </Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="dark:bg-slate-700 dark:border-slate-600"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This is the name that will be displayed throughout the app.
              </p>
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={userProfile?.email || ''}
                disabled
                className="bg-slate-100 dark:bg-slate-700 dark:border-slate-600 cursor-not-allowed"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Email cannot be changed.
              </p>
            </div>

            {/* Subscription Section */}
            {userProfile?.stripeSubscriptionId && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-900 dark:text-slate-100">Subscription</span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
                  {/* Current Plan */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {userProfile.subscription?.plan === 'wanderer' ? 'Wanderer' : 'Starter'} Plan
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      userProfile.stripeSubscriptionStatus === 'active'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : userProfile.stripeSubscriptionStatus === 'trialing'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {userProfile.stripeSubscriptionStatus === 'trialing'
                        ? 'Trial'
                        : userProfile.stripeSubscriptionStatus === 'active'
                        ? 'Active'
                        : userProfile.stripeSubscriptionStatus}
                    </span>
                  </div>

                  {/* Trial Status */}
                  {userProfile.stripeSubscriptionStatus === 'trialing' && userProfile.subscription?.trialEnd && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Calendar className="w-4 h-4" />
                      <span>Trial ends: {formatTrialEnd(userProfile.subscription.trialEnd)}</span>
                    </div>
                  )}

                  {/* Credits Info */}
                  {userProfile.subscription && (
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {PLAN_LIMITS[userProfile.subscription.plan].monthlyCredits - userProfile.subscription.creditsUsed}
                      </span>
                      {' '}of{' '}
                      <span>{PLAN_LIMITS[userProfile.subscription.plan].monthlyCredits}</span>
                      {' '}credits remaining this month
                    </div>
                  )}

                  {/* Manage Button */}
                  <Button
                    onClick={handleManageSubscription}
                    disabled={loadingPortal}
                    variant="outline"
                    className="w-full mt-2"
                  >
                    {loadingPortal ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Manage Subscription
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 sm:flex-none"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Link href="/dashboard">
                <Button variant="outline">Cancel</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
