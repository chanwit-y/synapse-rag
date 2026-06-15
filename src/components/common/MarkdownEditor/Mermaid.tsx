'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { repairMermaidLabels } from './mermaidUtils';

type MermaidTheme = 'light' | 'dark';

type MermaidProps = {
  chart: string;
  theme?: MermaidTheme;
  /** Debounce before (re)rendering, ms. Avoids error-flashing while typing in live mode. */
  debounceMs?: number;
};

type MermaidModule = typeof import('mermaid')['default'];

// mermaid is heavy and touches the DOM — load it lazily, once, on the client.
let mermaidPromise: Promise<MermaidModule> | null = null;
let initializedTheme: string | null = null;

async function getMermaid(theme: MermaidTheme): Promise<MermaidModule> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => m.default);
  }
  const mermaid = await mermaidPromise;
  const mermaidTheme = theme === 'dark' ? 'dark' : 'default';
  // Theme is global to the editor, so a shared init is fine; re-init only on change.
  if (initializedTheme !== mermaidTheme) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: mermaidTheme,
    });
    initializedTheme = mermaidTheme;
  }
  return mermaid;
}

export default function Mermaid({ chart, theme = 'light', debounceMs = 300 }: MermaidProps) {
  const rawId = useId().replace(/:/g, '');
  const renderCount = useRef(0);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasRendered, setHasRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const code = chart.trim();

    const timer = setTimeout(async () => {
      try {
        if (!code) {
          if (cancelled) return;
          setSvg(null);
          setError(null);
          return;
        }
        const mermaid = await getMermaid(theme);
        if (cancelled) return;
        // Parse the raw source first so a currently-valid diagram is never
        // rewritten. Only if it fails do we try the common-mistake auto-repair
        // (e.g. unescaped quotes in node labels) and re-parse.
        let source = code;
        try {
          await mermaid.parse(code);
        } catch (parseErr) {
          const repaired = repairMermaidLabels(code);
          if (repaired === code) throw parseErr;
          await mermaid.parse(repaired);
          source = repaired;
        }
        if (cancelled) return;
        const id = `mermaid-${rawId}-${(renderCount.current += 1)}`;
        const { svg: rendered } = await mermaid.render(id, source);
        if (cancelled) return;
        setSvg(rendered);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        // keep the last good diagram out of the way; surface the parser message instead
        setSvg(null);
        setError(err instanceof Error ? err.message : 'Invalid mermaid diagram.');
      } finally {
        if (!cancelled) setHasRendered(true);
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [chart, theme, debounceMs, rawId]);

  if (error) {
    return (
      <div className="mermaid-error" role="alert">
        <span className="mermaid-error-title">Mermaid diagram error</span>
        <pre>{error}</pre>
      </div>
    );
  }

  if (svg) {
    return (
      <div
        className="mermaid-diagram"
        // svg is produced by mermaid under securityLevel: 'strict' (sanitized)
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  if (!hasRendered) {
    return <div className="mermaid-loading">Rendering diagram…</div>;
  }

  return null;
}
