"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  SquareCode,
  Minus,
  Link2,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Save,
} from "lucide-react";
import { useSnackbar } from "../Snackbar/Snackbar";
import { normalizePublicPath } from "../MarkdownEditor/editorUtils";
import type { TreeNode } from "../FileTree/types";
import type { FlatFileNode } from "../FileTree/treeUtils";
import { htmlToMarkdown, markdownToHtml } from "./markdown";
import { TIPTAP_EDITOR_CSS } from "./editorCss";

export type TiptapEditorProps = {
  selectedFile: TreeNode | null;
  theme?: "light" | "dark";
  initialContent?: string;
  fullHeight?: boolean;
  className?: string;
  onSave?: (params: {
    id: string | null;
    name: string;
    content: string;
    collectionId: string;
  }) => Promise<{ id: string }>;
  onUploadImage?: (file: File) => Promise<string>;
  onChange?: (value: string) => void;
  /** Accepted for prop-parity with the markdown editor; unused in v1. */
  documents?: FlatFileNode[];
  /** Accepted for prop-parity with the markdown editor; unused in v1. */
  onOpenItem?: (id: string) => void;
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      // Keep editor selection while clicking a toolbar button.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors disabled:opacity-40 ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-surface-strong hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-border" />;
}

export default function TiptapEditor({
  selectedFile,
  theme = "light",
  initialContent,
  fullHeight = false,
  className,
  onSave,
  onUploadImage,
  onChange,
}: TiptapEditorProps) {
  const { showSnackbar } = useSnackbar();

  const onChangeRef = useLatestRef(onChange);
  const lastMarkdownRef = useRef<string | undefined>(initialContent);
  const fileIdRef = useRef<string | null>(selectedFile?.id ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // Strike/underline are excluded: they don't round-trip back to Markdown
      // with core turndown (no GFM plugin), which is the v1 content contract.
      StarterKit.configure({ strike: false, underline: false }),
      Image.configure({ inline: false }),
    ],
    content: markdownToHtml(initialContent ?? ""),
    editorProps: {
      attributes: { class: "ProseMirror focus:outline-none" },
    },
    onUpdate: ({ editor }) => {
      const markdown = htmlToMarkdown(editor.getHTML());
      lastMarkdownRef.current = markdown;
      onChangeRef.current?.(markdown);
    },
  });

  // Reseed when the document text arrives/changes externally (async content load
  // or a language flip), without clobbering in-progress edits. Compare against
  // the last markdown we emitted and the editor's current markdown so typing —
  // which never changes `initialContent` — won't trigger a content reset.
  useEffect(() => {
    if (!editor || initialContent === undefined) return;
    if (initialContent === lastMarkdownRef.current) return;
    if (initialContent === htmlToMarkdown(editor.getHTML())) {
      lastMarkdownRef.current = initialContent;
      return;
    }
    editor.commands.setContent(markdownToHtml(initialContent), {
      emitUpdate: false,
    });
    lastMarkdownRef.current = initialContent;
  }, [editor, initialContent]);

  useEffect(() => {
    fileIdRef.current = selectedFile?.id ?? null;
  }, [selectedFile?.id]);

  const insertImageFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        showSnackbar({ message: "Please select an image file", variant: "warning" });
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        showSnackbar({
          message: "Image file is too large. Please select an image smaller than 10MB.",
          variant: "warning",
        });
        return;
      }
      if (!onUploadImage) {
        showSnackbar({ message: "Image upload is not configured.", variant: "warning" });
        return;
      }
      try {
        const path = await onUploadImage(file);
        const src = normalizePublicPath(path);
        const alt = file.name.replace(/\.[^/.]+$/, "");
        editor?.chain().focus().setImage({ src, alt }).run();
      } catch (error) {
        console.error("Error uploading image:", error);
        showSnackbar({
          title: "Upload Failed",
          message: error instanceof Error ? error.message : "Error uploading image.",
          variant: "error",
        });
      }
    },
    [editor, onUploadImage, showSnackbar],
  );

  // Image paste/drop -> upload via the shared handler.
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;

    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) =>
        f.type.startsWith("image/"),
      );
      if (file) {
        e.preventDefault();
        void insertImageFile(file);
      }
    };
    const onDrop = (e: DragEvent) => {
      const file = Array.from(e.dataTransfer?.files ?? []).find((f) =>
        f.type.startsWith("image/"),
      );
      if (file) {
        e.preventDefault();
        void insertImageFile(file);
      }
    };

    dom.addEventListener("paste", onPaste);
    dom.addEventListener("drop", onDrop);
    return () => {
      dom.removeEventListener("paste", onPaste);
      dom.removeEventListener("drop", onDrop);
    };
  }, [editor, insertImageFile]);

  const handleSave = useCallback(async () => {
    if (!onSave || !editor) return;
    if (!selectedFile) {
      showSnackbar({ message: "Please select a file to save.", variant: "warning" });
      return;
    }
    try {
      const markdown = htmlToMarkdown(editor.getHTML());
      const result = await onSave({
        id: fileIdRef.current,
        name: selectedFile.name || "untitled.rt",
        collectionId: selectedFile.collectionId,
        content: markdown,
      });
      fileIdRef.current = result.id;
      showSnackbar({
        title: "Saved",
        message: `Saved "${selectedFile.name || "untitled.rt"}"`,
        variant: "success",
      });
    } catch (error) {
      console.error("Error saving file:", error);
      showSnackbar({
        title: "Error",
        message: error instanceof Error ? error.message : "Error saving file.",
        variant: "error",
      });
    }
  }, [editor, onSave, selectedFile, showSnackbar]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "");
    if (url === null) return; // cancelled
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
      }
    },
    [handleSave],
  );

  if (!editor) {
    return (
      <div className="flex h-full flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading editor…
      </div>
    );
  }

  return (
    <div
      onKeyDown={onKeyDown}
      className={`synapse-tiptap ${theme === "dark" ? "is-dark" : ""} flex w-full flex-col text-foreground ${
        fullHeight ? "h-full min-h-0 p-4" : ""
      } ${className ?? ""}`}
    >
      <style>{TIPTAP_EDITOR_CSS}</style>

      <div className="flex flex-wrap items-center gap-0.5 rounded-t-md border border-border bg-surface px-2 py-1">
        <ToolbarButton label="Save" onClick={() => void handleSave()}>
          <Save className="h-4 w-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          label="Heading 1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Inline code"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Code block"
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <SquareCode className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Horizontal rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton label="Link" active={editor.isActive("link")} onClick={setLink}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Image" onClick={() => fileInputRef.current?.click()}>
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          label="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <div
        className={`overflow-y-auto rounded-b-md border border-t-0 border-border bg-surface px-4 py-3 ${
          fullHeight ? "min-h-0 flex-1" : ""
        }`}
        onClick={() => editor.chain().focus().run()}
      >
        <EditorContent editor={editor as Editor} />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void insertImageFile(file);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />
    </div>
  );
}
