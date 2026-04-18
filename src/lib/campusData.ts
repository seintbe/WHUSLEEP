export type LatLngTuple = [number, number];

export type CampusPoiCategory = 'dining' | 'dormitory' | 'teaching';
export type AccentTone = 'primary' | 'secondary' | 'tertiary';

export interface CampusPoi {
  id: string;
  name: string;
  shortName: string;
  category: CampusPoiCategory;
  zone: '信息学部' | '工学部' | '文理学部' | '自定义';
  position: LatLngTuple;
  icon: string;
  accent: AccentTone;
  description: string;
  aliases?: string[];
}

// 高德地理编码 "武汉大学" 返回值，GCJ-02 坐标系
export const CAMPUS_CENTER: LatLngTuple = [30.536243, 114.364514];
// Bug 14 Fix: TILE_URL 和 OSRM_BASE_URL 是切换到高德地图前遗留的死代码，
// 整个项目中均未被引用，删除避免误导后续开发者以为还有 OSM/OSRM 集成。

export const CAMPUS_POIS: Record<string, CampusPoi> = {
  dormitory: {
    id: 'dormitory',
    name: '信息学部宿舍',
    shortName: '宿舍',
    category: 'dormitory',
    zone: '信息学部',
    position: [30.529500, 114.360200], // 信息学部 hub 附近估算
    icon: 'bedtime',
    accent: 'primary',
    description: '默认的午休与晚间休息锚点。',
    aliases: ['宿舍', '寝室'],
  },
  informationHub: {
    id: 'informationHub',
    name: '信息学部教学区',
    shortName: '信息学部',
    category: 'teaching',
    zone: '信息学部',
    position: [30.528548, 114.359739], // 高德地理编码 "武汉大学信息学部" 精确命中
    icon: 'school',
    accent: 'tertiary',
    description: '适合作为计算机、测绘、遥感等课程的默认教学区锚点。',
    aliases: ['信息学部', '信部', '计院', '遥感', '网安', '实验楼'],
  },
  engineeringHub: {
    id: 'engineeringHub',
    name: '工学部教学区',
    shortName: '工学部',
    category: 'teaching',
    zone: '工学部',
    position: [30.543863, 114.362329], // 高德地理编码 "武汉大学工学部" 精确命中
    icon: 'school',
    accent: 'tertiary',
    description: '适合作为工学部课程与跨区通勤的默认教学区锚点。',
    aliases: ['工学部', '动力', '电气', '土建', '水利'],
  },
  liberalArtsHub: {
    id: 'liberalArtsHub',
    name: '文理学部教学区',
    shortName: '文理学部',
    category: 'teaching',
    zone: '文理学部',
    position: [30.539000, 114.360000], // 桂园餐厅附近估算（待验证）
    icon: 'school',
    accent: 'tertiary',
    description: '适合作为文理学部课程与樱园片区的默认教学区锚点。',
    aliases: ['文理学部', '文科', '理学部', '主楼', '教三', '教四', '教五'],
  },
  'info-xinghu-canteen': {
    id: 'info-xinghu-canteen',
    name: '信息学部星湖一路食堂',
    shortName: '信部星湖一路',
    category: 'dining',
    zone: '信息学部',
    position: [30.529800, 114.360500], // 信息学部 hub 附近估算（一、二食堂）
    icon: 'restaurant',
    accent: 'secondary',
    description: '按公开位置描述调整到星湖一路食堂组团，靠近信息学部操场、CBD 与宿舍区。',
    aliases: ['信息学部一食堂', '信息学部二食堂', '信一', '信二', '一食堂', '二食堂', '星湖一路食堂'],
  },
  'info-south-canteen': {
    id: 'info-south-canteen',
    name: '信息学部星湖路食堂',
    shortName: '信部星湖路',
    category: 'dining',
    zone: '信息学部',
    position: [30.528700, 114.359200], // 信息学部 hub 附近估算（三、四食堂）
    icon: 'restaurant',
    accent: 'secondary',
    description: '按公开位置描述调整到星湖路食堂组团，靠近星湖庭园、宿舍群和信息学部南侧出入口。',
    aliases: ['信息学部三食堂', '信息学部四食堂', '信三', '信四', '三食堂', '四食堂', '星湖路食堂'],
  },
  'engineering-songyuan-canteen': {
    id: 'engineering-songyuan-canteen',
    name: '工学部松园东路食堂',
    shortName: '工学部松园',
    category: 'dining',
    zone: '工学部',
    position: [30.543863, 114.362329], // 工学部 hub 位置（松园食堂在其附近）
    icon: 'restaurant',
    accent: 'secondary',
    description: '按公开位置描述调整到松园东路食堂组团，覆盖工一、工二和民族食堂所在楼栋。',
    aliases: ['工学部学生一食堂', '工学部二食堂', '工学部民族食堂', '民族食堂', '清真食堂', '清真餐厅', '工一', '工二', '松园东路食堂'],
  },
  'guiyuan-canteen': {
    id: 'guiyuan-canteen',
    name: '桂园食堂',
    shortName: '桂园食堂',
    category: 'dining',
    zone: '文理学部',
    position: [30.538440, 114.358978], // 高德地理编码 "武汉大学桂园餐厅" 精确命中
    icon: 'restaurant',
    accent: 'secondary',
    description: '按公开位置描述调整到桂园一路，靠近桂园操场、第六教学楼和计算机学院一带。',
    aliases: ['桂园食堂', '桂园'],
  },
  'fengyuan-canteen': {
    id: 'fengyuan-canteen',
    name: '枫园食堂',
    shortName: '枫园食堂',
    category: 'dining',
    zone: '文理学部',
    position: [30.537077, 114.371760], // 高德地理编码 "武汉大学枫园食堂" 精确命中
    icon: 'restaurant',
    accent: 'secondary',
    description: '按公开位置描述调整到枫园路，靠近枫园教学楼与留学生宿舍片区。',
    aliases: ['枫园食堂', '枫园'],
  },
  'hubin-canteen': {
    id: 'hubin-canteen',
    name: '湖滨食堂',
    shortName: '湖滨食堂',
    category: 'dining',
    zone: '文理学部',
    position: [30.541452, 114.369980], // POI搜索 "珞珈面馆(湖滨店)" 地址确认为武大湖滨食堂2楼
    icon: 'restaurant',
    accent: 'secondary',
    description: '按公开位置描述调整到湖滨路，靠近湖滨宿舍、法学院和外国语言文学学院。',
    aliases: ['湖滨食堂', '湖滨'],
  },
};

export const DINING_POIS = Object.values(CAMPUS_POIS).filter((poi) => poi.category === 'dining');
export const DEFAULT_DINING_POI_ID = 'info-xinghu-canteen';
export const STORAGE_VERSION = '2026-04-18-reset-1';

const LEGACY_DINING_POI_MAP: Record<string, string> = {
  canteen1: 'info-xinghu-canteen',
  canteen2: 'engineering-songyuan-canteen',
  'info-canteen-1': 'info-xinghu-canteen',
  'info-canteen-2': 'info-xinghu-canteen',
  'info-canteen-3': 'info-south-canteen',
  'engineering-canteen-1': 'engineering-songyuan-canteen',
  'engineering-halal': 'engineering-songyuan-canteen',
};

export function getDiningPois(): CampusPoi[] {
  return DINING_POIS;
}

export function getAllDiningPois(customDiningPois: CampusPoi[] = []): CampusPoi[] {
  return [...DINING_POIS, ...normalizeCustomDiningPois(customDiningPois)];
}

export function getDiningPoiById(id: string, customDiningPois: CampusPoi[] = []): CampusPoi {
  const normalizedCustomPois = normalizeCustomDiningPois(customDiningPois);
  const normalizedId = normalizeDiningPoiId(id, normalizedCustomPois);
  return (
    normalizedCustomPois.find((poi) => poi.id === normalizedId) ??
    CAMPUS_POIS[normalizedId] ??
    CAMPUS_POIS[DEFAULT_DINING_POI_ID]
  );
}

export function normalizeDiningPoiId(id: string | null | undefined, customDiningPois: CampusPoi[] = []): string {
  if (!id) {
    return DEFAULT_DINING_POI_ID;
  }

  const mapped = LEGACY_DINING_POI_MAP[id] ?? id;
  const isStaticDiningPoi = mapped in CAMPUS_POIS && CAMPUS_POIS[mapped].category === 'dining';
  const isCustomDiningPoi = normalizeCustomDiningPois(customDiningPois).some((poi) => poi.id === mapped);

  return isStaticDiningPoi || isCustomDiningPoi ? mapped : DEFAULT_DINING_POI_ID;
}

export function isValidLatLngTuple(value: unknown): value is LatLngTuple {
  if (!Array.isArray(value) || value.length !== 2) {
    return false;
  }

  const [lat, lng] = value;
  return isFiniteNumber(lat) && isFiniteNumber(lng);
}

export function normalizeCustomDiningPois(customDiningPois: CampusPoi[] = []): CampusPoi[] {
  return customDiningPois.filter((poi) =>
    poi?.category === 'dining' &&
    typeof poi.id === 'string' &&
    typeof poi.name === 'string' &&
    typeof poi.shortName === 'string' &&
    typeof poi.zone === 'string' &&
    typeof poi.icon === 'string' &&
    typeof poi.description === 'string' &&
    isValidLatLngTuple(poi.position),
  );
}

export function getAccentColor(accent: AccentTone): string {
  if (accent === 'secondary') {
    return '#10B981';
  }
  if (accent === 'tertiary') {
    return '#F59E0B';
  }
  return '#38BDF8';
}

export function resolveCoursePoi(location: string, diningPoiId: string, customDiningPois: CampusPoi[] = []): CampusPoi {
  const normalized = location.replace(/\s+/g, '');
  const preferredDiningPoi = getDiningPoiById(diningPoiId, customDiningPois);
  const allDiningPois = getAllDiningPois(customDiningPois);

  if (!normalized) {
    return CAMPUS_POIS.informationHub;
  }

  // 数字区号映射（优先于中文关键词匹配）：
  //   1 / 1区 / 1- → 文理学部
  //   2 / 2区 / 2- → 工学部
  //   3 / 3区 / 3- → 信息学部
  // 支持格式：纯数字、"X区"、"X-教室号"、"X区X-教室号"
  const zoneMatch = normalized.match(/^([123])(?:[区\-]|$)/);
  if (zoneMatch) {
    const zone = zoneMatch[1];
    if (zone === '1') return CAMPUS_POIS.liberalArtsHub;
    if (zone === '2') return CAMPUS_POIS.engineeringHub;
    if (zone === '3') return CAMPUS_POIS.informationHub;
  }

  if (/宿舍|寝室/.test(normalized)) {
    return CAMPUS_POIS.dormitory;
  }
  if (/食堂|餐厅|桂园|枫园|湖滨|清真|民族/.test(normalized)) {
    const matchedDining = allDiningPois.find((poi) => {
      const candidates = [poi.name, poi.shortName, ...(poi.aliases ?? [])];
      return candidates.some((candidate) => normalized.includes(candidate.replace(/\s+/g, '')));
    });

    return matchedDining ?? preferredDiningPoi;
  }
  if (/工学|工学部|动力|电气|土建|水利/.test(normalized)) {
    return CAMPUS_POIS.engineeringHub;
  }
  if (/文理|文科|理学|主楼|教三|教四|教五/.test(normalized)) {
    return CAMPUS_POIS.liberalArtsHub;
  }
  if (/信息|信部|计院|遥感|网安|实验楼|测绘/.test(normalized)) {
    return CAMPUS_POIS.informationHub;
  }

  return CAMPUS_POIS.informationHub;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
