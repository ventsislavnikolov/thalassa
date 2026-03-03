import { cn } from "@/lib/utils";

interface BeachScoreProps {
  score: number;
}

export function BeachScore({ score }: BeachScoreProps) {
  const colorClass =
    score > 70
      ? "bg-secondary text-secondary-foreground"
      : score >= 50
        ? "bg-amber-500 text-white"
        : "bg-destructive text-white";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-bold text-sm",
        colorClass
      )}
    >
      {score}/100
    </span>
  );
}
