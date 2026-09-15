import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  increment,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';
import { ENV, getTodayDateString } from '../lib/constants';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name: string, refCode?: string) => Promise<void>;
  signInWithGoogle: (refCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Check admin status: strictly match import.meta.env.VITE_ADMIN_EMAIL (case-insensitive, trimmed)
  const configuredAdminEmail = (
    import.meta.env.VITE_ADMIN_EMAIL ||
    ENV.ADMIN_EMAIL ||
    ''
  )
    .toLowerCase()
    .trim();
  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const isAdmin = Boolean(
    currentUser &&
    configuredAdminEmail &&
    userEmail &&
    userEmail === configuredAdminEmail
  );

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);

        // Realtime sync of user profile
        unsubscribeProfile = onSnapshot(userDocRef, async (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as UserProfile;
            const today = getTodayDateString();

            // Daily reset check for today's ads count
            if (data.todayDate !== today) {
              await updateDoc(userDocRef, {
                todayDate: today,
                todayAdsWatched: 0,
                todayEarned: 0,
              });
              setUserProfile({
                ...data,
                todayDate: today,
                todayAdsWatched: 0,
                todayEarned: 0,
              });
            } else {
              setUserProfile(data);
            }
          } else {
            // Document doesn't exist yet, create initial profile
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              name: user.displayName || user.email?.split('@')[0] || 'Member',
              balance: 0.0,
              createdAt: new Date().toISOString(),
              streakCount: 0,
              lastActiveDate: '',
              referralCode: generateReferralCode(),
              referredBy: null,
              referralCount: 0,
              referralEarnings: 0.0,
              totalAdsWatched: 0,
              todayAdsWatched: 0,
              todayDate: getTodayDateString(),
              todayEarned: 0.0,
            };
            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
          }
          setLoading(false);
        }, (error) => {
          console.error('User profile subscription error:', error);
          setLoading(false);
        });
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signup = async (email: string, pass: string, name: string, refCode?: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const user = userCredential.user;

    await updateProfile(user, { displayName: name.trim() });

    let referredByUid: string | null = null;
    const cleanRefCode = refCode?.trim().toUpperCase();

    if (cleanRefCode) {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('referralCode', '==', cleanRefCode));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const referrerDoc = querySnapshot.docs[0];
          referredByUid = referrerDoc.id;
          // Increment referrer's referral count
          await updateDoc(doc(db, 'users', referrerDoc.id), {
            referralCount: increment(1),
          });
        }
      } catch (err) {
        console.warn('Referral lookup error:', err);
      }
    }

    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || email.trim(),
      name: name.trim(),
      balance: 0.0,
      createdAt: new Date().toISOString(),
      streakCount: 0,
      lastActiveDate: '',
      referralCode: generateReferralCode(),
      referredBy: referredByUid,
      referralCount: 0,
      referralEarnings: 0.0,
      totalAdsWatched: 0,
      todayAdsWatched: 0,
      todayDate: getTodayDateString(),
      todayEarned: 0.0,
    };

    await setDoc(doc(db, 'users', user.uid), newProfile);
    setUserProfile(newProfile);
  };

  const signInWithGoogle = async (refCode?: string) => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    // Check if user profile already exists
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      let referredByUid: string | null = null;
      const storedRef = typeof window !== 'undefined' ? sessionStorage.getItem('roz_referral_code') : null;
      const cleanRefCode = (refCode || storedRef || '')?.trim().toUpperCase();

      if (cleanRefCode) {
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('referralCode', '==', cleanRefCode));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const referrerDoc = querySnapshot.docs[0];
            if (referrerDoc.id !== user.uid) {
              referredByUid = referrerDoc.id;
              await updateDoc(doc(db, 'users', referrerDoc.id), {
                referralCount: increment(1),
              });
            }
          }
        } catch (err) {
          console.warn('Referral lookup error during Google sign-in:', err);
        }
      }

      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        name: user.displayName || user.email?.split('@')[0] || 'Member',
        balance: 0.0,
        createdAt: new Date().toISOString(),
        streakCount: 0,
        lastActiveDate: '',
        referralCode: generateReferralCode(),
        referredBy: referredByUid,
        referralCount: 0,
        referralEarnings: 0.0,
        totalAdsWatched: 0,
        todayAdsWatched: 0,
        todayDate: getTodayDateString(),
        todayEarned: 0.0,
      };

      await setDoc(userDocRef, newProfile);
      setUserProfile(newProfile);
    } else {
      // Existing user: do not reset balance or overwrite profile
      setUserProfile(userDocSnap.data() as UserProfile);
    }
  };

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), pass);
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  const refreshProfile = async () => {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      setUserProfile(snap.data() as UserProfile);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isAdmin,
        loading,
        login,
        signup,
        signInWithGoogle,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
