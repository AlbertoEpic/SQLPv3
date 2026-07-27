import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Code } from 'mdast';

/**
 * Remark plugin for processing Mermaid diagrams
 * 
 * This plugin detects code blocks with language "mermaid" and transforms them
 * into HTML containers that can be processed by the client-side Mermaid library.
 */

const remarkMermaid: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (node.lang !== 'mermaid') return;
      if (!node.value || typeof node.value !== 'string') return;

      const diagramId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

      // Transform to HTML container — no mermaid-js needed
      const html: any = {
        type: 'html',
        value: `<div class="mermaid-diagram" data-mermaid-id="${diagramId}">
          <pre class="mermaid-diagram-content"><code>${node.value.replace(/</g, '<').replace(/>/g, '>')}</code></pre>
          <style>
            .mermaid-diagram { text-align: center; padding: 1rem 0; }
            .mermaid-diagram-content { font-size: 13px; overflow-x: auto; white-space: pre-wrap; word-break: break-word; background: #f5f5f5; border-radius: 6px; padding: 1rem; margin: 0.5rem 0; }
            .mermaid-diagram-content code { font-family: 'Fira Code', monospace; }
          </style>
        </div>`
      };

      if (parent && typeof index === 'number') parent.children.splice(index, 1, html);
    });
  };
};

export default remarkMermaid;
