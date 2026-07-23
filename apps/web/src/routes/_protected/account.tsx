import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useSession } from "@/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_protected/account")({
  component: AccountPage,
});

function AccountPage() {
  const { session } = useSession();
  const [name, setName] = useState(session?.user?.name || "");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await authClient.updateUser({ name });
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Account</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your account profile.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Public Profile</CardTitle>
          <CardDescription>
            This is how others will see you on the site.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center gap-4 rounded-lg border bg-muted/20 p-4">
            <Avatar className="size-16">
              <AvatarImage
                src={session?.user?.image ?? undefined}
                alt={session?.user?.name ?? "Profile avatar"}
              />
              <AvatarFallback className="text-lg">
                {(session?.user?.name ?? "User").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{session?.user?.name}</p>
              <p className="text-sm text-muted-foreground">
                Profile image provided by your connected OAuth provider.
              </p>
            </div>
          </div>
          <form
            id="profile-form"
            onSubmit={handleUpdateProfile}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={session?.user?.email || ""}
                disabled
              />
              <p className="text-[0.8rem] text-muted-foreground">
                Your email address is managed by your sign-in provider.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button type="submit" form="profile-form" disabled={isUpdating}>
            {isUpdating ? "Saving..." : "Save changes"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
