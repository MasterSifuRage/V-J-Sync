import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { TaskAttachment } from '../../types';
import { taskAPI } from '../../services/api';
import { editorHtmlToMarkdown, markdownToEditorHtml } from '../../lib/richTextMarkdown';
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
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef(value);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      if (document.activeElement !== el) {
        el.innerHTML = markdownToEditorHtml(value);
      }
      return;
    }
    if (!el.innerHTML && value) {
      el.innerHTML = markdownToEditorHtml(value);
    }
  }, [value]);

  const emitChange = () => {
    const el = editorRef.current;
    if (!el) return;
    const markdown = editorHtmlToMarkdown(el.innerHTML);
    lastEmitted.current = markdown;
    onChange(markdown);
  };

  const applyFormat = (command: string, commandValue?: string) => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
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
    const localName = file.name;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await taskAPI.uploadAttachment(workspaceId, formData);
      const uploaded = res.data.attachment;
      if (uploaded?.fileUrl) {
        onAttachmentsChange([
          ...attachments,
          { ...uploaded, fileName: uploaded.fileName || localName },
        ]);
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
        <button type="button" title={t('tasks.bold')} disabled={disabled} onClick={() => applyFormat('bold')}>
          <i className="fas fa-bold" />
        </button>
        <button type="button" title={t('tasks.italic')} disabled={disabled} onClick={() => applyFormat('italic')}>
          <i className="fas fa-italic" />
        </button>
        <button
          type="button"
          title={t('tasks.list')}
          disabled={disabled}
          onClick={() => applyFormat('insertUnorderedList')}
        >
          <i className="fas fa-list-ul" />
        </button>
        <span className="markdown-editor-divider" />
        <button
          type="button"
          title={t('tasks.alignLeft')}
          disabled={disabled}
          onClick={() => applyFormat('justifyLeft')}
        >
          <i className="fas fa-align-left" />
        </button>
        <button
          type="button"
          title={t('tasks.alignCenter')}
          disabled={disabled}
          onClick={() => applyFormat('justifyCenter')}
        >
          <i className="fas fa-align-center" />
        </button>
        <button
          type="button"
          title={t('tasks.alignRight')}
          disabled={disabled}
          onClick={() => applyFormat('justifyRight')}
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

      <div
        ref={editorRef}
        className="markdown-editor-body markdown-content"
        contentEditable={!disabled}
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '  ');
            emitChange();
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
    </div>
  );
}
