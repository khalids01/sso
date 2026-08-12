import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Clock3,
  Code2,
  ExternalLink,
  KeyRound,
  Menu,
  Server,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  integrationComparison,
  securityChecklist,
  troubleshootingItems,
  type CodeSample,
} from "./integration-guide-content";
import { CopyCodeBlock } from "./copy-code-block";
import ssoAgentGuide from "./sso-agent-guide.md?raw";
import { packageRecipes, type GuideMode } from "./package-guide-content";

const headingClass =
  "text-[clamp(1.65rem,3vw,2rem)] font-semibold leading-tight tracking-[-0.025em] text-[#f4f6ff]";
const leadClass = "mt-3 max-w-2xl text-[0.95rem] leading-7 text-[#7f849c]";

const guideOptions: Array<{
  value: GuideMode;
  label: string;
  description: string;
  badge?: string;
}> = [
  { value: "manual", label: "Next.js or TanStack Start", description: "New full-stack TypeScript app", badge: "Recommended" },
  { value: "react", label: "React / Vite SPA", description: "Browser app with no auth server" },
  { value: "better", label: "Existing Better Auth", description: "Keep your current users and sessions" },
  { value: "other", label: "Another auth library", description: "Connect through generic OAuth/OIDC" },
  { value: "language", label: "Non-JavaScript backend", description: "Use your language's OIDC library" },
];

const guideMeta: Record<GuideMode, { time: string; values: string; result: string }> = {
  manual: { time: "10–15 minutes", values: "3 server values", result: "First-party HttpOnly session" },
  react: { time: "5–10 minutes", values: "2 public values", result: "Short-lived app token" },
  better: { time: "About 5 minutes", values: "2 SSO values", result: "Existing Better Auth session" },
  other: { time: "10–20 minutes", values: "Client ID + SSO URL", result: "Existing library session" },
  language: { time: "20–40 minutes", values: "OIDC configuration", result: "Backend-owned session" },
};

function visibleSamples(mode: GuideMode, samples: CodeSample[]) {
  if (mode !== "better") return samples;
  const visibleTitles = new Set([
    "Install",
    "Configure the server environment",
    "Add the provider to Better Auth",
    "Create the browser client",
    "Register the callback URL",
  ]);
  return samples.filter((sample) => visibleTitles.has(sample.title ?? sample.filename));
}

export function IntegrationGuide() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [authMode, setAuthMode] = useState<GuideMode>("manual");
  const activeRecipe = packageRecipes[authMode];
  const activeSamples = visibleSamples(authMode, activeRecipe.samples);
  const navigation = [
    {
      label: "Selected guide",
      items: [
        { label: "Overview", href: "#overview" },
        ...activeSamples.map((sample, index) => ({
          label: sample.title ?? sample.filename,
          href: `#guide-file-${index + 1}`,
        })),
      ],
    },
    {
      label: "Agent handoff",
      items: [{ label: "sso-agent-guide.md", href: "#agent-guide" }],
    },
    {
      label: "Reference",
      items: [
        { label: "Choose an integration", href: "#choose-integration" },
        { label: "SDK reference", href: "#sdk-reference" },
        { label: "Troubleshooting", href: "#troubleshooting" },
        { label: "Security checklist", href: "#security" },
      ],
    },
  ];
  const pickerProps = { authMode, setAuthMode };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#c0caf5] [color-scheme:dark]">
      <header className="sticky top-0 z-40 border-b border-[#292e42] bg-[#0b0f19]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-4 px-4 lg:px-6">
          <a href="/" className="flex items-center gap-2.5 text-sm font-semibold text-[#c0caf5]">
            <span className="grid size-8 place-items-center rounded-lg bg-[#7aa2f7] text-[#0b0f19]">
              <ShieldCheck className="size-[18px]" />
            </span>
            <span>SkyCanvas</span>
            <span className="rounded-md border border-[#3b4261] bg-[#1a1b26] px-2 py-0.5 text-[11px] font-medium text-[#7aa2f7]">
              Docs
            </span>
          </a>
          <div className="ml-auto hidden items-center gap-2 text-xs text-[#7f849c] sm:flex">
            <span className="size-1.5 rounded-full bg-[#9ece6a]" />
            OAuth service online
          </div>
          <a
            href="/dashboard"
            className="hidden items-center gap-1.5 rounded-lg border border-[#3b4261] px-3 py-2 text-xs font-medium text-[#a9b1d6] transition hover:border-[#7aa2f7] hover:text-[#c0caf5] sm:flex"
          >
            Dashboard <ExternalLink className="size-3" />
          </a>
          <button
            type="button"
            aria-label={mobileNavOpen ? "Close documentation navigation" : "Open documentation navigation"}
            className="ml-auto grid size-9 place-items-center rounded-lg border border-[#3b4261] text-[#a9b1d6] lg:hidden"
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[230px_minmax(0,1fr)]">
        <DocsSidebar
          navigation={navigation}
          open={mobileNavOpen}
          onNavigate={() => setMobileNavOpen(false)}
        />

        <main className="min-w-0 px-5 pb-24 pt-12 sm:px-8 lg:px-10 2xl:px-14">
          <article className="mx-auto flex max-w-5xl flex-col">
            <section id="overview" className="order-1 scroll-mt-28 border-b border-[#292e42] pb-14">
              <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#7aa2f7]">
                <BookOpen className="size-4" /> Selected integration guide
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-[#f4f6ff] sm:text-5xl">
                Add SkyCanvas SSO to your application
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#a9b1d6] sm:text-lg sm:leading-8">
                Pick the app you are integrating. The page will show only the setup that applies to it.
              </p>

              <div className="mt-8">
                <GuidePicker {...pickerProps} compact />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <QuickFact icon={Clock3} label="Typical setup" value={guideMeta[authMode].time} />
                <QuickFact icon={KeyRound} label="Configuration" value={guideMeta[authMode].values} />
                <QuickFact icon={ShieldCheck} label="You get" value={guideMeta[authMode].result} />
              </div>

              <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-[#292e42] bg-[#292e42] sm:grid-cols-3">
                <FlowStep number="01" icon={Code2} title="Install" text="Add the SSO package" />
                <FlowStep number="02" icon={Server} title={authMode === "react" ? "Connect SSO" : "Connect server"} text={authMode === "react" ? "Add the provider" : "Configure and mount auth"} />
                <FlowStep number="03" icon={KeyRound} title="Use session" text="Sign in, protect, sign out" />
              </div>

              <Callout>
                {authMode === "react" ? (
                  <span>
                    Register the exact <InlineCode>/auth/callback</InlineCode> URL and app origin. The browser uses
                    PKCE and a publishable client key; there is no app auth server or client secret.
                  </span>
                ) : authMode === "better" ? (
                  <span>
                    Better Auth generates <InlineCode>/api/auth/oauth2/callback/skycanvas</InlineCode>. Register that
                    exact path in SkyCanvas. Keep your existing Better Auth route, session hooks, and provider. You
                    only add <InlineCode>skycanvas()</InlineCode> on the server and
                    <InlineCode>skycanvasClient()</InlineCode> in the browser client.
                  </span>
                ) : authMode === "manual" ? (
                  <span>
                    React applications on this standalone path must mount one <InlineCode>SsoProvider</InlineCode>.
                    Pass it the bootstrap returned by the server helper so it receives the initial session and creates
                    its browser client without another configuration file.
                  </span>
                ) : activeRecipe.callbackPath ? (
                  <span>
                    The SSO server owns <InlineCode>{activeRecipe.callbackPath}</InlineCode> and keeps the encrypted
                    OAuth flow and session in server-only cookies.
                  </span>
                ) : (
                  <span>
                    Your existing auth library owns the callback and local session. Register the exact
                    <InlineCode>redirect_uri</InlineCode> that it sends to SkyCanvas.
                  </span>
                )}
              </Callout>
            </section>

            <section id="choose-integration" className="order-3 scroll-mt-24 border-b border-[#292e42] py-14">
              <SectionEyebrow>Architecture</SectionEyebrow>
              <h2 className={headingClass}>Choose who owns the application session</h2>
              <p className={leadClass}>
                SkyCanvas always owns central identity and upstream OAuth callbacks. Your integration choice decides
                how the consuming application proves authentication on later requests.
              </p>
              <div className="mt-8 overflow-x-auto rounded-xl border border-[#292e42]">
                <table className="min-w-[760px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#161822] text-xs text-[#7f849c]">
                    <tr>
                      <TableHead>Integration</TableHead>
                      <TableHead>Best for</TableHead>
                      <TableHead>Session owner</TableHead>
                      <TableHead>App credential</TableHead>
                      <TableHead>New auth server?</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {integrationComparison.map((row) => (
                      <tr key={row.mode} className="border-t border-[#292e42] bg-[#111522] align-top">
                        <TableCell strong>{row.mode}</TableCell>
                        <TableCell>{row.chooseWhen}</TableCell>
                        <TableCell>{row.sessionOwner}</TableCell>
                        <TableCell>{row.credential}</TableCell>
                        <TableCell>{row.appAuthServer}</TableCell>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section id="selected-guide" className="order-2 scroll-mt-24 border-b border-[#292e42] py-14">
              <SectionEyebrow>Selected guide</SectionEyebrow>
              <h2 className={headingClass}>{activeRecipe.label}</h2>
              <p className={leadClass}>
                {authMode === "react"
                  ? "Complete these steps in order. The SDK uses short-lived, application-scoped browser tokens; your API must verify them before returning protected data."
                  : "Complete these steps in order. OAuth tokens and session secrets stay on the server for this integration."}
              </p>

              {authMode === "better" ? <BetterAuthPrerequisites /> : null}

              <ol className="mt-9 space-y-10">
                {activeSamples.map((sample, index) => (
                  <GuideStep
                    key={`${sample.title ?? sample.filename}-${sample.filename}`}
                    id={`guide-file-${index + 1}`}
                    number={String(index + 1)}
                    title={sample.title ?? sample.filename}
                  >
                    {sample.description ? <p>{sample.description}</p> : null}
                    <CodeBlock sample={sample} />
                  </GuideStep>
                ))}
              </ol>
            </section>

            <section id="sdk-reference" className="order-4 scroll-mt-24 border-b border-[#292e42] py-14">
              <SectionEyebrow>React SDK</SectionEyebrow>
              <h2 className={headingClass}>Components and hooks at a glance</h2>
              <p className={leadClass}>
                These APIs are available below <InlineCode>SkyCanvasProvider</InlineCode> in standalone integrations.
                Better Auth integrations keep using Better Auth's own session hooks and components.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  ["<SignIn /> / <SignUp />", "Render configured password, magic-link, and OAuth methods in the app; only OAuth buttons open provider popups."],
                  ["<SignedIn /> / <SignedOut />", "Conditionally render UI after the provider has resolved authentication state."],
                  ["useAuth()", "Read isLoaded, isSignedIn, userId, session, getToken, and signOut."],
                  ["useUser()", "Read the verified SkyCanvas user and loading/authentication state."],
                  ["<SsoUserMenu />", "Ready-made account menu, profile summary, custom links, and logout."],
                  ["createSsoAccessTokenVerifier()", "Cache public metadata/JWKS and verify React-only Bearer tokens in an application API."],
                ].map(([name, description]) => (
                  <div key={name} className="rounded-xl border border-[#292e42] bg-[#111522] p-4">
                    <code className="font-mono text-sm text-[#7dcfff]">{name}</code>
                    <p className="mt-2 text-sm leading-6 text-[#a9b1d6]">{description}</p>
                  </div>
                ))}
              </div>
              <Callout>
                <InlineCode>SignedIn</InlineCode> protects presentation, not data. Always enforce authentication again
                in the server loader, route handler, or API that returns protected information.
              </Callout>
            </section>

            <section id="agent-guide" className="order-5 scroll-mt-24 border-b border-[#292e42] py-14">
              <SectionEyebrow>Agent handoff</SectionEyebrow>
              <h2 className={headingClass}>Give any coding agent the complete context</h2>
              <p className={leadClass}>
                Copy this file into the target project or paste it into an agent task. It tells the agent to use the
                package, select one auth path, preserve the existing session system, and verify the result.
              </p>
              <div className="mt-7">
                <CopyCodeBlock
                  sample={{
                    filename: "sso-agent-guide.md",
                    code: ssoAgentGuide,
                  }}
                />
              </div>
            </section>

            <section id="troubleshooting" className="order-6 scroll-mt-24 border-b border-[#292e42] py-14">
              <SectionEyebrow>Common problems</SectionEyebrow>
              <h2 className={headingClass}>Troubleshooting</h2>
              <div className="mt-7 space-y-3">
                {troubleshootingItems.map((item) => (
                  <details key={item.problem} className="group rounded-xl border border-[#292e42] bg-[#111522] p-4">
                    <summary className="flex cursor-pointer list-none items-center gap-3 text-sm font-medium text-[#f4f6ff]">
                      <TriangleAlert className="size-4 shrink-0 text-[#e0af68]" />
                      {item.problem}
                      <ChevronRight className="ml-auto size-4 transition group-open:rotate-90" />
                    </summary>
                    <p className="ml-7 mt-3 text-sm leading-6 text-[#a9b1d6]">{item.fix}</p>
                  </details>
                ))}
              </div>
            </section>

            <section id="security" className="order-7 scroll-mt-24 py-14">
              <SectionEyebrow>Before production</SectionEyebrow>
              <h2 className={headingClass}>Security checklist</h2>
              <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                {securityChecklist.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 rounded-xl border border-[#292e42] bg-[#111522] p-4 text-sm leading-6 text-[#a9b1d6]"
                  >
                    <CheckCircle2 className="mt-1 size-4 shrink-0 text-[#9ece6a]" />
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="/dashboard"
                className="mt-10 inline-flex items-center gap-2 rounded-lg bg-[#7aa2f7] px-4 py-2.5 text-sm font-semibold text-[#0b0f19] transition hover:bg-[#8db0ff]"
              >
                Create an application <ArrowRight className="size-4" />
              </a>
            </section>
          </article>
        </main>

      </div>
    </div>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

function TableCell({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return <td className={`px-4 py-4 leading-6 ${strong ? "font-medium text-[#f4f6ff]" : "text-[#a9b1d6]"}`}>{children}</td>;
}

function BetterAuthPrerequisites() {
  const prerequisites = [
    ["Better Auth installation", "https://www.better-auth.com/docs/installation"],
    ["Better Auth database setup", "https://www.better-auth.com/docs/concepts/database"],
    ["Prisma setup (when using Prisma)", "https://www.prisma.io/docs/orm/getting-started"],
    ["Better Auth Prisma adapter (when using Prisma)", "https://www.better-auth.com/docs/adapters/prisma"],
    ["Better Auth TanStack Start integration (when using TanStack Start)", "https://www.better-auth.com/docs/integrations/tanstack"],
  ] as const;

  return (
    <div className="mt-8 rounded-xl border border-[#3b4261] bg-[#111522] p-5">
      <h3 className="text-sm font-semibold text-[#f4f6ff]">Prerequisites</h3>
      <p className="mt-2 text-sm leading-6 text-[#a9b1d6]">
        This guide assumes Better Auth already works with its database, server handler, and browser client. SkyCanvas
        SSO does not create or manage Better Auth's users, sessions, accounts, verification records, or database
        schema. Complete the relevant official setup first:
      </p>
      <ul className="mt-4 space-y-2">
        {prerequisites.map(([label, href]) => (
          <li key={href}>
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-[#7aa2f7] hover:text-[#8db0ff]"
            >
              {label} <ExternalLink className="size-3.5" />
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm leading-6 text-[#a9b1d6]">
        Once Better Auth works independently, continue below to add SkyCanvas as an OAuth provider.
      </p>
    </div>
  );
}

type GuidePickerProps = {
  authMode: GuideMode;
  setAuthMode: (value: GuideMode) => void;
  compact?: boolean;
};

function GuidePicker({
  authMode,
  setAuthMode,
  compact = false,
}: GuidePickerProps) {
  const titleId = compact ? "guide-picker-title-compact" : "guide-picker-title-sidebar";

  return (
    <section
      aria-labelledby={titleId}
      className={`rounded-xl border border-[#292e42] bg-[#111522] ${compact ? "p-5" : "p-4"}`}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#7aa2f7]/10 text-[#7aa2f7]">
          <Code2 className="size-4" />
        </span>
        <div>
          <h2 id={titleId} className="text-sm font-semibold text-[#f4f6ff]">
            What kind of app are you adding SSO to?
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#7f849c]">Choose the closest match. You can switch without losing anything.</p>
        </div>
      </div>

      <div className={`mt-5 grid gap-2 ${compact ? "sm:grid-cols-2 lg:grid-cols-3" : ""}`}>
        {guideOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={authMode === option.value}
            onClick={() => setAuthMode(option.value)}
            className={`relative min-h-24 rounded-xl border p-3 text-left transition ${
              authMode === option.value
                ? "border-[#7aa2f7] bg-[#7aa2f7]/10 shadow-[0_0_0_1px_rgba(122,162,247,0.2)]"
                : "border-[#292e42] bg-[#161822] hover:border-[#3b4261] hover:bg-[#1a1f2e]"
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className={`text-sm font-semibold ${authMode === option.value ? "text-[#f4f6ff]" : "text-[#c0caf5]"}`}>
                {option.label}
              </span>
              {authMode === option.value ? <Check className="size-4 shrink-0 text-[#9ece6a]" /> : null}
            </span>
            <span className="mt-2 block text-xs leading-5 text-[#7f849c]">{option.description}</span>
            {option.badge ? (
              <span className="mt-3 inline-flex rounded-full bg-[#9ece6a]/10 px-2 py-1 text-[10px] font-semibold text-[#9ece6a]">
                {option.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-[#3b4261] bg-[#0b0f19] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#565f89]">Selected guide</p>
        <p className="mt-2 text-xs font-medium leading-5 text-[#c0caf5]">
          {packageRecipes[authMode].shortLabel}
        </p>
      </div>

      <a href="#selected-guide" className="mt-4 flex items-center justify-between rounded-lg bg-[#7aa2f7] px-3 py-2.5 text-xs font-semibold text-[#0b0f19] transition hover:bg-[#8db0ff]">
        Start this guide <ArrowRight className="size-3.5" />
      </a>
    </section>
  );
}

function DocsSidebar({
  navigation,
  open,
  onNavigate,
}: {
  navigation: Array<{ label: string; items: Array<{ label: string; href: string }> }>;
  open: boolean;
  onNavigate: () => void;
}) {
  return (
    <aside
      className={`fixed inset-x-0 bottom-0 top-16 z-30 overflow-y-auto border-r border-[#292e42] bg-[#0b0f19] px-5 py-7 transition-transform lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <nav aria-label="Documentation">
        {navigation.map((group) => (
          <div key={group.label} className="mb-8">
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#565f89]">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    onClick={onNavigate}
                    className="group flex items-center justify-between rounded-lg px-2 py-2 text-sm text-[#a9b1d6] transition hover:bg-[#1a1b26] hover:text-[#f4f6ff]"
                  >
                    {item.label}
                    <ChevronRight className="size-3.5 opacity-0 transition group-hover:opacity-100" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mt-10 rounded-xl border border-[#292e42] bg-[#111522] p-4">
        <p className="text-xs font-medium text-[#c0caf5]">Official package</p>
        <p className="mt-2 text-xs leading-5 text-[#7f849c]">
          JavaScript guides use @skycanvasstudio/sso. Other backends use the same OAuth/OIDC protocol directly.
        </p>
      </div>
    </aside>
  );
}

function FlowStep({
  number,
  icon: Icon,
  title,
  text,
}: {
  number: string;
  icon: typeof Code2;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-[#111522] p-5">
      <div className="flex items-center justify-between">
        <Icon className="size-4 text-[#7aa2f7]" />
        <span className="font-mono text-[10px] text-[#565f89]">{number}</span>
      </div>
      <p className="mt-5 text-sm font-semibold text-[#f4f6ff]">{title}</p>
      <p className="mt-1 text-xs text-[#7f849c]">{text}</p>
    </div>
  );
}

function QuickFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Code2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#292e42] bg-[#111522] p-3.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#7aa2f7]/10 text-[#7aa2f7]">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#565f89]">{label}</span>
        <span className="mt-1 block truncate text-xs font-medium text-[#c0caf5]">{value}</span>
      </span>
    </div>
  );
}

function SectionEyebrow({ children }: { children: string }) {
  return <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#7aa2f7]">{children}</p>;
}

function GuideStep({
  id,
  number,
  title,
  children,
}: {
  id?: string;
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <li id={id} className="scroll-mt-24 relative pl-11">
      <span className="absolute left-0 top-0 grid size-7 place-items-center rounded-full border border-[#3b4261] bg-[#111522] font-mono text-xs font-semibold text-[#7aa2f7]">
        {number}
      </span>
      <h3 className="text-base font-semibold text-[#f4f6ff]">{title}</h3>
      <div className="mt-2 space-y-4 text-sm leading-6 text-[#a9b1d6]">{children}</div>
    </li>
  );
}

function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="mt-7 flex gap-3 rounded-xl border border-[#7aa2f7]/25 bg-[#7aa2f7]/[0.07] p-4 text-sm leading-6 text-[#a9b1d6]">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#7aa2f7]" />
      <p>{children}</p>
    </div>
  );
}

function InlineCode({ children }: { children: string }) {
  return (
    <code className="rounded border border-[#3b4261] bg-[#1a1b26] px-1.5 py-0.5 font-mono text-[0.78rem] text-[#7dcfff]">
      {children}
    </code>
  );
}

function CodeBlock({ sample }: { sample: CodeSample | undefined }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const choices = useMemo(() => sample ? [sample, ...(sample.alternatives ?? [])] : [], [sample]);
  const activeSample = choices[activeTab] ?? sample;
  const highlighted = useMemo(() => highlight(activeSample?.code ?? ""), [activeSample?.code]);

  if (!sample) return null;

  async function copyCode() {
    if (!sample) return;
    if (!activeSample) return;
    await navigator.clipboard.writeText(activeSample.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#292e42] bg-[#1a1b26] shadow-2xl shadow-black/10">
      {choices.length > 1 ? (
        <div className="flex gap-1 overflow-x-auto border-b border-[#292e42] bg-[#0f1320] p-2" role="tablist">
          {choices.map((choice, index) => (
            <button
              key={`${choice.tabLabel ?? choice.filename}-${index}`}
              type="button"
              role="tab"
              aria-selected={activeTab === index}
              onClick={() => { setActiveTab(index); setCopied(false); }}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition ${
                activeTab === index
                  ? "bg-[#7aa2f7] text-[#0b0f19]"
                  : "text-[#7f849c] hover:bg-[#1a1b26] hover:text-[#c0caf5]"
              }`}
            >
              {choice.tabLabel ?? choice.filename}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex h-10 items-center border-b border-[#292e42] bg-[#161822] px-3">
        <div aria-hidden="true" className="mr-3 flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#f7768e]/80" />
          <span className="size-2.5 rounded-full bg-[#e0af68]/80" />
          <span className="size-2.5 rounded-full bg-[#9ece6a]/80" />
        </div>
        <span className="truncate font-mono text-[11px] text-[#7f849c]">{activeSample?.filename}</span>
        <button
          type="button"
          onClick={copyCode}
          className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-[#7f849c] transition hover:bg-[#292e42] hover:text-[#c0caf5]"
          aria-label={`Copy ${activeSample?.filename}`}
        >
          {copied ? <Check className="size-3 text-[#9ece6a]" /> : <Clipboard className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6 text-[#a9b1d6] sm:p-5">
        <code>{highlighted}</code>
      </pre>
    </div>
  );
}

function highlight(code: string) {
  const tokenPattern =
    /(\/\/.*$|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:import|from|export|default|const|let|function|async|await|return|new|throw|if|else|type|interface|extends|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b|[A-Z][A-Za-z0-9_]*(?=\b))/gm;

  return code.split(tokenPattern).map((token, index) => {
    if (!token) return null;
    let color = "#a9b1d6";
    if (token.startsWith("//") || token.startsWith("/*")) color = "#565f89";
    else if (/^["'`]/.test(token)) color = "#9ece6a";
    else if (/^\d/.test(token)) color = "#ff9e64";
    else if (
      /^(import|from|export|default|const|let|function|async|await|return|new|throw|if|else|type|interface|extends|true|false|null|undefined)$/.test(
        token,
      )
    )
      color = "#bb9af7";
    else if (/^[A-Z]/.test(token)) color = "#2ac3de";

    return (
      <span key={`${index}-${token.slice(0, 8)}`} style={{ color }}>
        {token}
      </span>
    );
  });
}
