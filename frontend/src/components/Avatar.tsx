import { useState } from 'react';

const PALETTE = [
  'bg-azure-600',
  'bg-sky-500',
  'bg-indigo-500',
  'bg-teal-600',
  'bg-slate-500',
  'bg-cyan-700',
  'bg-blue-800',
  'bg-rose-400',
];

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  id?: number | null;
  name?: string;
  size?: AvatarSize;
}

// Deterministic mock portrait per employee id (randomuser.me static files)
function portraitUrl(employeeId: number): string {
  const gender = employeeId % 2 === 0 ? 'women' : 'men';
  const idx = (employeeId * 13) % 100;
  return `https://randomuser.me/api/portraits/${gender}/${idx}.jpg`;
}

export default function Avatar({ id, name = '', size = 'md' }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  const sizeCls = size === 'lg' ? 'h-12 w-12' : size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  const textCls = size === 'lg' ? 'text-sm' : 'text-[10px]';
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
  const bg = id == null ? PALETTE[0] : PALETTE[Math.abs(id) % PALETTE.length];

  if (failed || !id) {
    return (
      <div
        className={`flex ${sizeCls} shrink-0 items-center justify-center rounded-full ${bg} font-bold text-white ${textCls}`}
        aria-hidden="true"
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={portraitUrl(id)}
      alt={name}
      onError={() => setFailed(true)}
      loading="lazy"
      className={`${sizeCls} shrink-0 rounded-full object-cover shadow-sm ring-2 ring-white`}
    />
  );
}
