import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { HotelConfig } from "@/domains/hotels/types";

interface HotelCardProps {
  hotel: HotelConfig;
}

export function HotelCard({ hotel }: HotelCardProps) {
  return (
    <Card className="group overflow-hidden pt-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-warm">
      <div className="relative h-48 overflow-hidden">
        <Image
          alt={hotel.displayName}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          src={hotel.image}
        />
      </div>
      <CardHeader>
        <CardTitle className="font-display">{hotel.displayName}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Badge variant="outline">{hotel.locationSlug}</Badge>
        <Badge variant="secondary">{hotel.strategyType}</Badge>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full" variant="outline">
          <Link href={`/hotels/${hotel.slug}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
