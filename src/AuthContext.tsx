import {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
  useMemo,
} from "react";
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signOut,
} from "firebase/auth";
import { auth, db } from "./firebase"; // Ensure this points to Firebase
import { doc, getDoc } from "firebase/firestore";

// Extend Firebase User with Vizionary fields
interface ExtendedUser extends FirebaseUser {
  isVizionary?: boolean;
  vizionaryId?: string;
  vizionaryName?: string;
}

export interface AuthContextType {
  user: ExtendedUser | null;
  logout: () => Promise<void>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("🔄 Auth state changed:", firebaseUser);

      if (firebaseUser) {
        // ✅ Fetch Firestore user data
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};

        setUser({
          ...firebaseUser,
          isVizionary: userData.isVizionary || false,
          vizionaryId: userData.vizionaryId || null,
          vizionaryName: userData.vizionaryName || null,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    console.log("🚪 User logged out");
    setUser(null);
  };

  const value = useMemo(() => ({ user, logout, loading }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
