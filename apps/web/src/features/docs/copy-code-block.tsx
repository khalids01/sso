import { useMemo, useState } from "react";
import { Check, Clipboard } from "lucide-react";
import type { CodeSample } from "./integration-guide-content";

export function CopyCodeBlock({ sample }: { sample: CodeSample }) {
  const [copied, setCopied] = useState(false);
  const highlighted = useMemo(() => highlight(sample.code), [sample.code]);

  async function copyCode() {
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
        <span className="truncate font-mono text-[11px] text-[#7f849c]">
          {sample.filename}
        </span>
        <button
          type="button"
          onClick={copyCode}
          className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-[#7f849c] transition hover:bg-[#292e42] hover:text-[#c0caf5]"
          aria-label={`Copy ${sample.filename}`}
        >
          {copied ? (
            <Check className="size-3 text-[#9ece6a]" />
          ) : (
            <Clipboard className="size-3" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-[640px] overflow-auto p-4 font-mono text-[13px] leading-6 text-[#a9b1d6] sm:p-5">
        <code>{highlighted}</code>
      </pre>
    </div>
  );
}

function highlight(code: string) {
  const pattern =
    /(\/\/.*$|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:import|from|export|default|const|let|function|async|await|return|new|throw|if|else|try|catch|type|interface|extends|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b|[A-Z][A-Za-z0-9_]*(?=\b))/gm;

  return code.split(pattern).map((token, index) => {
    if (!token) return null;
    let color = "#a9b1d6";
    if (token.startsWith("//") || token.startsWith("/*")) color = "#565f89";
    else if (/^["'`]/.test(token)) color = "#9ece6a";
    else if (/^\d/.test(token)) color = "#ff9e64";
    else if (
      /^(import|from|export|default|const|let|function|async|await|return|new|throw|if|else|try|catch|type|interface|extends|true|false|null|undefined)$/.test(
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
