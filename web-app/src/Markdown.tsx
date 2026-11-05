import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { ReactNode } from 'react';
import 'katex/dist/katex.min.css';

interface MarkdownNode { type: string; value?: string; children?: MarkdownNode[] }
// Recover CJK bold spans that CommonMark leaves literal next to punctuation.
// Processing sibling nodes also preserves formulas nested inside the bold span.
function remarkChineseStrong() {
  return (tree: MarkdownNode) => {
    function walk(node: MarkdownNode) {
      if (!node.children || node.type === 'code' || node.type === 'inlineCode') return;
      node.children.forEach(walk);
      const count = node.children.reduce((n, c) => n + (c.type === 'text' ? (c.value?.match(/\*\*/g)?.length || 0) : 0), 0);
      if (!count || count % 2) return;
      const result: MarkdownNode[] = [];
      let active: MarkdownNode | null = null;
      const append = (child: MarkdownNode) => (active ? active.children! : result).push(child);
      for (const child of node.children) {
        if (child.type !== 'text' || !child.value?.includes('**')) { append(child); continue; }
        const pieces = child.value.split('**');
        pieces.forEach((value, i) => {
          if (value) append({ type: 'text', value });
          if (i < pieces.length - 1) {
            if (active) { result.push(active); active = null; }
            else active = { type: 'strong', children: [] };
          }
        });
      }
      node.children = result;
    }
    walk(tree);
  };
}
function headingText(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(headingText).join('');
  if (children && typeof children === 'object' && 'props' in children) return headingText((children.props as { children: ReactNode }).children);
  return '';
}
export default function Markdown({ text, sections = [] }: { text: string; sections?: string[] }) {
  return <div className="prose"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath, remarkChineseStrong]} rehypePlugins={[[rehypeKatex, { strict: 'ignore', throwOnError: false }]]}
    components={{
      h1: ({ children }) => <h2>{children}</h2>,
      h3: ({ children }) => { const index = sections.indexOf(headingText(children)); return <h3 id={index >= 0 ? 'section-' + (index + 1) : undefined}>{children}</h3>; },
      table: ({ children }) => <div className="table-scroll" role="region" aria-label="可横向滚动的表格" tabIndex={0}><table>{children}</table></div>,
      a: ({ href, children }) => <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}>{children}</a>,
      input: ({ checked, ...props }) => <input {...props} type="checkbox" checked={checked} disabled />
    }}>{text}</ReactMarkdown></div>;
}
