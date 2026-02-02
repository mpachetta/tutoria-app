
import { GoogleGenAI, Part, Type } from "@google/genai";
import { SYSTEM_PROMPT, LEARNING_PATH_PROMPT } from "../constants.ts";
import { UserProfile, Message, Attachment, LearningPath } from "../types.ts";

export class GeminiService {
  // Modelo recomendado para tareas de texto y razonamiento rápido
  private modelName = 'gemini-3-flash-preview';

  async sendMessage(
    userProfile: UserProfile,
    history: Message[],
    currentMessage: string,
    attachments: Attachment[] = []
  ): Promise<string> {
    // Obtenemos la clave y eliminamos posibles espacios accidentales
    const rawApiKey = process.env.API_KEY;
    const apiKey = rawApiKey ? rawApiKey.trim() : null;
    
    if (!apiKey) {
      return "⚠️ **Error:** No se detectó la clave de API. Verifica que la variable `API_KEY` esté configurada en Netlify (Site settings > Environment variables) y vuelve a desplegar la app.";
    }

    const ai = new GoogleGenAI({ apiKey });
    const studentInfo = `Contexto: Estudiante ${userProfile.name}, ${userProfile.age} años, curso ${userProfile.grade}.`;
    
    const currentParts: Part[] = [];

    // Adjuntos actuales
    for (const att of attachments) {
      if (att.url.includes(',')) {
        const base64Data = att.url.split(',')[1];
        currentParts.push({ 
          inlineData: { 
            mimeType: att.mimeType, 
            data: base64Data 
          } 
        });
      }
    }

    // Texto del mensaje (nunca vacío)
    const textContent = currentMessage.trim() || (attachments.length > 0 ? "Analiza este material por favor." : "Hola TutorIA");
    currentParts.push({ text: textContent });

    // Mapeo de historial
    const contents = history.map(msg => {
      const parts: Part[] = [];
      if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach(att => {
          if (att.url.includes(',')) {
            parts.push({ 
              inlineData: { 
                mimeType: att.mimeType, 
                data: att.url.split(',')[1] 
              } 
            });
          }
        });
      }
      parts.push({ text: msg.content.trim() || "Adjunto" });
      
      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts: parts
      };
    });

    contents.push({ role: 'user', parts: currentParts });

    try {
      const response = await ai.models.generateContent({
        model: this.modelName,
        contents: contents as any,
        config: {
          systemInstruction: `${SYSTEM_PROMPT}\n\n${studentInfo}`,
          temperature: 0.7,
        },
      });

      return response.text || "No pude generar una respuesta.";
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      
      const errorMsg = error.toString();
      if (errorMsg.includes("API key not valid")) {
        return "⚠️ **Error de API Key:** La clave configurada en Netlify es inválida. Asegúrate de haberla copiado completa de Google AI Studio sin espacios extra.";
      }
      
      return "Hubo un problema al conectar con el cerebro de TutorIA. Intenta escribir de nuevo.";
    }
  }

  async generateLearningPath(userProfile: UserProfile, topic: string): Promise<Partial<LearningPath>> {
    const rawApiKey = process.env.API_KEY;
    const apiKey = rawApiKey?.trim();
    if (!apiKey) throw new Error("No API Key");

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: this.modelName,
      contents: [{ role: 'user', parts: [{ text: `Crea una ruta de aprendizaje para: ${topic}` }] }],
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
    
    const data = JSON.parse(response.text || "{}");
    return {
      id: Date.now().toString(),
      ...data,
      currentStepIndex: 0,
      status: 'in_progress',
      updatedAt: Date.now()
    };
  }

  async evaluateStepResponse(userProfile: UserProfile, stepTitle: string, question: string, answer: string): Promise<{ isCorrect: boolean; feedback: string }> {
    const rawApiKey = process.env.API_KEY;
    const apiKey = rawApiKey?.trim();
    if (!apiKey) throw new Error("No API Key");

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: this.modelName,
      contents: [{ role: 'user', parts: [{ text: `Pregunta: ${question}\nRespuesta: ${answer}` }] }],
      config: {
        systemInstruction: "Evalúa la respuesta. Responde en JSON con isCorrect (boolean) y feedback (string).",
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
