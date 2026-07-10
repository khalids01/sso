import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import UserMenu from "@/components/core/user-menu";

export const LandingNav = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="h-13">
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b h-13 pt-2 bg-background/80 backdrop-blur"
        )}
      >
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-2xl font-bold tracking-tight">
              SSO
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <a
                href="#features"
                className="hover:text-primary transition-colors"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="hover:text-primary transition-colors"
              >
                Pricing
              </a>
              <a
                href="#testimonials"
                className="hover:text-primary transition-colors"
              >
                Testimonials
              </a>
              <a href="#faq" className="hover:text-primary transition-colors">
                FAQ
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full"
            >
              {theme === "dark" ? (
                <Sun className="size-6" />
              ) : (
                <Moon className="size-6" />
              )}
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>
    </div>
  );
};
