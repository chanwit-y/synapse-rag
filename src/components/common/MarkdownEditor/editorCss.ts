export const MARKDOWN_EDITOR_CSS = `
body .w-md-editor-text-pre > code,
body .w-md-editor-text-input {
  font-size: 0.9rem !important;
  letter-spacing: 0.6px !important;
  line-height: 1.8 !important;
}

.md-mode-switch-anim {
  animation: mdModeSwitch 180ms ease-out;
}

@keyframes mdModeSwitch {
  from {
    opacity: 0.35;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.code-line {
  color: #333 !important;
}

.dark .code-line {
  color: #e5e5e5 !important;
}

.token.title.important {
  color: #636ccb !important;
}

.dark .token.title.important {
  color: #8b9aff !important;
}

.token.title.important > .token.punctuation {
  color: #636ccb !important;
}

.dark .token.title.important > .token.punctuation {
  color: #8b9aff !important;
}

.code-line > .token.url {
  color: #ef7722 !important;
}

.token.url > .token.url,
.token.url > .token.content {
  color: #0ba6df !important;
}

.token.strike {
  text-decoration: line-through !important;
  color: #bf092f !important;
}

.token.bold > .token.content,
.token.bold > .token.punctuation {
  color: #b6771d !important;
}

.token.italic > .token.content,
.token.italic > .token.punctuation {
  color: #fa812f !important;
}

.custom-highlight {
  background-color: #f4f754;
  color: #333;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: help;
}

.dark .custom-highlight {
  background-color: #b8860b;
  color: #fff;
}

.popover {
  position: fixed;
  background: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  pointer-events: none;
  max-width: 300px;
  word-wrap: break-word;
}

.dark .popover {
  background: #1f1f1f;
  color: #ededed;
}

.popover::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #333;
}

.dark .popover::after {
  border-top-color: #1f1f1f;
}

.image-upload-popover,
.link-popover,
.heading-popover {
  position: fixed;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1002;
  min-width: 280px;
}

.dark .image-upload-popover,
.dark .link-popover,
.dark .heading-popover {
  background: #1f1f1f;
  border-color: #404040;
}

.image-upload-popover::before,
.link-popover::before,
.heading-popover::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-bottom-color: white;
}

.dark .image-upload-popover::before,
.dark .link-popover::before,
.dark .heading-popover::before {
  border-bottom-color: #1f1f1f;
}

.image-upload-popover::after,
.link-popover::after,
.heading-popover::after {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 7px solid transparent;
  border-bottom-color: #e0e0e0;
  margin-bottom: -1px;
}

.dark .image-upload-popover::after,
.dark .link-popover::after,
.dark .heading-popover::after {
  border-bottom-color: #404040;
}

.image-upload-popover h3,
.link-popover h3,
.heading-popover h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.dark .image-upload-popover h3,
.dark .link-popover h3,
.dark .heading-popover h3 {
  color: #ededed;
}

.image-upload-popover input[type='file'] {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.dark .image-upload-popover input[type='file'] {
  border-color: #404040;
  background-color: #2a2a2a;
  color: #ededed;
}

.image-upload-popover input[type='file']:hover {
  border-color: #0ba6df;
}

.link-popover label,
.heading-popover label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.dark .link-popover label,
.dark .heading-popover label {
  color: #ededed;
}

.link-popover input[type='text'] {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 12px;
  box-sizing: border-box;
}

.dark .link-popover input[type='text'] {
  background-color: #2a2a2a;
  border-color: #404040;
  color: #ededed;
}

.link-popover input[type='text']:focus,
.heading-popover select:focus {
  outline: none;
  border-color: #0ba6df;
}

.link-popover button {
  width: 100%;
  padding: 8px 16px;
  background-color: #0ba6df;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.link-popover button:hover {
  background-color: #0a95c7;
}

.link-popover button:active {
  background-color: #0988b3;
}

.heading-popover select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 12px;
  box-sizing: border-box;
  background-color: white;
  cursor: pointer;
}

.dark .heading-popover select {
  background-color: #2a2a2a;
  border-color: #404040;
  color: #ededed;
}

.heading-popover select:hover {
  border-color: #0ba6df;
}

.hidden-text {
  display: none;
}

.mermaid-diagram {
  display: flex;
  justify-content: center;
  margin: 12px 0;
}

.mermaid-diagram svg {
  max-width: 100%;
  height: auto;
}

.mermaid-loading {
  margin: 12px 0;
  font-size: 0.85rem;
  color: #888;
  font-style: italic;
}

.mermaid-error {
  margin: 12px 0;
  padding: 10px 12px;
  border: 1px solid #f0b7b7;
  border-radius: 6px;
  background-color: #fdf2f2;
  color: #bf092f;
}

.dark .mermaid-error {
  border-color: #5c2626;
  background-color: #2a1717;
  color: #f4a6a6;
}

.mermaid-error-title {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.mermaid-error pre {
  margin: 0;
  font-size: 0.8rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.image-upload-spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(150, 150, 150, 0.3);
  border-top-color: #0BA6DF;
  border-radius: 50%;
  animation: spinUpload 0.6s linear infinite;
}

@keyframes spinUpload {
  to { transform: rotate(360deg); }
}

/* Cross-document link autocomplete (the [[ menu) */
.md-mention-popover {
  position: fixed;
  z-index: 1003;
  min-width: 220px;
  max-width: 360px;
  max-height: 260px;
  overflow-y: auto;
  padding: 4px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
}

.dark .md-mention-popover {
  background: #1f1f1f;
  border-color: #404040;
}

.md-mention-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  width: 100%;
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.md-mention-item.is-active,
.md-mention-item:hover {
  background-color: rgba(11, 166, 223, 0.12);
}

.md-mention-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #333;
}

.dark .md-mention-name {
  color: #ededed;
}

.md-mention-path {
  font-size: 0.72rem;
  color: #888;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.dark .md-mention-path {
  color: #9a9a9a;
}
`;
