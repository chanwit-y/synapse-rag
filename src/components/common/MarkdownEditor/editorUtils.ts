import type { Dispatch, SetStateAction } from 'react';

export function normalizePublicPath(path: string): string {
  if (!path) return '';
  return path.startsWith('/') ? path : `/${path}`;
}

function safeEscapeForAttributeSelector(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function getToolbarButtonCenter(ariaLabel: string): { x: number; y: number } {
  const toolbar = document.querySelector('.w-md-editor-toolbar');
  const escaped = safeEscapeForAttributeSelector(ariaLabel);
  const button = toolbar?.querySelector(`[aria-label="${escaped}"]`) as HTMLElement | null;

  if (button) {
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.bottom + 10 };
  }

  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

export function insertAtMdEditorCursor(opts: {
  markdown: string;
  setValue: Dispatch<SetStateAction<string>>;
  fallbackReplaceSelection?: (text: string) => void;
}): void {
  const { markdown, setValue, fallbackReplaceSelection } = opts;
  const textarea = document.querySelector('.w-md-editor-text-input') as HTMLTextAreaElement | null;

  if (textarea) {
    const currentText = textarea.value ?? '';
    const cursorStart = textarea.selectionStart ?? currentText.length;
    const cursorEnd = textarea.selectionEnd ?? cursorStart;

    const newText =
      currentText.substring(0, cursorStart) + markdown + currentText.substring(cursorEnd);

    setValue(newText);

    setTimeout(() => {
      const newTextarea = document.querySelector('.w-md-editor-text-input') as HTMLTextAreaElement | null;
      if (!newTextarea) return;
      const newCursorPos = cursorStart + markdown.length;
      newTextarea.focus();
      newTextarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);

    return;
  }

  if (fallbackReplaceSelection) {
    fallbackReplaceSelection(markdown);
    return;
  }

  setValue((prev) => `${prev}${markdown}`);
}
