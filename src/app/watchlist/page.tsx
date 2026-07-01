import { PageContainer } from "@/components/layout/page-container";
import { WatchlistManager } from "@/components/watchlist/watchlist-manager";

export const metadata = {
  title: "Watchlist · Thalassa",
  description: "Track hotel stays and monitor their prices over time.",
};

export default function WatchlistPage() {
  return (
    <section className="py-16">
      <PageContainer>
        <h1 className="mb-2 font-display text-4xl tracking-tight">Watchlist</h1>
        <p className="mb-8 text-lg text-muted-foreground">
          Track specific hotel stays. A scheduled scraper records their price
          every 2 hours, storing a new point only when the price changes.
        </p>
        <WatchlistManager />
      </PageContainer>
    </section>
  );
}
