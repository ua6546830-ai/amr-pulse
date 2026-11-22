import * as React from "react";
import { cn } from "@/lib/utils";

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={`${keyPrefix}-b-${index}`} className="font-semibold text-ink">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <React.Fragment key={`${keyPrefix}-t-${index}`}>{part}</React.Fragment>;
    });
}

export function MarkdownLite({ text, className }: { text: string; className?: string }) {
  const blocks = text.split(/\n{2,}/).filter((block) => block.trim() !== "");
  return (
    <div className={cn("space-y-2.5 text-[13px] leading-relaxed text-ink/90", className)}>
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n");
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
