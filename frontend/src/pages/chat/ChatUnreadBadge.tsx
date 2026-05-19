/** Badge số tin nhắn chưa đọc (sidebar chat) */
export default function ChatUnreadBadge({ count }: { count: number }) {
  if (!count || count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <span className="chat-unread-badge" aria-label={`${count} tin nhắn chưa đọc`}>
      {label}
    </span>
  );
}
