import { createOpenAI } from '@ai-sdk/openai';
import { streamText, CoreMessage } from 'ai';
import { AI_MENTOR_SYSTEM_PROMPT } from '@/lib/aiSystemPrompt';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages, tradeContext, imageUrl } = await req.json();
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '');

    if (!apiKey) {
      return new Response('API Key missing. Please configure it in the AI Mentor settings.', { status: 401 });
    }

    const customOpenAI = createOpenAI({ apiKey });

    const dynamicPrompt = AI_MENTOR_SYSTEM_PROMPT + '\n\nESTADÍSTICAS ACTUALES DEL TRADER:\n' + 
      (tradeContext ? JSON.stringify(tradeContext, null, 2) : 'Sin datos.');

    if (imageUrl) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'user') {
        const textContent = lastMsg.content;
        
        // Vercel SDK requiere la data cruda, asA- que separamos el prefijo "data:image/png;base64," del contenido real
        const base64Data = imageUrl.includes(',') ? imageUrl.split(',')[1] : imageUrl;

        lastMsg.content = [
          { type: 'text', text: textContent },
          { type: 'image', image: base64Data } 
        ];
      }
    }

    const result = await streamText({
      model: customOpenAI('gpt-4o'),
      system: dynamicPrompt,
      messages: messages as CoreMessage[],
    });

    return result.toAIStreamResponse();
  } catch (error: any) {
    console.error('AI API Error:', error);
    return new Response(error.message || 'Error processing AI request', { status: 500 });
  }
}
