import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 
  | 'Farmer' 
  | 'Labour' 
  | 'Store Owner' 
  | 'Tractor Owner' 
  | 'Cattle Owner' 
  | 'Transport Owner' 
  | 'Soil Tester'
  | 'Admin';

interface RoleContextType {
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  isMuted: boolean;
  toggleMute: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Lazily initialize state from localStorage to persist across reloads
  const [activeRole, setActiveRoleState] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('agri_user_role') as UserRole) || 'Farmer';
    }
    return 'Farmer';
  });
  
  const [isMuted, setIsMuted] = useState(false);

  // Securely update state and storage (in production, sync this with Supabase Auth user_metadata)
  const setActiveRole = (role: UserRole) => {
    setActiveRoleState(role);
    if (typeof window !== 'undefined') {
      localStorage.setItem('agri_user_role', role);
    }
  };

  const toggleMute = () => setIsMuted(!isMuted);

  return (
    <RoleContext.Provider value={{ activeRole, setActiveRole, isMuted, toggleMute }}>
      {children}
    </RoleContext.Provider>
  );
};

const defaultRoleContext: RoleContextType = {
  activeRole: 'Farmer',
  setActiveRole: () => {},
  isMuted: false,
  toggleMute: () => {},
};

export const useRole = () => {
  const context = useContext(RoleContext);
  return context || defaultRoleContext;
};
