import type { ReactNode } from 'react';

type IconProps = {
  width?: number;
  height?: number;
};

function IconBase({
  children,
  width = 16,
  height = 16,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const BoldIcon = () => (
  <IconBase>
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
  </IconBase>
);

export const ItalicIcon = () => (
  <IconBase>
    <line x1="19" y1="4" x2="10" y2="4" />
    <line x1="14" y1="20" x2="5" y2="20" />
    <line x1="15" y1="4" x2="9" y2="20" />
  </IconBase>
);

export const StrikethroughIcon = () => (
  <IconBase>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </IconBase>
);

export const UnderlineIcon = () => (
  <IconBase>
    <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
    <line x1="4" y1="21" x2="20" y2="21" />
  </IconBase>
);

export const LinkIcon = () => (
  <IconBase>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </IconBase>
);

export const ImageIcon = () => (
  <IconBase>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </IconBase>
);

export const HeadingIcon = () => (
  <IconBase>
    <path d="M6 4h3v16H6V4z" />
    <path d="M15 4h3v16h-3V4z" />
    <path d="M6 12h12" />
  </IconBase>
);

export const SaveIcon = () => (
  <IconBase>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </IconBase>
);

export const ClearIcon = () => (
  <IconBase>
    <path d="M20 20H11" />
    <path d="M3 14l7-7a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3l-3 3H9L3 16a2 2 0 0 1 0-2z" />
    <path d="M14 19l-5-5" />
  </IconBase>
);

export const EditCodeIcon = () => (
  <IconBase>
    <path d="M8 8L4 12l4 4" />
    <path d="M16 8l4 4-4 4" />
    <path d="M14.5 6.5l3 3" />
    <path d="M11 10l6-6a2.1 2.1 0 0 1 3 3l-6 6-3 1 1-4z" />
  </IconBase>
);

export const LiveCodeIcon = () => (
  <IconBase>
    <polygon points="10 8 16 12 10 16 10 8" />
    <path d="M3 12h3l2-4 3 8 2-4h6" />
  </IconBase>
);

export const PreviewIcon = () => (
  <IconBase>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="2.5" />
  </IconBase>
);

export const FullscreenIcon = () => (
  <IconBase>
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M16 3h3a2 2 0 0 1 2 2v3" />
    <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </IconBase>
);
