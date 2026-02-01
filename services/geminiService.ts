
import { GoogleGenAI, Part, Type } from "@google/genai";
import { SYSTEM_PROMPT, LEARNING_PATH_PROMPT } from "../constants";
import { UserProfile, Message, Attachment, LearningPath } from "../types";

export class GeminiService {
  private modelName = 'gemini-3-flash-preview';

  async sendMessage(
    userProfile: UserProfile,
    history: Message[],
    currentMessage: string,
    attachments: Attachment[] = []
  ): Promise<string> {
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      return "⚠️ **Error:** No se detectó la clave de API. Configura `API_KEY` en el panel de Netlify.";
    }

    const ai = new GoogleGenAI({ apiKey });
    const studentInfo = `Contexto: Estudiante ${userProfile.name}, ${userProfile.age} años, curso ${userProfile.grade}.`;
    
    const parts: Part[] = [];

    for (const att of attachments) {
      if (att.url.includes(',')) {
        const base64Data = att.url.split(',')[1];
        parts.push({ inlineData: { mimeType: att.mimeType, data: base64Data } });
      }
    }

    parts.push({ text: currentMessage || "Analiza el material." });

    const contents = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    contents.push({ role: 'user', parts: parts });

    try {
      const response = await ai.models.generateContent({
        model: this.modelName,
        contents: contents as any,
        config: {
          systemInstruction: `${SYSTEM_PROMPT}\n\n${studentInfo}`,
          temperature: 0.7,
        },
      });

      return response.text || "Error en la respuesta.";
    } catch (error: any) {
      return "Hubo un error al conectar con la IA.";
    }
  }

  async generateLearningPath(userProfile: UserProfile, topic: string): Promise<Partial<LearningPath>> {
    const apiKey = process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey: apiKey! });
    
    const response = await ai.models.generateContent({
      model: this.modelName,
      contents: [{ role: 'user', parts: [{ text: `Tema: ${topic}` }] }],
      config: {
        systemInstruction: LEARNING_PATH_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            description: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                  example: { type: Type.STRING },
                  practiceQuestion: { type: Type.STRING },
                  hint: { type: Type.STRING }
                },
                required: ["title", "content", "example", "practiceQuestion", "hint"]
              }
            }
          },
          required: ["topic", "description", "steps"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  }

  async evaluateStepResponse(userProfile: UserProfile, stepTitle: string, question: string, answer: string): Promise<{ isCorrect: boolean; feedback: string }> {
    const apiKey = process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey: apiKey! });

    const response = await ai.models.generateContent({
      model: this.modelName,
      contents: [{ role: 'user', parts: [{ text: `Respuesta: ${answer}` }] }],
      config: {
        systemInstruction: "Evalúa la respuesta pedagógicamente.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING }
          },
          required: ["isCorrect", "feedback"]
        }
      }
    });
    return JSON.parse(response.text || '{"isCorrect":false,"feedback":"Error"}');
  }
}

export const geminiService = new GeminiService();
