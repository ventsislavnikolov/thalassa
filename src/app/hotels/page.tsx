import { HotelGrid } from "@/components/hotels/hotel-grid";
import { PageContainer } from "@/components/layout/page-container";
import { getAllHotels } from "@/domains/hotels/registry";

export default function HotelsPage() {
  const hotels = getAllHotels();

  return (
    <section className="py-16">
      <PageContainer>
        <h1 className="mb-2 font-display text-4xl tracking-tight">
          Our Hotels
        </h1>
        <p className="mb-8 text-lg text-muted-foreground">
          Browse {hotels.length} premium hotels across Halkidiki & Thessaloniki,
          Greece
        </p>
        <HotelGrid hotels={hotels} />
      </PageContainer>
    </section>
  );
}
