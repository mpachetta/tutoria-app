
import { GoogleGenAI, Part, Type } from "@google/genai";
import { SYSTEM_PROMPT, LEARNING_PATH_PROMPT } from "../constants.ts";
import { UserProfile, Message, Attachment, LearningPath } from "../types.ts";

export class GeminiService {
  // Utilizamos 'gemini-3-flash-preview' según las guías para tareas de texto básicas.
  private modelName = 'gemini-3-flash-preview';

  private getAIInstance() {
    const rawApiKey = process.env.API_KEY;
    if (!rawApiKey) return null;
    
    // Limpieza profunda de la clave por si Netlify inyecta caracteres invisibles
    const apiKey = rawApiKey.trim().replace(/["']/g, "");
    if (!apiKey || apiKey === "undefined" || apiKey === "null") return null;
    
    return new GoogleGenAI({ apiKey });
  }

  async sendMessage(
    userProfile: UserProfile,
    history: Message[],
    currentMessage: string,
    attachments: Attachment[] = []
  ): Promise<string> {
    const ai = this.getAIInstance();
    
    if (!ai) {
      throw new Error("API_KEY_INVALID");
    }

    const studentInfo = `Contexto: Estudiante ${userProfile.name}, ${userProfile.age} años.`;
    
    const currentParts: Part[] = [];

    // Procesar adjuntos actuales
    for (const att of attachments) {
      if (att.url && att.url.includes(',')) {
        try {
          const base64Data = att.url.split(',')[1];
          if (base64Data) {
            currentParts.push({ 
              inlineData: { 
                mimeType: att.mimeType, 
                data: base64Data 
              } 
            });
          }
        } catch (e) {
          console.error("Error procesando adjunto:", att.name);
        }
      }
    }

    // El texto nunca debe estar vacío para evitar Error 400
    const textContent = currentMessage.trim() || (attachments.length > 0 ? "Analiza el material adjunto por favor." : "Hola TutorIA");
    currentParts.push({ text: textContent });

    // Construir historial filtrando partes vacías y contenidos sin partes
    const contents = history.map(msg => {
      const parts: Part[] = [];
      
      // Añadir adjuntos del historial
      if (msg.attachments) {
        msg.attachments.forEach(att => {
          if (att.url && att.url.includes(',')) {
            const data = att.url.split(',')[1];
            if (data) {
              parts.push({ inlineData: { mimeType: att.mimeType, data } });
            }
          }
        });
      }

      // Añadir texto del mensaje
      if (msg.content && msg.content.trim()) {
        parts.push({ text: msg.content.trim() });
      } else if (parts.length === 0) {
        // Fallback para evitar contenido sin partes
        parts.push({ text: "..." });
      }

      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts: parts
      };
    }).filter(content => content.parts.length > 0);

    // Añadir el turno actual
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

      return response.text || "Lo siento, no pude generar una respuesta clara.";
    } catch (error: any) {
      console.error("Gemini API Error Detail:", error);
      
      const errorMsg = error.toString();
      // Capturamos específicamente errores de clave o de entidad no encontrada
      if (errorMsg.includes("API key not valid") || errorMsg.includes("400") || errorMsg.includes("INVALID_ARGUMENT")) {
        throw new Error("API_KEY_INVALID");
      }
      if (errorMsg.includes("Requested entity was not found") || errorMsg.includes("404")) {
        throw new Error("MODEL_NOT_FOUND");
      }
      
      throw error;
    }
  }

  async generateLearningPath(userProfile: UserProfile, topic: string): Promise<Partial<LearningPath>> {
    const ai = this.getAIInstance();
    if (!ai) throw new Error("API_KEY_INVALID");

    try {
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
    } catch (error: any) {
      if (error.toString().includes("API key not valid")) throw new Error("API_KEY_INVALID");
      throw error;
    }
  }

  async evaluateStepResponse(userProfile: UserProfile, stepTitle: string, question: string, answer: string): Promise<{ isCorrect: boolean; feedback: string }> {
    const ai = this.getAIInstance();
    if (!ai) throw new Error("API_KEY_INVALID");

    try {
      const response = await ai.models.generateContent({
        model: this.modelName,
        contents: [{ role: 'user', parts: [{ text: `Pregunta: ${question}\nRespuesta: ${answer}` }] }],
        config: {
          systemInstruction: "Evalúa pedagógicamente la respuesta. Responde estrictamente en JSON.",
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
    } catch (error: any) {
      if (error.toString().includes("API key not valid")) throw new Error("API_KEY_INVALID");
      return { isCorrect: false, feedback: "Error de conexión al evaluar." };
    }
  }
}

export const geminiService = new GeminiService();
