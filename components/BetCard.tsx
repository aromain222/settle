import type { Bet, BetStatus } from '@/lib/types'

const STATUS_CONFIG: Record<BetStatus, { bg: string; text: string; dot: string; label: string }> = {
  pending:   { bg: 'bg-yellow-400/10', text: 'text-yellow-400', dot: 'bg-yellow-400', label: 'Awaiting' },
  active:    { bg: 'bg-blue-400/10',   text: 'text-blue-400',   dot: 'bg-blue-400',   label: 'Locked in' },
  resolving: { bg: 'bg-red-400/10',    text: 'text-red-400',    dot: 'bg-red-400',    label: 'Resolve now' },
  disputed:  { bg: 'bg-orange-400/10', text: 'text-orange-400', dot: 'bg-orange-400', label: 'Disputed' },
  settled:   { bg: 'bg-zinc-800/60',   text: 'text-zinc-500',   dot: 'bg-zinc-600',   label: 'Settled' },
  paid:      { bg: 'bg-zinc-800/60',   text: 'text-zinc-500',   dot: 'bg-zinc-600',   label: 'Paid' },
  cancelled: { bg: 'bg-zinc-800/40',   text: 'text-zinc-600',   dot: 'bg-zinc-700',   label: 'Cancelled' },
}

function InitialAvatar({ name, style }: { name: string; style?: React.CSSProperties }) {
  return (
    <div
      className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-white border-2 border-zinc-900 shrink-0"
      style={style}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

interface BetCardProps {
  bet: Bet
  currentUserId: string
  onClick?: () => void
}

export default function BetCard({ bet, currentUserId, onClick }: BetCardProps) {
  const cfg = STATUS_CONFIG[bet.status]
  const isMe = bet.creator_id === currentUserId
  const me = isMe ? bet.creator : bet.opponent
  const opponent = isMe ? bet.opponent : bet.creator

  const stakeDisplay =
    bet.amount != null
      ? `$${Number(bet.amount).toFixed(0)}`
      : (bet.stake_label ?? '—')

  const deadline = bet.deadline ? new Date(bet.deadline) : null
  let deadlineLabel = ''
  if (deadline) {
    const diffMs = deadline.getTime() - Date.now()
    const diffDays = Math.ceil(diffMs / 86_400_000)
    if (diffMs < 0) deadlineLabel = 'Expired'
    else if (diffDays === 0) deadlineLabel = 'Due today'
    else if (diffDays === 1) deadlineLabel = 'Tomorrow'
    else deadlineLabel = `${diffDays}d left`
  }

  const isDim = ['settled', 'paid', 'cancelled'].includes(bet.status)
  const needsAction =
    bet.status === 'active' ||
    (bet.status === 'resolving' &&
      (!bet.declared_winner_id || bet.declarer_id !== currentUserId))

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl p-4 mb-2.5 active:opacity-70 transition-opacity ${isDim ? 'bg-zinc-900/50' : 'bg-zinc-900'}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar stack */}
        <div className="flex items-center shrink-0 pt-0.5">
          {me ? (
            <InitialAvatar name={me.display_name} />
          ) : (
            <div className="w-7 h-7 rounded-full bg-zinc-800 border-2 border-zinc-700 shrink-0" />
          )}
          {opponent ? (
            <InitialAvatar name={opponent.display_name} style={{ marginLeft: -8 }} />
          ) : (
            <div
              className="w-7 h-7 rounded-full bg-zinc-800 border-2 border-dashed border-zinc-600 flex items-center justify-center shrink-0"
              style={{ marginLeft: -8 }}
            >
              <span className="text-zinc-600 text-[10px]">?</span>
            </div>
          )}
        </div>

        {/* Description + opponent */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-snug ${isDim ? 'text-zinc-500' : 'text-white'}`}>
            {bet.description}
          </p>
          <p className="text-zinc-500 text-xs mt-0.5">
            vs {opponent?.display_name ?? 'Waiting for opponent...'}
          </p>
        </div>

        {/* Stake + deadline */}
        <div className="shrink-0 text-right">
          <p className={`text-base font-bold ${isDim ? 'text-zinc-600' : 'text-white'}`}>
            {stakeDisplay}
          </p>
          {deadlineLabel && !isDim && (
            <p className="text-zinc-600 text-[10px] mt-0.5">{deadlineLabel}</p>
          )}
        </div>
      </div>

      {/* Footer row: status badge + action hint */}
      <div className="flex items-center justify-between mt-3">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
        {needsAction && (
          <span className="text-[10px] text-red-400 font-medium">
            {bet.status === 'active'
              ? 'Tap to declare →'
              : !bet.declared_winner_id
              ? 'Tap to declare →'
              : 'Tap to confirm →'}
          </span>
        )}
      </div>
    </button>
  )
}
