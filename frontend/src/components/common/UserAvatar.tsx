import { useEffect, useState } from 'react';
import { getAvatarColor, getUserInitials } from '../../lib/userInitials';
import './UserAvatar.css';

export type UserAvatarSize = 'xs' | 'sm' | 'md' | 'lg';

type UserAvatarProps = {
  name?: string | null;
  avatarUrl?: string | null;
  size?: UserAvatarSize;
  className?: string;
  title?: string;
};

export default function UserAvatar({
  name,
  avatarUrl,
  size = 'md',
  className = '',
  title,
}: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const displayName = name?.trim() || 'User';
  const initials = getUserInitials(displayName);
  const bg = getAvatarColor(displayName);
  const showImage = Boolean(avatarUrl) && !imgFailed;

  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);

  return (
    <span
      className={`user-avatar user-avatar--${size} ${className}`.trim()}
      title={title ?? displayName}
      aria-hidden={title ? undefined : true}
    >
      {showImage ? (
        <img src={avatarUrl!} alt="" onError={() => setImgFailed(true)} />
      ) : (
        <span className="user-avatar__initials" style={{ backgroundColor: bg }}>
          {initials}
        </span>
      )}
    </span>
  );
}
