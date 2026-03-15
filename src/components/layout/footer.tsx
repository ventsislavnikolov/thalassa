export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-card py-8">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-muted-foreground text-sm">
          Finding the best vacation deals across the Mediterranean
        </p>
        <p className="mt-2 text-muted-foreground text-xs">
          {year} Greece Holiday Advisor. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
