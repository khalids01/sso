import { Link, useNavigate, useRouter } from "@tanstack/react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useSession } from "@/providers/session-provider";

import { Button } from "../ui/button";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Permissions } from "@rbac";
import { env } from "@env/public";
import { sessionHasPermission } from "@/features/user/lib/session-permissions";

function expireCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function clearAuthCookies() {
  const sessionCookieName = env.AUTH_SESSION_COOKIE_NAME;

  const authCookieNames = new Set([
    sessionCookieName,
    `__Secure-${sessionCookieName}`,
    "better-auth.session_token",
    "__Secure-better-auth.session_token",
    "better-auth.session_data",
    "__Secure-better-auth.session_data",
  ]);

  for (const cookieName of authCookieNames) {
    expireCookie(cookieName);
  }
}

export default function UserMenu() {
  const navigate = useNavigate();
  const router = useRouter();
  const { session } = useSession();

  if (!session) {
    return (
      <>
        <Link to="/login">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
            Log in
          </Button>
        </Link>
        <Link to="/login">
          <Button size="sm">Get Started</Button>
        </Link>
      </>
    );
  }

  const items = [
    {
      label: "Dashboard",
      href: "/dashboard",
      type: "url",
    },
    {
      label: "Admin Dashboard",
      href: "/admin/overview",
      type: "url",
      show: sessionHasPermission(
        session.permissions,
        Permissions.AdminAccess,
      ),
    },
    {
      label: "Sign out",
      type: "btn",
      onClick: () => {
        authClient.signOut({
          fetchOptions: {
            onSuccess: async () => {
              await navigate({
                to: "/",
              });
              await router.invalidate();
            },
            onError() {
              clearAuthCookies();
              window.location.assign("/");
            },
          },
        });
      },
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            aria-label="User menu"
            className="h-10 w-10 shrink-0 rounded-md"
          >
            <User className="size-5" />
          </Button>
        }
      ></DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col">
            <span className="text-sm font-medium">{session.user.name}</span>
            <span className="text-xs text-muted-foreground">
              {session.user.email}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {items.map((item) => {
            if (item.show === false) return null;

            if (item.type === "url" && item.href) {
              return (
                <DropdownMenuItem
                  className={"text-base"}
                  onClick={() => navigate({ to: item.href })}
                  key={item.label}
                >
                  {item.label}
                </DropdownMenuItem>
              );
            }

            return (
              <DropdownMenuItem
                key={item.label}
                onClick={item.onClick}
                className={cn(
                  item.label === "Sign out" ? "text-destructive" : "",
                  "text-base"
                )}
              >
                {item.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
