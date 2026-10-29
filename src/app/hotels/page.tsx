import { HotelGrid } from "@/components/hotels/hotel-grid";
import { PageContainer } from "@/components/layout/page-container";
import { getAllHotels } from "@/domains/hotels/registry";

export default function HotelsPage() {
  const hotels = getAllHotels();

  return (
    <section className="py-16">
      <PageContainer>
        <h1 className="font-display mb-2 text-4xl tracking-tight">
          Our Hotels
        </h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Browse {hotels.length} premium hotels across Greece and Bulgaria
        </p>
        <HotelGrid hotels={hotels} />
      </PageContainer>
    </section>
  );
}
