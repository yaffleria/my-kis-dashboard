declare module "d3-voronoi-treemap" {
  export interface VoronoiTreemapConfigurator {
    prng(prng: () => number): VoronoiTreemapConfigurator;
    clip(clip: [number, number][]): VoronoiTreemapConfigurator;
    convergenceThreshold(threshold: number): VoronoiTreemapConfigurator;
    maxIterationCount(count: number): VoronoiTreemapConfigurator;
    minWeightRatio(ratio: number): VoronoiTreemapConfigurator;
    (root: import("d3").HierarchyNode<unknown>): void;
  }

  export function voronoiTreemap(): VoronoiTreemapConfigurator;
}
