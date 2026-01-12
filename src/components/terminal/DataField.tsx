import { cn } from "@/lib/utils";

/**
 * 데이터 필드 컴포넌트 -> Glass Data Field
 * 라벨-값 쌍을 표시
 */

export interface DataFieldProps {
  /** 필드 라벨 */
  label: string;
  /** 필드 값 */
  value: React.ReactNode;
  /** 값 뒤에 표시할 단위 */
  unit?: string;
  /** 값에 적용할 추가 CSS 클래스 (색상 등) */
  className?: string;
}

export function DataField({
  label,
  value,
  unit = "",
  className = "",
}: DataFieldProps) {
  return (
    <div className="flex flex-col">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1 opacity-70">
        {label}
      </div>
      <div
        className={cn(
          "text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-baseline",
          className
        )}
      >
        {value}
        {unit && (
          <span className="text-sm font-medium text-muted-foreground ml-1.5">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
