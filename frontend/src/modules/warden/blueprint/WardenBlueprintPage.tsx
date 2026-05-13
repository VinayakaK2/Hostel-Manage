import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
  BLUEPRINT_GRID_CELL,
  BLUEPRINT_PAD,
  BLUEPRINT_STRUCT_WALL,
  blueprintInnerPlatePixels,
  buildingOutlineRect,
  computeBlueprintCanvasSize,
  listCorridorMergedRects,
} from "@/modules/warden/blueprint/blueprintGeometry";
import { RoomDetailDrawer } from "@/modules/warden/blueprint/RoomDetailDrawer";
import { IconBell, IconChevron, IconMenu } from "@/modules/admin/components/icons";
import { useAuth } from "@/hooks/useAuth";
import { useWardenLayoutStore } from "@/stores/wardenLayoutStore";
import { useWardenBlueprintStore } from "@/stores/wardenBlueprintStore";

const MIN_SCALE = 0.08;
const MAX_SCALE = 2.75;
const MAP_MARGIN = 36;
/** Extra zoom-out so the whole floor reads like an overview (not “max fill”). */
const DEFAULT_VIEW_SLACK = 1.1;
/** Reserve space for floating legend + floor controls so fit targets visible canvas. */
const FIT_RESERVE_TOP = 56;
const FIT_RESERVE_BOTTOM = 96;
const FIT_RESERVE_X = 16;
/** Y translate after scale: anchor map below top chrome (not vertically centred). */
const VIEW_TOP_ANCHOR = 56;

/**
 * Fit the transform **content** (slab) into the viewport: scale from slack, **horizontally centred**,
 * **top-aligned** with `VIEW_TOP_ANCHOR` (not `centerView`, which pins vertically to middle).
 */
function applyFitTransform(
  ref: ReactZoomPanPinchContentRef | null,
  viewport: { w: number; h: number },
  content: { width: number; height: number },
  opts?: { animated?: boolean },
) {
  if (!ref || viewport.w < 80 || viewport.h < 80) return;
  const cw = Math.max(1, content.width);
  const ch = Math.max(1, content.height);
  const availW = Math.max(120, viewport.w - FIT_RESERVE_X * 2);
  const availH = Math.max(120, viewport.h - FIT_RESERVE_TOP - FIT_RESERVE_BOTTOM);
  const fit = Math.min(availW / cw, availH / ch);
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, fit * DEFAULT_VIEW_SLACK));
  const scaledW = cw * scale;
  const posX = (viewport.w - scaledW) / 2;
  const posY = VIEW_TOP_ANCHOR;
  const animated = opts?.animated ?? false;
  ref.setTransform(posX, posY, scale, animated ? 420 : 0, animated ? "easeOutCubic" : "linear");
}

const blueprintBarBtn =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900/95 text-slate-100 shadow-sm transition hover:bg-slate-800";

export function WardenBlueprintPage() {
  const transformRef = useRef<ReactZoomPanPinchContentRef | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const floorAbortRef = useRef<AbortController | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const [viewport, setViewport] = useState({ w: 1200, h: 800 });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const toggleMobileNav = useWardenLayoutStore((s) => s.toggleMobileNav);
  const toggleSidebar = useWardenLayoutStore((s) => s.toggleSidebar);
  const collapsed = useWardenLayoutStore((s) => s.sidebarCollapsed);
  const setMobileNavOpen = useWardenLayoutStore((s) => s.setMobileNavOpen);

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

  const bumpBlueprintRevision = useWardenBlueprintStore((s) => s.bumpBlueprintRevision);

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

  useEffect(() => {
    if (!userMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [userMenuOpen]);

  const canvasSize = useMemo(() => {
    if (!floorPayload?.rooms.length) return { width: 720, height: 560 };
    return computeBlueprintCanvasSize(floorPayload.rooms, floorPayload.grid);
  }, [floorPayload?.grid?.columns, floorPayload?.grid?.rows, floorPayload?.rooms]);

  const buildingOutline = useMemo(() => {
    if (!floorPayload?.rooms.length) return null;
    return buildingOutlineRect(floorPayload.rooms, floorPayload.grid);
  }, [floorPayload?.grid?.columns, floorPayload?.grid?.rows, floorPayload?.rooms]);

  const corridorRects = useMemo(() => {
    if (!floorPayload?.rooms.length) return [];
    return listCorridorMergedRects(floorPayload.rooms, floorPayload.grid);
  }, [floorPayload?.grid?.columns, floorPayload?.grid?.rows, floorPayload?.rooms]);

  const plateInnerPx = useMemo(() => {
    if (!floorPayload?.grid) return null;
    return blueprintInnerPlatePixels(floorPayload.grid.columns, floorPayload.grid.rows);
  }, [floorPayload?.grid?.columns, floorPayload?.grid?.rows]);

  const gridStride = BLUEPRINT_GRID_CELL + BLUEPRINT_STRUCT_WALL;

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
      applyFitTransform(transformRef.current, viewport, slabSize, { animated: false });
    }, 96);
    return () => window.clearTimeout(t);
  }, [
    floorState,
    floorPayload,
    viewport.w,
    viewport.h,
    slabSize.width,
    slabSize.height,
    blueprintRevision,
  ]);

  const silentReloadRoomDetail = useCallback(
    async (roomId: string) => {
      detailAbortRef.current?.abort();
      const ac = new AbortController();
      detailAbortRef.current = ac;
      try {
        const data = await fetchWardenRoomBlueprintDetail(roomId, ac.signal);
        setRoomDetail(data);
      } catch (e) {
        if (e instanceof WardenClientError && e.failure === "ABORTED") return;
        setRoomDetail(null);
      }
    },
    [setRoomDetail],
  );

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
    <div className="relative flex h-full max-h-full min-h-0 flex-1 flex-col overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-2 px-3 pt-3 sm:px-4">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            className={`md:hidden ${blueprintBarBtn}`}
            onClick={toggleMobileNav}
            aria-label="Open navigation"
          >
            <IconMenu className="h-5 w-5" />
          </button>
          <button
            type="button"
            className={`hidden md:inline-flex ${blueprintBarBtn}`}
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <IconChevron className={`h-5 w-5 transition ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <Link
            to="/warden/notifications"
            className={blueprintBarBtn}
            aria-label="Notifications"
          >
            <IconBell className="h-5 w-5" />
          </Link>
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              className="inline-flex max-w-[200px] items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/95 px-2.5 py-2 text-left text-sm font-semibold text-slate-100 shadow-sm hover:bg-slate-800 sm:max-w-[220px]"
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              onClick={() => setUserMenuOpen((v) => !v)}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
                {(user?.name ?? "W").slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block truncate">{user?.name ?? "Warden"}</span>
                <span className="block truncate text-xs font-medium text-slate-400">{user?.email ?? ""}</span>
              </span>
            </button>
            {userMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl ring-1 ring-slate-600/40"
              >
                <button
                  role="menuitem"
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm font-semibold text-rose-300 hover:bg-slate-800"
                  onClick={() => {
                    setUserMenuOpen(false);
                    setMobileNavOpen(false);
                    logout();
                  }}
                >
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{
          backgroundColor: "#020617",
          backgroundImage: `
            linear-gradient(rgba(51, 65, 85, 0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(51, 65, 85, 0.35) 1px, transparent 1px),
            radial-gradient(ellipse 120% 80% at 50% 0%, rgba(37, 99, 235, 0.14), transparent 50%)
          `,
          backgroundSize: "32px 32px, 32px 32px, 100% 420px",
          backgroundRepeat: "repeat, repeat, no-repeat",
        }}
      >
        {loading ? (
          <div
            className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-0.5 animate-pulse bg-brand-500/90 shadow-[0_0_12px_rgba(59,130,246,0.8)]"
            aria-hidden
          />
        ) : null}

        {!loading && floorState === "loaded" && hasRooms ? (
          <div
            className="pointer-events-none absolute left-3 top-14 z-20 max-w-[min(100%,22rem)] rounded-xl border border-slate-700/70 bg-slate-950/85 px-2.5 py-2 font-mono text-[10px] font-medium leading-snug text-slate-300 shadow-lg backdrop-blur-sm sm:left-4 sm:max-w-[min(100%,28rem)] sm:px-3 sm:text-[11px]"
            role="region"
            aria-label="Room occupancy legend"
          >
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 sm:gap-x-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" />
                <span>
                  <span className="text-emerald-300/95">Green</span> — empty
                </span>
              </span>
              <span className="hidden h-3 w-px shrink-0 bg-slate-600 sm:inline" aria-hidden />
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                <span>
                  <span className="text-yellow-200/95">Yellow</span> — partial
                </span>
              </span>
              <span className="hidden h-3 w-px shrink-0 bg-slate-600 sm:inline" aria-hidden />
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 shadow-[0_0_10px_rgba(248,113,113,0.55)]" />
                <span>
                  <span className="text-red-300/95">Red</span> — full
                </span>
              </span>
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none absolute bottom-6 right-5 z-30 flex flex-col items-stretch gap-2">
          <div className="pointer-events-auto flex flex-col items-center gap-2 rounded-2xl border border-slate-600/50 bg-slate-950/90 p-2 shadow-2xl backdrop-blur-md">
            <label className="sr-only" htmlFor="warden-blueprint-floor">
              Floor
            </label>
            <select
              id="warden-blueprint-floor"
              title="Floor"
              className="h-10 w-10 shrink-0 cursor-pointer appearance-none rounded-xl border border-slate-600/80 text-center text-[10px] font-bold uppercase leading-none tracking-wide text-white shadow-sm ring-1 ring-slate-600/60 transition hover:bg-slate-700/90 hover:ring-brand-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-0 disabled:opacity-50 [&::-webkit-appearance]:appearance-none"
              style={{
                backgroundColor: "rgba(30, 41, 59, 0.9)",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M3 4.5L6 8l3-3.5H3z'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 3px center",
                backgroundSize: "9px 9px",
              }}
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
              onClick={() => transformRef.current?.zoomIn(0.05, 320, "easeOutCubic")}
            >
              +
            </button>
            <button
              type="button"
              title="Zoom out"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/90 text-lg font-bold text-white shadow-sm ring-1 ring-slate-600/60 transition hover:bg-slate-700 hover:ring-brand-500/50"
              onClick={() => transformRef.current?.zoomOut(0.05, 320, "easeOutCubic")}
            >
              −
            </button>
            <button
              type="button"
              title="Reset view"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/90 text-sm font-bold text-white shadow-sm ring-1 ring-slate-600/60 transition hover:bg-slate-700 hover:ring-brand-500/50"
              onClick={() => {
                applyFitTransform(transformRef.current, viewport, slabSize, { animated: true });
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

        <div className="h-full w-full min-h-0 overflow-hidden">
          <TransformWrapper
            ref={transformRef}
            initialScale={1}
            minScale={MIN_SCALE}
            maxScale={MAX_SCALE}
            centerOnInit={false}
            limitToBounds={false}
            smooth
            doubleClick={{ disabled: true }}
            wheel={{ step: 0.006, touchPadDisabled: false }}
            panning={{ velocityDisabled: false, excluded: ["room-card"] }}
            pinch={{ step: 0.55, disabled: false, allowPanning: true, excluded: ["room-card"] }}
            zoomAnimation={{
              disabled: false,
              size: 0.18,
              animationTime: 220,
              animationType: "easeOutCubic",
            }}
          >
            <TransformComponent
              wrapperClass="!h-full !w-full !max-h-full !max-w-full"
              wrapperStyle={{ width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%" }}
              contentClass="!flex !h-auto !w-fit !max-w-full !min-w-0 !items-start !justify-start"
              contentStyle={{ overflow: "hidden" }}
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
                      {plateInnerPx ? (
                        <div
                          className="pointer-events-none absolute z-[0]"
                          style={{
                            left: BLUEPRINT_PAD,
                            top: BLUEPRINT_PAD,
                            width: plateInnerPx.width,
                            height: plateInnerPx.height,
                            opacity: 0.42,
                            backgroundImage: `
                              linear-gradient(rgba(56, 189, 248, 0.09) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(56, 189, 248, 0.09) 1px, transparent 1px)
                            `,
                            backgroundSize: `${gridStride}px ${gridStride}px`,
                          }}
                          aria-hidden
                        />
                      ) : null}
                      {corridorRects.map((c, idx) => (
                        <div
                          key={`corridor-${idx}-${c.left}-${c.top}`}
                          className="pointer-events-none absolute z-[1] rounded-sm border border-sky-500/[0.08] bg-[length:12px_12px]"
                          style={{
                            left: c.left,
                            top: c.top,
                            width: c.width,
                            height: c.height,
                            backgroundColor: "rgba(12, 20, 35, 0.55)",
                            backgroundImage: `
                              linear-gradient(90deg, rgba(56, 189, 248, 0.05) 1px, transparent 1px),
                              linear-gradient(rgba(56, 189, 248, 0.045) 1px, transparent 1px),
                              repeating-linear-gradient(
                                -18deg,
                                transparent,
                                transparent 8px,
                                rgba(71, 85, 105, 0.09) 8px,
                                rgba(71, 85, 105, 0.09) 9px
                              )
                            `,
                          }}
                          aria-hidden
                        />
                      ))}
                      {buildingOutline ? (
                        <div
                          className="pointer-events-none absolute z-[2] rounded-[3px] border-2 border-slate-400/35 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.5)]"
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
        onStudentAssignedToRoom={(roomId) => {
          bumpBlueprintRevision();
          void silentReloadRoomDetail(roomId);
        }}
      />
    </div>
  );
}
