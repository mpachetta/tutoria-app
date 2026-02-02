
import { GoogleGenAI, Part, Type } from "@google/genai";
import { SYSTEM_PROMPT, LEARNING_PATH_PROMPT } from "../constants.ts";
import { UserProfile, Message, Attachment, LearningPath } from "../types.ts";

export class GeminiService {
  // Modelo estándar para tareas de texto según guías de calidad
  private modelName = 'gemini-3-flash-preview';

  private getAIInstance() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey: apiKey.trim() });
  }

  async sendMessage(
    userProfile: UserProfile,
    history: Message[],
    currentMessage: string,
    attachments: Attachment[] = []
  ): Promise<string> {
    const ai = this.getAIInstance();
    
    if (!ai) {
      return "⚠️ **Configuración incompleta:** No se detectó la `API_KEY`. Por favor, selecciónala en el botón de configuración superior.";
    }

    const studentInfo = `Contexto: Estudiante ${userProfile.name}, ${userProfile.age} años, curso ${userProfile.grade}.`;
    
    const currentParts: Part[] = [];

    // Procesar adjuntos
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

    // Asegurar que el texto no esté vacío (evita error 400)
    const textContent = currentMessage.trim() || (attachments.length > 0 ? "Analiza el archivo adjunto." : "Hola");
    currentParts.push({ text: textContent });

    // Construir historial
    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [
        ...(msg.attachments || []).map(att => ({
          inlineData: {
            mimeType: att.mimeType,
            data: att.url.includes(',') ? att.url.split(',')[1] : ''
          }
        })),
        { text: msg.content || "..." }
        // FIX: Use safe property checking for union type Part to avoid "Property 'text' does not exist" error
      ].filter(p => ('text' in p && p.text) || ('inlineData' in p && p.inlineData?.data))
    }));

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

      return response.text || "TutorIA no pudo generar una respuesta clara. Intenta reformular.";
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      
      const errorMsg = error.toString();
      if (errorMsg.includes("API key not valid") || errorMsg.includes("INVALID_ARGUMENT")) {
        throw new Error("API_KEY_INVALID");
      }
      
      return "Hubo un error de conexión con TutorIA. Por favor, intenta de nuevo en unos segundos.";
    }
  }

  async generateLearningPath(userProfile: UserProfile, topic: string): Promise<Partial<LearningPath>> {
    const ai = this.getAIInstance();
    if (!ai) throw new Error("API_KEY_MISSING");

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
    const ai = this.getAIInstance();
    if (!ai) throw new Error("API_KEY_MISSING");

    const response = await ai.models.generateContent({
      model: this.modelName,
      contents: [{ role: 'user', parts: [{ text: `Pregunta: ${question}\nRespuesta: ${answer}` }] }],
      config: {
        systemInstruction: "Evalúa pedagógicamente la respuesta. Retorna JSON con isCorrect y feedback.",
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
