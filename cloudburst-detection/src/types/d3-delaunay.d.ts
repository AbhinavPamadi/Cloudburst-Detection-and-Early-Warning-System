declare module 'd3-delaunay' {
  export class Delaunay<P = [number, number]> {
    static from(
      points: ArrayLike<[number, number]> | Iterable<[number, number]>
    ): Delaunay<[number, number]>;

    static from<P>(
      points: ArrayLike<P> | Iterable<P>,
      getX?: (p: P) => number,
      getY?: (p: P) => number
    ): Delaunay<P>;

    points: Float64Array;
    halfedges: Int32Array;
    hull: Uint32Array;
    triangles: Uint32Array;

    find(x: number, y: number, i?: number): number;
    neighbors(i: number): IterableIterator<number>;
    render(context?: CanvasRenderingContext2D): string | void;
    renderHull(context?: CanvasRenderingContext2D): string | void;
    renderTriangle(i: number, context?: CanvasRenderingContext2D): string | void;
    renderPoints(
      context?: CanvasRenderingContext2D,
      radius?: number
    ): string | void;
    hullPolygon(): [number, number][];
    trianglePolygon(i: number): [number, number][];
    update(): Delaunay<P>;

    voronoi(
      bounds?: [number, number, number, number]
    ): Voronoi<P>;
  }

  export class Voronoi<P = [number, number]> {
    delaunay: Delaunay<P>;
    circumcenters: Float64Array;
    vectors: Float64Array;
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;

    contains(i: number, x: number, y: number): boolean;
    neighbors(i: number): IterableIterator<number>;
    render(context?: CanvasRenderingContext2D): string | void;
    renderBounds(context?: CanvasRenderingContext2D): string | void;
    renderCell(i: number, context?: CanvasRenderingContext2D): string | void;
    cellPolygon(i: number): [number, number][] | null;
    update(): Voronoi<P>;
  }
}
