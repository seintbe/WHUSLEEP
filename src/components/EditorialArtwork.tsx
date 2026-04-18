import { cn } from '@/lib/utils';

function GradientDefs({ prefix }: { prefix: string }) {
  return (
    <defs>
      <linearGradient id={`${prefix}-primary`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D58B57" />
        <stop offset="100%" stopColor="#C46E43" />
      </linearGradient>
      <linearGradient id={`${prefix}-secondary`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A7B39A" />
        <stop offset="100%" stopColor="#6F8465" />
      </linearGradient>
      <linearGradient id={`${prefix}-sand`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F2E7D8" />
        <stop offset="100%" stopColor="#E8D8C5" />
      </linearGradient>
    </defs>
  );
}

export function SleepArtwork({ className }: { className?: string }) {
  const prefix = 'sleep-art';

  return (
    <svg
      aria-hidden="true"
      className={cn('h-auto w-full text-primary', className)}
      viewBox="0 0 320 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <GradientDefs prefix={prefix} />
      <rect x="40" y="34" width="240" height="212" rx="106" fill={`url(#${prefix}-sand)`} opacity="0.72" />
      <path
        d="M89 149C89 101.83 127.23 63.6 174.4 63.6C194.31 63.6 212.65 70.43 227.2 81.86C205.38 85.39 188.7 104.35 188.7 127.14C188.7 152.44 209.21 172.95 234.5 172.95C246.14 172.95 256.76 168.61 264.83 161.46C257.57 192.38 228.21 215.4 193.5 215.4C135.35 215.4 89 190.77 89 149Z"
        fill={`url(#${prefix}-primary)`}
        opacity="0.95"
      />
      <circle cx="103" cy="111" r="6" fill="#6F8465" opacity="0.9" />
      <circle cx="231" cy="82" r="4" fill="#D2A153" opacity="0.85" />
      <circle cx="249" cy="195" r="5" fill="#6F8465" opacity="0.8" />
      <path d="M55 180C95.667 164.667 141.967 161.333 194 170" stroke="#9E8975" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M130 223C172 209.667 214 206.333 256 213" stroke="#9E8975" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M112 92C135.667 108.667 150.333 129.333 156 154"
        stroke={`url(#${prefix}-secondary)`}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M206 196C218.667 188.667 231.333 176 244 158"
        stroke={`url(#${prefix}-secondary)`}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PathArtwork({ className }: { className?: string }) {
  const prefix = 'path-art';

  return (
    <svg
      aria-hidden="true"
      className={cn('h-auto w-full', className)}
      viewBox="0 0 320 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <GradientDefs prefix={prefix} />
      <rect x="24" y="26" width="272" height="188" rx="94" fill={`url(#${prefix}-sand)`} opacity="0.6" />
      <path d="M69 175C108 120 130 94 184 90C220 87.333 247.667 97.667 267 121" stroke="#6F8465" strokeWidth="8" strokeLinecap="round" opacity="0.24" />
      <path d="M66 177C105 122 128 97 181 93C217 90.333 244.333 100.333 263 123" stroke={`url(#${prefix}-secondary)`} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="65" cy="177" r="12" fill="#FFF7EF" stroke="#C46E43" strokeWidth="3" />
      <circle cx="264" cy="123" r="12" fill="#FFF7EF" stroke="#6F8465" strokeWidth="3" />
      <circle cx="163" cy="146" r="16" fill="#FFF7EF" stroke="#D2A153" strokeWidth="3" strokeDasharray="5 5" />
      <path d="M91 69H166" stroke="#9E8975" strokeWidth="2" strokeLinecap="round" />
      <path d="M184 69H229" stroke="#9E8975" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M96 92H221" stroke="#9E8975" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M91 115H200" stroke="#9E8975" strokeWidth="2" strokeLinecap="round" opacity="0.32" />
    </svg>
  );
}

export function ProfileArtwork({ className }: { className?: string }) {
  const prefix = 'profile-art';

  return (
    <svg
      aria-hidden="true"
      className={cn('h-auto w-full', className)}
      viewBox="0 0 280 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <GradientDefs prefix={prefix} />
      <rect x="30" y="26" width="220" height="168" rx="84" fill={`url(#${prefix}-sand)`} opacity="0.65" />
      <circle cx="140" cy="105" r="42" fill="#FFF7EF" stroke="#C46E43" strokeWidth="4" />
      <path d="M91 172C102.167 146 120 133 144.5 133C169 133 186.833 146 198 172" stroke={`url(#${prefix}-secondary)`} strokeWidth="5" strokeLinecap="round" />
      <path d="M112 98C122.667 82 132.667 74 142 74C151.333 74 160.667 82 170 98" stroke="#9E8975" strokeWidth="2" strokeLinecap="round" />
      <circle cx="96" cy="78" r="5" fill="#6F8465" />
      <circle cx="196" cy="151" r="6" fill="#D2A153" />
      <path d="M54 104H80" stroke="#9E8975" strokeWidth="2" strokeLinecap="round" />
      <path d="M199 65H225" stroke="#9E8975" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
