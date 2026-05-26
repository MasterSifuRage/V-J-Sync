import { GoogleGenerativeAIFetchError } from '@google/generative-ai';
import { Response } from 'express';
import { mapOpenAIError } from './openaiHttpError';

const GEMINI_AUTH_HINT =
  'GEMINI_API_KEY không hợp lệ, bị từ chối, hoặc API Generative Language chưa bật cho dự án của key. Tạo key tại https://aistudio.google.com/apikey ; trong Google Cloud Console bật “Generative Language API” cho đúng dự án.';

const GEMINI_MODEL_HINT =
  'Model Gemini không khả dụng với key này. Trong backend/.env đặt GEMINI_MODEL (ví dụ gemini-2.0-flash hoặc gemini-1.5-flash) rồi khởi động lại server.';

const GEMINI_RATE_LIMIT_HINT =
  'Google trả HTTP 429 (hết RPM/RPD hoặc quota theo gói). Gói miễn phí có giới hạn rất thấp; bảng “usage” trên AI Studio đôi khi cập nhật chậm hoặc không khớp quota Cloud. Đợi 60–120 giây rồi thử lại; kiểm tra rate limit / billing trong AI Studio và Google Cloud cho đúng dự án gắn với API key.';

function looksLikeGeminiModelOrGenerateError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    /(\bmodel\b|generatecontent|generativelanguage)/i.test(msg) &&
    (/not found|not supported|is not found|does not exist|invalid argument|404/.test(lower) ||
      /is not supported for generatecontent/i.test(lower))
  );
}

/** Lỗi từ Google Generative AI — ưu tiên HTTP status từ SDK (tránh nhầm “quota” trong JSON chi tiết). */
export function mapGeminiError(err: unknown): { status: number; error: string } | null {
  if (err instanceof GoogleGenerativeAIFetchError) {
    const s = err.status;
    const msg = err.message;

    if (s === 401 || s === 403) {
      return { status: 502, error: GEMINI_AUTH_HINT };
    }

    if (s === 404 || (s === 400 && looksLikeGeminiModelOrGenerateError(msg))) {
      return { status: 502, error: GEMINI_MODEL_HINT };
    }

    if (s === 429) {
      return { status: 429, error: GEMINI_RATE_LIMIT_HINT };
    }

    if (s === 502 || s === 503) {
      return {
        status: 503,
        error: 'Gemini tạm không phản hồi (lỗi phía Google). Đợi vài chục giây rồi thử lại.',
      };
    }

    if (typeof s === 'number' && s >= 400) {
      return {
        status: 502,
        error: `Lỗi từ API Gemini (HTTP ${s}). Kiểm tra backend log; với 400 thử đổi GEMINI_MODEL hoặc rút ngắn nội dung dịch.`,
      };
    }

    if (/api key not valid|invalid api key|permission denied|requested entity was not found/i.test(msg)) {
      return { status: 502, error: GEMINI_AUTH_HINT };
    }

    if (looksLikeGeminiModelOrGenerateError(msg)) {
      return { status: 502, error: GEMINI_MODEL_HINT };
    }

    const lower = msg.toLowerCase();
    if (
      /resource_exhausted/i.test(msg) ||
      /\[\s*429\s/i.test(msg) ||
      /rate[\s_-]?limit|too many requests|quota exceeded|exceeded your quota/i.test(lower)
    ) {
      return { status: 429, error: GEMINI_RATE_LIMIT_HINT };
    }

    return null;
  }

  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (/api key not valid|invalid api key|401|403|permission denied|requested entity was not found/i.test(msg)) {
    return { status: 502, error: GEMINI_AUTH_HINT };
  }

  if (looksLikeGeminiModelOrGenerateError(msg)) {
    return { status: 502, error: GEMINI_MODEL_HINT };
  }

  if (
    /resource_exhausted/i.test(msg) ||
    /\[\s*429\s/i.test(msg) ||
    /rate[\s_-]?limit|too many requests|quota exceeded|exceeded your quota/i.test(lower)
  ) {
    return { status: 429, error: GEMINI_RATE_LIMIT_HINT };
  }

  return null;
}

export function respondLLMFailure(res: Response, err: unknown, fallback: string) {
  console.error('[llm]', err);
  const o = mapOpenAIError(err);
  if (o) return res.status(o.status).json({ error: o.error });
  const g = mapGeminiError(err);
  if (g) return res.status(g.status).json({ error: g.error });
  return res.status(500).json({
    error: fallback,
    ...(process.env.NODE_ENV === 'development' && err instanceof Error && { details: err.message }),
  });
}
