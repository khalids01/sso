import { safeReturnTo, type SsoSession } from "../index.js";

type Navigate = (path: string) => void;

export function completeAuthInteraction(
  session: SsoSession | null,
  returnTo: string,
  onSuccess?: (session: SsoSession) => void,
  navigate: Navigate = defaultNavigate,
): void {
  if (!session) return;
  if (onSuccess) {
    onSuccess(session);
    return;
  }
  navigate(safeReturnTo(returnTo));
}

function defaultNavigate(path: string): void {
  if (typeof window === "undefined") return;
  window.location.assign(path);
}
