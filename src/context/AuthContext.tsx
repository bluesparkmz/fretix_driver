import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService, userNeedsOnboarding, type OnboardingChoice, type User } from '../services/auth';
import { walletService, type Wallet } from '../services/wallet';

export type UserType = User['user_type'];

interface AuthContextType {
  user: User | null;
  userType: UserType | null;
  isClient: boolean;
  isCompany: boolean;
  isDriver: boolean;
  isPending: boolean;
  wallet: Wallet | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<void>;
  completeOnboarding: (choice: OnboardingChoice) => Promise<void>;
  logout: () => Promise<void>;
  getWallet: () => Promise<void>;
  updateUser: (data: Partial<Pick<User, 'name' | 'email' | 'profile_photo'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userType = user?.user_type ?? null;
  const isPending = userNeedsOnboarding(user);
  const isClient = !isPending && userType === 'cliente';
  const isCompany = !isPending && userType === 'empresa';
  const isDriver = !isPending && userType === 'motorista';

  useEffect(() => {
    void loadStoredUser();
  }, []);

  async function loadStoredUser() {
    try {
      const storedToken = await authService.getStoredToken();
      const cachedUser = await authService.getStoredUser();

      if (!storedToken) {
        setUser(null);
        setWallet(null);
        setIsLoading(false);
        return;
      }

      if (cachedUser) {
        setUser(cachedUser);
        setIsLoading(false);
      }

      try {
        const freshUser = await authService.getMe();
        setUser(freshUser);
        if (!userNeedsOnboarding(freshUser)) {
          await getWallet();
        }
      } catch (error: any) {
        if (error.response?.status === 401) {
          console.log('Token inválido ou expirado, limpando...');
          await authService.logout();
          setUser(null);
          setWallet(null);
        } else {
          console.warn('Network issue while refreshing user data. Continuing with cached user.', error.message);
        }
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      setUser(null);
      setWallet(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function getWallet() {
    try {
      const walletData = await walletService.getWallet();
      setWallet(walletData);
    } catch (error) {
      console.error('Failed to load wallet:', error);
      setWallet(null);
    }
  }

  async function login(email: string, password: string) {
    try {
      const response = await authService.login(email, password);
      setUser(response.user);
      if (!userNeedsOnboarding(response.user)) {
        await getWallet();
      }
    } catch (error) {
      setUser(null);
      setWallet(null);
      throw error;
    }
  }

  async function loginWithGoogle(idToken: string) {
    try {
      const response = await authService.loginWithGoogle(idToken);
      setUser(response.user);
      if (!userNeedsOnboarding(response.user)) {
        await getWallet();
      }
    } catch (error) {
      setUser(null);
      setWallet(null);
      throw error;
    }
  }

  async function register(name: string, email: string, phone: string, password: string) {
    try {
      const response = await authService.register(name, email, phone, password);
      setUser(response.user);
    } catch (error) {
      setUser(null);
      setWallet(null);
      throw error;
    }
  }

  async function completeOnboarding(choice: OnboardingChoice) {
    try {
      const updatedUser = await authService.completeOnboarding(choice);
      setUser(updatedUser);
      await getWallet();
    } catch (error) {
      throw error;
    }
  }

  async function logout() {
    try {
      await authService.logout();
      setUser(null);
      setWallet(null);
    } catch (error) {
      throw error;
    }
  }

  async function updateUser(data: Partial<Pick<User, 'name' | 'email' | 'profile_photo'>>) {
    const updatedUser = await authService.updateUser(data);
    setUser(updatedUser);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userType,
        isClient,
        isCompany,
        isDriver,
        isPending,
        wallet,
        isLoading,
        login,
        loginWithGoogle,
        register,
        completeOnboarding,
        logout,
        getWallet,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
