'use client'

import { useEffect, useState, useTransition } from 'react'
import { UserPlus, Trash2, Users } from 'lucide-react'
import BottomSheet from './BottomSheet'
import { getFriends, addFriendByEmail, removeFriend } from '@/lib/actions/friends'
import type { User } from '@/lib/types'

interface FriendsSheetProps {
  open: boolean
  onClose: () => void
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export default function FriendsSheet({ open, onClose }: FriendsSheetProps) {
  const [friends, setFriends] = useState<User[]>([])
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    getFriends().then(setFriends)
  }, [open])

  function handleClose() {
    setEmail('')
    setError(null)
    setSuccess(false)
    onClose()
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await addFriendByEmail(email)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setEmail('')
        const updated = await getFriends()
        setFriends(updated)
      }
    })
  }

  function handleRemove(friendId: string) {
    startTransition(async () => {
      await removeFriend(friendId)
      setFriends((prev) => prev.filter((f) => f.id !== friendId))
    })
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="Friends">
      {/* Add by email */}
      <form onSubmit={handleAdd} className="mb-6">
        <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 block">
          Add by email
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            autoComplete="email"
            className="flex-1 bg-zinc-800 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-zinc-600"
          />
          <button
            type="submit"
            disabled={!email.trim() || isPending}
            className="w-12 h-12 bg-green-400 rounded-2xl flex items-center justify-center text-black shrink-0 disabled:opacity-40 transition-opacity"
          >
            <UserPlus size={18} strokeWidth={2.5} />
          </button>
        </div>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        {success && <p className="text-green-400 text-xs mt-2">Friend added!</p>}
      </form>

      {/* Friends list */}
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
        Your Friends ({friends.length})
      </p>

      {friends.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
            <Users size={24} className="text-zinc-600" />
          </div>
          <p className="text-zinc-400 text-sm font-medium">No friends yet</p>
          <p className="text-zinc-600 text-xs mt-1">Add someone above to get started</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {friends.map((friend) => (
            <li
              key={friend.id}
              className="flex items-center gap-3 bg-zinc-800 rounded-2xl px-4 py-3"
            >
              <Avatar name={friend.display_name} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">
                  {friend.display_name}
                </p>
                {friend.email && (
                  <p className="text-zinc-500 text-xs truncate">{friend.email}</p>
                )}
              </div>
              <button
                onClick={() => handleRemove(friend.id)}
                className="text-zinc-600 active:text-red-400 transition-colors p-1"
                aria-label="Remove friend"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  )
}
