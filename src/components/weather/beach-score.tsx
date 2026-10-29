import { cn } from "@/lib/utils";

interface BeachScoreProps {
  score: number;
}

function scoreColorClass(score: number): string {
  if (score > 70) {
    return "bg-secondary text-secondary-foreground";
  }
  if (score >= 50) {
    return "bg-amber-500 text-white";
  }
  return "bg-destructive text-white";
}

export function BeachScore({ score }: BeachScoreProps) {
  const colorClass = scoreColorClass(score);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-sm font-bold",
        colorClass
      )}
    >
      {score}/100
    </span>
  );
}
