import { useState } from "react";
import { Check, Copy, Code2, Terminal, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const IntegrationDemo = () => {
  const [activeLang, setActiveLang] = useState<"ts" | "node" | "python" | "curl">("ts");
  const [copied, setCopied] = useState(false);

  const snippets = {
    ts: `import { createSsoBetterAuthIntegration } from "@skycanvasstudio/sso/better-auth"
import { betterAuth } from "better-auth"
import { genericOAuth } from "better-auth/plugins"
import { env } from "./env.server"

export const skycanvas = createSsoBetterAuthIntegration({
  clientId: env.SSO_CLIENT_ID,
  baseUrl: env.SSO_URL,
})

export const auth = betterAuth({
  database,
  plugins: [genericOAuth({ config: [skycanvas.provider] })],
})`,
    node: `import { createSsoServer } from "@skycanvasstudio/sso/server"
import { createNodeSsoHandler } from "@skycanvasstudio/sso/node"
import { env } from "./env.server"

const sso = createSsoServer({
  clientId: env.SSO_CLIENT_ID,
  baseUrl: env.SSO_URL,
  appUrl: env.APP_URL,
  sessionSecret: env.SESSION_SECRET,
})

app.all("/auth/*splat", createNodeSsoHandler(sso))`,
    python: `from sso_auth import SsoVerifier

verifier = SsoVerifier(
    issuer="https://auth.yourdomain.com",
    jwks_url="https://api-sso.skycanvasstudio.com/api/auth/jwks"
)

# FastAPI / Starlette auth dependency
async function get_current_user(token: str = Depends(oauth2_scheme)):
    payload = await verifier.verify_token(token)
    return payload["sub"] # Pairwise isolated user ID`,
    curl: `# Fetch public JWKS keys for local token signature verification
curl -X GET https://api-sso.skycanvasstudio.com/api/auth/jwks

# Exchange PKCE authorization code for 10-minute RS256 token
curl -X POST https://api-sso.skycanvasstudio.com/api/auth/oauth2/token \\
  -d "grant_type=authorization_code" \\
  -d "client_id=YOUR_CLIENT_ID" \\
  -d "code_verifier=YOUR_PKCE_VERIFIER" \\
  -d "code=AUTHORIZATION_CODE"`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeLang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="integration" className="py-24 bg-background border-t border-border/40 relative">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center max-w-6xl mx-auto">
          {/* Left Description Column */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <Code2 className="w-3.5 h-3.5" />
              Seamless Integration
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              Connect Any Application in Minutes
            </h2>

            <p className="text-muted-foreground text-base leading-relaxed">
              SSO provides standard OpenID Connect endpoints, pairwise subject isolation, and lightweight SDK handlers. Integrate web apps, backend APIs, or microservices with zero complex middleware setup.
            </p>

            <ul className="space-y-3 font-medium text-sm text-foreground">
              <li className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xs">
                  ✓
                </div>
                <span>Standard OIDC <code>.well-known/openid-configuration</code></span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xs">
                  ✓
                </div>
                <span>Zero-latency local RS256 token verification via JWKS</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xs">
                  ✓
                </div>
                <span>Real-time webhook revocation delivery for instant signouts</span>
              </li>
            </ul>

            <div className="pt-2">
              <a href="/login">
                <Button className="rounded-xl font-semibold gap-2">
                  Register Client Application <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>

          {/* Right Code Window Column */}
          <div className="lg:col-span-7">
            <div className="border border-border/80 rounded-2xl bg-slate-950 text-slate-100 shadow-2xl overflow-hidden text-left">
              {/* Header Tab Switcher */}
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveLang("ts")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      activeLang === "ts"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    TypeScript
                  </button>
                  <button
                    onClick={() => setActiveLang("node")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      activeLang === "node"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Node.js
                  </button>
                  <button
                    onClick={() => setActiveLang("python")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      activeLang === "python"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Python
                  </button>
                  <button
                    onClick={() => setActiveLang("curl")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      activeLang === "curl"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    cURL / OIDC
                  </button>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg"
                  title="Copy code"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              {/* Code Snippet Box */}
              <div className="p-5 font-mono text-xs md:text-sm overflow-x-auto min-h-[300px]">
                <pre className="text-slate-200 leading-relaxed">
                  <code>{snippets[activeLang]}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
