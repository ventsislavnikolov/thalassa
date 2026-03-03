import { MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllHotels, getHotel } from "@/domains/hotels/registry";
import type { HotelConfig } from "@/domains/hotels/types";

interface HotelDetailPageProps {
  params: Promise<{ slug: string }>;
}

function findHotel(slug: string): HotelConfig {
  try {
    return getHotel(slug);
  } catch {
    notFound();
  }
}

export function generateStaticParams() {
  const hotels = getAllHotels();
  return hotels.map((hotel) => ({ slug: hotel.slug }));
}

export default async function HotelDetailPage({
  params,
}: HotelDetailPageProps) {
  const { slug } = await params;
  const hotel = findHotel(slug);

  return (
    <div>
      {/* Hotel Hero */}
      <section className="bg-gradient-to-br from-primary/20 via-secondary/10 to-accent py-20">
        <PageContainer>
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-4 font-display text-4xl tracking-tight sm:text-5xl">
              {hotel.displayName}
            </h1>
            <div className="mb-6 flex items-center justify-center gap-3">
              <Badge variant="outline">
                <MapPin className="mr-1 h-3 w-3" />
                {hotel.locationSlug}
              </Badge>
              <Badge variant="secondary">{hotel.strategyType}</Badge>
            </div>
            {hotel.description && (
              <p className="mb-8 text-lg text-muted-foreground">
                {hotel.description}
              </p>
            )}
            <Button asChild size="lg">
              <Link href={`/search?hotel=${hotel.slug}`}>Check Prices</Link>
            </Button>
          </div>
        </PageContainer>
      </section>

      {/* Hotel Details */}
      <section className="py-16">
        <PageContainer>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Location</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Located in{" "}
                  <span className="font-medium text-foreground">
                    {hotel.locationSlug}
                  </span>
                  , Greece. One of the most sought-after destinations in the
                  Mediterranean.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display">Booking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">
                  We compare prices directly from the hotel's reservation system
                  to find you the best deals.
                </p>
                <Button asChild variant="outline">
                  <Link href={`/search?hotel=${hotel.slug}`}>
                    Search Available Dates
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
