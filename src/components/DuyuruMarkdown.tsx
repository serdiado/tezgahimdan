"use client";

/* eslint-disable @typescript-eslint/no-unused-vars -- her renderer'da `node`
   prop'u DOM'a sizmasin diye destructure'da bilincli ayiklanir (kullanilmaz). */
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Duyuru govdesini render eder - hem detay sayfasi hem admin formundaki canli
// onizleme ayni bileseni kullanir (tek dogru kaynak). GUVENLIK: react-markdown
// varsayilan olarak HAM HTML render ETMEZ (rehype-raw eklenmedi) - govdedeki
// <script> vb. duz metin kalir, calismaz. Link url'leri de varsayilan
// urlTransform ile temizlenir (javascript: engellenir). @tailwindcss/typography
// yok, bu yuzden her oge Tailwind siniflariyla tek tek stillenir. `node` prop'u
// her renderer'da ayiklanir (DOM'a sizmasin diye).
const BILESENLER: Components = {
  a: ({ node: _node, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline hover:text-primary-700" />
  ),
  h1: ({ node: _node, ...props }) => <h2 className="mt-4 mb-2 text-xl font-bold text-neutral-900" {...props} />,
  h2: ({ node: _node, ...props }) => <h3 className="mt-4 mb-2 text-lg font-bold text-neutral-900" {...props} />,
  h3: ({ node: _node, ...props }) => <h4 className="mt-3 mb-1 font-semibold text-neutral-900" {...props} />,
  p: ({ node: _node, ...props }) => <p className="my-2 leading-relaxed" {...props} />,
  ul: ({ node: _node, ...props }) => <ul className="my-2 list-disc pl-5" {...props} />,
  ol: ({ node: _node, ...props }) => <ol className="my-2 list-decimal pl-5" {...props} />,
  li: ({ node: _node, ...props }) => <li className="my-0.5" {...props} />,
  strong: ({ node: _node, ...props }) => <strong className="font-semibold text-neutral-900" {...props} />,
  blockquote: ({ node: _node, ...props }) => (
    <blockquote className="my-2 border-l-4 border-neutral-200 pl-3 text-neutral-500 italic" {...props} />
  ),
  code: ({ node: _node, ...props }) => (
    <code className="rounded bg-neutral-100 px-1 py-0.5 text-sm text-neutral-800" {...props} />
  ),
  hr: () => <hr className="my-4 border-neutral-200" />,
  // eslint-disable-next-line @next/next/no-img-element
  img: ({ node: _node, ...props }) => <img {...props} alt={props.alt ?? ""} className="my-3 max-w-full rounded-lg" />,
};

export function DuyuruMarkdown({ govde }: { govde: string }) {
  return (
    <div className="text-neutral-700">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={BILESENLER}>
        {govde}
      </ReactMarkdown>
    </div>
  );
}
