"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import type { PublicCategory } from "@/lib/public-categories";
import Footer from "@/components/Footer";

export default function SiteChrome({ children, categories = [] }: { children: React.ReactNode; categories?: PublicCategory[] }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") || pathname?.startsWith("/pilotage");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Header categories={categories} />
      {children}
      <Footer />
    </>
  );
}
