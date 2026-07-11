import { create } from "zustand";
import { persist } from "zustand/middleware";

type ApplicationsViewMode = "list" | "grid";

type ApplicationsViewState = {
  viewMode: ApplicationsViewMode;
  setViewMode: (viewMode: ApplicationsViewMode) => void;
};

export const useApplicationsViewStore = create<ApplicationsViewState>()(
  persist(
    (set) => ({
      viewMode: "list",
      setViewMode: (viewMode) => set({ viewMode }),
    }),
    {
      name: "sso-admin-applications-view",
    },
  ),
);
