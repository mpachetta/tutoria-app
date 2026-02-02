
import { GoogleGenAI, Part, Type } from "@google/genai";
import { SYSTEM_PROMPT, LEARNING_PATH_PROMPT } from "../constants.ts";
import { UserProfile, Message, Attachment, LearningPath } from "../types.ts";

export class GeminiService {
  // Usamos un alias estable para evitar errores de versión
  private modelName = 'gemini-flash-latest';

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
    
    // 1. Construir partes del mensaje actual
    const currentParts: Part[] = [];

    // Agregar adjuntos actuales si existen
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

    // El texto NUNCA puede estar vacío para la API de Gemini (error 400)
    const textContent = currentMessage.trim() || (attachments.length > 0 ? "Analiza el material adjunto." : "Hola");
    currentParts.push({ text: textContent });

    // 2. Mapear el historial correctamente incluyendo sus adjuntos pasados si los hubiera
    const contents = history.map(msg => {
      const parts: Part[] = [];
      
      // Si el mensaje del historial tenía adjuntos, los incluimos para mantener contexto
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
      
      // Siempre añadir texto (incluso si es un placeholder)
      parts.push({ text: msg.content.trim() || "Adjunto" });
      
      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts: parts
      };
    });

    // 3. Agregar el turno actual
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

      return response.text || "Lo siento, no pude procesar tu solicitud.";
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      if (error.message?.includes("400")) {
        return "⚠️ Error 400: Hubo un problema con el formato del mensaje. Intenta escribir algo de texto junto a tus archivos.";
      }
      return "Hubo un error al conectar con TutorIA. Por favor, revisa tu conexión o intenta más tarde.";
    }
  }

  async generateLearningPath(userProfile: UserProfile, topic: string): Promise<Partial<LearningPath>> {
    const apiKey = process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey: apiKey! });
    
    const response = await ai.models.generateContent({
      model: this.modelName,
      contents: [{ role: 'user', parts: [{ text: `Crea una ruta de aprendizaje para el tema: ${topic}` }] }],
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
    const apiKey = process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey: apiKey! });

    const prompt = `Pregunta: ${question}\nRespuesta del estudiante: ${answer}\nEvalúa si la respuesta demuestra comprensión del tema "${stepTitle}".`;

    const response = await ai.models.generateContent({
      model: this.modelName,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "Eres un profesor evaluando una respuesta. Responde en JSON con 'isCorrect' (boolean) y 'feedback' (string con consejos pedagógicos).",
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
    return JSON.parse(response.text || '{"isCorrect":false,"feedback":"Error en la evaluación."}');
  }
}

export const geminiService = new GeminiService();
