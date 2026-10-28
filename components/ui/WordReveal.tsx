import { cn } from "@/lib/cn";

/*
 * A line that appears one word at a time, for Ano's speech (pattern studied
 * on Aceternity's text generate effect, rebuilt without its blur or fade:
 * each word rises out of its own mask, 40 ms after the one before, so a line
 * reads like it's being said). No opacity change, so the text keeps full
 * contrast on every frame. Re-key it to play again. The words stay real
 * text, so screen readers and the caption get the whole line at once;
 * reduced motion shows it still.
 */

export function WordReveal({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
      {words.map((w, i) => (
        <span key={i}>
          <span className="-mb-[0.15em] inline-block overflow-hidden pb-[0.15em] align-bottom">
            <span className={cn("inline-block animate-word-in motion-reduce:animate-none")} style={{ animationDelay: `${i * 40}ms` }}>
              {w}
            </span>
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
      </span>
    </span>
  );
}
