export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#1e2a36] bg-[#070a0d] py-8">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-sm text-[#536365]">
          Finding the best hotel deals across the Mediterranean
        </p>
        <p className="mt-2 text-xs text-[#293044]">
          {year} Thalassa. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
