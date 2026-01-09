/**
 * 데이터 필드 컴포넌트
 * 라벨-값 쌍을 표시하는 터미널 스타일 데이터 디스플레이
 */

export interface DataFieldProps {
  /** 필드 라벨 */
  label: string;
  /** 필드 값 */
  value: React.ReactNode;
  /** 값 뒤에 표시할 단위 */
  unit?: string;
  /** 값에 적용할 추가 CSS 클래스 */
  className?: string;
}

export function DataField({
  label,
  value,
  unit = "",
  className = "",
}: DataFieldProps) {
  return (
    <div className="mb-0">
      <div className="text-brew-green/70 text-[10px] uppercase mb-0.5">
        {label}
      </div>
      <div
        className={`text-xl font-bold tracking-wider truncate ${
          className || "text-brew-neon-green"
        }`}
      >
        {value}{" "}
        <span className="text-xs font-normal text-brew-green">{unit}</span>
      </div>
    </div>
  );
}
