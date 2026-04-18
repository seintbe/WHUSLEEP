/**
 * 高德 Web 服务 REST API 封装
 *
 * 使用 VITE_AMAP_WEB_SERVICE_KEY（Web服务类型），与前端地图渲染的 JS API Key 分离。
 *
 * 坐标约定：
 *   - 项目内部统一使用 [lat, lng]（纬度在前）
 *   - 高德 REST API 使用 "lng,lat" 字符串（经度在前）
 *   - 本模块在入口/出口处自动转换，调用方无需关心
 */

import type { LatLngTuple } from '@/lib/campusData';

const WEB_SERVICE_KEY = import.meta.env.VITE_AMAP_WEB_SERVICE_KEY as string | undefined;
const BASE_URL = 'https://restapi.amap.com';

// ─── 对外类型 ────────────────────────────────────────────────────────────────

export interface AmapPoiResult {
  id: string;
  name: string;
  address: string;
  location: LatLngTuple;
  distance: number; // 单位：米
  type: string;
}

export interface AmapDistanceResult {
  distance: number; // 单位：米
  duration: number; // 单位：秒
}

// ─── 工具函数 ────────────────────────────────────────────────────────────────

function isConfigured(): boolean {
  return Boolean(WEB_SERVICE_KEY);
}

/** 内部 [lat, lng] → 高德 "lng,lat" 字符串 */
function toLngLat(point: LatLngTuple): string {
  return `${point[1]},${point[0]}`;
}

/** 高德 "lng,lat" 字符串 → 内部 [lat, lng] */
function fromLngLat(lngLatStr: string): LatLngTuple | null {
  const parts = lngLatStr.split(',');
  if (parts.length !== 2) return null;
  const lng = Number(parts[0]);
  const lat = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

// ─── POI 周边搜索 ─────────────────────────────────────────────────────────────

/**
 * 搜索指定中心点周边的 POI
 *
 * @param center   中心点 [lat, lng]
 * @param keywords 关键词，如 "食堂"、"便利店"、"自习室"
 * @param radius   搜索半径（米），默认 2000
 * @returns        POI 列表，按距离升序；失败时返回空数组
 */
export async function searchPoiAround(
  center: LatLngTuple,
  keywords: string,
  radius = 2000,
): Promise<AmapPoiResult[]> {
  if (!isConfigured()) {
    console.warn('[amapWebService] VITE_AMAP_WEB_SERVICE_KEY 未配置，跳过 POI 搜索。');
    return [];
  }

  try {
    const params = new URLSearchParams({
      key: WEB_SERVICE_KEY!,
      location: toLngLat(center),
      keywords,
      radius: String(radius),
      sortrule: 'distance',
      page_size: '20',
      page_num: '1',
      show_fields: 'business',
    });

    const response = await fetch(`${BASE_URL}/v5/place/around?${params}`);
    if (!response.ok) {
      console.error('[amapWebService] POI 搜索请求失败', response.status);
      return [];
    }

    const data = (await response.json()) as {
      status: string;
      info?: string;
      pois?: Array<{
        id: string;
        name: string;
        address: unknown;
        location: string;
        distance: string;
        type: string;
      }>;
    };

    if (data.status !== '1') {
      console.error('[amapWebService] POI 搜索返回错误', data.info);
      return [];
    }

    if (!Array.isArray(data.pois)) return [];

    return data.pois.flatMap((poi) => {
      const location = fromLngLat(poi.location);
      if (!location) return [];
      return [
        {
          id: poi.id,
          name: poi.name,
          address: typeof poi.address === 'string' ? poi.address : '',
          location,
          distance: Number(poi.distance) || 0,
          type: poi.type,
        },
      ];
    });
  } catch (error) {
    console.error('[amapWebService] searchPoiAround 异常', error);
    return [];
  }
}

// ─── 距离测量 ─────────────────────────────────────────────────────────────────

/**
 * 测量两点间的实际道路距离和耗时
 *
 * @param origin      起点 [lat, lng]
 * @param destination 终点 [lat, lng]
 * @param type        0=驾车距离, 1=步行距离（骑行可用步行近似）
 * @returns           { distance(米), duration(秒) }；失败时返回 null
 */
export async function measureDistance(
  origin: LatLngTuple,
  destination: LatLngTuple,
  type: 0 | 1 = 1,
): Promise<AmapDistanceResult | null> {
  if (!isConfigured()) {
    console.warn('[amapWebService] VITE_AMAP_WEB_SERVICE_KEY 未配置，跳过距离测量。');
    return null;
  }

  try {
    const params = new URLSearchParams({
      key: WEB_SERVICE_KEY!,
      origins: toLngLat(origin),
      destination: toLngLat(destination),
      type: String(type),
    });

    const response = await fetch(`${BASE_URL}/v3/distance?${params}`);
    if (!response.ok) {
      console.error('[amapWebService] 距离测量请求失败', response.status);
      return null;
    }

    const data = (await response.json()) as {
      status: string;
      info?: string;
      results?: Array<{
        distance: string;
        duration: string;
      }>;
    };

    if (data.status !== '1') {
      console.error('[amapWebService] 距离测量返回错误', data.info);
      return null;
    }

    const result = data.results?.[0];
    if (!result) return null;

    return {
      distance: Number(result.distance) || 0,
      duration: Number(result.duration) || 0,
    };
  } catch (error) {
    console.error('[amapWebService] measureDistance 异常', error);
    return null;
  }
}

// ─── 地理编码 ─────────────────────────────────────────────────────────────────

/**
 * 将地址字符串转换为坐标（限定武汉市，减少歧义）
 *
 * @param address 地址字符串，如 "武汉大学信息学部" 或 "珞珈山"
 * @returns       坐标 [lat, lng]；失败时返回 null
 */
export async function geocodeAddress(address: string): Promise<LatLngTuple | null> {
  if (!isConfigured()) {
    console.warn('[amapWebService] VITE_AMAP_WEB_SERVICE_KEY 未配置，跳过地理编码。');
    return null;
  }

  try {
    const params = new URLSearchParams({
      key: WEB_SERVICE_KEY!,
      address,
      city: '武汉',
    });

    const response = await fetch(`${BASE_URL}/v3/geocode/geo?${params}`);
    if (!response.ok) {
      console.error('[amapWebService] 地理编码请求失败', response.status);
      return null;
    }

    const data = (await response.json()) as {
      status: string;
      info?: string;
      geocodes?: Array<{ location: string }>;
    };

    if (data.status !== '1') {
      console.error('[amapWebService] 地理编码返回错误', data.info);
      return null;
    }

    const first = data.geocodes?.[0];
    if (!first) return null;

    return fromLngLat(first.location);
  } catch (error) {
    console.error('[amapWebService] geocodeAddress 异常', error);
    return null;
  }
}
