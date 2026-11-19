import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { Company, CompanyMember, UserProfile } from '../types/models';
import {
  checkIsReviewer,
  ensureUserProfile,
  seedDefaultEmissionFactors,
  updateUserProfile,
} from '../services/firestoreService';
import { BOOTSTRAPPED_OWNER_EMAIL } from '../constants/defaults';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isPlatformOwner: boolean;
  isReviewer: boolean;
  userCompanies: Company[];
  activeCompany: Company | null;
  activeMembership: CompanyMember | null;
  isCompanyAdmin: boolean;
  authError: string | null;
  signInWithGoogle: (preferredRole?: 'company_admin' | 'company_user') => Promise<void>;
  signOut: () => Promise<void>;
  selectActiveCompany: (companyId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReviewer, setIsReviewer] = useState(false);
  const [userCompanies, setUserCompanies] = useState<Company[]>([]);
  const [memberships, setMemberships] = useState<CompanyMember[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  const isPlatformOwner = Boolean(
    firebaseUser?.emailVerified &&
      (firebaseUser.email?.toLowerCase() === BOOTSTRAPPED_OWNER_EMAIL.toLowerCase() ||
        userProfile?.role === 'platform_owner')
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthError(null);
      if (!user) {
        setUserProfile(null);
        setIsReviewer(false);
        setUserCompanies([]);
        setMemberships([]);
        setSelectedCompanyId('');
        setLoading(false);
        return;
      }

      try {
        const profile = await ensureUserProfile('company_admin');
        setUserProfile(profile);
        if (profile.activeCompanyId) {
          setSelectedCompanyId(profile.activeCompanyId);
        }
        const reviewerFlag = await checkIsReviewer(user.uid);
        setIsReviewer(reviewerFlag || profile.role === 'verification_reviewer');

        // Auto-seed academic demo emission factors if Owner signs in and collection is empty
        if (user.email?.toLowerCase() === BOOTSTRAPPED_OWNER_EMAIL.toLowerCase() && user.emailVerified) {
          try {
            const { getDocs } = await import('firebase/firestore');
            const efSnap = await getDocs(collection(db, 'emission_factors'));
            if (efSnap.empty) {
              await seedDefaultEmissionFactors();
            }
          } catch {
            // Non-blocking seed check
          }
        }
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Unable to load user profile.');
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to companies the authenticated user belongs to
  useEffect(() => {
    if (!firebaseUser) return;
    const q = query(collection(db, 'companies'), where('memberUids', 'array-contains', firebaseUser.uid));
    const unsubCompanies = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Company) }));
        setUserCompanies(list);
        if (list.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(list[0].companyId);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'companies')
    );

    const mq = query(collection(db, 'company_members'), where('uid', '==', firebaseUser.uid));
    const unsubMembers = onSnapshot(
      mq,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as CompanyMember) }));
        setMemberships(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'company_members')
    );

    return () => {
      unsubCompanies();
      unsubMembers();
    };
  }, [firebaseUser, selectedCompanyId]);

  const activeCompany =
    userCompanies.find((c) => c.companyId === selectedCompanyId) || userCompanies[0] || null;

  const activeMembership = activeCompany
    ? memberships.find((m) => m.companyId === activeCompany.companyId && m.status === 'active') || null
    : null;

  const isCompanyAdmin = Boolean(
    isPlatformOwner ||
      activeMembership?.role === 'company_admin' ||
      (activeCompany && firebaseUser && activeCompany.ownerUid === firebaseUser.uid)
  );

  const signInWithGoogle = async (preferredRole: 'company_admin' | 'company_user' = 'company_admin') => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      const profile = await ensureUserProfile(preferredRole);
      setUserProfile(profile);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
      setAuthError(msg);
      throw err;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const selectActiveCompany = async (companyId: string) => {
    setSelectedCompanyId(companyId);
    if (firebaseUser) {
      await updateUserProfile(firebaseUser.uid, { activeCompanyId: companyId });
    }
  };

  const refreshProfile = async () => {
    if (!firebaseUser) return;
    const profile = await ensureUserProfile();
    setUserProfile(profile);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        loading,
        isPlatformOwner,
        isReviewer,
        userCompanies,
        activeCompany,
        activeMembership,
        isCompanyAdmin,
        authError,
        signInWithGoogle,
        signOut,
        selectActiveCompany,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
