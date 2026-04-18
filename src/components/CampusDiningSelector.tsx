import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CAMPUS_CENTER,
  type CampusPoi,
  type LatLngTuple,
  getAllDiningPois,
  getAccentColor,
  getDiningPoiById,
  normalizeDiningPoiId,
} from '@/lib/campusData';
import {
  formatAmapFailure,
  getAmapOrigin,
  getAmapMapStyle,
  isAmapConfigured,
  loadAmap,
  toAmapPosition,
} from '@/lib/amap';

interface CampusDiningSelectorProps {
  value: string;
  onChange: (poiId: string) => void;
  customPois?: CampusPoi[];
  onAddCustomPoi?: (poi: CampusPoi) => void;
  onRemoveCustomPoi?: (poiId: string) => void;
  compact?: boolean;
}

const ZONE_OPTIONS = ['信息学部', '工学部', '文理学部', '自定义'] as const;

export default function CampusDiningSelector({
  value,
  onChange,
  customPois = [],
  onAddCustomPoi,
  onRemoveCustomPoi,
  compact = false,
}: CampusDiningSelectorProps) {
  const allDiningPois = useMemo(() => getAllDiningPois(customPois), [customPois]);
  const normalizedValue = normalizeDiningPoiId(value, customPois);
  const selectedPoi = getDiningPoiById(normalizedValue, customPois);
  const [query, setQuery] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftZone, setDraftZone] = useState<CampusPoi['zone']>('自定义');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftPosition, setDraftPosition] = useState<LatLngTuple>(selectedPoi.position);
  const [amapReady, setAmapReady] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [amapError, setAmapError] = useState('');
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const draftMarkerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeTimersRef = useRef<number[]>([]);
  const amapOrigin = getAmapOrigin();
  const selectorMapStyle = getAmapMapStyle();

  const filteredPois = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return allDiningPois;
    }

    return allDiningPois.filter((poi) =>
      [poi.name, poi.shortName, poi.zone, ...(poi.aliases ?? [])].some((candidate) =>
        candidate.toLowerCase().includes(keyword),
      ),
    );
  }, [allDiningPois, query]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!mapContainerRef.current) {
        return;
      }

      if (!isAmapConfigured()) {
        setAmapError('请先配置高德地图 key 和 securityJsCode。');
        return;
      }

      try {
        const AMap = await loadAmap();
        if (cancelled || !mapContainerRef.current) {
          return;
        }

        setMapLoaded(false);

        const map = new AMap.Map(mapContainerRef.current, {
          zoom: compact ? 15 : 16,
          center: toAmapPosition(selectedPoi.position),
          mapStyle: selectorMapStyle,
          resizeEnable: true,
          viewMode: '2D',
          features: ['bg', 'road', 'point'],
        });

        if (!compact) {
          map.addControl(new AMap.ToolBar({ position: 'RT' }));
        }
        map.addControl(new AMap.Scale());
        map.on('click', (event: any) => {
          setDraftPosition([event.lnglat.getLat(), event.lnglat.getLng()]);
          map.panTo(event.lnglat);
        });
        map.on('complete', () => {
          if (cancelled) {
            return;
          }
          map.resize();
          map.setZoomAndCenter(compact ? 15 : 16, toAmapPosition(selectedPoi.position));
          setMapLoaded(true);
        });

        resizeObserverRef.current?.disconnect();
        resizeObserverRef.current = new ResizeObserver(() => {
          map.resize();
          map.setZoomAndCenter(compact ? 15 : 16, toAmapPosition(selectedPoi.position));
        });
        resizeObserverRef.current.observe(mapContainerRef.current);

        resizeTimersRef.current.forEach((timer) => window.clearTimeout(timer));
        resizeTimersRef.current = [0, 250, 1000].map((delay) =>
          window.setTimeout(() => {
            map.resize();
            map.setZoomAndCenter(compact ? 15 : 16, toAmapPosition(selectedPoi.position));
          }, delay),
        );

        mapRef.current = map;
        infoWindowRef.current = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -22) });
        setAmapError('');
        setAmapReady(true);
      } catch (error) {
        if (!cancelled) {
          setAmapError(formatAmapFailure(error));
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
      overlaysRef.current.forEach((overlay) => overlay?.setMap?.(null));
      overlaysRef.current = [];
      draftMarkerRef.current?.setMap?.(null);
      draftMarkerRef.current = null;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      resizeTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      resizeTimersRef.current = [];
      mapRef.current?.destroy?.();
      mapRef.current = null;
      infoWindowRef.current = null;
      setMapLoaded(false);
    };
  }, [compact, selectedPoi.position]);

  useEffect(() => {
    setDraftPosition(selectedPoi.position);
  }, [selectedPoi.position]);

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

      const markers = filteredPois.map((poi) => {
        const isSelected = poi.id === selectedPoi.id;
        const marker = new AMap.Marker({
          position: toAmapPosition(poi.position),
          anchor: 'center',
          content: createDiningMarkerHtml(poi, isSelected),
        });

        marker.on('click', () => {
          onChange(poi.id);
          infoWindowRef.current?.setContent(
            `<div><div style="font-weight:700">${poi.name}</div><div style="font-size:12px;opacity:0.75;margin-top:4px">${poi.zone} · ${poi.description}</div></div>`,
          );
          infoWindowRef.current?.open(mapRef.current, toAmapPosition(poi.position));
        });

        marker.setMap(mapRef.current);
        return marker;
      });

      overlaysRef.current.push(...markers);

      draftMarkerRef.current?.setMap?.(null);
      draftMarkerRef.current = new AMap.Marker({
        position: toAmapPosition(draftPosition),
        anchor: 'center',
        content: `
          <div class="sleep-map-marker sleep-map-marker--draft">
            <div class="sleep-map-marker__core" style="background:#F59E0B"></div>
          </div>
        `,
      });
      draftMarkerRef.current.setMap(mapRef.current);

      mapRef.current.setZoomAndCenter(compact ? 15 : 16, toAmapPosition(selectedPoi.position));
    }).catch(() => {
      // The visible error state is handled by the bootstrap effect.
    });
  }, [amapReady, compact, draftPosition, onChange, selectedPoi.id, selectedPoi.position, selectorMapStyle]);

  useEffect(() => {
    if (!amapReady || !mapRef.current) {
      return;
    }

    mapRef.current.setZoomAndCenter(compact ? 15 : 16, toAmapPosition(selectedPoi.position));
  }, [amapReady, compact, selectedPoi.position]);

  return (
    <div className="rounded-[26px] border border-outline-variant bg-surface-container-low overflow-hidden">
      <div className={`relative ${compact ? 'h-56' : 'h-72'} bg-surface-container-lowest`}>
        {isAmapConfigured() ? (
          <div className="absolute inset-0">
            <div ref={mapContainerRef} className="sleep-map-theme h-full w-full bg-[#dbeafe]" />
          </div>
        ) : (
          <div className="sleep-map-empty absolute inset-0 px-6 text-center">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">AMap Setup</p>
              <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                请提供 `VITE_AMAP_KEY` 和 `VITE_AMAP_SECURITY_JS_CODE`，这里就会切成高德真地图。
              </p>
              {amapOrigin ? (
                <p className="mt-2 text-xs text-on-surface-variant">当前访问地址：{amapOrigin}</p>
              ) : null}
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_18%)] pointer-events-none" />
        <div className="absolute left-4 right-4 top-4 rounded-full border border-outline-variant bg-white/92 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.1)] backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-on-surface-variant">search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索校内食堂，例如 信一、桂园、清真"
              className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant"
            />
          </div>
        </div>
        {!mapLoaded && isAmapConfigured() ? (
          <div className="absolute right-4 top-20 rounded-full border border-primary/20 bg-white/90 px-3 py-1 text-[11px] font-bold text-primary shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
            地图加载中
          </div>
        ) : null}
        <div className="absolute bottom-4 left-4 rounded-full border border-secondary/30 bg-white/94 px-3 py-1 text-[11px] font-bold text-secondary shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-sm">
          已选：{selectedPoi.name}
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">Dining POIs</p>
            <p className="mt-1 text-sm text-on-surface-variant">现在优先走高德底图，国内访问会更稳一些。</p>
          </div>
          <div className="rounded-full border border-outline-variant bg-surface px-3 py-1 text-xs text-on-surface-variant">
            共 {filteredPois.length} 个候选点
          </div>
        </div>

        <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
          {filteredPois.map((poi) => {
            const isSelected = poi.id === selectedPoi.id;
            const isCustom = customPois.some((item) => item.id === poi.id);

            return (
              <div
                key={poi.id}
                className={`rounded-2xl border p-4 transition-all ${
                  isSelected
                    ? 'border-primary bg-white shadow-[0_18px_38px_rgba(83,58,34,0.08)]'
                    : 'border-outline-variant bg-surface hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onChange(poi.id)}
                    data-ai-label={`选择食堂 ${poi.name}`}
                    data-ai-context="这个选择会同步到路线页和时间轴里的用餐偏好。"
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold text-on-secondary-container">
                        {poi.zone}
                      </span>
                      {isCustom ? (
                        <span className="rounded-full bg-tertiary-container px-2 py-0.5 text-[10px] font-bold text-on-tertiary-container">
                          自定义
                        </span>
                      ) : null}
                    </div>
                    <h5 className="mt-3 text-sm font-bold text-on-surface">{poi.name}</h5>
                    <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{poi.description}</p>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    {isCustom && onRemoveCustomPoi ? (
                      <button
                        type="button"
                        onClick={() => onRemoveCustomPoi(poi.id)}
                        data-ai-label={`删除自定义地点 ${poi.name}`}
                        data-ai-context="用户准备删除一个自己添加的干饭地点，这会影响后续餐饮偏好和路线推荐。"
                        className="rounded-full p-1 text-outline-variant transition-colors hover:text-error"
                        aria-label={`删除 ${poi.name}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    ) : null}
                    <span
                      className={`material-symbols-outlined ${isSelected ? 'text-primary' : 'text-outline-variant'}`}
                      style={{ fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {isSelected ? 'check_circle' : 'circle'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {onAddCustomPoi ? (
          <div className="mt-4 rounded-3xl border border-outline-variant bg-surface px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">Custom Spot</p>
                <h5 className="mt-1 text-lg font-bold text-on-surface">添加自定义干饭地点</h5>
                <p className="mt-2 text-sm text-on-surface-variant">点地图落点后再保存。接入高德后，这个坐标会直接落在国内容易访问的底图上。</p>
              </div>
              <span className="rounded-full border border-primary/30 bg-primary-container px-3 py-1 text-[11px] font-bold text-on-primary-container">
                {draftPosition[0].toFixed(4)}, {draftPosition[1].toFixed(4)}
              </span>
            </div>

            <div className={`mt-4 grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="例如：洪波门小炒、图书馆旁咖啡角"
                className="rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none placeholder:text-on-surface-variant"
              />
              <select
                value={draftZone}
                onChange={(event) => setDraftZone(event.target.value as CampusPoi['zone'])}
                className="rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none"
              >
                {ZONE_OPTIONS.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
              <input
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
                placeholder="一句备注，例如：离实验楼近、夜宵常去"
                className={`${compact ? '' : 'md:col-span-2'} rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none placeholder:text-on-surface-variant`}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const normalizedName = draftName.trim();
                  if (!normalizedName) {
                    return;
                  }

                  const createdPoi: CampusPoi = {
                    id: `custom-dining-${Date.now()}`,
                    name: normalizedName,
                    shortName: normalizedName.slice(0, 8),
                    category: 'dining',
                    zone: draftZone,
                    position: draftPosition,
                    icon: 'restaurant',
                    accent: 'secondary',
                    description: draftDescription.trim() || '用户自定义地点。',
                    aliases: [normalizedName],
                  };

                  onAddCustomPoi(createdPoi);
                  setDraftName('');
                  setDraftDescription('');
                }}
                data-ai-label="保存自定义干饭地点"
                data-ai-context="用户正在把地图落点保存成新的食堂偏好候选点，路线页和后续提示会复用这个地点。"
                disabled={!draftName.trim()}
                className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50"
              >
                保存自定义地点
              </button>
              <p className="text-xs text-on-surface-variant">
                {amapError || (isAmapConfigured() ? '提示：地图上最后一次点击的位置会作为该地点坐标。' : '提示：等你补上高德 key 后，就能在地图上精准落点。')}
              </p>
            </div>
          </div>
        ) : null}

        {!filteredPois.length ? (
          <div className="mt-3 rounded-2xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface-variant">
            没找到匹配项，试试搜索“信息”“工学”“桂园”“清真”。
          </div>
        ) : null}
      </div>
    </div>
  );
}

function createDiningMarkerHtml(poi: CampusPoi, isSelected: boolean): string {
  const accentColor = getAccentColor(poi.accent);
  return `
    <div class="sleep-map-marker ${isSelected ? 'sleep-map-marker--current' : 'sleep-map-marker--next'}">
      <div class="sleep-map-marker__core" style="background:${accentColor}"></div>
    </div>
  `;
}
