import { useAuth as useClerkAuth, useUser, useSignIn, useSignUp, useClerk } from '@clerk/clerk-expo';

export const useAuth = () => {
  const { isLoaded, userId, sessionId, getToken } = useClerkAuth();
  const { user } = useUser();
  const { signIn, setActive: setActiveSignIn } = useSignIn();
  const { signUp, setActive: setActiveSignUp } = useSignUp();
  const { signOut } = useClerk();

  return {
    isLoaded,
    isSignedIn: !!userId,
    userId,
    sessionId,
    getToken,
    user,
    signIn,
    signUp,
    signOut,
    setActiveSignIn,
    setActiveSignUp
  };
}; 