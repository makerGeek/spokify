import { createContext, useContext, useState, ReactNode } from 'react';

interface InviteContextType {
  pendingInviteCode: string | null;
  setPendingInviteCode: (code: string | null) => void;
  isInviteRequired: boolean;
  setIsInviteRequired: (required: boolean) => void;
}

const InviteContext = createContext<InviteContextType | undefined>(undefined);

export function InviteProvider({ children }: { children: ReactNode }) {
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  const [isInviteRequired, setIsInviteRequired] = useState(false);

  return (
    <InviteContext.Provider 
      value={{ 
        pendingInviteCode, 
        setPendingInviteCode, 
        isInviteRequired, 
        setIsInviteRequired 
      }}
    >
      {children}
    </InviteContext.Provider>
  );
}

export function useInvite() {
  const context = useContext(InviteContext);
  if (context === undefined) {
    throw new Error('useInvite must be used within an InviteProvider');
  }
  return context;
}