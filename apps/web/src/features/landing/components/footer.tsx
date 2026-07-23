import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-background border-t border-border/60 pt-16 pb-12 text-left">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Col 1 */}
          <div className="col-span-1 md:col-span-1 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold tracking-tight">SSO</span>
            </Link>
            <p className="text-muted-foreground text-xs leading-relaxed max-w-xs">
              Centralized identity, single sign-on, and access management for internal and customer-facing applications.
            </p>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="font-bold text-sm mb-4 text-foreground">Navigation</h4>
            <ul className="space-y-2.5 text-muted-foreground text-xs font-medium">
              <li>
                <a href="#features" className="hover:text-primary transition-colors">
                  Platform Features
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-primary transition-colors">
                  Security & Data Privacy
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-primary transition-colors">
                  Frequently Asked Questions
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="font-bold text-sm mb-4 text-foreground">Compliance & Legal</h4>
            <ul className="space-y-2.5 text-muted-foreground text-xs font-medium">
              <li>
                <Link to="/privacy" className="hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/data-deletion" className="hover:text-primary transition-colors">
                  Data Deletion Instructions
                </Link>
              </li>
              <li>
                <a 
                  href="https://developers.google.com/terms/api-services-user-data-policy" 
                  target="_blank" 
                  rel="noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Google Limited Use Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4 */}
          <div>
            <h4 className="font-bold text-sm mb-4 text-foreground">Supported Providers</h4>
            <p className="text-muted-foreground text-xs mb-3 leading-relaxed">
              Sign in with your preferred social identity or magic link.
            </p>
            <div className="flex flex-wrap gap-2 font-mono text-[11px]">
              <span className="px-2.5 py-1 rounded bg-muted border border-border text-foreground font-medium">Google</span>
              <span className="px-2.5 py-1 rounded bg-muted border border-border text-foreground font-medium">GitHub</span>
              <span className="px-2.5 py-1 rounded bg-muted border border-border text-foreground font-medium">Meta</span>
              <span className="px-2.5 py-1 rounded bg-muted border border-border text-foreground font-medium">LinkedIn</span>
            </div>
          </div>
        </div>

        <div className="border-t border-border/60 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} SSO Identity Service. All rights reserved.</p>
          <div className="flex items-center gap-6 font-medium">
            <Link to="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link to="/data-deletion" className="hover:text-primary transition-colors">
              Data Deletion
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
