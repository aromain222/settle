import type { Bet, BetStatus } from '@/lib/types'

const STATUS_CONFIG: Record<
  BetStatus,
  { border: string; badge: string; label: string }
> = {
  pending:   { border: 'border-yellow-400', badge: 'bg-yellow-400 text-black', label: 'PENDING' },
  active:    { border: 'border-blue-400',   badge: 'bg-blue-400 text-black',   label: 'LOCKED' },
  resolving: { border: 'border-red-400',    badge: 'bg-red-400 text-black',    label: 'RESOLVE' },
  disputed:  { border: 'border-orange-400', badge: 'bg-orange-400 text-black', label: '🚩 DISPUTED' },
  settled:   { border: 'border-zinc-600',   badge: 'bg-zinc-600 text-white',   label: 'SETTLED' },
  paid:      { border: 'border-zinc-700',   badge: 'bg-zinc-700 text-white',   label: 'PAID' },
  cancelled: { border: 'border-zinc-700',   badge: 'bg-zinc-700 text-zinc-400', label: 'CANCELLED' },
}

interface BetCardProps {
  bet: Bet
  currentUserId: string
  onClick?: () => void
}

export default function BetCard({ bet, currentUserId, onClick }: BetCardProps) {
  const cfg = STATUS_CONFIG[bet.status]
  const opponent =
    bet.creator_id === currentUserId ? bet.opponent : bet.creator

  const stakeDisplay =
    bet.amount != null
      ? `$${Number(bet.amount).toFixed(0)}`
      : (bet.stake_label ?? '—')

  const deadline = new Date(bet.deadline)
  const diffMs = deadline.getTime() - Date.now()
  const diffDays = Math.ceil(diffMs / 86_400_000)
  const deadlineLabel =
    diffMs < 0
      ? 'Deadline passed'
      : diffDays === 0
      ? 'Due today'
      : `${diffDays}d left`

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-zinc-900 rounded-xl p-3 border-l-4 ${cfg.border} mb-2 active:opacity-70 transition-opacity`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">
            {bet.description}
          </p>
          <p className="text-zinc-500 text-xs mt-0.5">
            vs {opponent?.display_name ?? 'Pending...'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-white">{stakeDisplay}</p>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.badge}`}
          >
            {cfg.label}
          </span>
        </div>
      </div>
      <p className="text-zinc-600 text-[10px] mt-2">{deadlineLabel}</p>
    </button>
  )
}
