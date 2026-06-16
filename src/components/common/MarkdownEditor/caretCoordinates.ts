// Measure the pixel position of the caret inside a <textarea> so a popover can
// be anchored to it. Works by rendering an invisible "mirror" div that copies
// the textarea's text and relevant styles, then measuring a marker span placed
// at the caret offset. Adapted from the well-known textarea-caret-position trick.

// Style properties that affect text layout and so must be mirrored exactly.
const MIRRORED_PROPERTIES = [
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
] as const;

export interface CaretCoordinates {
  /** Offset of the caret from the textarea's top-left content box, in px. */
  top: number;
  left: number;
  /** Line height at the caret, in px — useful to position a popover below the line. */
  height: number;
}

export function getCaretCoordinates(
  textarea: HTMLTextAreaElement,
  position: number,
): CaretCoordinates {
  const div = document.createElement('div');
  div.id = 'md-caret-mirror';
  const style = div.style;
  const computed = window.getComputedStyle(textarea);

  style.position = 'absolute';
  style.visibility = 'hidden';
  style.whiteSpace = 'pre-wrap';
  style.wordWrap = 'break-word';

  for (const prop of MIRRORED_PROPERTIES) {
    style[prop as never] = computed[prop as never];
  }

  // The mirror must scroll like the textarea, so subtract scroll later.
  div.textContent = textarea.value.substring(0, position);

  const span = document.createElement('span');
  // The marker holds the remaining text so wrapping matches up to the caret.
  span.textContent = textarea.value.substring(position) || '.';
  div.appendChild(span);

  document.body.appendChild(div);
  const lineHeight = parseInt(computed.lineHeight, 10) || parseInt(computed.fontSize, 10) || 16;
  const coordinates: CaretCoordinates = {
    top: span.offsetTop + parseInt(computed.borderTopWidth, 10) - textarea.scrollTop,
    left: span.offsetLeft + parseInt(computed.borderLeftWidth, 10) - textarea.scrollLeft,
    height: lineHeight,
  };
  document.body.removeChild(div);

  return coordinates;
}
