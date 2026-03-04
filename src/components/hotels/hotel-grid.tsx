import type { HotelConfig } from "@/domains/hotels/types";
import { HotelCard } from "./hotel-card";

const delayClasses = [
  "",
  "animate-delay-100",
  "animate-delay-200",
  "animate-delay-300",
  "animate-delay-400",
];

interface HotelGridProps {
  hotels: HotelConfig[];
}

export function HotelGrid({ hotels }: HotelGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {hotels.map((hotel, index) => (
        <div
          className={`animate-fade-in-up ${delayClasses[index % delayClasses.length]}`}
          key={hotel.id}
        >
          <HotelCard hotel={hotel} />
        </div>
      ))}
    </div>
  );
}
