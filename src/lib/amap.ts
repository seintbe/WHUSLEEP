import AMapLoader from '@amap/amap-jsapi-loader';
import { CAMPUS_CENTER, isValidLatLngTuple, type LatLngTuple } from '@/lib/campusData';

const AMAP_PLUGINS = [
  'AMap.Scale',
  'AMap.ToolBar',
  'AMap.Walking',
  'AMap.Riding',
  'AMap.Driving',
  'AMap.PlaceSearch',
  'AMap.AutoComplete',
] as const;

export type AMapRouteMode = 'walking' | 'riding' | 'driving';

export interface AMapRouteResult {
  path: LatLngTuple[];
  distanceMeters: number;
  durationSeconds: number;
  source: 'amap';
}

interface AMapConfig {
  key?: string;
  securityJsCode?: string;
  mapStyle?: string;
}

declare global {
  interface Window {
    _AMapSecurityConfig?: {
      securityJsCode?: string;
    };
  }
}

let amapPromise: Promise<any> | null = null;
let lastAmapError = '';

export function getAmapConfig(): AMapConfig {
  return {
    key: import.meta.env.VITE_AMAP_KEY,
    securityJsCode: import.meta.env.VITE_AMAP_SECURITY_JS_CODE,
    mapStyle: import.meta.env.VITE_AMAP_MAP_STYLE,
  };
}

export function isAmapConfigured(): boolean {
  const config = getAmapConfig();
  return Boolean(config.key && config.securityJsCode);
}

export function getAmapMapStyle(): string {
  return getAmapConfig().mapStyle ?? 'amap://styles/whitesmoke';
}

export function getAmapOrigin(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.origin;
}

export function getLastAmapError(): string {
  return lastAmapError;
}

export function fitAmapToPoints(
  AMap: any,
  map: any,
  points: LatLngTuple[],
  fallbackPoint: LatLngTuple = CAMPUS_CENTER,
): void {
  const validPoints = points.filter(isValidLatLngTuple);
  const safeFallbackPoint = isValidLatLngTuple(fallbackPoint) ? fallbackPoint : CAMPUS_CENTER;

  if (!validPoints.length) {
    map.setZoomAndCenter(15, toAmapPosition(safeFallbackPoint));
    return;
  }

  if (validPoints.length === 1) {
    map.setZoomAndCenter(15, toAmapPosition(validPoints[0]));
    return;
  }

  const lats = validPoints.map(([lat]) => lat);
  const lngs = validPoints.map(([, lng]) => lng);
  map.setBounds([
    Math.min(...lngs),
    Math.min(...lats),
    Math.max(...lngs),
    Math.max(...lats),
  ]);
}

export function formatAmapFailure(error: unknown): string {
  const details = extractAmapErrorMessage(error);
  const origin = getAmapOrigin();
  const suffix = origin ? ` 当前访问地址是 ${origin}。请确认它已经加入高德 Web 端白名单。` : '';

  if (!details) {
    return `高德地图加载失败，请检查 key、安全密钥、白名单以及前端是否已重启。${suffix}`.trim();
  }

  return `高德地图加载失败：${details}。请检查 key、安全密钥、白名单以及前端是否已重启。${suffix}`.trim();
}

export async function loadAmap(): Promise<any> {
  const config = getAmapConfig();
  if (!config.key || !config.securityJsCode) {
    lastAmapError = '缺少 VITE_AMAP_KEY 或 VITE_AMAP_SECURITY_JS_CODE';
    throw new Error(lastAmapError);
  }

  if (!amapPromise) {
    window._AMapSecurityConfig = {
      securityJsCode: config.securityJsCode,
    };

    amapPromise = AMapLoader.load({
      key: config.key,
      version: '2.0',
      plugins: [...AMAP_PLUGINS],
    }).catch((error: unknown) => {
      lastAmapError = extractAmapErrorMessage(error);
      console.error('[amap] failed to load JSAPI', error);
      amapPromise = null;
      throw error;
    });
  }

  // Bug 13 Fix: 删除无意义的 try-catch re-throw。
  // 原代码中 catch 块只是原样 throw，且 lastAmapError = '' 在异常路径下永远不会执行。
  // 直接 await 即可，错误由上层 catch 处理，成功后清空 lastAmapError。
  const AMap = await amapPromise;
  lastAmapError = '';
  return AMap;
}

export async function searchAmapRoute(
  AMap: any,
  mode: AMapRouteMode,
  from: LatLngTuple,
  to: LatLngTuple,
): Promise<AMapRouteResult | null> {
  const origin = toAmapLngLat(AMap, from);
  const destination = toAmapLngLat(AMap, to);

  const service = mode === 'walking'
    ? new AMap.Walking()
    : mode === 'riding'
      ? new AMap.Riding()
      : new AMap.Driving({ policy: 0 });

  return new Promise((resolve) => {
    service.search(origin, destination, (status: string, result: unknown) => {
      if (status !== 'complete' || !result) {
        resolve(null);
        return;
      }

      const normalized = normalizeRouteResult(result);
      resolve(normalized ? { ...normalized, source: 'amap' } : null);
    });
  });
}

export function toAmapPosition([lat, lng]: LatLngTuple): [number, number] {
  const point = isValidLatLngTuple([lat, lng]) ? [lat, lng] as LatLngTuple : CAMPUS_CENTER;
  return [point[1], point[0]];
}

export function fromAmapPosition(position: { lng?: number; lat?: number; getLng?: () => number; getLat?: () => number }): LatLngTuple {
  const lng = typeof position.getLng === 'function' ? position.getLng() : Number(position.lng);
  const lat = typeof position.getLat === 'function' ? position.getLat() : Number(position.lat);
  return [lat, lng];
}

function normalizeRouteResult(result: unknown): Omit<AMapRouteResult, 'source'> | null {
  if (!result || typeof result !== 'object') {
    return null;
  }

  const root = result as Record<string, unknown>;
  const firstRoute = Array.isArray(root.routes) ? root.routes[0] : Array.isArray(root.plans) ? root.plans[0] : root;
  if (!firstRoute || typeof firstRoute !== 'object') {
    return null;
  }

  const routeRecord = firstRoute as Record<string, unknown>;
  const path = dedupePath(extractPath(routeRecord).filter(isValidLatLngTuple));
  if (!path.length) {
    return null;
  }

  const distanceMeters = pickNumber(routeRecord.distance, routeRecord.dist) ?? estimateDistanceFromPath(path);
  const durationSeconds = pickNumber(routeRecord.time, routeRecord.duration) ?? 0;

  return {
    path,
    distanceMeters,
    durationSeconds,
  };
}

function extractAmapErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error.trim();
  }

  if (error instanceof Error) {
    return error.message.trim();
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;

    if (typeof record.info === 'string' && record.info.trim()) {
      return record.info.trim();
    }

    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message.trim();
    }

    if (typeof record.msg === 'string' && record.msg.trim()) {
      return record.msg.trim();
    }
  }

  return '';
}

function extractPath(value: unknown): LatLngTuple[] {
  const output: LatLngTuple[] = [];
  visitRouteNode(value, output);
  return output;
}

function visitRouteNode(node: unknown, output: LatLngTuple[]) {
  if (!node) {
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((item) => visitRouteNode(item, output));
    return;
  }

  if (typeof node !== 'object') {
    return;
  }

  const record = node as Record<string, unknown>;
  const latLng = asLatLng(record);
  if (latLng) {
    output.push(latLng);
  }

  const keys = ['path', 'steps', 'rides', 'segments', 'walking', 'driving', 'transit', 'points'];
  keys.forEach((key) => {
    if (key in record) {
      visitRouteNode(record[key], output);
    }
  });
}

function asLatLng(node: Record<string, unknown>): LatLngTuple | null {
  if (typeof node.getLng === 'function' && typeof node.getLat === 'function') {
    const point: LatLngTuple = [Number(node.getLat()), Number(node.getLng())];
    return isValidLatLngTuple(point) ? point : null;
  }

  if ((typeof node.lng === 'number' || typeof node.lng === 'string') && (typeof node.lat === 'number' || typeof node.lat === 'string')) {
    const point: LatLngTuple = [Number(node.lat), Number(node.lng)];
    return isValidLatLngTuple(point) ? point : null;
  }

  return null;
}

function dedupePath(path: LatLngTuple[]): LatLngTuple[] {
  return path.filter((point, index, array) => {
    if (index === 0) {
      return true;
    }

    const previous = array[index - 1];
    return previous[0] !== point[0] || previous[1] !== point[1];
  });
}

function pickNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function estimateDistanceFromPath(path: LatLngTuple[]): number {
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    total += getDistance(path[index - 1], path[index]);
  }
  return total;
}

function getDistance(left: LatLngTuple, right: LatLngTuple): number {
  const earthRadius = 6371000;
  const lat1 = degreesToRadians(left[0]);
  const lat2 = degreesToRadians(right[0]);
  const dLat = degreesToRadians(right[0] - left[0]);
  const dLng = degreesToRadians(right[1] - left[1]);

  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function toAmapLngLat(AMap: any, point: LatLngTuple) {
  return new AMap.LngLat(point[1], point[0]);
}
