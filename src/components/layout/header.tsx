import Link from "next/link";

export function Header() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link className="font-bold font-display text-primary text-xl" href="/">
          Thalassa
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            className="text-muted-foreground text-sm transition-colors hover:text-foreground"
            href="/"
          >
            Home
          </Link>
          <Link
            className="text-muted-foreground text-sm transition-colors hover:text-foreground"
            href="/hotels"
          >
            Hotels
          </Link>
          <Link
            className="text-muted-foreground text-sm transition-colors hover:text-foreground"
            href="/search"
          >
            Search
          </Link>
        </nav>
      </div>
    </header>
  );
}
