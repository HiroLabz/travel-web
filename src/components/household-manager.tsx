'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { createHouseholdAction, createHouseholdWithTemplateAction, updateHouseholdSettingsAction, updateHouseholdNameAction, addMemberByEmailAction, addManualMemberAction, deleteHouseholdAction, removeMemberAction, editMemberNameAction, createMemberWithAccountAction } from '@/lib/actions';
import { canCreateHousehold } from '@/lib/subscription';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2, Users, ArrowLeft, Plus, Shield, User, Baby, X, Save, Globe, Banknote, Wallet, MapPin, Clock, Archive, ArrowRight, Trash2, AlertTriangle, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { Combobox } from './ui/combobox';
import { CURRENCIES, COUNTRIES, DEFAULT_BUDGET_CATEGORIES, TIME_FORMAT_OPTIONS } from '@/lib/constants';
import type { HouseholdBudgetCategory, TimeFormat, HouseholdMember } from '@/types';
import { db, createUserAccount, generateSecurePassword } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useLoading } from '@/contexts/loading-context';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { getAvatarUrl } from '@/lib/avatar';

function CreateHouseholdForm() {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [householdNames, setHouseholdNames] = useState<Record<string, string>>({});
    const { user, userProfile } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    // Get list of user's existing households for template selection
    const existingHouseholds = userProfile?.householdIds || [];
    const hasExistingHouseholds = existingHouseholds.length > 0;

    // Fetch household names for template dropdown
    useEffect(() => {
        const fetchHouseholdNames = async () => {
            if (!db || existingHouseholds.length === 0) return;

            const names: Record<string, string> = {};
            for (const householdId of existingHouseholds) {
                try {
                    const householdRef = doc(db, 'households', householdId);
                    const householdSnap = await getDoc(householdRef);
                    if (householdSnap.exists()) {
                        names[householdId] = householdSnap.data().name || 'Unnamed Household';
                    }
                } catch (error) {
                    console.error('Error fetching household:', error);
                }
            }
            setHouseholdNames(names);
        };

        fetchHouseholdNames();
    }, [existingHouseholds.join(',')]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast({ title: 'You must be logged in.', variant: 'destructive' });
            return;
        }
        setLoading(true);

        // Check household creation limit based on subscription plan
        const householdCheck = await canCreateHousehold(
            user.uid,
            userProfile?.householdIds?.length || 0
        );

        if (!householdCheck.allowed) {
            toast({
                title: 'Travel Group Limit Reached',
                description: `Your ${householdCheck.plan === 'starter' ? 'Starter' : ''} plan allows ${householdCheck.maxHouseholds} travel group. Upgrade to Wanderer for unlimited groups.`,
                variant: 'destructive'
            });
            setLoading(false);
            return;
        }

        // Use new action with template support
        const result = await createHouseholdWithTemplateAction(
            name,
            user.uid,
            user.email!,
            user.displayName,
            user.photoURL,
            selectedTemplate
        );

        if (result.error) {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
            setLoading(false);
        } else {
            toast({ title: 'Success!', description: 'Travel group created.' });
            // Redirect to household settings
            router.push('/household');
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
            <div className="text-center p-8 border-2 border-dashed rounded-xl max-w-lg w-full mx-auto bg-white dark:bg-slate-800 shadow-sm dark:border-slate-700">
                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                    <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="mt-6 text-xl font-semibold text-slate-900 dark:text-slate-100">
                    {hasExistingHouseholds ? 'Create another Travel Group' : 'Create your Travel Group'}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    {hasExistingHouseholds
                        ? 'You can copy settings from an existing travel group or start fresh.'
                        : 'Start by creating a travel group to plan trips with family and friends.'}
                </p>
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div className="text-left">
                        <Label htmlFor="household-name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Travel Group Name
                        </Label>
                        <Input
                            id="household-name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g., The Adventure Crew"
                            required
                            className="mt-1 focus:ring-indigo-500"
                        />
                    </div>

                    {hasExistingHouseholds && (
                        <div className="text-left">
                            <Label htmlFor="template" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Copy Settings From (Optional)
                            </Label>
                            <select
                                id="template"
                                value={selectedTemplate || ''}
                                onChange={(e) => setSelectedTemplate(e.target.value || null)}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">Start Fresh (Default Settings)</option>
                                {existingHouseholds.map((householdId) => (
                                    <option key={householdId} value={householdId}>
                                        {householdNames[householdId] || 'Loading...'}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Copies currency, country, and budget categories from selected group
                            </p>
                        </div>
                    )}

                    <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Travel Group
                    </Button>
                </form>
            </div>
        </div>
    )
}

export default function HouseholdManager() {
    const { household, loading, user: currentUser, memberSuggestions, userProfile, activeHouseholdId, setActiveHouseholdId } = useAuth();
    const { toast } = useToast();
    const { showLoading, hideLoading } = useLoading();
    const router = useRouter();
    const searchParams = useSearchParams();
    const showCreateForm = searchParams.get('create') === 'true';

    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(household?.name || '');
    const [showAddModal, setShowAddModal] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    // Multi-household management
    const [allHouseholds, setAllHouseholds] = useState<Array<{ id: string; name: string }>>([]);

    // Household settings state
    const [currency, setCurrency] = useState(household?.currency || '');
    const [countryOfOrigin, setCountryOfOrigin] = useState(household?.countryOfOrigin || '');
    const [cityOfOrigin, setCityOfOrigin] = useState(household?.cityOfOrigin || '');
    const [timeFormat, setTimeFormat] = useState<TimeFormat>(household?.timeFormat || '24h');
    const [budgetCategories, setBudgetCategories] = useState<HouseholdBudgetCategory[]>(
        household?.budgetCategories || DEFAULT_BUDGET_CATEGORIES
    );
    const [newCategoryName, setNewCategoryName] = useState('');

    // New member form state
    const [addMemberTab, setAddMemberTab] = useState<'email' | 'manual' | 'create'>('email');
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [newMemberRole, setNewMemberRole] = useState<'member' | 'child'>('member');

    // Delete confirmation state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Edit member state
    const [editingMember, setEditingMember] = useState<HouseholdMember | null>(null);
    const [editMemberName, setEditMemberName] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [updateUserProfile, setUpdateUserProfile] = useState(false);
    const [isSavingMember, setIsSavingMember] = useState(false);

    // Remove member state
    const [removingMember, setRemovingMember] = useState<HouseholdMember | null>(null);
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [isRemovingMember, setIsRemovingMember] = useState(false);

    // Create account for member state
    const [createAccountMode, setCreateAccountMode] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
    const [isCreatingAccount, setIsCreatingAccount] = useState(false);

    // Fetch all household names for multi-household list
    useEffect(() => {
        const fetchAllHouseholds = async () => {
            if (!db || !userProfile?.householdIds || userProfile.householdIds.length === 0) {
                setAllHouseholds([]);
                return;
            }

            const householdData: Array<{ id: string; name: string }> = [];
            for (const householdId of userProfile.householdIds) {
                try {
                    const householdRef = doc(db, 'households', householdId);
                    const householdSnap = await getDoc(householdRef);
                    if (householdSnap.exists()) {
                        householdData.push({
                            id: householdId,
                            name: householdSnap.data().name || 'Unnamed Household'
                        });
                    }
                } catch (error) {
                    console.error('Error fetching household:', error);
                }
            }
            setAllHouseholds(householdData);
        };

        fetchAllHouseholds();
    }, [userProfile?.householdIds?.join(',')]);

    if (loading) {
        return <LoadingScreen message="Loading travel group..." />;
    }

    // Show create form if no household OR if create=true query parameter
    if (!household || showCreateForm) {
        return <CreateHouseholdForm />;
    }
    
    const handleUpdateName = async () => {
        if (!household || !tempName.trim()) return;
        showLoading('Saving name...');
        const result = await updateHouseholdNameAction(household.id, tempName);
        hideLoading();
        if (result.error) {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        } else {
            toast({ title: 'Success', description: 'Household name updated successfully.' });
        }
        setIsEditingName(false);
    };

    const handleDeleteHousehold = async () => {
        if (!household || !currentUser) return;

        // Require typing the household name to confirm
        if (deleteConfirmText !== household.name) {
            toast({ title: 'Error', description: 'Please type the travel group name to confirm deletion.', variant: 'destructive' });
            return;
        }

        setIsDeleting(true);
        const result = await deleteHouseholdAction(household.id, currentUser.uid);
        setIsDeleting(false);

        if (result.error) {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        } else {
            toast({ title: 'Travel group deleted', description: 'The travel group and all its data have been permanently deleted.' });
            setShowDeleteModal(false);
            setDeleteConfirmText('');
            // Redirect to dashboard - the auth provider will handle switching to another household
            router.push('/dashboard');
        }
    };

    const isOwner = household?.members.find(m => m.uid === currentUser?.uid)?.role === 'owner';

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!household || !currentUser) return;

        if (addMemberTab === 'email') {
            if (!newMemberEmail.trim()) {
                toast({ title: 'Error', description: 'Email is required.', variant: 'destructive' });
                return;
            }
        } else {
            if (!newMemberName.trim()) {
                toast({ title: 'Error', description: 'Name is required.', variant: 'destructive' });
                return;
            }
        }

        showLoading('Adding member...');

        try {
            let result;

            if (addMemberTab === 'email') {
                result = await addMemberByEmailAction(
                    household.id,
                    newMemberEmail.trim(),
                    currentUser.uid,
                    currentUser.displayName
                );
            } else {
                result = await addManualMemberAction(
                    household.id,
                    newMemberName.trim(),
                    newMemberRole,
                    currentUser.uid,
                    currentUser.displayName
                );
            }

            hideLoading();

            if (result.error) {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: 'Success!', description: result.message || 'Member added successfully.' });
                setShowAddModal(false);
                setNewMemberName('');
                setNewMemberEmail('');
                setNewMemberRole('member');
                setAddMemberTab('email');
            }
        } catch (error) {
            hideLoading();
            console.error('Error adding member:', error);
            toast({ title: 'Error', description: 'Failed to add member.', variant: 'destructive' });
        }
    };

    const handleEditMember = async () => {
        if (!household || !currentUser || !editingMember || !editMemberName.trim()) return;

        setIsSavingMember(true);
        try {
            const memberKey = editingMember.isManualEntry
                ? `${editingMember.name}|${editingMember.addedAt}`
                : null;

            const result = await editMemberNameAction(
                household.id,
                editingMember.uid || null,
                memberKey,
                editMemberName.trim(),
                !!editingMember.isManualEntry,
                updateUserProfile,
                currentUser.uid
            );

            if (result.error) {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: 'Success', description: result.message || 'Member name updated.' });
                setShowEditModal(false);
                setEditingMember(null);
                setEditMemberName('');
                setUpdateUserProfile(false);
            }
        } catch (error) {
            console.error('Error editing member:', error);
            toast({ title: 'Error', description: 'Failed to update member name.', variant: 'destructive' });
        }
        setIsSavingMember(false);
    };

    const handleRemoveMember = async () => {
        if (!household || !currentUser || !removingMember) return;

        setIsRemovingMember(true);
        try {
            const memberKey = removingMember.isManualEntry
                ? `${removingMember.name}|${removingMember.addedAt}`
                : null;

            const result = await removeMemberAction(
                household.id,
                removingMember.uid || null,
                memberKey,
                !!removingMember.isManualEntry,
                currentUser.uid
            );

            if (result.error) {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: 'Success', description: result.message || 'Member removed.' });
                setShowRemoveModal(false);
                setRemovingMember(null);
            }
        } catch (error) {
            console.error('Error removing member:', error);
            toast({ title: 'Error', description: 'Failed to remove member.', variant: 'destructive' });
        }
        setIsRemovingMember(false);
    };

    const handleCreateMemberAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!household || !currentUser || !newMemberEmail.trim() || !newMemberName.trim()) {
            toast({ title: 'Error', description: 'Email and name are required.', variant: 'destructive' });
            return;
        }

        setIsCreatingAccount(true);
        try {
            // Generate a secure temporary password
            const tempPassword = generateSecurePassword(12);

            // Create the Firebase Auth account
            const newUser = await createUserAccount(
                newMemberEmail.trim(),
                tempPassword,
                newMemberName.trim()
            );

            if (!newUser) {
                toast({ title: 'Error', description: 'Failed to create user account.', variant: 'destructive' });
                setIsCreatingAccount(false);
                return;
            }

            // Create the user document and add to household
            const result = await createMemberWithAccountAction(
                household.id,
                newUser.uid,
                newUser.email,
                newMemberName.trim(),
                newMemberRole,
                currentUser.uid,
                currentUser.displayName
            );

            if (result.error) {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            } else {
                // Show the generated password
                setGeneratedPassword(tempPassword);
                setShowAddModal(false);
                setNewMemberName('');
                setNewMemberEmail('');
                setNewMemberRole('member');
                setCreateAccountMode(false);
                toast({ title: 'Success!', description: result.message || 'Account created.' });
            }
        } catch (error: unknown) {
            console.error('Error creating member account:', error);
            const firebaseError = error as { code?: string; message?: string };
            if (firebaseError.code === 'auth/email-already-in-use') {
                toast({ title: 'Error', description: 'An account with this email already exists.', variant: 'destructive' });
            } else {
                toast({ title: 'Error', description: firebaseError.message || 'Failed to create account.', variant: 'destructive' });
            }
        }
        setIsCreatingAccount(false);
    };

    const handleSaveSettings = async (newCurrency: string, newCountry: string, newCity: string, newTimeFormat: TimeFormat, categories?: HouseholdBudgetCategory[]) => {
        if (!household) return;
        setSavingSettings(true);
        const result = await updateHouseholdSettingsAction(household.id, {
            currency: newCurrency,
            countryOfOrigin: newCountry,
            cityOfOrigin: newCity,
            timeFormat: newTimeFormat,
            budgetCategories: categories,
        });
        if (result.error) {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        } else {
            toast({ title: 'Settings saved', description: 'Household settings updated successfully.' });
        }
        setSavingSettings(false);
    };

    const handleCurrencyChange = (value: string) => {
        setCurrency(value);
        handleSaveSettings(value, countryOfOrigin, cityOfOrigin, timeFormat, budgetCategories);
    };

    const handleCountryChange = (value: string) => {
        setCountryOfOrigin(value);
        handleSaveSettings(currency, value, cityOfOrigin, timeFormat, budgetCategories);
    };

    const handleCityChange = (value: string) => {
        setCityOfOrigin(value);
        handleSaveSettings(currency, countryOfOrigin, value, timeFormat, budgetCategories);
    };

    const handleTimeFormatChange = (value: TimeFormat) => {
        setTimeFormat(value);
        handleSaveSettings(currency, countryOfOrigin, cityOfOrigin, value, budgetCategories);
    };

    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        const newCategory: HouseholdBudgetCategory = {
            id: `custom-${Date.now()}`,
            name: newCategoryName.trim(),
        };

        const updatedCategories = [...budgetCategories, newCategory];
        setBudgetCategories(updatedCategories);
        setNewCategoryName('');
        handleSaveSettings(currency, countryOfOrigin, cityOfOrigin, timeFormat, updatedCategories);
    };

    const handleRemoveCategory = (categoryId: string) => {
        const updatedCategories = budgetCategories.filter(c => c.id !== categoryId);
        setBudgetCategories(updatedCategories);
        handleSaveSettings(currency, countryOfOrigin, cityOfOrigin, timeFormat, updatedCategories);
    };

    const handleResetCategories = () => {
        setBudgetCategories(DEFAULT_BUDGET_CATEGORIES);
        handleSaveSettings(currency, countryOfOrigin, cityOfOrigin, timeFormat, DEFAULT_BUDGET_CATEGORIES);
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
        case 'owner': return <Shield className="w-4 h-4 text-indigo-500" />;
        case 'admin': return <Shield className="w-4 h-4 text-indigo-500" />;
        case 'child': return <Baby className="w-4 h-4 text-sky-500" />;
        default: return <User className="w-4 h-4 text-slate-500" />;
        }
    };
    
    return (
        <>
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                <button onClick={() => router.push('/dashboard')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 mr-3 text-slate-500 dark:text-slate-400">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Travel Group Settings</h1>
                </div>
            </div>
            </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 dark:bg-slate-900 min-h-screen">

            {/* My Travel Groups Card (only show if user has multiple households) */}
            {allHouseholds.length > 1 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-100 dark:bg-purple-900/50 p-3 rounded-lg">
                                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">My Travel Groups</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    You belong to {allHouseholds.length} travel groups. Switch between them or create a new one.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        {allHouseholds.map((h) => (
                            <button
                                key={h.id}
                                onClick={async () => {
                                    if (h.id !== activeHouseholdId) {
                                        await setActiveHouseholdId(h.id);
                                        toast({ title: 'Switched travel group', description: `Now managing ${h.name}` });
                                    }
                                }}
                                className={`text-left p-4 rounded-lg border-2 transition-all ${
                                    h.id === activeHouseholdId
                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-slate-900 dark:text-slate-100">{h.name}</span>
                                    {h.id === activeHouseholdId && (
                                        <span className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full font-medium">
                                            Active
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => router.push('/household?create=true')}
                        className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:border-purple-400 dark:hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create New Travel Group
                    </button>
                </div>
            )}

            {/* Travel Group Name Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Group Profile</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage your travel group name and identity.</p>
                </div>
                </div>
                {!isEditingName ? (
                <button
                    onClick={() => {
                        setTempName(household.name);
                        setIsEditingName(true);
                    }}
                    className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                    Edit
                </button>
                ) : (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingName(false)} className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">Cancel</Button>
                    <Button size="sm" onClick={handleUpdateName} disabled={!tempName.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                        Save
                    </Button>
                </div>
                )}
            </div>

            {isEditingName ? (
                <Input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-2xl font-bold"
                />
            ) : (
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{household.name}</div>
            )}

            {/* Delete Travel Group - Only visible to owner */}
            {isOwner && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-red-600 dark:text-red-400">Delete Travel Group</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Permanently delete this travel group and all its data.</p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDeleteModal(true)}
                            className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </Button>
                    </div>
                </div>
            )}
            </div>

            {/* Regional Settings Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-emerald-100 dark:bg-emerald-900/50 p-3 rounded-lg">
                <Globe className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Regional Settings</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Set your travel group&apos;s location and preferred currency.</p>
                </div>
                {savingSettings && (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400 ml-auto" />
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                <Label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-400" />
                    Country of Origin
                    </div>
                </Label>
                <Combobox
                    options={COUNTRIES}
                    value={countryOfOrigin}
                    onValueChange={handleCountryChange}
                    placeholder="Select country..."
                    searchPlaceholder="Search countries..."
                    emptyText="No country found."
                    disabled={savingSettings}
                />
                </div>

                <div>
                <Label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    City of Origin
                    </div>
                </Label>
                <Input
                    type="text"
                    value={cityOfOrigin}
                    onChange={(e) => setCityOfOrigin(e.target.value)}
                    onBlur={() => handleCityChange(cityOfOrigin)}
                    placeholder="e.g., New York"
                    disabled={savingSettings}
                />
                </div>

                <div>
                <Label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-slate-400" />
                    Preferred Currency
                    </div>
                </Label>
                <Combobox
                    options={CURRENCIES}
                    value={currency}
                    onValueChange={handleCurrencyChange}
                    placeholder="Select currency..."
                    searchPlaceholder="Search currencies..."
                    emptyText="No currency found."
                    disabled={savingSettings}
                />
                </div>

                <div>
                <Label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    Time Format
                    </div>
                </Label>
                <div className="flex gap-2">
                    {TIME_FORMAT_OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => handleTimeFormatChange(option.value)}
                        disabled={savingSettings}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                        timeFormat === option.value
                            ? 'bg-emerald-50 dark:bg-emerald-900/50 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500'
                            : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                        }`}
                    >
                        <div className="text-xs">{option.label}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">{option.example}</div>
                    </button>
                    ))}
                </div>
                </div>
            </div>
            </div>

            {/* Budget Categories Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                <div className="bg-amber-100 dark:bg-amber-900/50 p-3 rounded-lg">
                    <Wallet className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Budget Categories</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Define the categories you want to track for trip budgets.</p>
                </div>
                </div>
                <div className="flex items-center gap-2">
                {savingSettings && (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                )}
                <button
                    onClick={handleResetCategories}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline"
                    disabled={savingSettings}
                >
                    Reset to defaults
                </button>
                </div>
            </div>

            {/* Category List */}
            <div className="flex flex-wrap gap-2 mb-6">
                {budgetCategories.map((category) => (
                <div
                    key={category.id}
                    className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 group"
                >
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{category.name}</span>
                    <button
                    onClick={() => handleRemoveCategory(category.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    disabled={savingSettings}
                    >
                    <X className="w-4 h-4" />
                    </button>
                </div>
                ))}
            </div>

            {/* Add New Category Form */}
            <form onSubmit={handleAddCategory} className="flex items-end gap-3">
                <div className="flex-1">
                <Label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Category Name</Label>
                <Input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g., Souvenirs"
                    className="h-10"
                    disabled={savingSettings}
                />
                </div>
                <Button
                type="submit"
                disabled={!newCategoryName.trim() || savingSettings}
                className="bg-amber-600 hover:bg-amber-700 h-10"
                >
                <Plus className="w-4 h-4 mr-1" />
                Add
                </Button>
            </form>
            </div>

            {/* Archived Trips Link */}
            <div
              onClick={() => router.push('/archived-trips')}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8 cursor-pointer hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-lg group-hover:bg-slate-200 dark:group-hover:bg-slate-600 transition-colors">
                    <Archive className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Archived Trips</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">View and restore trips that have been archived.</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
              </div>
            </div>

            {/* Members Grid */}
            <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Members ({household.members.length})</h3>
            <Button
                onClick={() => setShowAddModal(true)}
                className="bg-slate-900 dark:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
            >
                <Plus className="w-4 h-4 mr-2" />
                Add Member
            </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {household.members.map((member, index) => (
                    <div key={member.uid || `manual-member-${index}`} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 hover:shadow-md transition-shadow group">
                    <img src={getAvatarUrl(member.photoURL, member.name)} alt={member.name || 'member'} className="w-12 h-12 rounded-full object-cover border border-slate-100 dark:border-slate-600" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">{member.name}</span>
                        {member.uid === currentUser?.uid && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 flex-shrink-0">YOU</span>
                        )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {getRoleIcon(member.role)}
                        <span className="capitalize">{member.role}</span>
                        </div>
                    </div>
                    {/* Action buttons - only for owner, not on owner's card */}
                    {isOwner && member.role !== 'owner' && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => {
                                    setEditingMember(member);
                                    setEditMemberName(member.name || '');
                                    setUpdateUserProfile(false);
                                    setShowEditModal(true);
                                }}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                                title="Edit member name"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => {
                                    setRemovingMember(member);
                                    setShowRemoveModal(true);
                                }}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                                title="Remove member"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    </div>
                ))}
            </div>

        </div>

        {/* Add Member Modal */}
        {showAddModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Add Family Member</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <X className="w-5 h-5" />
                </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <button
                        type="button"
                        onClick={() => setAddMemberTab('email')}
                        className={`flex-1 px-3 py-3 text-xs font-medium transition-colors ${
                            addMemberTab === 'email'
                                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                    >
                        Add by Email
                    </button>
                    <button
                        type="button"
                        onClick={() => setAddMemberTab('manual')}
                        className={`flex-1 px-3 py-3 text-xs font-medium transition-colors ${
                            addMemberTab === 'manual'
                                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                    >
                        Add Manually
                    </button>
                    {isOwner && (
                        <button
                            type="button"
                            onClick={() => setAddMemberTab('create')}
                            className={`flex-1 px-3 py-3 text-xs font-medium transition-colors ${
                                addMemberTab === 'create'
                                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                            }`}
                        >
                            Create Account
                        </button>
                    )}
                </div>

                <form onSubmit={addMemberTab === 'create' ? handleCreateMemberAccount : handleAddMember} className="p-6 space-y-4">
                {addMemberTab === 'email' && (
                    <>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                        <Input
                        type="email"
                        required
                        className="focus:ring-indigo-500"
                        placeholder="email@example.com"
                        value={newMemberEmail}
                        onChange={e => setNewMemberEmail(e.target.value)}
                        list="member-suggestions"
                        />
                        {memberSuggestions.length > 0 && (
                            <datalist id="member-suggestions">
                                {memberSuggestions
                                    .filter(suggestion => suggestion.email)
                                    .map((suggestion, idx) => (
                                        <option key={idx} value={suggestion.email}>
                                            {suggestion.name}
                                        </option>
                                    ))}
                            </datalist>
                        )}
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            The user will be added to this household automatically
                        </p>
                    </div>
                    </>
                )}
                {addMemberTab === 'manual' && (
                    <>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                        <Input
                        type="text"
                        required
                        className="focus:ring-indigo-500"
                        placeholder="e.g. Alice Anderson"
                        value={newMemberName}
                        onChange={e => setNewMemberName(e.target.value)}
                        list="name-suggestions"
                        />
                        {memberSuggestions.length > 0 && (
                            <datalist id="name-suggestions">
                                {memberSuggestions.map((suggestion, idx) => (
                                    <option key={idx} value={suggestion.name} />
                                ))}
                            </datalist>
                        )}
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            For children or family members without an account
                        </p>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                        <div className="grid grid-cols-2 gap-2">
                        {(['member', 'child'] as const).map((role) => (
                            <button
                            key={role}
                            type="button"
                            onClick={() => setNewMemberRole(role)}
                            className={`py-2 px-1 rounded-lg text-xs font-medium border capitalize flex items-center justify-center gap-1.5 ${
                                newMemberRole === role
                                ? 'bg-indigo-50 dark:bg-indigo-900/50 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                                : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                            }`}
                            >
                            {getRoleIcon(role)}
                            {role}
                            </button>
                        ))}
                        </div>
                    </div>
                    </>
                )}
                {addMemberTab === 'create' && (
                    <>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                        <Input
                        type="email"
                        required
                        className="focus:ring-indigo-500"
                        placeholder="email@example.com"
                        value={newMemberEmail}
                        onChange={e => setNewMemberEmail(e.target.value)}
                        />
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            A new account will be created with this email
                        </p>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                        <Input
                        type="text"
                        required
                        className="focus:ring-indigo-500"
                        placeholder="e.g. Alice Anderson"
                        value={newMemberName}
                        onChange={e => setNewMemberName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                        <div className="grid grid-cols-2 gap-2">
                        {(['member', 'child'] as const).map((role) => (
                            <button
                            key={role}
                            type="button"
                            onClick={() => setNewMemberRole(role)}
                            className={`py-2 px-1 rounded-lg text-xs font-medium border capitalize flex items-center justify-center gap-1.5 ${
                                newMemberRole === role
                                ? 'bg-indigo-50 dark:bg-indigo-900/50 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                                : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                            }`}
                            >
                            {getRoleIcon(role)}
                            {role}
                            </button>
                        ))}
                        </div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                            A temporary password will be generated and shown once. Share it with the member so they can log in. They will be required to change it on first login.
                        </p>
                    </div>
                    </>
                )}

                <div className="pt-2">
                    <Button
                    type="submit"
                    disabled={isCreatingAccount}
                    className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                        {isCreatingAccount ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating Account...
                            </>
                        ) : addMemberTab === 'create' ? (
                            <>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Account
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Add Member
                            </>
                        )}
                    </Button>
                </div>
                </form>
            </div>
            </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-red-50 dark:bg-red-900/30 px-6 py-4 border-b border-red-100 dark:border-red-800 flex items-center gap-3">
                        <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-full">
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-red-900 dark:text-red-100">Delete Travel Group</h3>
                            <p className="text-sm text-red-700 dark:text-red-300">This action cannot be undone</p>
                        </div>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                            This will permanently delete <span className="font-semibold">{household?.name}</span> and all its data, including:
                        </p>
                        <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 mb-6 ml-4 list-disc">
                            <li>All trips and itineraries</li>
                            <li>All uploaded documents</li>
                            <li>All budget tracking data</li>
                            <li>All member associations</li>
                        </ul>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Type <span className="font-bold text-slate-900 dark:text-slate-100">{household?.name}</span> to confirm:
                            </label>
                            <Input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="Enter travel group name"
                                className="border-red-200 dark:border-red-800 focus:ring-red-500"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDeleteHousehold}
                                disabled={deleteConfirmText !== household?.name || isDeleting}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                Delete Forever
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Edit Member Modal */}
        {showEditModal && editingMember && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowEditModal(false); setEditingMember(null); }}>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100">Edit Member</h3>
                        <button onClick={() => { setShowEditModal(false); setEditingMember(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <Label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Member Name
                            </Label>
                            <Input
                                type="text"
                                value={editMemberName}
                                onChange={(e) => setEditMemberName(e.target.value)}
                                placeholder="Enter member name"
                                className="w-full"
                            />
                        </div>
                        {!editingMember.isManualEntry && editingMember.uid && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="update-profile"
                                    checked={updateUserProfile}
                                    onChange={(e) => setUpdateUserProfile(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <Label htmlFor="update-profile" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                                    Also update their user profile name
                                </Label>
                            </div>
                        )}
                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => { setShowEditModal(false); setEditingMember(null); }}
                                disabled={isSavingMember}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleEditMember}
                                disabled={!editMemberName.trim() || isSavingMember}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {isSavingMember ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Remove Member Confirmation Modal */}
        {showRemoveModal && removingMember && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowRemoveModal(false); setRemovingMember(null); }}>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-red-50 dark:bg-red-900/30 px-6 py-4 border-b border-red-100 dark:border-red-800 flex items-center gap-3">
                        <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-full">
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-red-900 dark:text-red-100">Remove Member</h3>
                            <p className="text-sm text-red-700 dark:text-red-300">This action cannot be undone</p>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <img
                                src={getAvatarUrl(removingMember.photoURL, removingMember.name)}
                                alt={removingMember.name || 'member'}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-600"
                            />
                            <div>
                                <p className="font-semibold text-slate-900 dark:text-slate-100">{removingMember.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{removingMember.role}</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                            Are you sure you want to remove <span className="font-semibold">{removingMember.name}</span> from this travel group?
                        </p>
                        {!removingMember.isManualEntry && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                They will lose access to this travel group and all its trips.
                            </p>
                        )}
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => { setShowRemoveModal(false); setRemovingMember(null); }}
                                disabled={isRemovingMember}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleRemoveMember}
                                disabled={isRemovingMember}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {isRemovingMember ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                Remove Member
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Generated Password Modal */}
        {generatedPassword && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                    <div className="bg-emerald-50 dark:bg-emerald-900/30 px-6 py-4 border-b border-emerald-100 dark:border-emerald-800 flex items-center gap-3">
                        <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-full">
                            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-emerald-900 dark:text-emerald-100">Account Created</h3>
                            <p className="text-sm text-emerald-700 dark:text-emerald-300">Share this password with the member</p>
                        </div>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                            The account has been created successfully. Share the temporary password below with the member:
                        </p>
                        <div className="bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4 mb-4">
                            <p className="font-mono text-lg text-center text-slate-900 dark:text-slate-100 select-all">
                                {generatedPassword}
                            </p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                            <p className="text-xs text-amber-800 dark:text-amber-200">
                                This password will only be shown once. Make sure to copy it or write it down before closing this window. The member will be required to change it on first login.
                            </p>
                        </div>
                        <Button
                            onClick={() => setGeneratedPassword(null)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            Done
                        </Button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
