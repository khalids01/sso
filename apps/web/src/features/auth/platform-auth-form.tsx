import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/client";
import SignInForm from "./sign-in-form";
import SignUpForm from "./sign-up-form";
import type { ApplicationAuthPolicy } from "./application-auth-shell";

type PlatformSettings = {
  signInMethods: ApplicationAuthPolicy["signInMethods"];
  signUpMethods: ApplicationAuthPolicy["signUpMethods"];
  registrationMode: ApplicationAuthPolicy["registrationMode"];
};

export function PlatformAuthForm({ page }: { page: "login" | "signup" }) {
  const query = useQuery({
    queryKey: ["platform-auth-settings"],
    queryFn: async () => {
      const { data, error } = await client.auth["platform-settings"].get();
      if (error) throw error;
      return data as PlatformSettings;
    },
  });
  if (!query.data) return null;
  const policy: ApplicationAuthPolicy = {
    signInMethods: query.data.signInMethods,
    signUpMethods:
      query.data.registrationMode === "closed" ? [] : query.data.signUpMethods,
    registrationMode: query.data.registrationMode,
  };
  return page === "login" ? (
    <SignInForm applicationPolicy={policy} />
  ) : (
    <SignUpForm applicationPolicy={policy} />
  );
}
