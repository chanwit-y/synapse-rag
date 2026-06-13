type NodeLike = {
  type?: string;
  value?: string;
  children?: NodeLike[];
};

export function remarkHighlight() {
  return (tree: NodeLike) => {
    const visit = (node: NodeLike, index: number, parent: NodeLike | null) => {
      if (node.type === 'text' && typeof node.value === 'string') {
        const text = node.value;
        const highlightRegex = /\?\?([^?]+)\?\?/g;
        const matches = [...text.matchAll(highlightRegex)];

        if (matches.length > 0) {
          const newNodes: NodeLike[] = [];
          let lastIndex = 0;

          for (const match of matches) {
            const matchStart = match.index ?? 0;
            const matchEnd = matchStart + match[0].length;

            if (matchStart > lastIndex) {
              const beforeText = text.slice(lastIndex, matchStart);
              if (beforeText) newNodes.push({ type: 'text', value: beforeText });
            }

            const highlighted = match[1];
            const popoverContent = `This is highlighted text: "${highlighted}"`;
            newNodes.push({
              type: 'html',
              value: `<span class="custom-highlight" data-popover="${popoverContent}">${highlighted}</span>`,
            });

            lastIndex = matchEnd;
          }

          if (lastIndex < text.length) {
            const remainingText = text.slice(lastIndex);
            if (remainingText) newNodes.push({ type: 'text', value: remainingText });
          }

          if (parent?.children && newNodes.length > 0) {
            parent.children.splice(index, 1, ...newNodes);
            return;
          }
        }
      }

      if (node.children) {
        node.children.forEach((child, childIndex) => {
          visit(child, childIndex, node);
        });
      }
    };

    visit(tree, 0, null);
  };
}

export function remarkHiddenText() {
  return (tree: NodeLike) => {
    const visit = (node: NodeLike, index: number, parent: NodeLike | null) => {
      if (node.type === 'text' && typeof node.value === 'string') {
        const text = node.value;
        const hiddenRegex = /==([^=]+)==/g;
        const matches = [...text.matchAll(hiddenRegex)];

        if (matches.length > 0) {
          const newNodes: NodeLike[] = [];
          let lastIndex = 0;

          for (const match of matches) {
            const matchStart = match.index ?? 0;
            const matchEnd = matchStart + match[0].length;

            if (matchStart > lastIndex) {
              const beforeText = text.slice(lastIndex, matchStart);
              if (beforeText) newNodes.push({ type: 'text', value: beforeText });
            }

            newNodes.push({
              type: 'html',
              value: `<span class="hidden-text" aria-hidden="true">${match[1]}</span>`,
            });

            lastIndex = matchEnd;
          }

          if (lastIndex < text.length) {
            const remainingText = text.slice(lastIndex);
            if (remainingText) newNodes.push({ type: 'text', value: remainingText });
          }

          if (parent?.children && newNodes.length > 0) {
            parent.children.splice(index, 1, ...newNodes);
            return;
          }
        }
      }

      if (node.children) {
        node.children.forEach((child, childIndex) => {
          visit(child, childIndex, node);
        });
      }
    };

    visit(tree, 0, null);
  };
}

export function rehypeHighlight() {
  return (tree: unknown) => tree;
}
