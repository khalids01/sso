import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RememberedAuthMethod =
  | "password"
  | "magic_link"
  | "google"
  | "facebook"
  | "linkedin"
  | "github";

type AuthMethodState = {
  lastUsedMethod: RememberedAuthMethod | null;
  rememberMethod: (method: RememberedAuthMethod) => void;
};

export const useAuthMethodStore = create<AuthMethodState>()(
  persist(
    (set) => ({
      lastUsedMethod: null,
      rememberMethod: (lastUsedMethod) => set({ lastUsedMethod }),
    }),
    { name: "sso-last-auth-method" },
  ),
);
