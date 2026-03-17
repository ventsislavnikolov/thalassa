import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  ChevronRight,
  CloudSun,
  Hotel,
  Mail,
  MapPin,
  Phone,
  Search,
  Shield,
  Sparkles,
  Sun,
  TrendingDown,
  Users,
  Waves,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { getAllHotels } from "@/domains/hotels/registry";
import { getAllLocations } from "@/domains/locations/registry";

function getPropertyType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("villa")) return "Villa";
  if (n.includes("suite")) return "Suites";
  if (n.includes("palace")) return "Palace";
  if (n.includes("maison")) return "Boutique";
  if (n.includes("resort")) return "Resort";
  return "Hotel";
}

function getPropertyTypeColor(type: string): string {
  switch (type) {
    case "Villa":
      return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    case "Palace":
      return "bg-violet-500/20 text-violet-300 border-violet-500/30";
    case "Boutique":
      return "bg-rose-500/20 text-rose-300 border-rose-500/30";
    case "Resort":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    case "Suites":
      return "bg-sky-500/20 text-sky-300 border-sky-500/30";
    default:
      return "bg-slate-500/20 text-slate-300 border-slate-500/30";
  }
}

const delayClasses = [
  "",
  "animate-delay-100",
  "animate-delay-200",
  "animate-delay-300",
  "animate-delay-400",
  "animate-delay-500",
  "animate-delay-600",
  "animate-delay-700",
  "animate-delay-800",
];

export default function HomePage() {
  const allHotels = getAllHotels();
  const locations = getAllLocations();
  const locationNames = Object.fromEntries(
    locations.map((l) => [l.slug, l.name])
  );

  const destinationShowcase = [
    {
      name: "Halkidiki",
      description: "Crystal-clear waters across three peninsulas",
      image: "/images/locations/vourvourou.jpg",
      hotelCount: allHotels.filter((h) =>
        [
          "pefkochori",
          "hanioti",
          "nea-moudania",
          "ouranoupolis",
          "vourvourou",
          "fourka",
          "nea-roda",
          "neos-marmaras",
        ].includes(h.locationSlug)
      ).length,
    },
    {
      name: "Kavala",
      description: "Historic port city meets coastal charm",
      image: "/images/locations/kavala.jpg",
      hotelCount: allHotels.filter((h) => h.locationSlug === "kavala").length,
    },
    {
      name: "Greek Islands",
      description: "Santorini, Milos, Paxos & beyond",
      image: "/images/locations/santorini.webp",
      hotelCount: allHotels.filter((h) =>
        ["santorini", "milos", "paxos"].includes(h.locationSlug)
      ).length,
    },
  ];

  return (
    <div className="noir-bg">
      {/* ─── Hero ─── */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden">
        <Image
          alt="Aerial view of Halkidiki coastline"
          className="object-cover"
          fill
          priority
          sizes="100vw"
          src="/images/locations/ouranoupolis.jpg"
        />
        {/* Multi-layer dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#070a0d]/70 via-[#070a0d]/50 to-[#070a0d]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070a0d]/60 via-transparent to-[#070a0d]/40" />

        {/* Subtle grid texture */}
        <div className="noir-grid pointer-events-none absolute inset-0 opacity-40" />

        <PageContainer className="relative z-10 pt-20 pb-32">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex animate-fade-in-up items-center gap-2 rounded-full border border-[#2A4F58]/40 bg-[#2A4F58]/15 px-4 py-1.5">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-emerald-400" />
              <span className="text-[#A3B2B5] text-xs tracking-wide">
                Live prices from {allHotels.length} hotels
              </span>
            </div>

            <h1 className="mb-6 animate-delay-100 animate-fade-in-up font-display text-5xl text-[#F5F7F8] leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Find the best
              <br />
              hotel prices in
              <br />
              <span className="text-[#A3B2B5]">Greece</span>
            </h1>

            <p className="mb-10 max-w-xl animate-delay-200 animate-fade-in-up text-[#536365] text-lg leading-relaxed">
              Compare real-time rates across {allHotels.length} handpicked
              hotels in Halkidiki, Kavala & the Greek Islands. Weather-smart
              recommendations included.
            </p>

            {/* Search widget — glassmorphism */}
            <div className="animate-delay-300 animate-fade-in-up">
              <div className="glass-noir inline-flex flex-wrap items-center gap-3 rounded-2xl p-2 sm:flex-nowrap">
                <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
                  <MapPin className="h-4 w-4 shrink-0 text-[#738C8A]" />
                  <span className="truncate text-[#A3B2B5] text-sm">
                    Halkidiki, Kavala, Islands
                  </span>
                </div>
                <div className="hidden items-center gap-3 rounded-xl bg-white/5 px-4 py-3 sm:flex">
                  <Sun className="h-4 w-4 shrink-0 text-[#738C8A]" />
                  <span className="text-[#A3B2B5] text-sm">Any dates</span>
                </div>
                <div className="hidden items-center gap-3 rounded-xl bg-white/5 px-4 py-3 sm:flex">
                  <Users className="h-4 w-4 shrink-0 text-[#738C8A]" />
                  <span className="text-[#A3B2B5] text-sm">2 guests</span>
                </div>
                <Button
                  asChild
                  className="shrink-0 bg-[#2E5BB1] px-6 text-white hover:bg-[#2E5BB1]/90"
                  size="lg"
                >
                  <Link href="/search">
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </PageContainer>

        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
          <ChevronDown className="h-5 w-5 animate-scroll-hint text-[#536365]" />
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <div className="relative z-20 -mt-16">
        <PageContainer>
          <div className="glass-noir glow-teal mx-auto max-w-5xl rounded-2xl px-8 py-6">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-0">
              {[
                {
                  value: `${allHotels.length}`,
                  label: "Hotels tracked",
                  icon: Hotel,
                },
                {
                  value: `${locations.length}`,
                  label: "Destinations",
                  icon: MapPin,
                },
                { value: "Live", label: "Price tracking", icon: BarChart3 },
                {
                  value: "Smart",
                  label: "Weather analysis",
                  icon: CloudSun,
                },
              ].map((stat, i) => (
                <div
                  className={`flex items-center gap-3 ${i > 0 ? "sm:border-[#1e2a36] sm:border-l sm:pl-6" : ""}`}
                  key={stat.label}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2A4F58]/20">
                    <stat.icon className="h-4.5 w-4.5 text-[#738C8A]" />
                  </div>
                  <div>
                    <p className="animate-count-up font-display text-[#F5F7F8] text-xl leading-none">
                      {stat.value}
                    </p>
                    <p className="mt-0.5 text-[#536365] text-xs">
                      {stat.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </div>

      {/* ─── All Hotels Grid ─── */}
      <section className="py-24">
        <PageContainer>
          <div className="mb-14 flex items-end justify-between">
            <div>
              <p className="mb-2 font-semibold text-[#2A4F58] text-xs uppercase tracking-[0.3em]">
                All Properties
              </p>
              <h2 className="font-display text-3xl text-[#F5F7F8] sm:text-4xl">
                Compare {allHotels.length} Hotels
              </h2>
              <p className="mt-3 max-w-lg text-[#536365] text-sm leading-relaxed">
                Every hotel tracked in real-time. Click any card to see detailed
                pricing, room types, and weather forecasts.
              </p>
            </div>
            <Button
              asChild
              className="hidden border-[#1e2a36] bg-transparent text-[#A3B2B5] hover:bg-[#111820] hover:text-[#F5F7F8] sm:flex"
              variant="outline"
            >
              <Link href="/search">
                Compare Prices
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allHotels.map((hotel, index) => {
              const propertyType = getPropertyType(hotel.displayName);
              const typeColor = getPropertyTypeColor(propertyType);

              return (
                <Link
                  className={`group noir-card hover:glow-teal animate-fade-in-up overflow-hidden rounded-xl transition-all duration-300 hover:border-[#2A4F58]/50 ${delayClasses[index % 9]}`}
                  href={`/hotels/${hotel.slug}`}
                  key={hotel.id}
                >
                  {/* Image */}
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      alt={hotel.displayName}
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      src={hotel.image}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111820] via-transparent to-transparent" />

                    {/* Property type badge */}
                    <div className="absolute top-3 left-3">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-[10px] uppercase tracking-wider ${typeColor}`}
                      >
                        {propertyType}
                      </span>
                    </div>

                    {/* Price badge placeholder */}
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#070a0d]/70 px-2 py-1 text-[#738C8A] text-[10px] backdrop-blur-sm">
                        <TrendingDown className="h-3 w-3" />
                        Check price
                      </span>
                    </div>

                    {/* Weather indicator */}
                    <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-md bg-[#070a0d]/60 px-2 py-1 backdrop-blur-sm">
                      <CloudSun className="h-3 w-3 text-amber-400" />
                      <span className="text-[#A3B2B5] text-[10px]">
                        Weather
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-4">
                    <h3 className="font-display text-[#F5F7F8] text-lg transition-colors group-hover:text-white">
                      {hotel.displayName}
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 text-[#536365] text-xs">
                      <MapPin className="h-3 w-3" />
                      {locationNames[hotel.locationSlug] || hotel.locationSlug}
                    </p>

                    {/* Action row */}
                    <div className="mt-4 flex items-center justify-between border-[#1e2a36] border-t pt-3">
                      <span className="animate-shimmer rounded bg-clip-text px-1 text-[#2A4F58] text-xs">
                        Search for best rates
                      </span>
                      <ChevronRight className="h-4 w-4 text-[#293044] transition-all group-hover:translate-x-0.5 group-hover:text-[#2E5BB1]" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Button
              asChild
              className="border-[#1e2a36] bg-transparent text-[#A3B2B5] hover:bg-[#111820] hover:text-[#F5F7F8]"
              variant="outline"
            >
              <Link href="/search">
                Compare All Prices
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </PageContainer>
      </section>

      {/* ─── Destinations ─── */}
      <section className="relative py-24">
        <div className="noir-surface absolute inset-0" />
        <div className="noir-grid pointer-events-none absolute inset-0 opacity-30" />

        <PageContainer className="relative">
          <div className="mb-14 text-center">
            <p className="mb-2 font-semibold text-[#2A4F58] text-xs uppercase tracking-[0.3em]">
              Destinations
            </p>
            <h2 className="font-display text-3xl text-[#F5F7F8] sm:text-4xl">
              Explore by Region
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[#536365] text-sm">
              From the three peninsulas of Halkidiki to the historic harbor of
              Kavala and the iconic Greek Islands.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {destinationShowcase.map((dest, index) => (
              <div
                className={`group relative animate-fade-in-up overflow-hidden rounded-2xl ${index === 0 ? "md:row-span-2" : ""} ${delayClasses[index]}`}
                key={dest.name}
              >
                <div
                  className={`relative w-full ${index === 0 ? "h-full min-h-[400px]" : "aspect-[4/3]"}`}
                >
                  <Image
                    alt={dest.name}
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    fill
                    sizes={
                      index === 0
                        ? "(max-width: 768px) 100vw, 33vw"
                        : "(max-width: 768px) 100vw, 33vw"
                    }
                    src={dest.image}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070a0d] via-[#070a0d]/30 to-transparent" />

                  {/* Content overlay */}
                  <div className="absolute right-0 bottom-0 left-0 p-6">
                    <div className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-[#2A4F58]/30 px-2.5 py-1 backdrop-blur-sm">
                      <Hotel className="h-3 w-3 text-[#738C8A]" />
                      <span className="text-[#A3B2B5] text-xs">
                        {dest.hotelCount}{" "}
                        {dest.hotelCount === 1 ? "hotel" : "hotels"}
                      </span>
                    </div>
                    <h3 className="font-display text-2xl text-[#F5F7F8]">
                      {dest.name}
                    </h3>
                    <p className="mt-1 text-[#536365] text-sm">
                      {dest.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* ─── How It Works ─── */}
      <section className="py-24">
        <PageContainer>
          <div className="mb-16 text-center">
            <p className="mb-2 font-semibold text-[#2A4F58] text-xs uppercase tracking-[0.3em]">
              Simple process
            </p>
            <h2 className="font-display text-3xl text-[#F5F7F8] sm:text-4xl">
              How Thalassa Works
            </h2>
          </div>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: Search,
                title: "Search",
                description:
                  "Pick your dates, guests, and preferred locations. We search all hotels simultaneously.",
              },
              {
                step: "02",
                icon: BarChart3,
                title: "Compare",
                description:
                  "See real-time prices side by side with weather scores and availability for every hotel.",
              },
              {
                step: "03",
                icon: Sparkles,
                title: "Book Smart",
                description:
                  "Our analysis combines price trends and weather data to highlight the best value deals.",
              },
            ].map((item, index) => (
              <div
                className={`group relative animate-fade-in-up text-center ${delayClasses[index]}`}
                key={item.step}
              >
                {/* Step number */}
                <div className="relative mx-auto mb-6">
                  <div className="noir-card group-hover:glow-teal mx-auto flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-300 group-hover:border-[#2A4F58]/50">
                    <item.icon className="h-8 w-8 text-[#2A4F58] transition-colors group-hover:text-[#738C8A]" />
                  </div>
                  <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#2E5BB1] font-mono text-white text-xs">
                    {item.step}
                  </span>
                </div>

                {/* Connector line (between steps) */}
                {index < 2 && (
                  <div className="absolute top-10 left-[calc(50%+48px)] hidden h-px w-[calc(100%-96px)] bg-gradient-to-r from-[#1e2a36] to-[#1e2a36]/0 md:block" />
                )}

                <h3 className="mb-2 font-display text-[#F5F7F8] text-xl">
                  {item.title}
                </h3>
                <p className="text-[#536365] text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* ─── Trust & Features ─── */}
      <section className="relative py-24">
        <div className="noir-surface absolute inset-0" />
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, oklch(0.45 0.08 200 / 0.15), transparent 50%), radial-gradient(circle at 80% 50%, oklch(0.35 0.05 230 / 0.1), transparent 50%)",
          }}
        />

        <PageContainer className="relative">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-2 font-semibold text-[#2A4F58] text-xs uppercase tracking-[0.3em]">
              Why Thalassa
            </p>
            <h2 className="mb-4 font-display text-3xl text-[#F5F7F8] sm:text-4xl">
              Travel Intelligence, Perfected
            </h2>
            <p className="text-[#536365] text-sm leading-relaxed">
              We combine real-time market data with environmental analysis to
              find your ideal Mediterranean escape.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Search,
                title: "Multi-Property Search",
                description:
                  "Compare prices across all properties in a single, unified search",
                accent: "#2E5BB1",
              },
              {
                icon: Sun,
                title: "Weather Intelligence",
                description:
                  "Beach suitability scoring with temperature, wind, UV & sea analysis",
                accent: "#738C8A",
              },
              {
                icon: TrendingDown,
                title: "Price Tracking",
                description:
                  "Real-time rate monitoring with historical trend analysis",
                accent: "#2A4F58",
              },
              {
                icon: Shield,
                title: "Trusted Sources",
                description:
                  "Direct hotel pricing with no hidden fees or third-party markups",
                accent: "#536365",
              },
            ].map((feature, index) => (
              <div
                className={`group noir-card hover:glow-teal animate-fade-in-up rounded-xl p-6 transition-all duration-300 hover:border-[#2A4F58]/50 ${delayClasses[index]}`}
                key={feature.title}
              >
                <div
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-colors"
                  style={{ backgroundColor: `${feature.accent}20` }}
                >
                  <feature.icon
                    className="h-5 w-5"
                    style={{ color: feature.accent }}
                  />
                </div>
                <h3 className="mb-2 font-display text-[#F5F7F8] text-lg">
                  {feature.title}
                </h3>
                <p className="text-[#536365] text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* ─── Contact ─── */}
      <section className="relative overflow-hidden py-24">
        <Image
          alt="Mediterranean coastline at dusk"
          className="object-cover"
          fill
          sizes="100vw"
          src="/images/locations/neos-marmaras.jpg"
        />
        <div className="absolute inset-0 bg-[#070a0d]/80" />
        <div className="noir-grid pointer-events-none absolute inset-0 opacity-20" />

        <PageContainer className="relative z-10">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="mb-3 font-semibold text-[#2A4F58] text-xs uppercase tracking-[0.3em]">
                Get in Touch
              </p>
              <h2 className="mb-6 font-display text-3xl text-[#F5F7F8] leading-tight sm:text-4xl">
                Plan Your
                <br />
                Greek Getaway
              </h2>
              <p className="mb-10 max-w-md text-[#536365] leading-relaxed">
                Whether you need help choosing the perfect property or want a
                custom price comparison, we are here to help.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Mail, text: "hello@thalassa.com" },
                  { icon: Phone, text: "+30 2310 123 456" },
                  { icon: MapPin, text: "Thessaloniki, Greece" },
                ].map((item) => (
                  <div className="flex items-center gap-3.5" key={item.text}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2A4F58]/15">
                      <item.icon className="h-4 w-4 text-[#738C8A]" />
                    </div>
                    <span className="text-[#A3B2B5] text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Glass form */}
            <div className="glass-noir rounded-2xl p-8 sm:p-10">
              <form className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      className="mb-2 block font-medium text-[#A3B2B5] text-sm"
                      htmlFor="contact-first-name"
                    >
                      First Name
                    </label>
                    <input
                      className="w-full rounded-lg border border-[#1e2a36] bg-[#0d1117] px-4 py-3 text-[#F5F7F8] text-sm transition-colors placeholder:text-[#293044] focus:border-[#2A4F58] focus:outline-none focus:ring-1 focus:ring-[#2A4F58]/40"
                      id="contact-first-name"
                      placeholder="Elena"
                      type="text"
                    />
                  </div>
                  <div>
                    <label
                      className="mb-2 block font-medium text-[#A3B2B5] text-sm"
                      htmlFor="contact-last-name"
                    >
                      Last Name
                    </label>
                    <input
                      className="w-full rounded-lg border border-[#1e2a36] bg-[#0d1117] px-4 py-3 text-[#F5F7F8] text-sm transition-colors placeholder:text-[#293044] focus:border-[#2A4F58] focus:outline-none focus:ring-1 focus:ring-[#2A4F58]/40"
                      id="contact-last-name"
                      placeholder="Papadimitriou"
                      type="text"
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="mb-2 block font-medium text-[#A3B2B5] text-sm"
                    htmlFor="contact-email"
                  >
                    Email
                  </label>
                  <input
                    className="w-full rounded-lg border border-[#1e2a36] bg-[#0d1117] px-4 py-3 text-[#F5F7F8] text-sm transition-colors placeholder:text-[#293044] focus:border-[#2A4F58] focus:outline-none focus:ring-1 focus:ring-[#2A4F58]/40"
                    id="contact-email"
                    placeholder="elena@example.com"
                    type="email"
                  />
                </div>
                <div>
                  <label
                    className="mb-2 block font-medium text-[#A3B2B5] text-sm"
                    htmlFor="contact-message"
                  >
                    Message
                  </label>
                  <textarea
                    className="w-full resize-none rounded-lg border border-[#1e2a36] bg-[#0d1117] px-4 py-3 text-[#F5F7F8] text-sm transition-colors placeholder:text-[#293044] focus:border-[#2A4F58] focus:outline-none focus:ring-1 focus:ring-[#2A4F58]/40"
                    id="contact-message"
                    placeholder="Tell us about your ideal Greek getaway..."
                    rows={4}
                  />
                </div>
                <Button
                  className="w-full bg-[#2E5BB1] text-white hover:bg-[#2E5BB1]/90"
                  size="lg"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Send Inquiry
                </Button>
              </form>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="relative py-24">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 50% 0%, oklch(0.45 0.08 200 / 0.08), transparent 60%)",
          }}
        />

        <PageContainer className="relative">
          <div className="mx-auto max-w-3xl text-center">
            <Waves className="mx-auto mb-6 h-8 w-8 animate-float text-[#2A4F58]" />
            <h2 className="mb-4 font-display text-3xl text-[#F5F7F8] sm:text-4xl">
              Ready to Find Your Perfect Stay?
            </h2>
            <p className="mb-10 text-[#536365]">
              Start comparing prices across {allHotels.length} premium
              properties with real-time weather analysis.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                asChild
                className="bg-[#2E5BB1] px-10 text-white hover:bg-[#2E5BB1]/90"
                size="lg"
              >
                <Link href="/search">
                  <Search className="mr-2 h-4 w-4" />
                  Start Searching
                </Link>
              </Button>
              <Button
                asChild
                className="border-[#1e2a36] bg-transparent text-[#A3B2B5] hover:bg-[#111820] hover:text-[#F5F7F8]"
                size="lg"
                variant="outline"
              >
                <Link href="/hotels">
                  Browse All Hotels
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
