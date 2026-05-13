import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const translate = async (req: AuthRequest, res: Response) => {
  const { text, from, to, senderRole, receiverRole } = req.body;
  if (!text) return res.status(400).json({ error: 'Vui lòng nhập nội dung cần dịch.' });

  const targetLang = to || (from === 'ja' ? 'vi' : 'ja');
  const sourceLang = from || (to === 'ja' ? 'vi' : 'ja');

  const systemPrompt = `Bạn là trợ lý dịch thuật chuyên nghiệp Việt-Nhật trong môi trường công sở.
Quy tắc:
- Dịch chính xác từ ${sourceLang === 'vi' ? 'tiếng Việt' : 'tiếng Nhật'} sang ${targetLang === 'vi' ? 'tiếng Việt' : 'tiếng Nhật'}
- Giữ nguyên thuật ngữ chuyên ngành IT/kinh doanh
- ${senderRole && receiverRole ? `Người gửi có vai trò: ${senderRole}, người nhận: ${receiverRole}. Điều chỉnh mức độ kính ngữ phù hợp.` : 'Sử dụng ngôn ngữ lịch sự, chuyên nghiệp.'}
- CHỈ trả về bản dịch, không giải thích thêm.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    return res.json({ translated: completion.choices[0].message.content?.trim() });
  } catch {
    return res.status(500).json({ error: 'Lỗi dịch thuật. Vui lòng thử lại.' });
  }
};

export const decodeIntent = async (req: AuthRequest, res: Response) => {
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.5,
      max_tokens: 1000,
    });

    return res.json({ analysis: completion.choices[0].message.content?.trim() });
  } catch {
    return res.status(500).json({ error: 'Lỗi phân tích. Vui lòng thử lại.' });
  }
};

export const summarize = async (req: AuthRequest, res: Response) => {
  const { messages, type } = req.body;
  if (!messages || !messages.length) return res.status(400).json({ error: 'Không có nội dung để tóm tắt.' });

  const contentType = type === 'task' ? 'công việc' : type === 'reminder' ? 'nhắc nhở' : 'đoạn chat';
  const content = Array.isArray(messages)
    ? messages.map((m: any) => `${m.sender || 'User'}: ${m.content}`).join('\n')
    : messages;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `Tóm tắt ngắn gọn nội dung ${contentType} sau bằng tiếng Việt. Nêu rõ các điểm chính, quyết định quan trọng và action items (nếu có). Tối đa 5 bullet points.` },
        { role: 'user', content: content },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return res.json({ summary: completion.choices[0].message.content?.trim() });
  } catch {
    return res.status(500).json({ error: 'Lỗi tóm tắt. Vui lòng thử lại.' });
  }
};

export const suggest = async (req: AuthRequest, res: Response) => {
  const { text, context, targetLanguage } = req.body;
  if (!text) return res.status(400).json({ error: 'Vui lòng nhập nội dung.' });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Bạn là trợ lý viết tin nhắn chuyên nghiệp trong môi trường công sở Việt-Nhật.
Gợi ý 2-3 cách diễn đạt lịch sự, chuyên nghiệp hơn cho tin nhắn sau.
${targetLanguage ? `Ngôn ngữ đích: ${targetLanguage === 'ja' ? 'tiếng Nhật' : 'tiếng Việt'}` : ''}
${context ? `Ngữ cảnh: ${context}` : ''}
Trả về dạng danh sách đánh số.`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    return res.json({ suggestions: completion.choices[0].message.content?.trim() });
  } catch {
    return res.status(500).json({ error: 'Lỗi gợi ý. Vui lòng thử lại.' });
  }
};
