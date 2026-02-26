import { createHighlighter } from "shiki/bundle/web";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";

const SHIKI_LIGHT_THEME = "github-light";
const SHIKI_DARK_THEME = "vesper";
const SHIKI_LANGS = ["ts", "tsx", "jsonc", "bash", "css"] as const;

type CodeMode = "light" | "dark";
type ShikiHighlighter = Awaited<ReturnType<typeof createHighlighter>>;

let shikiHighlighterPromise: Promise<ShikiHighlighter> | null = null;

function getShikiHighlighter() {
  if (!shikiHighlighterPromise) {
    shikiHighlighterPromise = createHighlighter({
      langs: [...SHIKI_LANGS],
      themes: [SHIKI_LIGHT_THEME, SHIKI_DARK_THEME],
    }).catch((error) => {
      shikiHighlighterPromise = null;
      throw error;
    });
  }

  return shikiHighlighterPromise;
}

function interpolateCodeValues(
  code: string,
  values: CodeProps["values"] | undefined,
) {
  if (!values) return code;

  return code.replace(/\{\{([^}]+)\}\}/g, (template, keyRaw: string) => {
    const key = keyRaw.trim();
    const replacement = values[key];
    return replacement?.value ?? template;
  });
}

function readCodeMode(element: HTMLDivElement | null): CodeMode {
  if (typeof document === "undefined") return "light";

  const modeHost =
    element?.closest<HTMLElement>("[data-mode]") ?? document.documentElement;
  return modeHost.getAttribute("data-mode") === "dark" ? "dark" : "light";
}

/** Code language variant definitions. */
export const KUMO_CODE_VARIANTS = {
  lang: {
    ts: {
      classes: "",
      description: "TypeScript code",
    },
    tsx: {
      classes: "",
      description: "TypeScript JSX code",
    },
    jsonc: {
      classes: "",
      description: "JSON with comments",
    },
    bash: {
      classes: "",
      description: "Shell/Bash commands",
    },
    css: {
      classes: "",
      description: "CSS styles",
    },
  },
} as const;

export const KUMO_CODE_DEFAULT_VARIANTS = {
  lang: "ts",
} as const;

/**
 * Styling metadata for Code component (for AI/Figma plugin consumption)
 */
export const KUMO_CODE_STYLING = {
  /** Base semantic tokens used */
  baseTokens: ["text-kumo-strong"],
  /** Typography and layout */
  typography: {
    fontFamily: "font-mono",
    fontSize: "text-sm",
    lineHeight: "leading-[20px]",
  },
  /** Container dimensions */
  dimensions: {
    minWidth: "min-w-0",
    width: "w-full",
  },
  /** Border and background */
  appearance: {
    borderRadius: "rounded-none",
    border: "border-none",
    background: "bg-transparent",
  },
} as const;

/**
 * Styling metadata for CodeBlock component (for AI/Figma plugin consumption)
 */
export const KUMO_CODEBLOCK_STYLING = {
  /** Base semantic tokens used */
  baseTokens: ["bg-kumo-base", "border-kumo-fill"],
  /** Container styling */
  container: {
    minWidth: "min-w-0",
    overflow: "overflow-hidden",
    borderRadius: "rounded-md",
    border: "border border-kumo-fill",
    background: "bg-kumo-base",
  },
  /** Scroll viewport */
  viewport: {
    minWidth: "min-w-0",
    maxWidth: "max-w-full",
    maxHeight: "max-h-96",
    overflow: "overflow-auto",
    padding: "p-2.5",
  },
  /** Parsed dimensions */
  dimensions: {
    borderRadius: 6, // md = 6px
    padding: 10, // p-2.5 = 10px
    maxHeight: 384, // max-h-96 = 24rem
  },
} as const;

// Derived types from KUMO_CODE_VARIANTS
export type KumoCodeLang = keyof typeof KUMO_CODE_VARIANTS.lang;

export interface KumoCodeVariantsProps {
  /**
   * Language hint for the code content.
   * - `"ts"` — TypeScript code
   * - `"tsx"` — TypeScript JSX code
   * - `"jsonc"` — JSON with comments
   * - `"bash"` — Shell/Bash commands
   * - `"css"` — CSS styles
   * @default "ts"
   */
  lang?: KumoCodeLang;
}

export function codeVariants({
  lang = KUMO_CODE_DEFAULT_VARIANTS.lang,
}: KumoCodeVariantsProps = {}) {
  return cn(
    // Base styles
    "min-w-0 w-full rounded-none border-none bg-transparent font-mono text-sm leading-[20px] text-kumo-strong",
    // Apply lang-specific styles (currently none, but extensible)
    KUMO_CODE_VARIANTS.lang[lang].classes,
  );
}

// Legacy type alias for backwards compatibility
export type CodeLang = KumoCodeLang;

/** @deprecated Use CodeLang instead */
export type BundledLanguage = CodeLang;

/**
 * Code component props.
 *
 * @example
 * ```tsx
 * <Code code="const x = 1;" lang="ts" />
 * <Code code="export API_KEY={{apiKey}}" lang="bash"
 *   values={{ apiKey: { value: "sk_live_123", highlight: true } }}
 * />
 * ```
 */
export interface CodeProps extends KumoCodeVariantsProps {
  /** The code string to display. */
  code: string;
  /** Template values for `{{key}}` interpolation. Values with `highlight: true` are visually emphasized. */
  values?: Record<
    string,
    {
      value: string;
      highlight?: boolean;
    }
  >;
  /** Additional CSS classes merged via `cn()`. */
  className?: string;
  /** Inline styles. */
  style?: CSSProperties;
}

/**
 * Code component with runtime syntax highlighting via Shiki.
 *
 * Renders highlighted code in a monospace font with language-specific token colors.
 * For a bordered container version, use `Code.Block` or `CodeBlock`.
 *
 * **Styling:**
 * - Typography: `font-mono text-sm leading-[20px]`
 * - Shiki themes: `github-light` (light) + `vesper` (dark)
 * - Plain-text fallback while highlighting loads or fails
 * - Supports all semantic tokens via className prop
 */
function CodeComponent({
  code,
  lang = KUMO_CODE_DEFAULT_VARIANTS.lang,
  values,
  className,
  style,
}: CodeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<CodeMode>("light");
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);

  const interpolatedCode = useMemo(
    () => interpolateCodeValues(code, values),
    [code, values],
  );

  useEffect(() => {
    if (typeof MutationObserver === "undefined") return;

    const rootElement = rootRef.current;
    if (!rootElement) return;

    const modeHost =
      rootElement.closest<HTMLElement>("[data-mode]") ?? document.documentElement;

    const syncMode = () => {
      setMode(readCodeMode(rootElement));
    };

    syncMode();

    const observer = new MutationObserver(syncMode);
    observer.observe(modeHost, {
      attributes: true,
      attributeFilter: ["data-mode"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isCancelled = false;

    setHighlightedCode(null);

    void (async () => {
      try {
        const highlighter = await getShikiHighlighter();
        const html = highlighter.codeToHtml(interpolatedCode, {
          lang,
          themes: {
            light: SHIKI_LIGHT_THEME,
            dark: SHIKI_DARK_THEME,
          },
          defaultColor: false,
        });

        if (!isCancelled) {
          setHighlightedCode(html);
        }
      } catch {
        if (!isCancelled) {
          setHighlightedCode(null);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [interpolatedCode, lang]);

  const themedStyle = useMemo(
    () =>
      ({
        ...style,
        "--kumo-code-shiki-base-color":
          mode === "dark" ? "var(--shiki-dark)" : "var(--shiki-light)",
        "--kumo-code-shiki-token-color":
          mode === "dark" ? "var(--shiki-dark)" : "var(--shiki-light)",
        "--kumo-code-shiki-bg":
          mode === "dark" ? "var(--shiki-dark-bg)" : "var(--shiki-light-bg)",
      }) as CSSProperties,
    [mode, style],
  );

  return (
    <div
      ref={rootRef}
      className={cn(codeVariants({ lang }), className)}
      style={themedStyle}
      data-kumo-code-render-mode={highlightedCode ? "highlighted" : "fallback"}
    >
      {highlightedCode ? (
        <div
          className={cn(
            "[&_.shiki]:m-0 [&_.shiki]:min-w-full [&_.shiki]:w-max [&_.shiki]:rounded-none [&_.shiki]:border-none [&_.shiki]:p-0",
            "[&_.shiki]:[background-color:var(--kumo-code-shiki-bg)] [&_.shiki]:[color:var(--kumo-code-shiki-base-color)]",
            "[&_.shiki]:font-mono [&_.shiki]:text-sm [&_.shiki]:leading-[20px]",
            "[&_.shiki_span]:[color:var(--kumo-code-shiki-token-color)]",
          )}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      ) : (
        <pre className="m-0 min-w-full w-max rounded-none border-none bg-transparent p-0">
          {interpolatedCode}
        </pre>
      )}
    </div>
  );
}

CodeComponent.displayName = "Code";

/**
 * CodeBlock component props — code inside a bordered container.
 *
 * @example
 * ```tsx
 * <CodeBlock lang="tsx" code={`const greeting = "Hello!";`} />
 * ```
 */
export interface CodeBlockProps {
  /** The code string to display. */
  code: string;
  /**
   * Language hint for the code content.
   * @default "ts"
   */
  lang?: CodeLang;
}

/**
 * Code block with border and background container.
 *
 * A styled wrapper around Code that adds a bordered container with surface background.
 * Useful for displaying code snippets with visual separation from surrounding content.
 *
 * **Styling:**
 * - Container: `min-w-0 overflow-hidden rounded-md border border-kumo-fill bg-kumo-base`
 * - Scroll viewport: `min-w-0 max-h-96 max-w-full overflow-auto p-2.5`
 * - Uses semantic tokens: `bg-kumo-base`, `border-kumo-fill`
 */
function CodeBlockComponent({ code, lang }: CodeBlockProps) {
  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-kumo-fill bg-kumo-base">
      <div className="min-w-0 max-h-96 max-w-full overflow-auto p-2.5">
        <CodeComponent lang={lang} code={code} />
      </div>
    </div>
  );
}

CodeBlockComponent.displayName = "CodeBlock";

// Export Code with Block sub-component (for registry detection)
export const Code = Object.assign(CodeComponent, {
  Block: CodeBlockComponent,
});

// Backward-compatible standalone export
export const CodeBlock = CodeBlockComponent;
