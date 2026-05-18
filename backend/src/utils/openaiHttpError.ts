import { Response } from 'express';
import { APIError, AuthenticationError, RateLimitError } from 'openai';

function isQuotaRelated429(err: RateLimitError): boolean {
  const raw = err.message || '';
  const e = err.error as { code?: string; message?: string } | string | undefined;
  const nested =
    typeof e === 'object' && e && 'code' in e
      ? `${(e as { code?: string }).code ?? ''} ${(e as { message?: string }).message ?? ''}`
      : typeof e === 'string'
        ? e
        : JSON.stringify(e ?? '');
  const blob = `${raw} ${nested}`.toLowerCase();
  return (
    blob.includes('insufficient_quota') ||
    blob.includes('billing_hard_limit') ||
    /exceeded your (current )?quota/.test(blob) ||
    /does not have enough (quota|balance)/.test(blob)
  );
}

/** OpenAI dùng sk-... Key Google (AIza...) không phải OpenAI — trả null để tránh gọi nhầm API. */
export function readOpenAIApiKey(): string | null {
  const raw = process.env.OPENAI_API_KEY;
  if (raw == null || typeof raw !== 'string') return null;
  const key = raw.replace(/^\uFEFF/, '').trim();
  let k = key;
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1).trim();
  }
  if (!k) return null;
  if (k === 'sk-your-openai-api-key') return null;
  if (k.startsWith('AIza')) return null;
  return k;
}

export function mapOpenAIError(err: unknown): { status: number; error: string } | null {
  if (err instanceof AuthenticationError) {
    return {
      status: 502,
      error:
        'OPENAI_API_KEY không hợp lệ hoặc bị từ chối. Kiểm tra backend/.env: key dạng sk-..., không có dấu ngoặc thừa, không ký tự ẩn; khởi động lại npm run dev sau khi sửa.',
    };
  }
  if (err instanceof RateLimitError) {
    if (isQuotaRelated429(err)) {
      return {
        status: 402,
        error:
          'OpenAI hết quota / cần nạp credit (429). Bạn có thể dùng Gemini: đặt GEMINI_API_KEY (Google AI Studio) hoặc AI_PROVIDER=gemini, rồi xóa/comment OPENAI_API_KEY nếu không dùng OpenAI. Billing OpenAI: https://platform.openai.com/account/billing',
      };
    }
    return {
      status: 429,
      error:
        'OpenAI giới hạn tần suất (429). Đợi 30–90 giây rồi bấm Dịch lại; nếu hay gặp, nâng gói hoặc hạn chế bấm Dịch liên tục.',
    };
  }
  if (err instanceof APIError) {
    const msg = err.message || '';
    const code = err.code;
    if (
      code === 'insufficient_quota' ||
      msg.includes('insufficient_quota') ||
      /billing|quota|credit/i.test(msg)
    ) {
      return {
        status: 402,
        error:
          'Tài khoản OpenAI hết quota hoặc chưa bật thanh toán. Vào https://platform.openai.com/account/billing để kiểm tra.',
      };
    }
    if (err.status === 401) {
      return {
        status: 502,
        error: 'OpenAI trả 401 — API key sai hoặc đã thu hồi. Tạo key mới tại platform.openai.com/api-keys.',
      };
    }
  }
  return null;
}

export function respondOpenAIFailure(res: Response, err: unknown, fallback: string) {
  console.error('[ai]', err);
  const mapped = mapOpenAIError(err);
  if (mapped) return res.status(mapped.status).json({ error: mapped.error });
  return res.status(500).json({
    error: fallback,
    ...(process.env.NODE_ENV === 'development' && err instanceof Error && { details: err.message }),
  });
}

function isRetryableOpenAI(err: unknown): boolean {
  if (err instanceof RateLimitError) return !isQuotaRelated429(err);
  if (err instanceof APIError) {
    const s = err.status ?? 0;
    if (s === 429) {
      const msg = `${err.message || ''} ${JSON.stringify(err.error || {})}`.toLowerCase();
      if (msg.includes('insufficient_quota') || /exceeded your.*quota/.test(msg)) return false;
      return true;
    }
    return s === 502 || s === 503 || s >= 500;
  }
  return false;
}

/** Gọi OpenAI lại với backoff khi 429 (trừ hết quota) hoặc lỗi máy chủ tạm (5xx). */
export async function withOpenAIRetries<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const maxAttempts = Math.min(8, Math.max(2, parseInt(process.env.OPENAI_RETRY_ATTEMPTS || '5', 10) || 5));
  const baseMs = 800;
  let last: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const retryable = isRetryableOpenAI(err);
      if (!retryable || attempt === maxAttempts - 1) throw err;
      const waitMs = baseMs * 2 ** attempt + Math.floor(Math.random() * 400);
      console.warn(`[ai/${label}] tạm lỗi (sẽ thử lại sau ${waitMs}ms, lần ${attempt + 2}/${maxAttempts})`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw last;
}
