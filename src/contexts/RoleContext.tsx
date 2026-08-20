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

const ALLOWED_PUBLIC_ROLES: UserRole[] = [
  'Farmer',
  'Labour',
  'Store Owner',
  'Tractor Owner',
  'Cattle Owner',
  'Transport Owner',
  'Soil Tester',
];

export const RoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  // Lazily initialize state from localStorage to persist across reloads.
  // Never trust 'Admin' from localStorage to prevent client-side privilege escalation.
  const [activeRole, setActiveRoleState] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('agri_user_role') as UserRole;
      if (stored && ALLOWED_PUBLIC_ROLES.includes(stored)) {
        return stored;
      }
    }
    return 'Farmer';
  });
  
  const [isMuted, setIsMuted] = useState(false);

  const setActiveRole = (role: UserRole) => {
    // Prevent client-side setting of Admin without server authorization
    const safeRole = ALLOWED_PUBLIC_ROLES.includes(role) ? role : 'Farmer';
    setActiveRoleState(safeRole);
    if (typeof window !== 'undefined') {
      localStorage.setItem('agri_user_role', safeRole);
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
