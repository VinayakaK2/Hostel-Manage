import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import type { ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import { WardenClientError } from "@/lib/api/wardenClient";
import {
  fetchWardenBlueprintFloor,
  fetchWardenBlueprintOverview,
  fetchWardenRoomBlueprintDetail,
} from "@/modules/warden/api/wardenApi";
import { BlueprintRoomCard } from "@/modules/warden/blueprint/BlueprintRoomCard";
import {
  buildingOutlineRect,
  computeBlueprintCanvasSize,
  corridorCellRect,
  listCorridorCells,
} from "@/modules/warden/blueprint/blueprintGeometry";
import { RoomDetailDrawer } from "@/modules/warden/blueprint/RoomDetailDrawer";
import { useWardenBlueprintStore } from "@/stores/wardenBlueprintStore";

const MIN_SCALE = 0.18;
const MAX_SCALE = 2.75;
const MAP_MARGIN = 52;

function applyFitTransform(
  ref: ReactZoomPanPinchContentRef | null,
  viewport: { w: number; h: number },
  canvas: { width: number; height: number },
  opts?: { animated?: boolean },
) {
  if (!ref || viewport.w < 80 || viewport.h < 80) return;
  const innerW = Math.max(320, canvas.width);
  const innerH = Math.max(320, canvas.height);
  const sx = (viewport.w - MAP_MARGIN * 2) / innerW;
  const sy = (viewport.h - MAP_MARGIN * 2) / innerH;
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(sx, sy)));
  const animated = opts?.animated ?? false;
  ref.setTransform(MAP_MARGIN, MAP_MARGIN, scale, animated ? 420 : 0, animated ? "easeOutCubic" : "linear");
}

export function WardenBlueprintPage() {
  const transformRef = useRef<ReactZoomPanPinchContentRef | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const floorAbortRef = useRef<AbortController | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);

  const [viewport, setViewport] = useState({ w: 1200, h: 800 });

  const overview = useWardenBlueprintStore((s) => s.overview);
  const overviewState = useWardenBlueprintStore((s) => s.overviewState);
  const floorPayload = useWardenBlueprintStore((s) => s.floorPayload);
  const floorState = useWardenBlueprintStore((s) => s.floorState);
  const selectedFloor = useWardenBlueprintStore((s) => s.selectedFloor);
  const error = useWardenBlueprintStore((s) => s.error);
  const detailOpen = useWardenBlueprintStore((s) => s.detailOpen);
  const detailLoading = useWardenBlueprintStore((s) => s.detailLoading);
  const roomDetail = useWardenBlueprintStore((s) => s.roomDetail);
  const blueprintRevision = useWardenBlueprintStore((s) => s.blueprintRevision);

  const setOverview = useWardenBlueprintStore((s) => s.setOverview);
  const setOverviewState = useWardenBlueprintStore((s) => s.setOverviewState);
  const setFloorPayload = useWardenBlueprintStore((s) => s.setFloorPayload);
  const setFloorState = useWardenBlueprintStore((s) => s.setFloorState);
  const setSelectedFloor = useWardenBlueprintStore((s) => s.setSelectedFloor);
  const setError = useWardenBlueprintStore((s) => s.setError);
  const openDetail = useWardenBlueprintStore((s) => s.openDetail);
  const closeDetail = useWardenBlueprintStore((s) => s.closeDetail);
  const setRoomDetail = useWardenBlueprintStore((s) => s.setRoomDetail);
  const setDetailLoading = useWardenBlueprintStore((s) => s.setDetailLoading);

  const loadOverview = useCallback(async () => {
    setOverviewState("loading");
    setError(null);
    const ac = new AbortController();
    try {
      const data = await fetchWardenBlueprintOverview(ac.signal);
      setOverview(data);
      setSelectedFloor(data.default_floor);
      setOverviewState("loaded");
    } catch (e) {
      if (e instanceof WardenClientError && e.failure === "ABORTED") return;
      setError(e instanceof WardenClientError ? e.message : "Unable to load blueprint.");
      setOverviewState("error");
    }
  }, [setOverview, setOverviewState, setSelectedFloor, setError]);

  const loadFloor = useCallback(
    async (floor: number) => {
      floorAbortRef.current?.abort();
      const ac = new AbortController();
      floorAbortRef.current = ac;
      setFloorState("loading");
      setError(null);
      try {
        const data = await fetchWardenBlueprintFloor(floor, ac.signal);
        setFloorPayload(data);
        setFloorState("loaded");
      } catch (e) {
        if (e instanceof WardenClientError && e.failure === "ABORTED") return;
        setError(e instanceof WardenClientError ? e.message : "Unable to load floor layout.");
        setFloorState("error");
      }
    },
    [setFloorPayload, setFloorState, setError],
  );

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (overviewState !== "loaded") return;
    void loadFloor(selectedFloor);
  }, [overviewState, selectedFloor, loadFloor, blueprintRevision]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setViewport({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setViewport({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const canvasSize = useMemo(() => {
    if (!floorPayload?.rooms.length) return { width: 720, height: 560 };
    return computeBlueprintCanvasSize(floorPayload.rooms, floorPayload.grid);
  }, [floorPayload?.grid?.columns, floorPayload?.grid?.rows, floorPayload?.rooms]);

  const buildingOutline = useMemo(() => {
    if (!floorPayload?.rooms.length) return null;
    return buildingOutlineRect(floorPayload.rooms, floorPayload.grid);
  }, [floorPayload?.grid?.columns, floorPayload?.grid?.rows, floorPayload?.rooms]);

  const corridorCells = useMemo(() => {
    if (!floorPayload?.rooms.length) return [];
    return listCorridorCells(floorPayload.rooms, floorPayload.grid);
  }, [floorPayload?.grid?.columns, floorPayload?.grid?.rows, floorPayload?.rooms]);

  /** Tight slab around the floor plate so the map is not a small island inside a viewport-sized void. */
  const slabSize = useMemo(
    () => ({
      width: canvasSize.width + MAP_MARGIN * 2,
      height: canvasSize.height + MAP_MARGIN * 2,
    }),
    [canvasSize.height, canvasSize.width],
  );

  useEffect(() => {
    if (floorState !== "loaded" || !floorPayload) return;
    const t = window.setTimeout(() => {
      applyFitTransform(transformRef.current, viewport, canvasSize, { animated: false });
    }, 48);
    return () => window.clearTimeout(t);
  }, [
    floorState,
    floorPayload,
    viewport.w,
    viewport.h,
    canvasSize.width,
    canvasSize.height,
    blueprintRevision,
  ]);

  const openRoom = useCallback(
    async (roomId: string) => {
      detailAbortRef.current?.abort();
      const ac = new AbortController();
      detailAbortRef.current = ac;
      openDetail();
      setDetailLoading(true);
      setRoomDetail(null);
      try {
        const data = await fetchWardenRoomBlueprintDetail(roomId, ac.signal);
        setRoomDetail(data);
      } catch (e) {
        if (e instanceof WardenClientError && e.failure === "ABORTED") return;
        setRoomDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [openDetail, setDetailLoading, setRoomDetail],
  );

  const loading = overviewState === "loading" || (overviewState === "loaded" && floorState === "loading");
  const rooms = floorPayload?.rooms ?? [];
  const hasRooms = rooms.length > 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-slate-950">
      <div
        ref={viewportRef}
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{
          backgroundColor: "#020617",
          backgroundImage: `
            linear-gradient(rgba(51, 65, 85, 0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(51, 65, 85, 0.35) 1px, transparent 1px),
            radial-gradient(ellipse 80% 55% at 50% -10%, rgba(37, 99, 235, 0.18), transparent 55%)
          `,
          backgroundSize: "32px 32px, 32px 32px, 100% 100%",
        }}
      >
        {loading ? (
          <div
            className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-0.5 animate-pulse bg-brand-500/90 shadow-[0_0_12px_rgba(59,130,246,0.8)]"
            aria-hidden
          />
        ) : null}

        <div className="pointer-events-none absolute bottom-6 right-5 z-30 flex flex-col items-stretch gap-2">
          <div className="pointer-events-auto flex flex-col gap-2 rounded-2xl border border-slate-600/50 bg-slate-950/90 p-2 shadow-2xl backdrop-blur-md">
            <label className="sr-only" htmlFor="warden-blueprint-floor">
              Floor
            </label>
            <select
              id="warden-blueprint-floor"
              className="cursor-pointer rounded-lg border border-slate-600/80 bg-slate-900/90 px-2.5 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              value={overview ? selectedFloor : 1}
              disabled={!overview}
              onChange={(e) => setSelectedFloor(Number(e.target.value))}
            >
              {!overview ? (
                <option value={1}>…</option>
              ) : (
                overview.floors.map((f) => (
                  <option key={f.floor} value={f.floor}>
                    F{f.floor}
                  </option>
                ))
              )}
            </select>
            <div className="mx-1 h-px bg-slate-700/80" />
            <button
              type="button"
              title="Zoom in"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/90 text-lg font-bold text-white shadow-sm ring-1 ring-slate-600/60 transition hover:bg-slate-700 hover:ring-brand-500/50"
              onClick={() => transformRef.current?.zoomIn(0.11, 320, "easeOutCubic")}
            >
              +
            </button>
            <button
              type="button"
              title="Zoom out"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/90 text-lg font-bold text-white shadow-sm ring-1 ring-slate-600/60 transition hover:bg-slate-700 hover:ring-brand-500/50"
              onClick={() => transformRef.current?.zoomOut(0.11, 320, "easeOutCubic")}
            >
              −
            </button>
            <button
              type="button"
              title="Reset view"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/90 text-sm font-bold text-white shadow-sm ring-1 ring-slate-600/60 transition hover:bg-slate-700 hover:ring-brand-500/50"
              onClick={() => {
                applyFitTransform(transformRef.current, viewport, canvasSize, { animated: true });
              }}
            >
              ⟲
            </button>
            {error ? (
              <>
                <div className="mx-1 h-px bg-slate-700/80" />
                <button
                  type="button"
                  title={error}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-950/90 text-amber-200 shadow-sm ring-1 ring-amber-700/50 transition hover:bg-amber-900"
                  onClick={() => void loadOverview()}
                >
                  ↻
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="h-full w-full min-h-[320px]">
          <TransformWrapper
            ref={transformRef}
            initialScale={1}
            minScale={MIN_SCALE}
            maxScale={MAX_SCALE}
            centerOnInit={false}
            limitToBounds={false}
            smooth
            doubleClick={{ disabled: true }}
            wheel={{ step: 0.02, touchPadDisabled: false }}
            panning={{ velocityDisabled: false, excluded: ["room-card"] }}
            pinch={{ step: 2.2, disabled: false, allowPanning: true, excluded: ["room-card"] }}
            zoomAnimation={{
              disabled: false,
              size: 0.32,
              animationTime: 260,
              animationType: "easeOutCubic",
            }}
          >
            <TransformComponent
              wrapperClass="!h-full !w-full"
              contentClass="!flex !h-full !w-full !items-start !justify-start"
            >
              <motion.div
                key={`${floorPayload?.floor ?? 0}-${floorPayload?.grid?.layout_source ?? "x"}-${blueprintRevision}`}
                className="relative shrink-0 shadow-[0_0_0_1px_rgba(148,163,184,0.12)]"
                style={{ width: slabSize.width, height: slabSize.height }}
                initial={{ opacity: 0.88 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.22 }}
              >
                <div
                  className="absolute rounded-md border border-slate-600/50 bg-slate-900/50 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.85)] ring-1 ring-slate-500/15"
                  style={{
                    left: MAP_MARGIN,
                    top: MAP_MARGIN,
                    width: canvasSize.width,
                    height: canvasSize.height,
                  }}
                >
                  {!loading && floorState === "loaded" && !hasRooms ? (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-slate-500">
                      No rooms on this floor.
                    </div>
                  ) : !loading && hasRooms ? (
                    <>
                      {corridorCells.map(({ gx, gy }) => {
                        const c = corridorCellRect(gx, gy);
                        return (
                          <div
                            key={`corridor-${gx}-${gy}`}
                            className="pointer-events-none absolute rounded-[2px] border border-sky-500/[0.07] bg-[length:10px_10px] opacity-[0.92]"
                            style={{
                              left: c.left,
                              top: c.top,
                              width: c.width,
                              height: c.height,
                              backgroundColor: "rgba(15, 23, 42, 0.42)",
                              backgroundImage: `
                                linear-gradient(90deg, rgba(56, 189, 248, 0.06) 1px, transparent 1px),
                                linear-gradient(rgba(56, 189, 248, 0.05) 1px, transparent 1px),
                                repeating-linear-gradient(
                                  -18deg,
                                  transparent,
                                  transparent 5px,
                                  rgba(100, 116, 139, 0.07) 5px,
                                  rgba(100, 116, 139, 0.07) 6px
                                )
                              `,
                            }}
                            aria-hidden
                          />
                        );
                      })}
                      {buildingOutline ? (
                        <div
                          className="pointer-events-none absolute rounded-[3px] border-2 border-slate-400/35 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.5)]"
                          style={{
                            left: buildingOutline.left,
                            top: buildingOutline.top,
                            width: buildingOutline.width,
                            height: buildingOutline.height,
                          }}
                          aria-hidden
                        />
                      ) : null}
                      {rooms.map((r) => (
                        <BlueprintRoomCard key={r.id} room={r} dimmed={false} onSelect={(id) => void openRoom(id)} />
                      ))}
                    </>
                  ) : null}
                </div>
              </motion.div>
            </TransformComponent>
          </TransformWrapper>
        </div>
      </div>

      <RoomDetailDrawer
        open={detailOpen}
        loading={detailLoading}
        detail={roomDetail}
        onClose={() => {
          detailAbortRef.current?.abort();
          closeDetail();
        }}
      />
    </div>
  );
}
