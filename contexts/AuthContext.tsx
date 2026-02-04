
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { UserProfile } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  // Helper function to fetch profile with a timeout
  const fetchProfile = async (userId: string) => {
    try {
      // Tăng timeout lên 10s để tránh lỗi mạng chậm làm mất quyền
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timed out')), 10000)
      );

      const dbPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      // Race against the timeout
      const { data, error } = await Promise.race([dbPromise, timeoutPromise]) as any;
      
      if (error) {
        console.warn('Error fetching profile:', error);
        return null;
      }
      return data as UserProfile;
    } catch (err) {
      console.warn('Unexpected error or timeout fetching profile:', err);
      return null;
    }
  };

  useEffect(() => {
    mounted.current = true;

    // Safety fallback: Force loading to false after 7 seconds to prevent getting stuck
    const safetyTimer = setTimeout(() => {
        if (mounted.current) {
            console.warn("Auth loading safety timer triggered. Forcing loading to false.");
            setLoading(false);
        }
    }, 7000);

    const initializeAuth = async () => {
        try {
            // 1. Get current session
            const { data: { session: initialSession }, error } = await supabase.auth.getSession();
            
            if (error) throw error;

            if (mounted.current) {
                setSession(initialSession);
                setUser(initialSession?.user ?? null);

                if (initialSession?.user) {
                    // Fetch profile if user exists
                    const userProfile = await fetchProfile(initialSession.user.id);
                    if (mounted.current && userProfile) {
                        setProfile(userProfile);
                    }
                }
            }
        } catch (error) {
            console.error("Auth initialization error:", error);
        } finally {
            if (mounted.current) {
                setLoading(false);
            }
        }
    };

    initializeAuth();

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        if (!mounted.current) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (event === 'SIGNED_OUT') {
            setProfile(null);
            setLoading(false);
            return;
        }

        if (currentSession?.user) {
            // Re-fetch profile on sign in or token refresh
            const userProfile = await fetchProfile(currentSession.user.id);
            
            if (mounted.current) {
                // QUAN TRỌNG: Chỉ cập nhật nếu lấy được profile hợp lệ.
                // Nếu fetchProfile trả về null (do lỗi mạng), giữ nguyên profile cũ 
                // để tránh tình trạng Admin bị mất menu Quản lý.
                if (userProfile) {
                    setProfile(userProfile);
                }
            }
        } else {
            if (mounted.current) setProfile(null);
        }
        
        if (mounted.current) setLoading(false);
    });

    return () => {
        mounted.current = false;
        clearTimeout(safetyTimer);
        subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
        await supabase.auth.signOut();
    } catch (error) {
        console.error("Error signing out:", error);
    } finally {
        if (mounted.current) {
            setProfile(null);
            setUser(null);
            setSession(null);
        }
    }
  };

  // --- ROLE LOGIC ---
  const role = profile?.role;
  const isSuperAdmin = role === 'super_admin';
  // Admin privileges include 'admin' AND 'super_admin'
  const isAdmin = role === 'admin' || isSuperAdmin;
  // Manager privileges include 'manager', 'admin', AND 'super_admin'
  const isManager = role === 'manager' || isAdmin;

  const value = {
    session,
    user,
    profile,
    loading,
    signOut,
    isAdmin,
    isManager,
    isSuperAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
