"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableRow, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
  subtitle?: string;
  loading?: boolean;
}

/**
 * 통계 카드 컴포넌트
 * 총 자산, 수익률 등 주요 지표 표시용
 */
export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  subtitle,
  loading = false,
}: StatCardProps) {
  const changeColorClass = {
    positive: "text-success",
    negative: "text-error",
    neutral: "text-foreground-secondary",
  }[changeType];

  if (loading) {
    return (
      <Card className="glass-card p-6 border-none shadow-none">
        <div className="flex items-start justify-between space-y-0">
          <div className="space-y-4 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-20" />
          </div>
          {icon && <Skeleton className="h-12 w-12 rounded-xl" />}
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-card glass-card-hover border-none shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-foreground-secondary">
          {title}
        </CardTitle>
        {icon && (
          <div className="p-3 rounded-xl bg-accent-primary/20 text-accent-primary">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl md:text-3xl font-bold text-foreground glow-text">
          {value}
        </div>
        {(change || subtitle) && (
          <div className="flex items-center gap-2 mt-1">
            {change && (
              <p className={cn("text-sm font-semibold", changeColorClass)}>
                {change}
              </p>
            )}
            {subtitle && (
              <p className="text-xs text-foreground-secondary">{subtitle}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AccountCardProps {
  accountName: string;
  accountNo: string;
  totalAsset: string;
  profitLoss: string;
  profitLossRate: string;
  isPension?: boolean;
  changeType: "positive" | "negative" | "neutral";
  onClick?: () => void;
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
    positive: "text-success",
    negative: "text-error",
    neutral: "text-foreground-secondary",
  }[changeType];

  return (
    <Card
      className="glass-card glass-card-hover cursor-pointer border-none shadow-none transition-all hover:bg-muted/50"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              isPension
                ? "bg-purple-500/20 text-purple-400"
                : "bg-accent-primary/20 text-accent-primary"
            )}
          >
            {isPension ? "💰" : "📈"}
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              {accountName}
            </CardTitle>
            <p className="text-xs text-foreground-secondary">{accountNo}</p>
          </div>
        </div>
        {isPension && <span className="badge badge-info text-xs">연금</span>}
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-foreground-secondary">평가자산</span>
            <span className="text-lg font-bold text-foreground">
              {totalAsset}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-foreground-secondary">평가손익</span>
            <div className="text-right">
              <span className={cn("font-semibold", changeColorClass)}>
                {profitLoss}
              </span>
              <span className={cn("text-sm ml-2", changeColorClass)}>
                ({profitLossRate})
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-background-tertiary overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              changeType === "positive"
                ? "bg-success"
                : changeType === "negative"
                ? "bg-error"
                : "bg-foreground-secondary"
            )}
            style={{ width: "100%" }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface HoldingRowProps {
  stockName: string;
  stockCode: string;
  quantity: number;
  currentPrice: string;
  evaluationAmount: string;
  profitLoss: string;
  profitLossRate: string;
  changeType: "positive" | "negative" | "neutral";
  weight: number;
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
    positive: "text-success",
    negative: "text-error",
    neutral: "text-foreground-secondary",
  }[changeType];

  return (
    <TableRow className="hover:bg-sidebar-hover border-card-border">
      <TableCell className="py-4">
        <div>
          <p className="font-semibold text-foreground">{stockName}</p>
          <p className="text-xs text-foreground-secondary">{stockCode}</p>
        </div>
      </TableCell>
      <TableCell className="text-right text-foreground">
        {quantity.toLocaleString()}
      </TableCell>
      <TableCell className="text-right text-foreground">
        {currentPrice}
      </TableCell>
      <TableCell className="text-right font-semibold text-foreground">
        {evaluationAmount}
      </TableCell>
      <TableCell className="text-right">
        <span className={cn("font-semibold", changeColorClass)}>
          {profitLoss}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <span className={cn("font-semibold", changeColorClass)}>
          {profitLossRate}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-background-tertiary overflow-hidden">
            <div
              className="h-full bg-accent-primary rounded-full"
              style={{ width: `${Math.min(weight, 100)}%` }}
            />
          </div>
          <span className="text-sm text-foreground-secondary w-12 text-right">
            {weight.toFixed(1)}%
          </span>
        </div>
      </TableCell>
    </TableRow>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

/**
 * 빈 상태 컴포넌트
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="glass-card p-12 text-center border-none shadow-none">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent-primary/20 flex items-center justify-center">
        <span className="text-3xl">📊</span>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-foreground-secondary mb-6 max-w-md mx-auto">
        {description}
      </p>
      {action}
    </Card>
  );
}

import { Loader2 } from "lucide-react";

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string; // Allow passing external classes
}

/**
 * 로딩 스피너 컴포넌트
 */
export function LoadingSpinner({
  size = "md",
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <Loader2
      className={cn(
        "animate-spin text-accent-primary",
        sizeClasses[size],
        className
      )}
    />
  );
}
