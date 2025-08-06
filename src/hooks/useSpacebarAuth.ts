import { useState, useEffect, useCallback } from 'react';
import { spacebarClient } from '@/lib/spacebar';

interface SpacebarUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
}

interface AuthState {
  user: SpacebarUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export const useSpacebarAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    error: null
  });

  // Initialize client on mount
  useEffect(() => {
    const initializeClient = async () => {
      try {
        setAuthState(prev => ({ ...prev, isLoading: true }));
        
        // Try to get stored token
        const storedToken = localStorage.getItem('spacebar_token');
        if (storedToken) {
          await spacebarClient.initialize();
          await spacebarClient.login(storedToken);
          const user = spacebarClient.getUser();
          
          if (user) {
            setAuthState({
              user: {
                id: user.id,
                username: user.username,
                discriminator: user.discriminator,
                avatar: user.avatar
              },
              isLoading: false,
              isAuthenticated: true,
              error: null
            });
          }
        } else {
          await spacebarClient.initialize();
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Failed to initialize Spacebar client:', error);
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize'
        }));
      }
    };

    initializeClient();
  }, []);

  const login = useCallback(async (token: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const result = await spacebarClient.login(token);
      
      // Store token
      localStorage.setItem('spacebar_token', token);
      
      const user = spacebarClient.getUser();
      
      if (user) {
        setAuthState({
          user: {
            id: user.id,
            username: user.username,
            discriminator: user.discriminator,
            avatar: user.avatar
          },
          isLoading: false,
          isAuthenticated: true,
          error: null
        });
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  const register = useCallback(async (credentials: { email: string; password: string; username: string }) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const result = await spacebarClient.register(credentials);
      
      // Store token if provided
      if (result.token) {
        localStorage.setItem('spacebar_token', result.token);
        
        // Login with the new token
        await spacebarClient.login(result.token);
        const user = spacebarClient.getUser();
        
        if (user) {
          setAuthState({
            user: {
              id: user.id,
              username: user.username,
              discriminator: user.discriminator,
              avatar: user.avatar
            },
            isLoading: false,
            isAuthenticated: true,
            error: null
          });
        }
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem('spacebar_token');
      await spacebarClient.disconnect();
      
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  return {
    ...authState,
    login,
    register,
    logout
  };
};