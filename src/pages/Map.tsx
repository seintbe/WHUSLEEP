import { useEffect, useRef, useState } from 'react';
import { formatWeekdayLabel, getCurrentWeekday, selectReferenceCourses, type CourseScheduleItem } from '@/lib/courseSchedule';
import {
  CAMPUS_CENTER,
  CAMPUS_POIS,
  getAccentColor,
  getAllDiningPois,
  getDiningPoiById,
  normalizeDiningPoiId,
  resolveCoursePoi,
  type AccentTone,
  type CampusPoi,
  type LatLngTuple,
} from '@/lib/campusData';
import {
  fitAmapToPoints,
  formatAmapFailure,
  getAmapMapStyle,
  getAmapOrigin,
  isAmapConfigured,
  loadAmap,
  searchAmapRoute,
  toAmapPosition,
  type AMapRouteMode,
} from '@/lib/amap';
import { measureDistance } from '@/lib/amapWebService';
import { useAppStore } from '@/store';

type TransportMode = 'walking' | 'ebike' | 'bus';

interface DayStop {
  id: string;
  time: string;
  label: string;
  detail: string;
  kind: 'course' | 'meal' | 'rest';
  poi: CampusPoi;
}

interface RouteState {
  points: LatLngTuple[];
  distanceMeters: number;
  durationSeconds: number;
  source: 'amap' | 'direct';
}

export default function Map() {
  const { courseSchedule, diningPOI, customDiningPois, transportMode } = useAppStore();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const [route, setRoute] = useState<RouteState | null>(null);
  const [routeError, setRouteError] = useState('');
  const [mapError, setMapError] = useState('');
  const [amapReady, setAmapReady] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(true);

  const dayStops = buildDayStops(courseSchedule, diningPOI, customDiningPois);
  const activePlan = getActivePlan(dayStops);
  const currentStop = activePlan.currentStop;
  const nextStop = activePlan.nextStop ?? activePlan.currentStop;
  const focusStops = getFocusStops(dayStops, currentStop.id, nextStop.id);
  const currentTransportMode = normalizeTransportMode(transportMode);
  const routeMeta = describeTransportMode(currentTransportMode);
  const allDiningPois = getAllDiningPois(customDiningPois);
  const amapOrigin = getAmapOrigin();

  useEffect(() => {
    let cancelled = false;

    async function bootstrapMap() {
      if (!mapContainerRef.current) {
        return;
      }

      if (!isAmapConfigured()) {
        setMapError('当前还没有配置高德地图 key 和 securityJsCode。');
        return;
      }

      try {
        const AMap = await loadAmap();
        if (cancelled || !mapContainerRef.current) {
          return;
        }

        const map = new AMap.Map(mapContainerRef.current, {
          zoom: 15,
          center: toAmapPosition(CAMPUS_CENTER),
          mapStyle: getAmapMapStyle(),
          viewMode: '2D',
          resizeEnable: true,
          zooms: [3, 19],
        });

        map.addControl(new AMap.Scale());
        map.addControl(new AMap.ToolBar({ position: 'RT' }));

        mapRef.current = map;
        infoWindowRef.current = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -24) });
        setMapError('');
        setAmapReady(true);
      } catch (error) {
        if (!cancelled) {
          setMapError(formatAmapFailure(error));
        }
      }
    }

    bootstrapMap();

    return () => {
      cancelled = true;
      overlaysRef.current.forEach((overlay) => overlay?.setMap?.(null));
      overlaysRef.current = [];
      mapRef.current?.destroy?.();
      mapRef.current = null;
      infoWindowRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!amapReady || !mapRef.current) {
      return;
    }

    loadAmap().then((AMap) => {
      if (!mapRef.current) {
        return;
      }

      overlaysRef.current.forEach((overlay) => overlay?.setMap?.(null));
      overlaysRef.current = [];

      const markerOverlays = dedupeStopsByPoi(focusStops).map((stop) => {
        const marker = new AMap.Marker({
          position: toAmapPosition(stop.poi.position),
          anchor: 'center',
          offset: new AMap.Pixel(0, 0),
          content: createMarkerHtml(stop, currentStop.id, nextStop.id),
        });

        marker.on('click', () => {
          infoWindowRef.current?.setContent(
            `<div><div style="font-weight:700">${stop.poi.name}</div><div style="font-size:12px;opacity:0.75;margin-top:4px">${stop.time} · ${stop.label}</div></div>`,
          );
          infoWindowRef.current?.open(mapRef.current, toAmapPosition(stop.poi.position));
        });

        marker.setMap(mapRef.current);
        return marker;
      });

      overlaysRef.current.push(...markerOverlays);

      if (route?.points.length && route.points.length > 1) {
        const glow = new AMap.Polyline({
          path: route.points.map(toAmapPosition),
          strokeColor: '#C46E43',
          strokeOpacity: 0.16,
          strokeWeight: 11,
          lineJoin: 'round',
          lineCap: 'round',
        });

        const line = new AMap.Polyline({
          path: route.points.map(toAmapPosition),
          strokeColor: '#C46E43',
          strokeOpacity: 0.95,
          strokeWeight: 4,
          strokeStyle: route.source === 'direct' ? 'dashed' : 'solid',
          strokeDasharray: route.source === 'direct' ? [10, 10] : undefined,
          lineJoin: 'round',
          lineCap: 'round',
        });

        glow.setMap(mapRef.current);
        line.setMap(mapRef.current);
        overlaysRef.current.push(glow, line);
      }

      const focusPoints = [
        ...focusStops.map((stop) => stop.poi.position),
        ...(route?.points ?? []),
      ];
      fitAmapToPoints(AMap, mapRef.current, focusPoints, currentStop.poi.position);
    }).catch(() => {
      // The visible error state is handled by the bootstrap effect.
    });
  }, [amapReady, currentStop.id, focusStops, nextStop.id, route]);

  useEffect(() => {
    let cancelled = false;

    async function fetchRoute() {
      setIsRouteLoading(true);
      setRouteError('');

      if (currentStop.poi.id === nextStop.poi.id) {
        setRoute({
          points: [currentStop.poi.position],
          distanceMeters: 0,
          durationSeconds: 0,
          source: 'direct',
        });
        setIsRouteLoading(false);
        return;
      }

      if (!isAmapConfigured()) {
        // AMap JS API 未配置，直接用 REST API 测量距离作为兜底
        const restResult = await fetchRestFallbackRoute(
          currentStop.poi.position,
          nextStop.poi.position,
          currentTransportMode,
        );
        setRoute(restResult);
        setRouteError('高德 JS API 配置缺失，已使用 REST 距离测量作为兜底。');
        setIsRouteLoading(false);
        return;
      }

      let AMap: any;
      try {
        AMap = await loadAmap();
      } catch (error) {
        if (!cancelled) {
          // AMap JS API 加载失败，降级到 REST 距离测量
          const restResult = await fetchRestFallbackRoute(
            currentStop.poi.position,
            nextStop.poi.position,
            currentTransportMode,
          );
          setRoute(restResult);
          setRouteError(`${formatAmapFailure(error)} 已降级为 REST 距离测量兜底。`);
          setIsRouteLoading(false);
        }
        return;
      }

      if (cancelled) {
        return;
      }

      const planned = await searchAmapRoute(AMap, routeMeta.amapMode, currentStop.poi.position, nextStop.poi.position);

      if (cancelled) {
        return;
      }

      if (!planned) {
        // AMap 路线规划返回空，降级到 REST 距离测量
        const restResult = await fetchRestFallbackRoute(
          currentStop.poi.position,
          nextStop.poi.position,
          currentTransportMode,
        );
        setRoute(restResult);
        setRouteError('高德路线规划返回为空，已降级为 REST 距离测量兜底。');
      } else {
        setRoute({
          points: planned.path,
          distanceMeters: planned.distanceMeters,
          durationSeconds: planned.durationSeconds,
          source: 'amap',
        });
      }

      setIsRouteLoading(false);
    }

    fetchRoute();

    return () => {
      cancelled = true;
    };
  }, [currentStop.poi.id, currentStop.poi.position, currentTransportMode, nextStop.poi.id, nextStop.poi.position, routeMeta.amapMode]);

  const badgeTone = nextStop.poi.id === currentStop.poi.id ? 'bg-primary-container text-on-primary-container border-primary/40' : 'bg-secondary-container text-on-secondary-container border-secondary/40';
  const calories = estimateCalories(route?.distanceMeters ?? 0, currentTransportMode);
  const routeSummary = formatRouteSummary(route?.distanceMeters ?? 0, route?.durationSeconds ?? 0, currentTransportMode);
  const progressRatio = Math.max(0.12, Math.min(1, activePlan.progressRatio));

  return (
    <div className="relative h-[calc(100vh-182px)] w-full overflow-hidden rounded-[36px] border border-outline-variant editorial-shadow">
      {isAmapConfigured() ? (
        <div className="absolute inset-0 z-0">
          <div ref={mapContainerRef} className="sleep-map-theme h-full w-full" />
        </div>
      ) : (
        <div className="sleep-map-empty absolute inset-0 z-0 px-8 text-center">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-on-surface-variant">AMap Required</p>
            <h3 className="mt-3 text-2xl font-headline font-bold text-on-surface">等待接入高德地图配置</h3>
            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
              请在 `.env.local` 中补上 `VITE_AMAP_KEY` 与 `VITE_AMAP_SECURITY_JS_CODE`，然后重启前端。
            </p>
            {amapOrigin ? (
              <p className="mt-2 text-xs text-on-surface-variant">当前访问地址：{amapOrigin}</p>
            ) : null}
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_top,rgba(196,110,67,0.16),transparent_34%),radial-gradient(circle_at_75%_20%,rgba(111,132,101,0.12),transparent_22%)]" />
      <div className="absolute inset-0 z-10 map-gradient-overlay pointer-events-none" />

      <div className="absolute left-6 right-6 top-6 z-20">
        <div className="paper-panel glass-panel rounded-[28px] px-5 py-4">
          <p className="editorial-kicker">Campus Route</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-headline text-3xl font-semibold text-on-surface">今天该怎么走，也该在哪里补觉</h2>
              <p className="mt-2 text-sm text-on-surface-variant">地图逻辑与路线规划保持不变，只把信息壳层整理得更轻、更容易扫读。</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 px-6 pb-6">
        <div className="paper-panel mb-4 rounded-[32px] p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="editorial-kicker">当前活动状态</p>
              <h2 className="mt-1 text-2xl font-headline font-bold text-on-surface">
                {currentStop.poi.shortName} → {nextStop.poi.shortName}
              </h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                {currentStop.time} · {currentStop.label}
                {currentStop.detail ? ` · ${currentStop.detail}` : ''}
              </p>
            </div>
            <div className={`rounded-full border px-3 py-1 text-xs font-bold ${badgeTone}`}>
              {nextStop.poi.id === currentStop.poi.id ? '已到达' : isRouteLoading ? '规划中' : route?.source === 'amap' ? '高德路线' : '兜底路线'}
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative h-3 overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-[#e5c187] to-secondary transition-[width] duration-700"
                style={{ width: `${Math.round(progressRatio * 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-4 gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-on-surface-variant">
              {focusStops.slice(0, 4).map((stop) => (
                <div key={stop.id} className={stop.id === currentStop.id ? 'text-primary' : ''}>
                  <p>{stop.time}</p>
                  <p className="mt-1 truncate text-[11px] normal-case tracking-normal">{stop.poi.shortName}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <StatCard label="路线距离" value={formatDistance(route?.distanceMeters ?? 0)} icon="route" />
            <StatCard label="预计耗时" value={formatDuration(route?.durationSeconds ?? 0)} icon="schedule" />
            <StatCard label="能量消耗" value={calories} icon="local_fire_department" />
          </div>

          <div className="mt-6 flex items-start gap-4 border-t border-outline-variant pt-6">
            <div className="flex -space-x-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-background bg-surface-container-high">
                <span className="material-symbols-outlined text-sm text-primary">route</span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-background bg-surface-container-high">
                <span className="material-symbols-outlined text-sm text-secondary">{routeMeta.icon}</span>
              </div>
            </div>
            <div className="space-y-2 text-xs leading-relaxed text-on-surface-variant">
              <p>{routeSummary}</p>
              <p>{routeMeta.helperText}</p>
              {mapError ? <p className="text-tertiary">{mapError}</p> : null}
              {routeError ? <p className="text-tertiary">{routeError}</p> : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              data-ai-label="查看当前路线说明"
              data-ai-context="用户希望更快看懂当前动线、出行方式和路线耗时的含义。"
              className="rounded-full border border-primary/30 bg-primary-container px-4 py-2 text-xs font-bold text-on-primary-container"
            >
              路线说明
            </button>
            <button
              type="button"
              data-ai-label="查看当前休息建议"
              data-ai-context="用户希望更快看懂当前地图页为什么推荐这个节点作为休息或补觉位置。"
              className="rounded-full border border-secondary/30 bg-secondary-container px-4 py-2 text-xs font-bold text-on-secondary-container"
            >
              休息建议
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="paper-panel-soft rounded-[24px] p-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">schedule</span>
              <div>
                <p className="text-[10px] uppercase text-on-surface-variant">下个节点</p>
                <p className="text-sm font-bold text-on-surface">
                  {nextStop.time} {nextStop.poi.shortName}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-on-surface-variant">{nextStop.label}</p>
          </div>

          <div className="paper-panel-soft rounded-[24px] p-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary">{routeMeta.icon}</span>
              <div>
                <p className="text-[10px] uppercase text-on-surface-variant">出行模式</p>
                <p className="text-sm font-bold text-on-surface">{routeMeta.label}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-on-surface-variant">{routeMeta.bottomLine}</p>
          </div>
        </div>

        <div className="paper-panel-soft mt-4 rounded-[22px] px-4 py-3 text-[11px] leading-relaxed text-on-surface-variant">
          {activePlan.referenceLabel} · {formatWeekdayLabel(activePlan.referenceWeekday)} · 当前已加载 {allDiningPois.length} 个餐饮点位，路线规划优先使用高德 JSAPI。
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="paper-panel-soft rounded-[24px] p-4">
      <span className="material-symbols-outlined text-sm text-primary">{icon}</span>
      <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-on-surface-variant">{label}</p>
      <p className="mt-1 text-base font-bold text-on-surface">{value}</p>
    </div>
  );
}

function buildDayStops(courseSchedule: CourseScheduleItem[], diningPOI: string, customDiningPois: CampusPoi[]): DayStop[] {
  const reference = selectReferenceCourses(courseSchedule, new Date());
  const diningStop = getDiningPoiById(normalizeDiningPoiId(diningPOI, customDiningPois), customDiningPois);

  if (!reference) {
    return [
      createStop('rest', '08:00', '在宿舍恢复状态', '暂无课表，先以宿舍为默认锚点。', CAMPUS_POIS.dormitory, 'rest'),
      createStop('meal', '12:20', `前往${diningStop.shortName}`, '偏好餐饮地点已同步到地图页。', diningStop, 'meal'),
      createStop('night', '22:00', '回宿舍收尾', '晚间默认回到宿舍休息。', CAMPUS_POIS.dormitory, 'rest'),
    ];
  }

  const stops: DayStop[] = [
    createStop('dorm-start', clampEarlierTime(reference.courses[0]?.startTime ?? '08:00', 35), '从宿舍出发', '当天首段校园动线。', CAMPUS_POIS.dormitory, 'rest'),
  ];

  reference.courses.forEach((course, index) => {
    stops.push(
      createStop(
        course.id || `course-${index}`,
        course.startTime,
        course.courseName,
        course.location || '教学区待确认',
        resolveCoursePoi(course.location, diningStop.id, customDiningPois),
        'course',
      ),
    );
  });

  const lunchTime = inferLunchTime(reference.courses);
  if (lunchTime) {
    stops.push(
      createStop('meal-midday', lunchTime, `去${diningStop.shortName}补给`, '基于你的偏好食堂插入午间节点。', diningStop, 'meal'),
    );
  }

  const lastCourse = reference.courses[reference.courses.length - 1];
  stops.push(
    createStop(
      'dorm-end',
      clampLaterTime(lastCourse?.endTime ?? '20:40', 55),
      '返回宿舍',
      '晚间休息默认回到宿舍。',
      CAMPUS_POIS.dormitory,
      'rest',
    ),
  );

  return stops.sort((left, right) => toMinutes(left.time) - toMinutes(right.time));
}

function getActivePlan(stops: DayStop[]) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const currentIndex = Math.max(
    0,
    stops.reduce((picked, stop, index) => (toMinutes(stop.time) <= nowMinutes ? index : picked), 0),
  );
  const currentStop = stops[currentIndex] ?? stops[0];
  const nextStop = findNextDistinctStop(stops, currentIndex) ?? currentStop;
  const referenceWeekday = getCurrentWeekday(now);
  const finalIndex = Math.max(stops.length - 1, 1);

  return {
    currentStop,
    nextStop,
    progressRatio: currentIndex / finalIndex,
    referenceLabel: currentIndex === 0 && nowMinutes < toMinutes(stops[0].time) ? '即将开始' : '今日路径',
    referenceWeekday,
  };
}

function findNextDistinctStop(stops: DayStop[], currentIndex: number): DayStop | null {
  const current = stops[currentIndex];
  for (let index = currentIndex + 1; index < stops.length; index += 1) {
    if (stops[index].poi.id !== current.poi.id) {
      return stops[index];
    }
  }

  return stops[currentIndex + 1] ?? null;
}

function getFocusStops(stops: DayStop[], currentId: string, nextId: string): DayStop[] {
  const currentIndex = stops.findIndex((stop) => stop.id === currentId);
  if (currentIndex === -1) {
    return stops.slice(0, 4);
  }

  const visible = [
    stops[Math.max(0, currentIndex - 1)],
    stops[currentIndex],
    stops.find((stop) => stop.id === nextId),
    stops[stops.length - 1],
  ].filter(Boolean) as DayStop[];

  return visible.filter((stop, index, array) => array.findIndex((entry) => entry.id === stop.id) === index);
}

function dedupeStopsByPoi(stops: DayStop[]): DayStop[] {
  return stops.filter((stop, index, array) => array.findIndex((entry) => entry.poi.id === stop.poi.id) === index);
}

function createStop(
  id: string,
  time: string,
  label: string,
  detail: string,
  poi: CampusPoi,
  kind: DayStop['kind'],
): DayStop {
  return { id, time, label, detail, poi, kind };
}

function inferLunchTime(courses: CourseScheduleItem[]): string | null {
  const morningCourses = courses.filter((course) => toMinutes(course.startTime) < 12 * 60 + 30);
  if (!morningCourses.length) {
    return '12:20';
  }

  const lastMorningCourse = morningCourses[morningCourses.length - 1];
  return clampLaterTime(lastMorningCourse.endTime, 20);
}

function clampEarlierTime(time: string, offsetMinutes: number): string {
  return fromMinutes(Math.max(6 * 60 + 30, toMinutes(time) - offsetMinutes));
}

function clampLaterTime(time: string, offsetMinutes: number): string {
  return fromMinutes(Math.min(23 * 60, toMinutes(time) + offsetMinutes));
}

function toMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function fromMinutes(totalMinutes: number): string {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function normalizeTransportMode(value: string): TransportMode {
  if (value === 'ebike' || value === 'bus') {
    return value;
  }
  return 'walking';
}

function describeTransportMode(mode: TransportMode): {
  label: string;
  icon: string;
  amapMode: AMapRouteMode;
  helperText: string;
  bottomLine: string;
} {
  if (mode === 'ebike') {
    return {
      label: '电动车优先',
      icon: 'moped',
      amapMode: 'riding',
      helperText: '当前优先使用高德骑行路径来近似校园内电动车动线。',
      bottomLine: '长距离跨区时优先尝试骑行路线。',
    };
  }

  if (mode === 'bus') {
    return {
      label: '校巴近似',
      icon: 'directions_bus',
      amapMode: 'driving',
      helperText: '校巴班次暂未接入，这里先用高德驾车路线近似道路通行结果。',
      bottomLine: '后续可换成带校巴班次的真实规划。',
    };
  }

  return {
    label: '步行优先',
    icon: 'directions_walk',
    amapMode: 'walking',
    helperText: '当前使用高德步行路径，适合校内近距离移动。',
    bottomLine: '步行模式下会优先保守估算通行时间。',
  };
}

function createMarkerHtml(stop: DayStop, currentId: string, nextId: string): string {
  const accentColor = getAccentColor(stop.poi.accent as AccentTone);
  const variant = stop.id === currentId ? 'current' : stop.id === nextId ? 'next' : 'default';

  return `
    <div class="sleep-map-marker sleep-map-marker--${variant}">
      <div class="sleep-map-marker__core" style="background:${accentColor}"></div>
    </div>
  `;
}

/**
 * 优先用高德 REST 距离测量 API 获取真实路网距离；
 * 若 REST 失败则退回 Haversine 直线估算。
 * 两点之间始终以直线连接（折线渲染为虚线），但距离/耗时数值更准确。
 */
async function fetchRestFallbackRoute(
  from: LatLngTuple,
  to: LatLngTuple,
  mode: TransportMode,
): Promise<RouteState> {
  // bus 用驾车距离(type=0)近似，其余用步行距离(type=1)
  const distanceType: 0 | 1 = mode === 'bus' ? 0 : 1;
  const restResult = await measureDistance(from, to, distanceType);

  if (restResult) {
    return {
      points: [from, to],
      distanceMeters: restResult.distance,
      durationSeconds: restResult.duration,
      source: 'direct',
    };
  }

  // REST 也失败，Haversine 兜底
  return buildFallbackRoute(from, to, mode);
}

function buildFallbackRoute(from: LatLngTuple, to: LatLngTuple, mode: TransportMode): RouteState {  return {
    points: [from, to],
    distanceMeters: calculateDirectDistance(from, to),
    durationSeconds: estimateFallbackDuration(from, to, mode),
    source: 'direct',
  };
}

function calculateDirectDistance(from: LatLngTuple, to: LatLngTuple): number {
  if (from[0] === to[0] && from[1] === to[1]) {
    return 0;
  }

  const R = 6371000;
  const lat1 = (from[0] * Math.PI) / 180;
  const lat2 = (to[0] * Math.PI) / 180;
  const dLat = ((to[0] - from[0]) * Math.PI) / 180;
  const dLng = ((to[1] - from[1]) * Math.PI) / 180;

  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateFallbackDuration(from: LatLngTuple, to: LatLngTuple, mode: TransportMode): number {
  const distance = calculateDirectDistance(from, to);
  const speedMetersPerSecond = mode === 'ebike' ? 5.5 : mode === 'bus' ? 7.5 : 1.35;
  return distance / speedMetersPerSecond;
}

function formatDistance(distanceMeters: number): string {
  if (!distanceMeters) {
    return '已到达';
  }
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(distanceMeters)} m`;
}

function formatDuration(durationSeconds: number): string {
  if (!durationSeconds) {
    return '0 分钟';
  }
  const totalMinutes = Math.max(1, Math.round(durationSeconds / 60));
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes ? `${hours} 小时 ${minutes} 分` : `${hours} 小时`;
  }
  return `${totalMinutes} 分钟`;
}

function estimateCalories(distanceMeters: number, mode: TransportMode): string {
  if (!distanceMeters) {
    return '0 kcal';
  }

  const factor = mode === 'ebike' ? 0.012 : mode === 'bus' ? 0.002 : 0.048;
  return `${Math.max(1, Math.round(distanceMeters * factor))} kcal`;
}

function formatRouteSummary(distanceMeters: number, durationSeconds: number, mode: TransportMode): string {
  const label = mode === 'ebike' ? '预计骑行' : mode === 'bus' ? '预计道路通行' : '预计步行';
  return `${label} ${formatDistance(distanceMeters)}，耗时约 ${formatDuration(durationSeconds)}。`;
}
