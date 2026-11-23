import * as React from "react";
import { cn } from "@/lib/utils";

const INLINE_PATTERN = /(\*\*[^*]+\*\*|(?<![\w])_[^_\n]+_(?![\w])|\[[^\]]+\]\([^)\s]+\)|`[^`]+`)/g;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return text
    .split(INLINE_PATTERN)
    .filter((part) => part !== "")
    .map((part, index) => {
      const key = `${keyPrefix}-${index}`;
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={key} className="font-semibold text-ink">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
        return (
          <em key={key} className="italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return (
          <code key={key} className="rounded bg-canvas px-1 py-0.5 font-mono text-[0.92em] text-navy-800">
            {part.slice(1, -1)}
          </code>
        );
      }
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
      if (link) {
        return (
          <a
            key={key}
            href={link[2]}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
          >
            {link[1]}
          </a>
        );
      }
      return <React.Fragment key={key}>{part}</React.Fragment>;
    });
}

function splitRow(line: string) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function isTableBlock(lines: string[]) {
  return lines.length >= 2 && /^\s*\|/.test(lines[0]) && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[1]) && lines[1].includes("-");
}

export function MarkdownLite({ text, className }: { text: string; className?: string }) {
  const blocks = text.split(/\n{2,}/).filter((block) => block.trim() !== "");
  return (
    <div className={cn("space-y-2.5 text-[13px] leading-relaxed text-ink/90", className)}>
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n");
        if (isTableBlock(lines)) {
          const header = splitRow(lines[0]);
          const body = lines.slice(2).filter((line) => line.trim().startsWith("|"));
          return (
            <div key={`table-${blockIndex}`} className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full border-collapse text-[10.5px]">
                <thead className="bg-canvas/70">
                  <tr>
                    {header.map((cell, cellIndex) => (
                      <th key={`th-${blockIndex}-${cellIndex}`} className="border-b border-line px-2.5 py-1.5 text-left font-medium uppercase tracking-wide text-muted">
                        {renderInline(cell, `th-${blockIndex}-${cellIndex}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((line, rowIndex) => (
                    <tr key={`tr-${blockIndex}-${rowIndex}`} className="border-b border-line/70 last:border-0">
                      {splitRow(line).map((cell, cellIndex) => (
                        <td key={`td-${blockIndex}-${rowIndex}-${cellIndex}`} className="px-2.5 py-1.5 align-top text-ink/85">
                          {renderInline(cell, `td-${blockIndex}-${rowIndex}-${cellIndex}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (lines.every((line) => /^\s*>\s?/.test(line))) {
          return (
            <blockquote key={`quote-${blockIndex}`} className="rounded-lg border border-warn-100 bg-warn-50/60 px-3 py-2 text-[11.5px] leading-relaxed text-ink/80">
              {lines.map((line, lineIndex) => (
                <React.Fragment key={`ql-${blockIndex}-${lineIndex}`}>
                  {lineIndex > 0 ? <br /> : null}
                  {renderInline(line.replace(/^\s*>\s?/, ""), `${blockIndex}-${lineIndex}`)}
                </React.Fragment>
              ))}
            </blockquote>
          );
        }
        if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
          return (
            <ul key={`ul-${blockIndex}`} className="ml-4 list-disc space-y-1">
              {lines.map((line, lineIndex) => (
                <li key={`li-${blockIndex}-${lineIndex}`}>{renderInline(line.replace(/^\s*[-*]\s+/, ""), `${blockIndex}-${lineIndex}`)}</li>
              ))}
            </ul>
          );
        }
        if (lines.every((line) => /^\s*\d+\.\s+/.test(line))) {
          return (
            <ol key={`ol-${blockIndex}`} className="ml-4 list-decimal space-y-1">
              {lines.map((line, lineIndex) => (
                <li key={`oi-${blockIndex}-${lineIndex}`}>{renderInline(line.replace(/^\s*\d+\.\s+/, ""), `${blockIndex}-${lineIndex}`)}</li>
              ))}
            </ol>
          );
        }
        const heading = lines.length === 1 ? /^(#{1,3})\s+(.+)$/.exec(lines[0]) : null;
        if (heading) {
          const level = heading[1].length;
          const content = renderInline(heading[2], `h-${blockIndex}`);
          if (level === 1) return <h1 key={`h-${blockIndex}`} className="text-base font-semibold text-ink">{content}</h1>;
          if (level === 2) return <h2 key={`h-${blockIndex}`} className="mt-4 text-[14px] font-semibold text-ink">{content}</h2>;
          return <h3 key={`h-${blockIndex}`} className="mt-3 text-[13px] font-semibold text-ink">{content}</h3>;
        }
        return (
          <p key={`p-${blockIndex}`}>
            {lines.map((line, lineIndex) => (
              <React.Fragment key={`pl-${blockIndex}-${lineIndex}`}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line, `${blockIndex}-${lineIndex}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
