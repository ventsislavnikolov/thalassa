import type { ReactNode } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

interface StandardLayoutProps {
  children: ReactNode;
}

export function StandardLayout({ children }: StandardLayoutProps) {
  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
