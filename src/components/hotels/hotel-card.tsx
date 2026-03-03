import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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
    <Card className="overflow-hidden">
      <div className="h-40 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent" />
      <CardHeader>
        <CardTitle className="font-display">{hotel.displayName}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Badge variant="outline">{hotel.locationSlug}</Badge>
        <Badge variant="secondary">{hotel.strategyType}</Badge>
      </CardContent>
      <CardFooter>
        <Link
          className="text-primary text-sm underline-offset-4 hover:underline"
          href={`/hotels/${hotel.slug}`}
        >
          View Details
        </Link>
      </CardFooter>
    </Card>
  );
}
