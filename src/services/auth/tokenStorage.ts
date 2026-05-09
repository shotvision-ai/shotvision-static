import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "shotvision_access_token";
const REFRESH_TOKEN_KEY = "shotvision_refresh_token";

/**
 * tokenStorage handles secure storage of authentication tokens using expo-secure-store.
 */
export const tokenStorage = {
  /**
   * Saves the access token securely.
   */
  async saveAccessToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    } catch (error) {
      console.error("Error saving access token:", error);
      throw new Error("Failed to save access token securely");
    }
  },

  /**
   * Retrieves the access token securely.
   * Returns null if token is missing or corrupted.
   */
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error("Error retrieving access token:", error);
      // Gracefully handle corrupted token by returning null
      return null;
    }
  },

  /**
   * Removes the access token.
   */
  async removeAccessToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error("Error removing access token:", error);
    }
  },

  /**
   * Saves the refresh token securely.
   */
  async saveRefreshToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    } catch (error) {
      console.error("Error saving refresh token:", error);
      throw new Error("Failed to save refresh token securely");
    }
  },

  /**
   * Retrieves the refresh token securely.
   * Returns null if token is missing or corrupted.
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error("Error retrieving refresh token:", error);
      // Gracefully handle corrupted token by returning null
      return null;
    }
  },

  /**
   * Removes the refresh token.
   */
  async removeRefreshToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error("Error removing refresh token:", error);
    }
  },

  /**
   * Clears all authentication tokens (session).
   */
  async clearSession(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      ]);
    } catch (error) {
      console.error("Error clearing session:", error);
    }
  },
};
