"use client";

import { useBalanceQuery } from "@/hooks/useBalance";
import { HoldingsTable } from "@/components/dashboard/HoldingsTable";
import type { SafeBalanceResponse } from "@/types";

interface HomePageClientProps {
  initialData?: SafeBalanceResponse;
}

export function HomePageClient({ initialData }: HomePageClientProps) {
  const { data: safeBalance, isLoading } = useBalanceQuery({ initialData });

  return (
    <HoldingsTable
      holdings={safeBalance?.holdings || []}
      isLoading={isLoading && !initialData}
    />
  );
}
