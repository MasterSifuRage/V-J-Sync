import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { llmGenerateText, resolveLLM } from '../services/llmChat';
import { respondLLMFailure } from '../utils/llmHttpError';

const AI_DISABLED = {
  error:
    'Chức năng AI chưa được cấu hình. Trong backend/.env: đặt GEMINI_API_KEY (Google AI Studio), hoặc OPENAI_API_KEY dạng sk-... (không dùng AIza ở đây). Có thể thêm AI_PROVIDER=gemini để chỉ dùng Gemini. Khởi động lại server sau khi sửa.',
};

type LangCode = 'vi' | 'ja' | 'en';

function clampLang(v: unknown, fallback: LangCode): LangCode {
  if (v === 'vi' || v === 'ja' || v === 'en') return v;
  return fallback;
}

function langLabel(l: LangCode): string {
  switch (l) {
    case 'ja':
      return 'tiếng Nhật';
    case 'en':
      return 'tiếng Anh';
    default:
      return 'tiếng Việt';
  }
}

export const translate = async (req: AuthRequest, res: Response) => {
  if (!resolveLLM()) return res.status(503).json(AI_DISABLED);

  const { text, from, to, senderRole, receiverRole } = req.body;
  if (!text) return res.status(400).json({ error: 'Vui lòng nhập nội dung cần dịch.' });

  const targetLang = clampLang(to, 'ja');
  const sourceLang = clampLang(from, 'vi');

  if (sourceLang === targetLang) {
    return res.json({ translated: String(text) });
  }

  const systemPrompt = `Bạn là trợ lý dịch thuật chuyên nghiệp trong môi trường công sở (Việt–Nhật–Anh).
Quy tắc:
- Dịch chính xác từ ${langLabel(sourceLang)} sang ${langLabel(targetLang)}
- Giữ nguyên thuật ngữ chuyên ngành IT/kinh doanh
- ${senderRole && receiverRole ? `Người gửi có vai trò: ${senderRole}, người nhận: ${receiverRole}. Điều chỉnh mức độ kính ngữ phù hợp.` : 'Sử dụng ngôn ngữ lịch sự, chuyên nghiệp.'}
- CHỈ trả về bản dịch, không giải thích thêm.`;

  try {
    const out = await llmGenerateText({
      system: systemPrompt,
      user: String(text),
      label: 'translate',
      temperature: 0.3,
      maxTokens: 2000,
    });
    return res.json({ translated: out });
  } catch (err) {
    return respondLLMFailure(res, err, 'Lỗi dịch thuật. Vui lòng thử lại.');
  }
};

export const decodeIntent = async (req: AuthRequest, res: Response) => {
  if (!resolveLLM()) return res.status(503).json(AI_DISABLED);

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
  if (!resolveLLM()) return res.status(503).json(AI_DISABLED);

  const { messages, type } = req.body;
  if (!messages || !messages.length) return res.status(400).json({ error: 'Không có nội dung để tóm tắt.' });

  const contentType = type === 'task' ? 'công việc' : type === 'reminder' ? 'nhắc nhở' : 'đoạn chat';
  const content = Array.isArray(messages)
    ? messages.map((m: any) => `${m.sender || 'User'}: ${m.content}`).join('\n')
    : String(messages);

  const system = `Tóm tắt ngắn gọn nội dung ${contentType} sau bằng tiếng Việt. Nêu rõ các điểm chính, quyết định quan trọng và action items (nếu có). Tối đa 5 bullet points.`;

  try {
    const out = await llmGenerateText({
      system,
      user: content,
      label: 'summarize',
      temperature: 0.3,
      maxTokens: 500,
    });
    return res.json({ summary: out });
  } catch (err) {
    return respondLLMFailure(res, err, 'Lỗi tóm tắt. Vui lòng thử lại.');
  }
};

export const suggest = async (req: AuthRequest, res: Response) => {
  if (!resolveLLM()) return res.status(503).json(AI_DISABLED);

  const { text, context, targetLanguage } = req.body;
  if (!text) return res.status(400).json({ error: 'Vui lòng nhập nội dung.' });

  const system = `Bạn là trợ lý viết tin nhắn chuyên nghiệp trong môi trường công sở Việt-Nhật.
Gợi ý 2-3 cách diễn đạt lịch sự, chuyên nghiệp hơn cho tin nhắn sau.
${targetLanguage ? `Ngôn ngữ đích: ${targetLanguage === 'ja' ? 'tiếng Nhật' : 'tiếng Việt'}` : ''}
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
