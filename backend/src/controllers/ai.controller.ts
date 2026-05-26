import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { isAiConfigured, langLabel, LangCode } from '../services/aiConfig';
import { llmGenerateText } from '../services/llmChat';
import { summarizeText } from '../services/summarizeService';
import { translateWithCache } from '../services/translateService';
import { respondLLMFailure } from '../utils/llmHttpError';

const AI_DISABLED = {
  error:
    'Chức năng AI chưa được cấu hình. Trong backend/.env: AI_PROVIDER=ollama + OLLAMA_BASE_URL, hoặc TRANSLATE_PROVIDER=deepl/google, SUMMARIZE_PROVIDER=ollama. Khởi động lại server sau khi sửa.',
};

function clampLang(v: unknown, fallback: LangCode): LangCode {
  if (v === 'vi' || v === 'ja' || v === 'en') return v;
  return fallback;
}

export const translate = async (req: AuthRequest, res: Response) => {
  if (!isAiConfigured()) return res.status(503).json(AI_DISABLED);

  const { text, from, to, senderRole, receiverRole } = req.body;
  if (!text) return res.status(400).json({ error: 'Vui lòng nhập nội dung cần dịch.' });

  const targetLang = clampLang(to, 'ja');
  const sourceLang = clampLang(from, 'vi');

  if (sourceLang === targetLang) {
    return res.json({ translated: String(text) });
  }

  const roleHint =
    senderRole && receiverRole
      ? `Người gửi: ${senderRole}, người nhận: ${receiverRole} — điều chỉnh kính ngữ phù hợp.`
      : undefined;

  try {
    const out = await translateWithCache(String(text), sourceLang, targetLang, roleHint);
    return res.json({ translated: out });
  } catch (err) {
    return respondLLMFailure(res, err, 'Lỗi dịch thuật. Vui lòng thử lại.');
  }
};

export const decodeIntent = async (req: AuthRequest, res: Response) => {
  if (!isAiConfigured()) return res.status(503).json(AI_DISABLED);

  const { text, language } = req.body;
  if (!text) return res.status(400).json({ error: 'Vui lòng nhập nội dung cần phân tích.' });

  const systemPrompt = `Bạn là chuyên gia phân tích giao tiếp cross-cultural Việt-Nhật trong môi trường công sở.
Phân tích tin nhắn sau và trả về:
1. **Ý định thực sự**: Ý nghĩa thật đằng sau câu nói (đặc biệt trong văn hóa ${language === 'ja' ? 'Nhật Bản' : 'Việt Nam'})
2. **Mức độ khẩn cấp**: Thấp / Trung bình / Cao
3. **Hành động đề xuất**: Bạn nên làm gì tiếp theo
4. **Lưu ý văn hóa**: Điều gì cần chú ý trong ngữ cảnh cross-cultural

Trả lời bằng tiếng Việt, ngắn gọn và thực tiễn.`;

  try {
    const out = await llmGenerateText({
      system: systemPrompt,
      user: String(text),
      label: 'decode-intent',
      temperature: 0.5,
      maxTokens: 1000,
    });
    return res.json({ analysis: out });
  } catch (err) {
    return respondLLMFailure(res, err, 'Lỗi phân tích. Vui lòng thử lại.');
  }
};

export const summarize = async (req: AuthRequest, res: Response) => {
  if (!isAiConfigured()) return res.status(503).json(AI_DISABLED);

  const { messages, type, text } = req.body;
  const contentType = type === 'task' ? 'công việc' : type === 'reminder' ? 'nhắc nhở' : 'đoạn chat';
  const content =
    typeof text === 'string' && text.trim()
      ? text.trim()
      : Array.isArray(messages) && messages.length
        ? messages.map((m: { sender?: string; content?: string }) => `${m.sender || 'User'}: ${m.content}`).join('\n')
        : '';
  if (!content) return res.status(400).json({ error: 'Không có nội dung để tóm tắt.' });

  try {
    const out = await summarizeText(content, { contentType });
    if (!out) return res.status(503).json({ error: 'Không thể tóm tắt. Kiểm tra Ollama hoặc cấu hình SUMMARIZE_PROVIDER.' });
    return res.json({ summary: out });
  } catch (err) {
    return respondLLMFailure(res, err, 'Lỗi tóm tắt. Vui lòng thử lại.');
  }
};

export const suggest = async (req: AuthRequest, res: Response) => {
  if (!isAiConfigured()) return res.status(503).json(AI_DISABLED);

  const { text, context, targetLanguage } = req.body;
  if (!text) return res.status(400).json({ error: 'Vui lòng nhập nội dung.' });

  const system = `Bạn là trợ lý viết tin nhắn chuyên nghiệp trong môi trường công sở Việt-Nhật.
Gợi ý 2-3 cách diễn đạt lịch sự, chuyên nghiệp hơn cho tin nhắn sau.
${targetLanguage ? `Ngôn ngữ đích: ${targetLanguage === 'ja' ? langLabel('ja') : langLabel('vi')}` : ''}
${context ? `Ngữ cảnh: ${context}` : ''}
Trả về dạng danh sách đánh số.`;

  try {
    const out = await llmGenerateText({
      system,
      user: String(text),
      label: 'suggest',
      temperature: 0.7,
      maxTokens: 800,
    });
    return res.json({ suggestions: out });
  } catch (err) {
    return respondLLMFailure(res, err, 'Lỗi gợi ý. Vui lòng thử lại.');
  }
};
