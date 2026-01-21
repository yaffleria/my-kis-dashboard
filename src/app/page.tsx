import { getBalanceAction } from "@/app/actions/balance";
import { HomePageClient } from "@/components/dashboard/HomePageClient";

export default async function HomePage() {
  // 1. 서버 사이드에서 초기 데이터 조회 (네트워크 탭 노출 최소화)
  const result = await getBalanceAction();
  const initialData = result.success ? result.data : undefined;

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="px-6 py-5 border-b border-border shrink-0 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tight">Portfolio</h1>
      </header>

      {/* Table Container */}
      <main className="flex-1 overflow-hidden">
        <HomePageClient initialData={initialData} />
      </main>
    </div>
  );
}
