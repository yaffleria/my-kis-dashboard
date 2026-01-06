'use client'

interface StatCardProps {
  title: string
  value: string
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon?: React.ReactNode
  subtitle?: string
  loading?: boolean
}

/**
 * 통계 카드 컴포넌트
 * 총 자산, 수익률 등 주요 지표 표시용
 */
export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  subtitle,
  loading = false,
}: StatCardProps) {
  const changeColorClass = {
    positive: 'text-success',
    negative: 'text-error',
    neutral: 'text-foreground-secondary',
  }[changeType]

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-4 flex-1">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-8 w-40" />
            <div className="skeleton h-4 w-20" />
          </div>
          {icon && <div className="skeleton h-12 w-12 rounded-xl" />}
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card glass-card-hover p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-foreground-secondary font-medium">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-foreground glow-text">{value}</p>
          {(change || subtitle) && (
            <div className="flex items-center gap-2">
              {change && <span className={`text-sm font-semibold ${changeColorClass}`}>{change}</span>}
              {subtitle && <span className="text-xs text-foreground-secondary">{subtitle}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className="p-3 rounded-xl bg-linear-to-br from-accent-primary/20 to-accent-secondary/20">
            <div className="text-accent-primary">{icon}</div>
          </div>
        )}
      </div>
    </div>
  )
}

interface AccountCardProps {
  accountName: string
  accountNo: string
  totalAsset: string
  profitLoss: string
  profitLossRate: string
  isPension?: boolean
  changeType: 'positive' | 'negative' | 'neutral'
  onClick?: () => void
}

/**
 * 계좌 카드 컴포넌트
 * 개별 계좌의 요약 정보 표시
 */
export function AccountCard({
  accountName,
  accountNo,
  totalAsset,
  profitLoss,
  profitLossRate,
  isPension = false,
  changeType,
  onClick,
}: AccountCardProps) {
  const changeColorClass = {
    positive: 'text-success',
    negative: 'text-error',
    neutral: 'text-foreground-secondary',
  }[changeType]

  return (
    <div
      className="glass-card glass-card-hover p-5 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`
            w-10 h-10 rounded-lg flex items-center justify-center
            ${
              isPension
                ? 'bg-linear-to-br from-purple-500/20 to-pink-500/20'
                : 'bg-linear-to-br from-accent-primary/20 to-accent-secondary/20'
            }
          `}
          >
            <span className={isPension ? 'text-purple-400' : 'text-accent-primary'}>{isPension ? '💰' : '📈'}</span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{accountName}</h3>
            <p className="text-xs text-foreground-secondary">{accountNo}</p>
          </div>
        </div>
        {isPension && <span className="badge badge-info text-xs">연금</span>}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-foreground-secondary">평가자산</span>
          <span className="text-lg font-bold text-foreground">{totalAsset}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-foreground-secondary">평가손익</span>
          <div className="text-right">
            <span className={`font-semibold ${changeColorClass}`}>{profitLoss}</span>
            <span className={`text-sm ml-2 ${changeColorClass}`}>({profitLossRate})</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1 rounded-full bg-background-tertiary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            changeType === 'positive'
              ? 'bg-linear-to-r from-accent-primary to-success'
              : changeType === 'negative'
                ? 'bg-linear-to-r from-warning to-error'
                : 'bg-foreground-secondary'
          }`}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  )
}

interface HoldingRowProps {
  stockName: string
  stockCode: string
  quantity: number
  currentPrice: string
  evaluationAmount: string
  profitLoss: string
  profitLossRate: string
  changeType: 'positive' | 'negative' | 'neutral'
  weight: number
}

/**
 * 보유 종목 행 컴포넌트
 */
export function HoldingRow({
  stockName,
  stockCode,
  quantity,
  currentPrice,
  evaluationAmount,
  profitLoss,
  profitLossRate,
  changeType,
  weight,
}: HoldingRowProps) {
  const changeColorClass = {
    positive: 'text-success',
    negative: 'text-error',
    neutral: 'text-foreground-secondary',
  }[changeType]

  return (
    <tr className="border-b border-card-border hover:bg-sidebar-hover transition-colors">
      <td className="py-4 px-4">
        <div>
          <p className="font-semibold text-foreground">{stockName}</p>
          <p className="text-xs text-foreground-secondary">{stockCode}</p>
        </div>
      </td>
      <td className="py-4 px-4 text-right text-foreground">{quantity.toLocaleString()}</td>
      <td className="py-4 px-4 text-right text-foreground">{currentPrice}</td>
      <td className="py-4 px-4 text-right font-semibold text-foreground">{evaluationAmount}</td>
      <td className="py-4 px-4 text-right">
        <span className={`font-semibold ${changeColorClass}`}>{profitLoss}</span>
      </td>
      <td className="py-4 px-4 text-right">
        <span className={`font-semibold ${changeColorClass}`}>{profitLossRate}</span>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-background-tertiary overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-accent-primary to-accent-secondary rounded-full"
              style={{ width: `${Math.min(weight, 100)}%` }}
            />
          </div>
          <span className="text-sm text-foreground-secondary w-12 text-right">{weight.toFixed(1)}%</span>
        </div>
      </td>
    </tr>
  )
}

interface EmptyStateProps {
  title: string
  description: string
  action?: React.ReactNode
}

/**
 * 빈 상태 컴포넌트
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="glass-card p-12 text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-linear-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center">
        <span className="text-3xl">📊</span>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-foreground-secondary mb-6 max-w-md mx-auto">{description}</p>
      {action}
    </div>
  )
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
}

/**
 * 로딩 스피너 컴포넌트
 */
export function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }

  return (
    <div
      className={`
        ${sizeClasses[size]} 
        rounded-full border-accent-primary border-t-transparent 
        animate-spin
      `}
    />
  )
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

/**
 * 버튼 컴포넌트
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'

  const variantClasses = {
    primary:
      'bg-linear-to-r from-accent-primary to-accent-secondary text-white hover:shadow-lg hover:shadow-accent-primary/25',
    secondary: 'bg-background-secondary border border-card-border text-foreground hover:bg-background-tertiary',
    ghost: 'text-foreground-secondary hover:text-foreground hover:bg-sidebar-hover',
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner size="sm" />}
      {!loading && children}
    </button>
  )
}
