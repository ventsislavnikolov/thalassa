import type { ReactNode } from "react";
import { StandardLayout } from "@/components/layout/standard-layout";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <StandardLayout>{children}</StandardLayout>;
}
