import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,

  login: async (userData, token, refreshToken = null) => {
    try {
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      if (refreshToken) {
        await AsyncStorage.setItem('refreshToken', refreshToken);
      }
      set({ user: userData, token, refreshToken, isAuthenticated: true });
    } catch (error) {
      console.error('Login storage error:', error);
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('refreshToken');
      set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
    } catch (error) {
      console.error('Logout storage error:', error);
    }
  },

  setUser: (userData) => {
    set({ user: userData });
  },

  loadUser: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      const userStr = await AsyncStorage.getItem('user');
      
      let user = null;
      if (userStr && userStr !== 'undefined' && userStr !== 'null') {
        try {
          user = JSON.parse(userStr);
        } catch (parseError) {
          console.error('JSON parse error for user data:', parseError);
          // Clear corrupted data
          await AsyncStorage.removeItem('user');
        }
      }
      
      if (token && user) {
        set({ user, token, refreshToken, isAuthenticated: true });
      } else {
        // Clear invalid state
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      }
    } catch (error) {
      console.error('Load user storage error:', error);
      // Reset to safe state on error
      set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
    }
  },
}));

export default useAuthStore;
