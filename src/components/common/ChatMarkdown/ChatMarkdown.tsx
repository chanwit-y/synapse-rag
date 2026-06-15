"use client";

import "katex/dist/katex.min.css";
import type { AnchorHTMLAttributes, ImgHTMLAttributes } from "react";
import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import Mermaid from "../MarkdownEditor/Mermaid";
import { CHAT_MARKDOWN_CSS } from "./chatMarkdownCss";

type ChatMarkdownTheme = "light" | "dark";

type ChatMarkdownProps = {
  content: string;
  theme?: ChatMarkdownTheme;
};

/** A hast element node carrying tag/properties, as react-markdown passes it. */
type HastElement = {
  tagName?: string;
  properties?: { className?: unknown };
  children?: HastElement[];
};

function classNameList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(/\s+/);
  return [];
}

function buildComponents(theme: ChatMarkdownTheme): Components {
  return {
    // Open links in a new tab; never trust LLM-provided targets with opener access.
    a: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow" {...props}>
        {children}
      </a>
    ),

    img: ({ src, alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) => (
      <img
        src={typeof src === "string" ? src : undefined}
        alt={alt || ""}
        loading="lazy"
        className="chat-md-img"
        {...props}
      />
    ),

    // Mermaid code blocks become diagrams; the matching `pre` override below
    // unwraps the surrounding <pre> so a diagram never nests inside it.
    code: ({ className, children, ...props }) => {
      const isMermaid = classNameList(className).includes("language-mermaid");
      if (isMermaid) {
        const chart = String(children ?? "").replace(/\n$/, "");
        return <Mermaid chart={chart} theme={theme} debounceMs={0} />;
      }
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },

    pre: ({ children, node }) => {
      const codeChild = (node as HastElement | undefined)?.children?.[0];
      const isMermaid =
        codeChild?.tagName === "code" &&
        classNameList(codeChild.properties?.className).includes("language-mermaid");
      if (isMermaid) return <>{children}</>;
      return <pre className="chat-md-pre">{children}</pre>;
    },
  };
}

function ChatMarkdownBase({ content, theme = "light" }: ChatMarkdownProps) {
  return (
    <div className="chat-md" data-color-mode={theme}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={buildComponents(theme)}
      >
        {content}
      </ReactMarkdown>
      <style jsx global>
        {CHAT_MARKDOWN_CSS}
      </style>
    </div>
  );
}

const ChatMarkdown = memo(ChatMarkdownBase);
export default ChatMarkdown;
