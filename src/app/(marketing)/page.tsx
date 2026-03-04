import { Hotel, MapPin, Search, Sun } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { HotelGrid } from "@/components/hotels/hotel-grid";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAllHotels } from "@/domains/hotels/registry";
import { getAllLocations } from "@/domains/locations/registry";

export default function HomePage() {
  const hotels = getAllHotels();
  const locations = getAllLocations();

  return (
    <div>
      {/* Hero Section */}
      <section className="relative flex min-h-[70vh] items-center justify-center">
        <Image
          alt="Pefkochori beach"
          className="object-cover"
          fill
          priority
          sizes="100vw"
          src="/images/locations/pefkochori.jpg"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        <PageContainer className="relative z-10">
          <div className="mx-auto max-w-3xl text-center text-white">
            <h1 className="mb-4 animate-fade-in-up font-display text-4xl tracking-tight sm:text-5xl lg:text-6xl">
              Find the Best Hotel Deals Across the Mediterranean
            </h1>
            <p className="mb-8 animate-delay-100 animate-fade-in-up text-lg text-white/80">
              Compare prices across {hotels.length} premium hotels in Halkidiki
              & Thessaloniki, Greece. Weather analysis, price trends, and smart
              recommendations.
            </p>
            <div className="flex animate-delay-200 animate-fade-in-up flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/search">
                  <Search className="mr-2 h-4 w-4" />
                  Start Searching
                </Link>
              </Button>
              <Button
                asChild
                className="border-white/30 text-white hover:bg-white/10"
                size="lg"
                variant="outline"
              >
                <Link href="/hotels">
                  <Hotel className="mr-2 h-4 w-4" />
                  Browse Hotels
                </Link>
              </Button>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* Hotel Showcase */}
      <section className="py-16">
        <PageContainer>
          <p className="mb-2 font-semibold text-primary text-sm uppercase tracking-widest">
            Our Collection
          </p>
          <h2 className="mb-8 font-display text-3xl">Featured Hotels</h2>
          <HotelGrid hotels={hotels} />
        </PageContainer>
      </section>

      {/* Location Highlights */}
      <section className="bg-muted/50 py-16">
        <PageContainer>
          <p className="mb-2 font-semibold text-primary text-sm uppercase tracking-widest">
            Destinations
          </p>
          <h2 className="mb-8 font-display text-3xl">Explore Our Locations</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2">
            {locations.map((location, index) => (
              <div
                className={`group relative animate-fade-in-up overflow-hidden rounded-xl ${
                  index === 0 ? "md:col-span-2 md:row-span-2" : "aspect-[4/3]"
                }`}
                key={location.slug}
              >
                <div className="relative h-full min-h-[200px] w-full">
                  <Image
                    alt={location.name}
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    fill
                    sizes={
                      index === 0
                        ? "(max-width: 768px) 100vw, 66vw"
                        : "(max-width: 768px) 100vw, 33vw"
                    }
                    src={location.image}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-5">
                    <h3 className="flex items-center gap-2 font-display text-white text-xl">
                      <MapPin className="h-5 w-5" />
                      {location.name}
                    </h3>
                    <p className="text-sm text-white/70">
                      {location.region}, {location.country}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* Features */}
      <section className="py-16">
        <PageContainer>
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-2 font-semibold text-primary text-sm uppercase tracking-widest">
              Platform
            </p>
            <h2 className="mb-10 font-display text-3xl">
              Why Use Greece Holiday Advisor?
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                {
                  icon: Search,
                  title: "Multi-Hotel Search",
                  description:
                    "Compare prices across all hotels in a single search",
                },
                {
                  icon: Sun,
                  title: "Weather Analysis",
                  description:
                    "Beach suitability scoring with temperature and wind analysis",
                },
                {
                  icon: MapPin,
                  title: "Smart Recommendations",
                  description:
                    "Combined price and weather scoring for the best travel dates",
                },
              ].map((feature, index) => (
                <Card
                  className={`animate-fade-in-up text-center ${
                    index === 1
                      ? "animate-delay-100"
                      : index === 2
                        ? "animate-delay-200"
                        : ""
                  }`}
                  key={feature.title}
                >
                  <CardContent className="pt-6">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-2 font-display text-lg">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
