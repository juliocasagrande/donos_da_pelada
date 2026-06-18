import { cn } from "@/lib/utils";

export function DeveloperCredit({ className }: { className?: string }) {
  return (
    <p className={cn("text-center text-xs text-musgo/70", className)}>
      Desenvolvido por{" "}
      <a
        href="https://www.linkedin.com/in/j%C3%BAlio-casagrande/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-musgo"
      >
        Julio Casagrande
      </a>
    </p>
  );
}
