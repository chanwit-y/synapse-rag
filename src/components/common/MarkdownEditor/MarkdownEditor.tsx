'use client';

import type { AnchorHTMLAttributes, HTMLAttributes, ImgHTMLAttributes, ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MDEditor, {
  commands as mdCommands,
  type ExecuteState,
  type ICommand,
  type PreviewType,
  type TextAreaTextApi,
} from '@uiw/react-md-editor';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useSnackbar } from '../Snackbar/Snackbar';
import { MARKDOWN_EDITOR_CSS } from './editorCss';
import {
  BoldIcon,
  ClearIcon,
  EditCodeIcon,
  FullscreenIcon,
  HeadingIcon,
  ImageIcon,
  ItalicIcon,
  LiveCodeIcon,
  LinkIcon,
  PreviewIcon,
  SaveIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from './icons';
import { rehypeHighlight, remarkHighlight, remarkHiddenText } from './highlightPlugins';
import {
  getToolbarButtonCenter,
  insertAtMdEditorCursor,
  normalizePublicPath,
} from './editorUtils';
import type { TreeNode } from '../FileTree/types';

export type MarkdownEditorProps = {
  selectedFile: TreeNode | null;
  theme?: 'light' | 'dark';
  initialContent?: string;
  height?: string;
  fullHeight?: boolean;
  className?: string;
  onSave?: (params: { id: string | null; name: string; content: string; collectionId: string }) => Promise<{ id: string }>;
  onUploadImage?: (file: File) => Promise<string>;
  onAnalyzeImage?: (file: File, question: string) => Promise<string>;
  onChange?: (value: string) => void;
};

type TooltipState = {
  visible: boolean;
  content: string;
  x: number;
  y: number;
};

type PositionedPopoverState = {
  visible: boolean;
  x: number;
  y: number;
};

type EditorCommandCtx = {
  selectedText?: string;
  replaceSelection?: (text: string) => void;
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

function useModeSwitchAnimation(previewMode: PreviewType) {
  useEffect(() => {
    const targets = document.querySelectorAll('.w-md-editor-preview, .w-md-editor-text');
    targets.forEach((el) => {
      el.classList.remove('md-mode-switch-anim');
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      (el as HTMLElement).offsetWidth;
      el.classList.add('md-mode-switch-anim');
    });
  }, [previewMode]);
}

function useHighlightTooltip(): TooltipState {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    content: '',
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.classList.contains('custom-highlight')) return;
      const rect = target.getBoundingClientRect();
      const content = target.getAttribute('data-popover') || '';
      setTooltip({
        visible: true,
        content,
        x: rect.left + rect.width / 2,
        y: rect.top - 45,
      });
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('custom-highlight') || target.querySelector('.custom-highlight')) {
        setTooltip((prev) => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  return tooltip;
}

function createModeCommand(opts: {
  base: ICommand;
  ariaLabel: string;
  icon: ReactElement;
  mode: PreviewType;
  setPreviewMode: (mode: PreviewType) => void;
}): ICommand {
  const { base, ariaLabel, icon, mode, setPreviewMode } = opts;
  return {
    ...base,
    buttonProps: { 'aria-label': ariaLabel },
    icon,
    execute: (_state, api, dispatch) => {
      api.textArea?.focus?.();
      setPreviewMode(mode);
      dispatch?.({ preview: mode });
    },
  };
}

function createInsertCommand(opts: {
  name: string;
  keyCommand: string;
  ariaLabel: string;
  icon: ReactElement;
  onOpen: (selectedText: string | undefined, replaceSelection?: (text: string) => void) => void;
}): ICommand {
  const { name, keyCommand, ariaLabel, icon, onOpen } = opts;
  return {
    name,
    keyCommand,
    buttonProps: { 'aria-label': ariaLabel },
    icon,
    execute: (state: ExecuteState, api: TextAreaTextApi) => {
      onOpen(state.selectedText, (text) => {
        api.replaceSelection(text);
      });
    },
  };
}

export default function MarkdownEditor({
  selectedFile,
  theme = 'light',
  initialContent,
  height = 'calc(100vh - 160px)',
  fullHeight = false,
  className,
  onSave,
  onUploadImage,
  onAnalyzeImage,
  onChange,
}: MarkdownEditorProps) {
  const { showSnackbar } = useSnackbar();
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState(400);

  const [value, setValue] = useState(initialContent ?? '');
  const [previewMode, setPreviewMode] = useState<PreviewType>('preview');
  const valueRef = useLatestRef(value);
  const tooltip = useHighlightTooltip();

  const [imageUploadPopover, setImageUploadPopover] = useState<PositionedPopoverState>({
    visible: false,
    x: 0,
    y: 0,
  });
  const [linkPopover, setLinkPopover] = useState<PositionedPopoverState>({
    visible: false,
    x: 0,
    y: 0,
  });
  const [headingPopover, setHeadingPopover] = useState<PositionedPopoverState>({
    visible: false,
    x: 0,
    y: 0,
  });

  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);

  const imageUploadPopoverRef = useRef<HTMLDivElement>(null);
  const linkPopoverRef = useRef<HTMLDivElement>(null);
  const headingPopoverRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkTextInputRef = useRef<HTMLInputElement>(null);
  const headingSelectRef = useRef<HTMLSelectElement>(null);

  const commandCtxRef = useRef<EditorCommandCtx | null>(null);
  const fileIdRef = useRef<string | null>(null);

  useModeSwitchAnimation(previewMode);

  useEffect(() => {
    if (!fullHeight) return;

    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      const nextHeight = Math.floor(container.getBoundingClientRect().height);
      if (nextHeight > 0) {
        setMeasuredHeight(nextHeight);
      }
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(container);
    return () => observer.disconnect();
  }, [fullHeight]);

  const editorHeight = fullHeight ? `${measuredHeight}px` : height;

  const insertMarkdown = useCallback(
    (markdown: string) => {
      insertAtMdEditorCursor({
        markdown,
        setValue,
        fallbackReplaceSelection: commandCtxRef.current?.replaceSelection,
      });
    },
    [setValue]
  );

  const openAtToolbarButton = useCallback(
    (ariaLabel: string, setPopover: (s: PositionedPopoverState) => void) => {
      const pos = getToolbarButtonCenter(ariaLabel);
      setPopover({ visible: true, x: pos.x, y: pos.y });
    },
    []
  );

  const codeEditCommand = useMemo(
    () =>
      createModeCommand({
        base: mdCommands.codeEdit,
        ariaLabel: 'Edit code',
        icon: <EditCodeIcon />,
        mode: 'edit',
        setPreviewMode,
      }),
    [setPreviewMode]
  );

  const codeLiveCommand = useMemo(
    () =>
      createModeCommand({
        base: mdCommands.codeLive,
        ariaLabel: 'Live code',
        icon: <LiveCodeIcon />,
        mode: 'live',
        setPreviewMode,
      }),
    [setPreviewMode]
  );

  const codePreviewCommand = useMemo(
    () =>
      createModeCommand({
        base: mdCommands.codePreview,
        ariaLabel: 'Preview',
        icon: <PreviewIcon />,
        mode: 'preview',
        setPreviewMode,
      }),
    [setPreviewMode]
  );

  const fullscreenCommand = useMemo<ICommand>(
    () => ({
      ...mdCommands.fullscreen,
      buttonProps: { 'aria-label': 'Toggle fullscreen' },
      icon: <FullscreenIcon />,
    }),
    []
  );

  const boldCommand = useMemo<ICommand>(
    () => ({
      name: 'bold',
      keyCommand: 'bold',
      buttonProps: { 'aria-label': 'Bold (Ctrl+B)' },
      icon: <BoldIcon />,
      shortcuts: 'ctrl+b',
      execute: (state: ExecuteState, api: TextAreaTextApi) => {
        api.replaceSelection(`**${state.selectedText || 'Bold Text'}**`);
      },
    }),
    []
  );

  const italicCommand = useMemo<ICommand>(
    () => ({
      name: 'italic',
      keyCommand: 'italic',
      buttonProps: { 'aria-label': 'Italic (Ctrl+I)' },
      icon: <ItalicIcon />,
      shortcuts: 'ctrl+i',
      execute: (state: ExecuteState, api: TextAreaTextApi) => {
        api.replaceSelection(`*${state.selectedText || 'Italic Text'}*`);
      },
    }),
    []
  );

  const underlineCommand = useMemo<ICommand>(
    () => ({
      name: 'underline',
      keyCommand: 'underline',
      buttonProps: { 'aria-label': 'Underline (Ctrl+U)' },
      icon: <UnderlineIcon />,
      shortcuts: 'ctrl+u',
      execute: (state: ExecuteState, api: TextAreaTextApi) => {
        api.replaceSelection(`<u>${state.selectedText || 'Underline Text'}</u>`);
      },
    }),
    []
  );

  const strikethroughCommand = useMemo<ICommand>(
    () => ({
      name: 'strikethrough',
      keyCommand: 'strikethrough',
      buttonProps: { 'aria-label': 'Strikethrough' },
      icon: <StrikethroughIcon />,
      execute: (state: ExecuteState, api: TextAreaTextApi) => {
        api.replaceSelection(`~~${state.selectedText || 'Strikethrough Text'}~~`);
      },
    }),
    []
  );

  const imageCommand = useMemo(
    () =>
      createInsertCommand({
        name: 'image',
        keyCommand: 'image',
        ariaLabel: 'Insert Image',
        icon: <ImageIcon />,
        onOpen: (selectedText, replaceSelection) => {
          commandCtxRef.current = { selectedText, replaceSelection };
          openAtToolbarButton('Insert Image', setImageUploadPopover);
        },
      }),
    [openAtToolbarButton]
  );

  const linkCommand = useMemo(
    () =>
      createInsertCommand({
        name: 'link',
        keyCommand: 'link',
        ariaLabel: 'Insert Link',
        icon: <LinkIcon />,
        onOpen: (selectedText, replaceSelection) => {
          commandCtxRef.current = { selectedText, replaceSelection };
          openAtToolbarButton('Insert Link', setLinkPopover);
          setLinkText(selectedText || '');
          setLinkUrl('');
          setTimeout(() => linkTextInputRef.current?.focus(), 100);
        },
      }),
    [openAtToolbarButton]
  );

  const headingCommand = useMemo(
    () =>
      createInsertCommand({
        name: 'heading',
        keyCommand: 'heading',
        ariaLabel: 'Insert Heading',
        icon: <HeadingIcon />,
        onOpen: (selectedText, replaceSelection) => {
          commandCtxRef.current = { selectedText, replaceSelection };
          openAtToolbarButton('Insert Heading', setHeadingPopover);
          setTimeout(() => headingSelectRef.current?.focus(), 100);
        },
      }),
    [openAtToolbarButton]
  );

  const saveCurrentContent = useCallback(async () => {
    if (!onSave) return;

    try {
      if (!selectedFile) {
        showSnackbar({ message: 'Please select a file to save.', variant: 'warning' });
        return;
      }

      const result = await onSave({
        id: fileIdRef.current,
        name: selectedFile.name || 'untitled.md',
        collectionId: selectedFile.collectionId,
        content: valueRef.current,
      });

      fileIdRef.current = result.id;
      showSnackbar({
        title: 'Saved',
        message: `Saved "${selectedFile.name || 'untitled.md'}"`,
        variant: 'success',
      });
    } catch (error) {
      console.error('Error saving file:', error);
      showSnackbar({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Error saving file. Please try again.',
        variant: 'error',
      });
    }
  }, [onSave, selectedFile, showSnackbar, valueRef]);

  useEffect(() => {
    const id = selectedFile?.id ?? null;
    fileIdRef.current = id;

    if (!id) {
      setValue('');
      return;
    }

    setValue(selectedFile?.content ?? '');
  }, [selectedFile?.content, selectedFile?.id]);

  useEffect(() => {
    if (initialContent !== undefined) {
      setValue(initialContent);
    }
  }, [initialContent]);

  const handleValueChange = useCallback(
    (val: string | undefined) => {
      const newValue = val || '';
      setValue(newValue);
      onChange?.(newValue);
    },
    [onChange]
  );

  const saveCommand = useMemo<ICommand>(
    () => ({
      name: 'save',
      keyCommand: 'save',
      buttonProps: { 'aria-label': 'Save' },
      icon: <SaveIcon />,
      execute: () => {
        void saveCurrentContent();
      },
    }),
    [saveCurrentContent]
  );

  const clearCommand = useMemo<ICommand>(
    () => ({
      name: 'clear',
      keyCommand: 'clear',
      buttonProps: { 'aria-label': 'Clear' },
      icon: <ClearIcon />,
      execute: () => {
        setValue('');
        onChange?.('');
        setImageUploadPopover({ visible: false, x: 0, y: 0 });
        setLinkPopover({ visible: false, x: 0, y: 0 });
        setHeadingPopover({ visible: false, x: 0, y: 0 });
        setLinkText('');
        setLinkUrl('');
      },
    }),
    [onChange]
  );

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showSnackbar({ message: 'Please select an image file', variant: 'warning' });
        return;
      }

      if (file.size > MAX_IMAGE_BYTES) {
        showSnackbar({ message: 'Image file is too large. Please select an image smaller than 10MB.', variant: 'warning' });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      if (!onUploadImage) {
        showSnackbar({ message: 'Image upload is not configured.', variant: 'warning' });
        return;
      }

      setIsImageProcessing(true);
      setIsImageUploading(true);

      try {
        const path = await onUploadImage(file);
        setIsImageUploading(false);
        const imagePath = normalizePublicPath(path);
        const altText = file.name.replace(/\.[^/.]+$/, '');
        insertMarkdown(`![${altText}](${imagePath})`);

        if (onAnalyzeImage) {
          try {
            const analysisText = await onAnalyzeImage(file, 'Describe the content of this image.');
            insertMarkdown(`\n\`\`\`\n${analysisText}\n\`\`\`\n`);
            showSnackbar({
              title: 'Image Analyzed',
              message: 'AI analysis has been inserted below the image.',
              variant: 'success',
            });
          } catch (err) {
            console.error('AI image analysis failed:', err);
            showSnackbar({
              title: 'Analysis Failed',
              message: err instanceof Error ? err.message : 'Could not analyze image.',
              variant: 'error',
            });
          }
        }

        setIsImageProcessing(false);
        setImageUploadPopover({ visible: false, x: 0, y: 0 });
      } catch (error) {
        console.error('Error uploading image:', error);
        showSnackbar({
          title: 'Upload Failed',
          message: error instanceof Error ? error.message : 'Error uploading image. Please try again.',
          variant: 'error',
        });
        setIsImageProcessing(false);
        setIsImageUploading(false);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [insertMarkdown, onAnalyzeImage, onUploadImage, showSnackbar]
  );

  const handleLinkSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const url = linkUrl.trim();
      if (!url) {
        showSnackbar({ message: 'Please enter a URL', variant: 'warning' });
        return;
      }

      const text = linkText.trim() || url;
      insertMarkdown(`[${text}](${url})`);

      setLinkPopover({ visible: false, x: 0, y: 0 });
      setLinkText('');
      setLinkUrl('');
    },
    [insertMarkdown, linkText, linkUrl, showSnackbar]
  );

  const handleHeadingSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const level = Number.parseInt(e.target.value, 10);
      if (!level || level < 1 || level > 6) return;

      const selectedText = commandCtxRef.current?.selectedText || 'Heading';
      insertMarkdown(`${'#'.repeat(level)} ${selectedText}`);

      setHeadingPopover({ visible: false, x: 0, y: 0 });
      if (headingSelectRef.current) headingSelectRef.current.value = '';
    },
    [insertMarkdown]
  );

  useEffect(() => {
    const anyOpen = imageUploadPopover.visible || linkPopover.visible || headingPopover.visible;
    if (!anyOpen) return;

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (
        imageUploadPopover.visible &&
        imageUploadPopoverRef.current &&
        !imageUploadPopoverRef.current.contains(target) &&
        !target.closest('[aria-label="Insert Image"]')
      ) {
        setImageUploadPopover({ visible: false, x: 0, y: 0 });
      }

      if (
        linkPopover.visible &&
        linkPopoverRef.current &&
        !linkPopoverRef.current.contains(target) &&
        !target.closest('[aria-label="Insert Link"]')
      ) {
        setLinkPopover({ visible: false, x: 0, y: 0 });
      }

      if (
        headingPopover.visible &&
        headingPopoverRef.current &&
        !headingPopoverRef.current.contains(target) &&
        !target.closest('[aria-label="Insert Heading"]')
      ) {
        setHeadingPopover({ visible: false, x: 0, y: 0 });
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [headingPopover.visible, imageUploadPopover.visible, linkPopover.visible]);

  const previewComponents = useMemo(
    () => ({
      h1: ({ ...props }: HTMLAttributes<HTMLHeadingElement>) => (
        <h1
          style={{ color: theme === 'dark' ? '#8B9AFF' : '#636CCB', fontSize: '2rem' }}
          {...props}
        />
      ),
      p: ({ ...props }: HTMLAttributes<HTMLParagraphElement>) => (
        <p
          style={{ color: theme === 'dark' ? '#E5E5E5' : '#37353E', fontSize: '.95rem' }}
          {...props}
        />
      ),
      a: ({ ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a style={{ color: '#0BA6DF', fontSize: '.95rem' }} {...props} />
      ),
      img: ({ src, alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) => {
        let imageSrc = typeof src === 'string' ? src : undefined;
        if (imageSrc?.startsWith('/api/upload/')) imageSrc = imageSrc.replace('/api/upload/', '/upload/');
        if (imageSrc) imageSrc = normalizePublicPath(imageSrc);

        return (
          <img
            src={imageSrc}
            alt={alt || ''}
            style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px', margin: '10px 0' }}
            {...props}
          />
        );
      },
      code: ({ inline, ...props }: HTMLAttributes<HTMLElement> & { inline?: boolean }) => {
        return (
          <code
            style={{
              backgroundColor: inline ? (theme === 'dark' ? '#2a2a2a' : 'lightgray') : 'transparent',
              color: inline && theme === 'dark' ? '#E5E5E5' : undefined,
              padding: '0.2rem 0.4rem',
              borderRadius: '4px',
            }}
            {...props}
          />
        );
      },
    }),
    [theme]
  );

  const commands = useMemo(
    () => [
      saveCommand,
      clearCommand,
      mdCommands.divider,
      boldCommand,
      italicCommand,
      underlineCommand,
      strikethroughCommand,
      mdCommands.divider,
      headingCommand,
      imageCommand,
      linkCommand,
    ],
    [
      boldCommand,
      clearCommand,
      headingCommand,
      imageCommand,
      italicCommand,
      linkCommand,
      saveCommand,
      strikethroughCommand,
      underlineCommand,
    ]
  );

  const extraCommands = useMemo(
    () => [
      codeEditCommand,
      codeLiveCommand,
      codePreviewCommand,
      mdCommands.divider,
      fullscreenCommand,
    ],
    [codeEditCommand, codeLiveCommand, codePreviewCommand, fullscreenCommand]
  );

  const editor = (
    <MDEditor
      value={value}
      onChange={handleValueChange}
      height={editorHeight}
      preview={previewMode}
      data-color-mode={theme}
      visibleDragbar={false}
      previewOptions={{
        rehypePlugins: [rehypeKatex, rehypeHighlight],
        remarkPlugins: [remarkMath, remarkHighlight, remarkHiddenText],
        components: previewComponents as never,
      }}
      commands={commands}
      extraCommands={extraCommands}
      hideToolbar={false}
    />
  );

  return (
    <div
      className={
        fullHeight
          ? `flex h-full min-h-0 w-full flex-col p-4 ${className ?? ''}`
          : className
      }
      style={
        fullHeight ? undefined : { padding: '10px', width: '100%', margin: '0 auto' }
      }
    >
      <style>{MARKDOWN_EDITOR_CSS}</style>

      {fullHeight ? (
        <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
          {editor}
        </div>
      ) : (
        <div ref={containerRef}>{editor}</div>
      )}

      {tooltip.visible && (
        <div
          className="popover"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px`, transform: 'translateX(-50%)' }}
        >
          {tooltip.content}
        </div>
      )}

      {imageUploadPopover.visible && (
        <div
          ref={imageUploadPopoverRef}
          className="image-upload-popover"
          style={{ left: `${imageUploadPopover.x - 320}px`, top: `${imageUploadPopover.y - 60}px`, transform: 'translateX(-50%)' }}
        >
          <h3>Upload Image</h3>
          {isImageProcessing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
              <span className="image-upload-spinner" />
              <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                {isImageUploading ? 'Uploading image…' : 'Analyzing image with AI…'}
              </span>
            </div>
          ) : (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'block', width: '100%' }}
            />
          )}
        </div>
      )}

      {linkPopover.visible && (
        <div
          ref={linkPopoverRef}
          className="link-popover"
          style={{ left: `${linkPopover.x - 320}px`, top: `${linkPopover.y - 60}px`, transform: 'translateX(-50%)' }}
        >
          <h3>Insert Link</h3>
          <form onSubmit={handleLinkSubmit}>
            <label htmlFor="link-text">Link Text</label>
            <input
              ref={linkTextInputRef}
              id="link-text"
              type="text"
              placeholder="Enter link text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
            />
            <label htmlFor="link-url">URL</label>
            <input
              id="link-url"
              type="text"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              required
            />
            <button type="submit">Insert Link</button>
          </form>
        </div>
      )}

      {headingPopover.visible && (
        <div
          ref={headingPopoverRef}
          className="heading-popover"
          style={{ left: `${headingPopover.x - 320}px`, top: `${headingPopover.y - 60}px`, transform: 'translateX(-50%)' }}
        >
          <h3>Insert Heading</h3>
          <label htmlFor="heading-level">Heading Level</label>
          <select
            ref={headingSelectRef}
            id="heading-level"
            onChange={handleHeadingSelect}
            defaultValue=""
          >
            <option value="" disabled>
              Select heading level
            </option>
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
            <option value="4">Heading 4</option>
            <option value="5">Heading 5</option>
            <option value="6">Heading 6</option>
          </select>
        </div>
      )}
    </div>
  );
}
