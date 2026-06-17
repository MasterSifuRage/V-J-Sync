import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { TaskAttachment } from '../../types';
import { taskAPI } from '../../services/api';
import {
  applyAlignBlock,
  applyBulletList,
  applyTextEdit,
  getTextSelection,
  wrapSelection,
} from '../../lib/markdownToolbar';
import './MarkdownEditor.css';

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  workspaceId: string;
  attachments: TaskAttachment[];
  onAttachmentsChange: (attachments: TaskAttachment[]) => void;
  disabled?: boolean;
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
  workspaceId,
  attachments,
  onAttachmentsChange,
  disabled = false,
}: MarkdownEditorProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const runEdit = (edit: (selection: ReturnType<typeof getTextSelection>) => { value: string; cursor: number }) => {
    const textarea = textareaRef.current;
    if (!textarea || disabled) return;
    const result = edit(getTextSelection(value, textarea));
    applyTextEdit(textarea, result.value, result.cursor, onChange);
  };

  const handleAttachPick = () => {
    if (!uploading && !disabled) fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError(t('tasks.attachmentTooLarge'));
      return;
    }

    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await taskAPI.uploadAttachment(workspaceId, formData);
      const uploaded = res.data.attachment;
      if (uploaded?.fileUrl) {
        onAttachmentsChange([...attachments, uploaded]);
      }
    } catch {
      setUploadError(t('tasks.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (fileUrl: string) => {
    onAttachmentsChange(attachments.filter((a) => a.fileUrl !== fileUrl));
  };

  return (
    <div className={`markdown-editor ${disabled ? 'is-disabled' : ''}`}>
      <div className="markdown-editor-toolbar">
        <button
          type="button"
          title={t('tasks.bold')}
          disabled={disabled}
          onClick={() => runEdit((sel) => wrapSelection(sel, '**', '**', t('tasks.markdownPlaceholder')))}
        >
          <i className="fas fa-bold" />
        </button>
        <button
          type="button"
          title={t('tasks.italic')}
          disabled={disabled}
          onClick={() => runEdit((sel) => wrapSelection(sel, '*', '*', t('tasks.markdownPlaceholder')))}
        >
          <i className="fas fa-italic" />
        </button>
        <button
          type="button"
          title={t('tasks.list')}
          disabled={disabled}
          onClick={() => runEdit((sel) => applyBulletList(sel, t('tasks.markdownListItem')))}
        >
          <i className="fas fa-list-ul" />
        </button>
        <span className="markdown-editor-divider" />
        <button
          type="button"
          title={t('tasks.alignLeft')}
          disabled={disabled}
          onClick={() => runEdit((sel) => applyAlignBlock(sel, 'left', t('tasks.markdownPlaceholder')))}
        >
          <i className="fas fa-align-left" />
        </button>
        <button
          type="button"
          title={t('tasks.alignCenter')}
          disabled={disabled}
          onClick={() => runEdit((sel) => applyAlignBlock(sel, 'center', t('tasks.markdownPlaceholder')))}
        >
          <i className="fas fa-align-center" />
        </button>
        <button
          type="button"
          title={t('tasks.alignRight')}
          disabled={disabled}
          onClick={() => runEdit((sel) => applyAlignBlock(sel, 'right', t('tasks.markdownPlaceholder')))}
        >
          <i className="fas fa-align-right" />
        </button>
        <span className="markdown-editor-divider" />
        <button
          type="button"
          title={t('tasks.attach')}
          disabled={disabled || uploading}
          onClick={handleAttachPick}
        >
          <i className={uploading ? 'fas fa-spinner fa-spin' : 'fas fa-paperclip'} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          disabled={disabled || uploading}
          onChange={handleFileChange}
        />
      </div>

      <textarea
        ref={textareaRef}
        className="markdown-editor-textarea"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            runEdit((sel) => wrapSelection(sel, '  ', '', ''));
          }
        }}
      />

      {attachments.length > 0 && (
        <ul className="markdown-editor-attachments">
          {attachments.map((file) => (
            <li key={file.fileUrl}>
              <i className="fas fa-file-alt" aria-hidden />
              <span className="markdown-editor-attachment-name" title={file.fileName}>
                {file.fileName}
              </span>
              {file.fileSize ? (
                <span className="markdown-editor-attachment-size">{formatFileSize(file.fileSize)}</span>
              ) : null}
              <button
                type="button"
                className="markdown-editor-attachment-remove"
                title={t('tasks.removeAttachment')}
                disabled={disabled}
                onClick={() => removeAttachment(file.fileUrl)}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}

      {uploadError && <p className="markdown-editor-error">{uploadError}</p>}
      <p className="markdown-editor-hint">{t('tasks.markdownHint')}</p>
    </div>
  );
}
