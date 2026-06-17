import { resolveMediaUrl } from '../../lib/apiBase';
import './ChatMessageFile.css';

export type ChatFileItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType?: string | null;
  createdAt?: string;
  senderName?: string;
};

type ChatMessageFileProps = {
  file: Pick<ChatFileItem, 'fileName' | 'fileUrl' | 'fileType'>;
  variant?: 'bubble' | 'sidebar';
};

export default function ChatMessageFile({ file, variant = 'bubble' }: ChatMessageFileProps) {
  const href = resolveMediaUrl(file.fileUrl) ?? file.fileUrl;
  const isImage = file.fileType === 'image' || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.fileName);

  if (variant === 'bubble' && isImage) {
    return (
      <a className="chat-message-file chat-message-file--image" href={href} target="_blank" rel="noopener noreferrer">
        <img src={href} alt={file.fileName} />
      </a>
    );
  }

  return (
    <a
      className={`chat-message-file chat-message-file--${variant}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      download={file.fileName}
    >
      <i className="fas fa-file-alt" aria-hidden />
      <span className="chat-message-file-name">{file.fileName}</span>
    </a>
  );
}
