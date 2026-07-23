import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Sun, Moon, ShieldCheck } from "lucide-react";
import UserMenu from "@/components/core/user-menu";

export const LandingNav = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="h-16">
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-border/40 h-16 bg-background/80 backdrop-blur-md"
        )}
      >
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight leading-none">SSO</span>
                <span className="text-[10px] text-muted-foreground font-mono leading-none mt-0.5">Identity Provider</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <a
                href="#features"
                className="hover:text-foreground transition-colors"
              >
                Features
              </a>
              <a
                href="#authentication"
                className="hover:text-foreground transition-colors"
              >
                Authentication
              </a>
              <a
                href="#security"
                className="hover:text-foreground transition-colors"
              >
                Security
              </a>
              <a
                href="#faq"
                className="hover:text-foreground transition-colors"
              >
                FAQ
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full w-9 h-9"
            >
              {theme === "dark" ? (
                <Sun className="size-4 text-muted-foreground hover:text-foreground" />
              ) : (
                <Moon className="size-4 text-muted-foreground hover:text-foreground" />
              )}
            </Button>

            <UserMenu />
          </div>
        </div>
      </header>
    </div>
  );
};
