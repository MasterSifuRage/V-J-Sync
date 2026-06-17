import { useTranslation } from 'react-i18next';
import { resolveMediaUrl } from '../../lib/apiBase';
import { TaskAttachment } from '../../types';
import './TaskAttachmentList.css';

type TaskAttachmentListProps = {
  attachments: TaskAttachment[];
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TaskAttachmentList({ attachments }: TaskAttachmentListProps) {
  const { t } = useTranslation();
  if (!attachments.length) return null;

  return (
    <div className="task-attachment-list">
      <h4 className="task-attachment-list-title">
        <i className="fas fa-paperclip" /> {t('tasks.attachmentsTitle')}
      </h4>
      <ul>
        {attachments.map((file) => {
          const href = resolveMediaUrl(file.fileUrl) ?? file.fileUrl;
          return (
            <li key={file.id ?? file.fileUrl}>
              <a href={href} target="_blank" rel="noopener noreferrer" download={file.fileName}>
                <i className="fas fa-file-download" aria-hidden />
                <span className="task-attachment-name">{file.fileName}</span>
                {file.fileSize ? (
                  <span className="task-attachment-size">{formatFileSize(file.fileSize)}</span>
                ) : null}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
