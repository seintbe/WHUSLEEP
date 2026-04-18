import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CampusDiningSelector from '@/components/CampusDiningSelector';
import { ProfileArtwork } from '@/components/EditorialArtwork';
import { useAppStore } from '@/store';

export default function Profile() {
  const { transportMode, setTransportMode, diningPOI, setDiningPOI, customDiningPois, addCustomDiningPoi, removeCustomDiningPoi } = useAppStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const navigate = useNavigate();
  // Bug 9 Fix: 从 localStorage 读取持久化的用户信息，而非每次用硬编码默认值
  const [userInfo, setUserInfo] = useState(() => {
    const saved = localStorage.getItem('userInfo');
    if (saved) {
      try {
        return JSON.parse(saved) as { name: string; studentId: string; major: string; grade: string };
      } catch {
        // 解析失败则使用默认值
      }
    }
    return {
      name: '用户',
      studentId: '2023000000',
      major: '计算机科学与技术',
      grade: '2023级',
    };
  });

  const handleEditUserInfo = () => {
    // Bug 9 Fix: 原实现注释掉了保存逻辑，修改后关弹窗但数据不持久。
    // 现在将用户信息写入 localStorage，刷新后依然保留。
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    setShowEditModal(false);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <section className="page-canvas paper-panel relative mb-8 overflow-hidden rounded-[36px] px-6 py-8 sm:px-8 sm:py-10">
        <div className="ambient-line top-6" />
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="relative z-10">
            <p className="editorial-kicker">Profile</p>
            <div className="mt-5 flex items-center gap-5">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-primary bg-surface-container-low">
                {/* Bug 15 Fix: 原来硬编码一个外部 Google 图片 URL 作为头像，随时可能失效。
                    改为用用户名首字母生成内置头像，简单可靠且无外部依赖。*/}
                <div className="flex h-full w-full select-none items-center justify-center bg-primary text-3xl font-bold text-on-primary">
                  {userInfo.name.charAt(0) || '?'}
                </div>
              </div>
              <div className="flex-1">
                <h2 className="font-headline text-4xl font-semibold text-on-surface">{userInfo.name}</h2>
                <p className="mt-2 text-sm text-on-surface-variant">{userInfo.studentId} | {userInfo.major} | {userInfo.grade}</p>
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  data-ai-label="编辑个人资料"
                  data-ai-context="用户准备修改个人基础信息，这些内容会影响应用里的个性化展示。"
                  className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
                >
                  编辑资料
                </button>
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <ProfileArtwork className="mx-auto max-w-[260px]" />
          </div>
        </div>
      </section>

      {/* Settings Sections */}
      <section className="space-y-6">
        {/* Basic Settings */}
        <div className="paper-panel rounded-[32px] p-6 sm:p-8">
          <h3 className="mb-6 text-2xl font-headline font-semibold text-on-surface">基本设置</h3>
          
          <div className="space-y-4">
            {/* Transport Mode */}
            <div>
              <h4 className="text-sm font-medium text-on-surface-variant mb-3">日常交通方式</h4>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'walking', icon: 'directions_walk', title: '步行' },
                  { id: 'ebike', icon: 'moped', title: '电动车' },
                  { id: 'bus', icon: 'directions_bus', title: '校巴' },
                ].map((mode) => (
                  <button
                    type="button"
                    key={mode.id}
                    onClick={() => setTransportMode(mode.id)}
                    data-ai-label={`在个人页选择交通方式：${mode.title}`}
                    data-ai-context="交通偏好会影响时间轴、地图路线和操作提示对校园动线的解释。"
                    className={`rounded-[24px] border p-4 transition-colors flex flex-col items-center ${
                      transportMode === mode.id ? 'bg-white border-primary shadow-[0_18px_38px_rgba(83,58,34,0.08)]' : 'bg-white/58 border-outline-variant hover:bg-white/72'
                    }`}
                  >
                    <span className={`material-symbols-outlined mb-2 ${transportMode === mode.id ? 'text-primary' : 'text-on-surface-variant'}`}>
                      {mode.icon}
                    </span>
                    <span className={`text-sm font-medium ${transportMode === mode.id ? 'text-primary' : 'text-on-surface'}`}>
                      {mode.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dining Preference */}
            <div>
              <h4 className="text-sm font-medium text-on-surface-variant mb-3">偏好干饭地点</h4>
              <CampusDiningSelector
                value={diningPOI}
                onChange={setDiningPOI}
                customPois={customDiningPois}
                onAddCustomPoi={addCustomDiningPoi}
                onRemoveCustomPoi={removeCustomDiningPoi}
                compact
              />
            </div>
          </div>
        </div>

        {/* App Settings */}
        <div className="paper-panel rounded-[32px] p-6 sm:p-8">
          <h3 className="mb-6 text-2xl font-headline font-semibold text-on-surface">应用设置</h3>
          
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              data-ai-label="进入课表识别与校准"
              data-ai-context="用户想回到引导页重新处理课表 OCR 和课程校准。"
              className="flex w-full items-center justify-between rounded-[22px] bg-white/68 p-4 text-left transition-colors hover:bg-white"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-on-surface-variant">scan</span>
                <span className="text-sm font-medium">课表识别与校准</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </button>
            <button
              type="button"
              data-ai-label="打开通知设置"
              data-ai-context="这里是通知能力的预留入口，提示层需要解释未来会如何影响睡眠提醒。"
              className="flex w-full items-center justify-between rounded-[22px] bg-white/68 p-4 text-left transition-colors hover:bg-white"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
                <span className="text-sm font-medium">通知设置</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </button>
            
            <button
              type="button"
              data-ai-label="打开语言设置"
              data-ai-context="这里是语言能力的预留入口，提示层需要解释未来会如何影响应用表达。"
              className="flex w-full items-center justify-between rounded-[22px] bg-white/68 p-4 text-left transition-colors hover:bg-white"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-on-surface-variant">language</span>
                <span className="text-sm font-medium">语言设置</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </button>
            
            <button
              type="button"
              data-ai-label="打开隐私设置"
              data-ai-context="这里是隐私能力的预留入口，提示层需要解释课表和睡眠数据的使用边界。"
              className="flex w-full items-center justify-between rounded-[22px] bg-white/68 p-4 text-left transition-colors hover:bg-white"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-on-surface-variant">privacy_tip</span>
                <span className="text-sm font-medium">隐私设置</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </button>
            
            <button
              type="button"
              data-ai-label="打开存储管理"
              data-ai-context="这里是存储能力的预留入口，提示层需要解释课表图片和本地缓存会如何管理。"
              className="flex w-full items-center justify-between rounded-[22px] bg-white/68 p-4 text-left transition-colors hover:bg-white"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-on-surface-variant">storage</span>
                <span className="text-sm font-medium">存储管理</span>
              </div>
              <span className="text-sm text-on-surface-variant">12.5 MB</span>
            </button>
          </div>
        </div>

        {/* About */}
        <div className="paper-panel rounded-[32px] p-6 sm:p-8">
          <h3 className="mb-6 text-2xl font-headline font-semibold text-on-surface">关于</h3>
          
          <div className="space-y-3">
            <button
              type="button"
              data-ai-label="查看关于应用"
              data-ai-context="用户想知道应用版本和产品定位，这里需要给出更清楚的产品说明。"
              className="flex w-full items-center justify-between rounded-[22px] bg-white/68 p-4 text-left transition-colors hover:bg-white"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-on-surface-variant">info</span>
                <span className="text-sm font-medium">关于应用</span>
              </div>
              <span className="text-sm text-on-surface-variant">v1.0.0</span>
            </button>
            
            <button
              type="button"
              data-ai-label="打开帮助与反馈"
              data-ai-context="用户可能遇到了使用问题，这里需要给出帮助入口的解释。"
              className="flex w-full items-center justify-between rounded-[22px] bg-white/68 p-4 text-left transition-colors hover:bg-white"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-on-surface-variant">help</span>
                <span className="text-sm font-medium">帮助与反馈</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </button>
            
            <button
              type="button"
              data-ai-label="给应用评分"
              data-ai-context="用户准备评价应用，这里需要解释评分会反馈哪些维度。"
              className="flex w-full items-center justify-between rounded-[22px] bg-white/68 p-4 text-left transition-colors hover:bg-white"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-on-surface-variant">rate_review</span>
                <span className="text-sm font-medium">给我们评分</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          data-ai-label="退出登录"
          data-ai-context="用户准备离开当前账号状态，这里需要提醒本地数据和会话影响。"
          className="w-full rounded-full bg-error-container px-6 py-4 text-lg font-bold tracking-widest text-error transition-all hover:bg-error-container/90 active:scale-95"
        >
          退出登录
        </button>
      </section>

      {/* Edit User Info Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,29,25,0.18)] p-6 backdrop-blur-sm">
          <div className="paper-panel max-w-md w-full rounded-[32px] p-8">
            <h2 className="text-2xl font-bold text-on-surface mb-6 text-center">编辑个人资料</h2>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm text-on-surface-variant font-bold mb-2">姓名</label>
                <input
                  type="text"
                  value={userInfo.name}
                  onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                  className="w-full bg-surface p-4 rounded-xl border border-outline focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm text-on-surface-variant font-bold mb-2">学号</label>
                <input
                  type="text"
                  value={userInfo.studentId}
                  onChange={(e) => setUserInfo({ ...userInfo, studentId: e.target.value })}
                  className="w-full bg-surface p-4 rounded-xl border border-outline focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm text-on-surface-variant font-bold mb-2">专业</label>
                <input
                  type="text"
                  value={userInfo.major}
                  onChange={(e) => setUserInfo({ ...userInfo, major: e.target.value })}
                  className="w-full bg-surface p-4 rounded-xl border border-outline focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm text-on-surface-variant font-bold mb-2">年级</label>
                <input
                  type="text"
                  value={userInfo.grade}
                  onChange={(e) => setUserInfo({ ...userInfo, grade: e.target.value })}
                  className="w-full bg-surface p-4 rounded-xl border border-outline focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={handleEditUserInfo}
                data-ai-label="保存个人资料"
                data-ai-context="用户已修改个人资料，保存后个人页会立即使用这份新信息。"
                className="w-full bg-primary text-on-primary font-bold py-4 rounded-xl hover:bg-primary/90 transition-colors"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                data-ai-label="取消编辑个人资料"
                data-ai-context="用户放弃当前个人资料改动。"
                className="w-full bg-surface-container-low text-on-surface font-bold py-4 rounded-xl hover:bg-surface-container transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
