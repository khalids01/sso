import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Code2,
  ExternalLink,
  FileCode2,
  KeyRound,
  Menu,
  Server,
  ShieldCheck,
  X,
} from "lucide-react";
import { securityChecklist, type CodeSample } from "./integration-guide-content";
import { CopyCodeBlock } from "./copy-code-block";
import ssoAgentGuide from "./sso-agent-guide.md?raw";
import { betterAuthSamples, manualSamples, nextBetterAuthSamples } from "./framework-recipe-content";
import { nextManualSamples } from "./next-manual-content";


type Recipe = "better" | "manual" | "nextjs" | "next-better";
type AppType = "fullstack" | "separate";
type FullstackFramework = "nextjs" | "tanstack";
type FrontendFramework = "react" | "browser";
type BackendFramework = "node" | "elysia";
type AuthMode = "better" | "manual";

const recipeCopy: Record<Recipe, { label: string; description: string; samples: CodeSample[] }> = {
  better: {
    label: "Better Auth",
    description: "Let Better Auth own the OAuth callback, local users, and application sessions.",
    samples: betterAuthSamples,
  },
  manual: {
    label: "Without auth library",
    description: "Use the copy-ready Elysia handlers and encrypted local session directly.",
    samples: manualSamples,
  },
  "next-better": {
    label: "Next.js + Better Auth",
    description: "Keep Better Auth as the only session system and add SkyCanvas as its OAuth provider.",
    samples: nextBetterAuthSamples,
  },
  nextjs: {
    label: "Next.js APIs",
    description: "Use App Router handlers for login, callback, profile, logout, and encrypted sessions.",
    samples: nextManualSamples,
  },
};

const headingClass =
  "text-[clamp(1.65rem,3vw,2rem)] font-semibold leading-tight tracking-[-0.025em] text-[#f4f6ff]";
const leadClass = "mt-3 max-w-2xl text-[0.95rem] leading-7 text-[#7f849c]";

export function IntegrationGuide() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [appType, setAppType] = useState<AppType>("fullstack");
  const [fullstackFramework, setFullstackFramework] = useState<FullstackFramework>("nextjs");
  const [frontendFramework, setFrontendFramework] = useState<FrontendFramework>("react");
  const [backendFramework, setBackendFramework] = useState<BackendFramework>("node");
  const [authMode, setAuthMode] = useState<AuthMode>("better");
  const recipe: Recipe =
    authMode === "better"
      ? appType === "fullstack" && fullstackFramework === "nextjs"
        ? "next-better"
        : "better"
      : appType === "fullstack" && fullstackFramework === "nextjs"
        ? "nextjs"
        : "manual";
  const activeRecipe = recipeCopy[recipe];
  const stackLabel =
    appType === "fullstack"
      ? fullstackFramework === "nextjs"
        ? "Next.js"
        : "TanStack Start"
      : `${frontendFramework === "react" ? "React" : "Browser client"} + ${
          backendFramework === "node" ? "Node.js" : "Elysia"
        }`;
  const navigation = [
    {
      label: "Selected guide",
      items: [
        { label: "Overview", href: "#overview" },
        ...activeRecipe.samples.map((sample, index) => ({
          label: sample.filename,
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
      items: [{ label: "Security checklist", href: "#security" }],
    },
  ];
  const pickerProps = {
    appType,
    setAppType,
    fullstackFramework,
    setFullstackFramework,
    frontendFramework,
    setFrontendFramework,
    backendFramework,
    setBackendFramework,
    authMode,
    setAuthMode,
  };

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

      <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)_290px]">
        <DocsSidebar
          navigation={navigation}
          open={mobileNavOpen}
          onNavigate={() => setMobileNavOpen(false)}
        />

        <main className="min-w-0 px-5 pb-24 pt-12 sm:px-8 lg:px-10 2xl:px-14">
          <div className="mx-auto mb-10 max-w-4xl xl:hidden">
            <GuidePicker {...pickerProps} compact />
          </div>
          <article className="mx-auto max-w-4xl">
            <section id="overview" className="scroll-mt-28 border-b border-[#292e42] pb-14">
              <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#7aa2f7]">
                <BookOpen className="size-4" /> Selected integration guide
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-[#f4f6ff] sm:text-5xl">
                {stackLabel} with {authMode === "better" ? "Better Auth" : "no auth library"}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#a9b1d6] sm:text-lg sm:leading-8">
                {activeRecipe.description} Only the files for this selection are shown below.
              </p>

              <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-[#292e42] bg-[#292e42] sm:grid-cols-3">
                <FlowStep number="01" icon={Code2} title="Start login" text="Better Auth redirects" />
                <FlowStep number="02" icon={Server} title="SSO callback" text="Next.js handles it" />
                <FlowStep number="03" icon={KeyRound} title="Local session" text="Use Better Auth normally" />
              </div>

              <Callout>
                {recipe === "next-better" ? (
                  <span>
                    Better Auth generates <InlineCode>/api/auth/oauth2/callback/skycanvas</InlineCode>. Register that
                    exact path in SkyCanvas. <InlineCode>/api/auth/callback</InlineCode> is wrong for this setup, and
                    you should not add <InlineCode>SSO_CALLBACK_URL</InlineCode>.
                  </span>
                ) : (
                  <span>Register the exact callback shown in the first step of this selected guide.</span>
                )}
              </Callout>
            </section>

            <section id="agent-guide" className="scroll-mt-24 border-b border-[#292e42] py-14">
              <SectionEyebrow>Agent handoff</SectionEyebrow>
              <h2 className={headingClass}>Give any coding agent the complete context</h2>
              <p className={leadClass}>
                Copy this file into your project or paste it into an agent task before asking for the integration.
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

            <section id="selected-guide" className="scroll-mt-24 border-b border-[#292e42] py-14">
              <SectionEyebrow>Selected guide</SectionEyebrow>
              <h2 className={headingClass}>{activeRecipe.label}</h2>
              <p className={leadClass}>Add these files in order. Do not add separate login, callback, profile, or session handlers.</p>

              <ol className="mt-9 space-y-10">
                {activeRecipe.samples.map((sample, index) => (
                  <GuideStep
                    key={sample.filename}
                    id={`guide-file-${index + 1}`}
                    number={String(index + 1)}
                    title={sample.filename}
                  >
                    <CodeBlock sample={sample} />
                  </GuideStep>
                ))}
              </ol>
            </section>

            <section id="security" className="scroll-mt-24 py-14">
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

        <aside className="hidden border-l border-[#292e42] px-5 py-8 xl:block">
          <div className="sticky top-24">
            <GuidePicker {...pickerProps} />
          </div>
        </aside>
      </div>
    </div>
  );
}

type GuidePickerProps = {
  appType: AppType;
  setAppType: (value: AppType) => void;
  fullstackFramework: FullstackFramework;
  setFullstackFramework: (value: FullstackFramework) => void;
  frontendFramework: FrontendFramework;
  setFrontendFramework: (value: FrontendFramework) => void;
  backendFramework: BackendFramework;
  setBackendFramework: (value: BackendFramework) => void;
  authMode: AuthMode;
  setAuthMode: (value: AuthMode) => void;
  compact?: boolean;
};

function GuidePicker({
  appType,
  setAppType,
  fullstackFramework,
  setFullstackFramework,
  frontendFramework,
  setFrontendFramework,
  backendFramework,
  setBackendFramework,
  authMode,
  setAuthMode,
  compact = false,
}: GuidePickerProps) {
  const titleId = compact ? "guide-picker-title-compact" : "guide-picker-title-sidebar";
  const stack =
    appType === "fullstack"
      ? fullstackFramework === "nextjs"
        ? "Next.js"
        : "TanStack Start"
      : `${frontendFramework === "react" ? "React" : "Browser client"} + ${
          backendFramework === "node" ? "Node.js" : "Elysia"
        }`;

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
            Build your guide
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#7f849c]">Choose only what your app uses.</p>
        </div>
      </div>

      <div className={`mt-5 ${compact ? "grid gap-5 sm:grid-cols-2" : "space-y-5"}`}>
        <PickerGroup
          label="Type of app"
          value={appType}
          onChange={setAppType}
          options={[
            ["fullstack", "Fullstack"],
            ["separate", "Separate frontend + backend"],
          ]}
        />

        {appType === "fullstack" ? (
          <PickerGroup
            label="Fullstack framework"
            value={fullstackFramework}
            onChange={setFullstackFramework}
            options={[
              ["nextjs", "Next.js"],
              ["tanstack", "TanStack Start"],
            ]}
          />
        ) : (
          <>
            <PickerGroup
              label="Frontend"
              value={frontendFramework}
              onChange={setFrontendFramework}
              options={[
                ["react", "React"],
                ["browser", "Browser client"],
              ]}
            />
            <PickerGroup
              label="Backend"
              value={backendFramework}
              onChange={setBackendFramework}
              options={[
                ["node", "Node.js"],
                ["elysia", "Elysia"],
              ]}
            />
          </>
        )}

        <PickerGroup
          label="Authentication"
          value={authMode}
          onChange={setAuthMode}
          options={[
            ["better", "Better Auth"],
            ["manual", "No auth library"],
          ]}
        />
      </div>

      <div className="mt-5 rounded-lg border border-[#3b4261] bg-[#0b0f19] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#565f89]">Selected guide</p>
        <p className="mt-2 text-xs font-medium leading-5 text-[#c0caf5]">
          {stack} · {authMode === "better" ? "Better Auth" : "No auth library"}
        </p>
      </div>

      <a
        href="#framework-guides"
        className="mt-4 flex items-center justify-between rounded-lg bg-[#7aa2f7] px-3 py-2.5 text-xs font-semibold text-[#0b0f19] transition hover:bg-[#8db0ff]"
      >
        View this guide <ArrowRight className="size-3.5" />
      </a>
    </section>
  );
}

function PickerGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly (readonly [T, string])[];
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[11px] font-semibold text-[#a9b1d6]">{label}</legend>
      <div className="grid gap-1.5">
        {options.map(([optionValue, optionLabel]) => (
          <button
            key={optionValue}
            type="button"
            aria-pressed={value === optionValue}
            onClick={() => onChange(optionValue)}
            className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
              value === optionValue
                ? "border-[#7aa2f7]/60 bg-[#7aa2f7]/10 text-[#f4f6ff]"
                : "border-[#292e42] bg-[#161822] text-[#7f849c] hover:border-[#3b4261] hover:text-[#c0caf5]"
            }`}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </fieldset>
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
        <p className="text-xs font-medium text-[#c0caf5]">Content format</p>
        <p className="mt-2 text-xs leading-5 text-[#7f849c]">
          Start with one typed guide. Move to MDX when a second docs page is needed.
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
  const highlighted = useMemo(() => highlight(sample?.code ?? ""), [sample?.code]);

  if (!sample) return null;

  async function copyCode() {
    if (!sample) return;
    await navigator.clipboard.writeText(sample.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#292e42] bg-[#1a1b26] shadow-2xl shadow-black/10">
      <div className="flex h-10 items-center border-b border-[#292e42] bg-[#161822] px-3">
        <div aria-hidden="true" className="mr-3 flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#f7768e]/80" />
          <span className="size-2.5 rounded-full bg-[#e0af68]/80" />
          <span className="size-2.5 rounded-full bg-[#9ece6a]/80" />
        </div>
        <span className="truncate font-mono text-[11px] text-[#7f849c]">{sample.filename}</span>
        <button
          type="button"
          onClick={copyCode}
          className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-[#7f849c] transition hover:bg-[#292e42] hover:text-[#c0caf5]"
          aria-label={`Copy ${sample.filename}`}
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

function ReferenceRow({ name, value, last = false }: { name: string; value: string; last?: boolean }) {
  return (
    <div
      className={`grid gap-2 bg-[#111522] px-4 py-4 sm:grid-cols-[210px_1fr] ${
        last ? "" : "border-b border-[#292e42]"
      }`}
    >
      <code className="text-xs font-semibold text-[#7dcfff]">{name}</code>
      <span className="text-sm text-[#a9b1d6]">{value}</span>
    </div>
  );
}
