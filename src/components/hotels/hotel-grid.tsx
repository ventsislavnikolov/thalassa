import type { HotelConfig } from "@/domains/hotels/types";
import { HotelCard } from "./hotel-card";

interface HotelGridProps {
  hotels: HotelConfig[];
}

export function HotelGrid({ hotels }: HotelGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {hotels.map((hotel) => (
        <HotelCard hotel={hotel} key={hotel.id} />
      ))}
    </div>
  );
}
