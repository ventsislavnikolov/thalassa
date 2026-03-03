import { MapPin, Search, Sun } from "lucide-react";
import Link from "next/link";
import { HotelGrid } from "@/components/hotels/hotel-grid";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllHotels } from "@/domains/hotels/registry";
import { getAllLocations } from "@/domains/locations/registry";

export default function HomePage() {
  const hotels = getAllHotels();
  const locations = getAllLocations();

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20">
        <PageContainer>
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-4 font-display text-4xl tracking-tight sm:text-5xl">
              Find the Best Hotel Deals Across the Mediterranean
            </h1>
            <p className="mb-8 text-lg text-muted-foreground">
              Compare prices across {hotels.length} premium hotels in Halkidiki
              & Thessaloniki, Greece. Weather analysis, price trends, and smart
              recommendations.
            </p>
            <Button asChild size="lg">
              <Link href="/search">
                <Search className="mr-2 h-4 w-4" />
                Start Searching
              </Link>
            </Button>
          </div>
        </PageContainer>
      </section>

      {/* Hotel Showcase */}
      <section className="py-16">
        <PageContainer>
          <h2 className="mb-8 font-display text-3xl">Featured Hotels</h2>
          <HotelGrid hotels={hotels} />
        </PageContainer>
      </section>

      {/* Location Highlights */}
      <section className="bg-muted/50 py-16">
        <PageContainer>
          <h2 className="mb-8 font-display text-3xl">Explore Our Locations</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {locations.map((location) => (
              <Card key={location.slug}>
                <div className="h-32 bg-gradient-to-br from-secondary/20 via-primary/10 to-accent" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display">
                    <MapPin className="h-5 w-5 text-primary" />
                    {location.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {location.region}, {location.country}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* Features */}
      <section className="py-16">
        <PageContainer>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-8 font-display text-3xl">
              Why Use Greece Holiday Advisor?
            </h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div>
                <Search className="mx-auto mb-3 h-8 w-8 text-primary" />
                <h3 className="mb-2 font-display text-lg">
                  Multi-Hotel Search
                </h3>
                <p className="text-muted-foreground text-sm">
                  Compare prices across all hotels in a single search
                </p>
              </div>
              <div>
                <Sun className="mx-auto mb-3 h-8 w-8 text-primary" />
                <h3 className="mb-2 font-display text-lg">Weather Analysis</h3>
                <p className="text-muted-foreground text-sm">
                  Beach suitability scoring with temperature and wind analysis
                </p>
              </div>
              <div>
                <MapPin className="mx-auto mb-3 h-8 w-8 text-primary" />
                <h3 className="mb-2 font-display text-lg">
                  Smart Recommendations
                </h3>
                <p className="text-muted-foreground text-sm">
                  Combined price and weather scoring for the best travel dates
                </p>
              </div>
            </div>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
