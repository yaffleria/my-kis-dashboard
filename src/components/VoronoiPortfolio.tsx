"use client";

import React, { useMemo, useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { voronoiTreemap } from "d3-voronoi-treemap";
import { useDashboardStore } from "@/store";
import { useBalanceQuery, calculatePortfolioSummary } from "@/hooks/useBalance";
import type { AccountBalance } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

interface VoronoiNode {
  id: string;
  name: string;
  value: number;
  weight: number;
  profitRate: number;
}

interface VoronoiCellProps {
  polygon: [number, number][];
  node: VoronoiNode;
  color: string;
  glowColor: string;
  index: number;
}

const VoronoiCell = ({
  polygon,
  node,
  color,
  glowColor,
  index,
}: VoronoiCellProps) => {
  const pathData = d3.line()(polygon) + "Z";

  // Calculate centroid for label
  const centroid = d3.polygonCentroid(polygon);
  const area = Math.abs(d3.polygonArea(polygon));
  const showLabel = area > 2000; // Only show label if area is large enough
  const showSubLabel = area > 4000;

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
      animate={{
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        transition: {
          opacity: { duration: 0.8, delay: index * 0.08, ease: "easeOut" },
          scale: {
            duration: 0.8,
            delay: index * 0.08,
            ease: [0.16, 1, 0.3, 1],
          },
          filter: { duration: 0.8, delay: index * 0.08, ease: "easeOut" },
        },
      }}
      exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
      whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
    >
      <path
        d={pathData}
        fill={color}
        fillOpacity={0.15}
        stroke={glowColor}
        strokeWidth={1.5}
        className="transition-all duration-300 hover:fill-opacity-30"
        style={{
          filter: `drop-shadow(0 0 8px ${glowColor}44)`,
        }}
      />
      {showLabel && (
        <text
          x={centroid[0]}
          y={centroid[1]}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#ffffff"
          fontSize={Math.min(12, Math.sqrt(area) / 10)}
          fontWeight="bold"
          className="pointer-events-none select-none"
        >
          {node.name}
        </text>
      )}
      {showSubLabel && (
        <text
          x={centroid[0]}
          y={centroid[1] + Math.min(12, Math.sqrt(area) / 10) + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={node.profitRate >= 0 ? "#4ade80" : "#ef4444"}
          fontSize={Math.min(10, Math.sqrt(area) / 12)}
          className="pointer-events-none select-none opacity-90 font-mono"
        >
          {node.profitRate >= 0 ? "+" : ""}
          {node.profitRate.toFixed(1)}%
        </text>
      )}
    </motion.g>
  );
};

export function VoronoiPortfolio({
  initialData,
}: {
  initialData?: AccountBalance[];
}) {
  useBalanceQuery({ initialData });
  const { setBalances, setPortfolioSummary, setLastUpdated } =
    useDashboardStore();
  const balances = useDashboardStore((state) => state.balances);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Sync initial data to store
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setBalances(initialData);
      setPortfolioSummary(calculatePortfolioSummary(initialData));
      setLastUpdated(new Date().toISOString());
    }
  }, [initialData, setBalances, setPortfolioSummary, setLastUpdated]);

  // Process data for Voronoi
  const voronoiData = useMemo(() => {
    if (!balances || balances.length === 0 || dimensions.width === 0)
      return null;

    const aggregated: Record<
      string,
      {
        stockCode: string;
        stockName: string;
        evaluationAmount: number;
        buyAmount: number;
        profitLossRate: number;
      }
    > = {};

    let totalValue = 0;

    balances.forEach((b) => {
      b.holdings.forEach((h) => {
        if (!h.stockCode) return;
        if (!aggregated[h.stockCode]) {
          aggregated[h.stockCode] = {
            stockCode: h.stockCode,
            stockName: h.stockName,
            evaluationAmount: 0,
            buyAmount: 0,
            profitLossRate: 0,
          };
        }
        aggregated[h.stockCode].evaluationAmount += h.evaluationAmount;
        aggregated[h.stockCode].buyAmount += h.buyAmount;
        aggregated[h.stockCode].profitLossRate = h.profitLossRate;
        totalValue += h.evaluationAmount;
      });
    });

    const nodes = Object.values(aggregated).map((h) => {
      // 미국 주식(티커) 판별 고도화:
      // 한국 상품 코드는 보통 6자리(예: 005930, 0019K0)이므로,
      // 6자리가 아니거나 숫자가 아예 없는 경우를 티커(미국 주식)로 간주합니다.
      const isUS = h.stockCode.length !== 6 || !/\d/.test(h.stockCode);

      const profitLoss = h.evaluationAmount - h.buyAmount;
      const profitRate =
        h.buyAmount > 0 ? (profitLoss / h.buyAmount) * 100 : h.profitLossRate;

      return {
        id: h.stockCode,
        name: isUS ? h.stockCode : h.stockName,
        fullName: h.stockName,
        value: Math.max(0.1, h.evaluationAmount),
        profitRate: profitRate,
        weight: totalValue > 0 ? (h.evaluationAmount / totalValue) * 100 : 0,
      };
    });

    // Create D3 Hierarchy
    const root = d3
      .hierarchy<{ children?: VoronoiNode[] } | VoronoiNode>({
        children: nodes,
      })
      .sum((d) => (d as VoronoiNode).value || 0);

    // Prepare Voronoi Treemap
    const width = dimensions.width;
    const height = dimensions.height;

    // Create a circular clipping mask or rectangular
    const prng = d3.randomLcg(0.5); // Deterministic randomness
    const vTreemap = voronoiTreemap()
      .prng(prng)
      .clip([
        [0, 0],
        [0, height],
        [width, height],
        [width, 0],
      ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vTreemap(root as any);

    return (
      root.leaves() as (d3.HierarchyNode<VoronoiNode> & {
        polygon: [number, number][];
      })[]
    )
      .map((leaf) => ({
        polygon: leaf.polygon,
        node: leaf.data as VoronoiNode,
        ...getProfitColors((leaf.data as VoronoiNode).profitRate),
      }))
      .sort((a, b) => b.node.value - a.node.value); // Sequential animation from largest to smallest
  }, [balances, dimensions]);

  return (
    <div
      ref={containerRef}
      className="h-screen w-full bg-black relative overflow-hidden flex items-center justify-center"
    >
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_70%)]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" />
      </div>

      {voronoiData && dimensions.width > 0 && (
        <>
          <svg
            width={dimensions.width}
            height={dimensions.height}
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            className="relative z-10"
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <AnimatePresence>
              {voronoiData.map((d, i) => (
                <VoronoiCell
                  key={d.node.id}
                  polygon={d.polygon}
                  node={d.node}
                  color={d.color}
                  glowColor={d.glowColor}
                  index={i}
                />
              ))}
            </AnimatePresence>
          </svg>
        </>
      )}
    </div>
  );
}

function getProfitColors(profitRate: number): {
  color: string;
  glowColor: string;
} {
  if (profitRate >= 10) return { color: "#4ade80", glowColor: "#4ade80" }; // Bright Green
  if (profitRate >= 0) return { color: "#22c55e", glowColor: "#22c55e" }; // Green
  if (profitRate >= -10) return { color: "#f87171", glowColor: "#f87171" }; // Light Red
  return { color: "#ef4444", glowColor: "#ef4444" }; // Red
}

export default VoronoiPortfolio;
