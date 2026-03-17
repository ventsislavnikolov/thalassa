import Link from "next/link";

export function Header() {
  return (
    <header className="border-[#1e2a36] border-b bg-[#070a0d]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          className="font-bold font-display text-[#F5F7F8] text-xl"
          href="/"
        >
          Thalassa
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            className="text-[#536365] text-sm transition-colors hover:text-[#A3B2B5]"
            href="/"
          >
            Home
          </Link>
          <Link
            className="text-[#536365] text-sm transition-colors hover:text-[#A3B2B5]"
            href="/hotels"
          >
            Hotels
          </Link>
          <Link
            className="text-[#536365] text-sm transition-colors hover:text-[#A3B2B5]"
            href="/search"
          >
            Search
          </Link>
        </nav>
      </div>
    </header>
  );
}
