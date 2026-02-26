import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { codeToHtmlMock, createHighlighterMock } = vi.hoisted(() => {
  const codeToHtml = vi.fn();
  const createHighlighter = vi.fn(async () => ({
    codeToHtml,
  }));

  return {
    codeToHtmlMock: codeToHtml,
    createHighlighterMock: createHighlighter,
  };
});

vi.mock("shiki/bundle/web", () => ({
  createHighlighter: createHighlighterMock,
}));

import { Code, CodeBlock } from "./code";

const SHIKI_HTML = `<pre class="shiki" style="--shiki-light:#111;--shiki-dark:#eee;--shiki-light-bg:#fff;--shiki-dark-bg:#000"><code><span class="line"><span style="--shiki-light:#f00;--shiki-dark:#0ff">const answer = 42;</span></span></code></pre>`;

describe("Code", () => {
  beforeEach(() => {
    codeToHtmlMock.mockReset();
    codeToHtmlMock.mockReturnValue(SHIKI_HTML);
    createHighlighterMock.mockClear();
    document.documentElement.removeAttribute("data-mode");
  });

  it("renders Shiki markup and uses the provided language", async () => {
    const { container, rerender } = render(
      <Code code="const answer = 42;" lang="ts" />,
    );

    await waitFor(() => {
      expect(container.querySelector(".shiki")).toBeTruthy();
    });

    expect(codeToHtmlMock).toHaveBeenLastCalledWith(
      "const answer = 42;",
      expect.objectContaining({
        lang: "ts",
        defaultColor: false,
        themes: {
          light: "github-light",
          dark: "vesper",
        },
      }),
    );

    const codeRoot = container.firstElementChild as HTMLElement | null;
    expect(codeRoot).toBeTruthy();
    expect(codeRoot?.getAttribute("data-kumo-code-render-mode")).toBe(
      "highlighted",
    );
    expect(codeRoot?.style.getPropertyValue("--kumo-code-shiki-token-color")).toBe(
      "var(--shiki-light)",
    );

    const highlightLayer = codeRoot?.firstElementChild as HTMLElement | null;
    expect(highlightLayer).toBeTruthy();
    expect(highlightLayer?.className).toContain(
      "[&_.shiki_span]:[color:var(--kumo-code-shiki-token-color)]",
    );
    expect(highlightLayer?.className).not.toContain(
      "[&_.shiki_span]:[color:var(--kumo-code-shiki-color)]",
    );

    rerender(<Code code="echo hello" lang="bash" />);

    await waitFor(() => {
      expect(codeToHtmlMock).toHaveBeenLastCalledWith(
        "echo hello",
        expect.objectContaining({
          lang: "bash",
        }),
      );
    });
  });

  it("falls back to plain text when syntax highlighting fails", async () => {
    codeToHtmlMock.mockImplementationOnce(() => {
      throw new Error("highlight-failed");
    });

    const { container } = render(<Code code="const fallback = true;" lang="ts" />);

    await waitFor(() => {
      expect(screen.getByText("const fallback = true;")).toBeTruthy();
    });

    expect(container.querySelector(".shiki")).toBeNull();
    const codeRoot = container.firstElementChild as HTMLElement | null;
    expect(codeRoot?.getAttribute("data-kumo-code-render-mode")).toBe(
      "fallback",
    );
  });

  it("interpolates template values before highlighting", async () => {
    render(
      <Code
        lang="bash"
        code="export API_KEY={{apiKey}}"
        values={{
          apiKey: { value: "sk_live_123" },
        }}
      />,
    );

    await waitFor(() => {
      expect(codeToHtmlMock).toHaveBeenLastCalledWith(
        "export API_KEY=sk_live_123",
        expect.objectContaining({
          lang: "bash",
        }),
      );
    });
  });
});

describe("CodeBlock", () => {
  it("uses bounded, bi-directional scrolling classes", async () => {
    const { container } = render(
      <CodeBlock code={`const greeting = "hello";`} lang="ts" />,
    );

    await waitFor(() => {
      expect(container.querySelector(".shiki")).toBeTruthy();
    });

    const outer = container.firstElementChild as HTMLElement | null;
    expect(outer).toBeTruthy();
    expect(outer?.className).toContain("overflow-hidden");

    const viewport = outer?.firstElementChild as HTMLElement | null;
    expect(viewport).toBeTruthy();
    expect(viewport?.className).toContain("overflow-auto");
    expect(viewport?.className).toContain("max-h-96");
    expect(viewport?.className).toContain("max-w-full");
  });
});
