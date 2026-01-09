
import { GoogleGenAI, Type, GenerateContentResponse, Chat } from "@google/genai";
import { RiccePrompt, EvaluationResult, AnalysisResult } from "../types";

// Always initialize the client using the named parameter and obtain the key directly from process.env.API_KEY
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
};

export const refinePrompt = async (userInput: string): Promise<RiccePrompt> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Refine this vague request into a professional prompt using the RICCE framework: "${userInput}"`,
    config: {
      systemInstruction: `You are a world-class Synthesis Engineer. Your task is to transform vague user inputs into highly specific, professional RICCE prompts. 
      RICCE Framework components:
      - R (Role): The persona or expertise level.
      - I (Instruction): The specific, measurable task.
      - C (Context): Background, audience, or "why".
      - C (Constraints): Boundaries, style, format, or length limits.
      - E (Evaluation): Examples of success or desired formatting.
      
      Respond ONLY in valid JSON format matching the schema provided.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          role: { type: Type.STRING, description: 'The persona/expertise' },
          instruction: { type: Type.STRING, description: 'The core task' },
          context: { type: Type.STRING, description: 'The background/audience' },
          constraints: { type: Type.STRING, description: 'The limitations/rules' },
          evaluation: { type: Type.STRING, description: 'The success criteria/examples' },
        },
        required: ['role', 'instruction', 'context', 'constraints', 'evaluation'],
      },
    },
  });

  try {
    // response.text is a property, not a method
    return JSON.parse(response.text.trim()) as RiccePrompt;
  } catch (e) {
    console.error("Failed to parse AI response as JSON", response.text);
    throw new Error("Invalid AI response format");
  }
};

export const analyzeRicce = async (data: RiccePrompt): Promise<AnalysisResult> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze this RICCE prompt and suggest improvements: ${JSON.stringify(data)}`,
    config: {
      systemInstruction: "You are a Meta-Synthesis Engineer. Critique the provided RICCE prompt. Identify weaknesses and provide improved versions of specific fields. Output JSON only.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          feedback: { type: Type.STRING },
          improvements: {
            type: Type.OBJECT,
            properties: {
              role: { type: Type.STRING },
              instruction: { type: Type.STRING },
              context: { type: Type.STRING },
              constraints: { type: Type.STRING },
              evaluation: { type: Type.STRING },
            }
          }
        },
        required: ['feedback', 'improvements']
      }
    }
  });
  return JSON.parse(response.text.trim());
};

export const evaluateOutput = async (prompt: RiccePrompt, output: string): Promise<EvaluationResult> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Prompt Evaluation Criteria: ${prompt.evaluation}\n\nActual Model Output:\n${output}`,
    config: {
      systemInstruction: "You are an objective evaluator. Grade the output based on the provided criteria. Score from 0-100. Provide a concise critique and 3 specific suggestions for improvement. Output JSON only.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          critique: { type: Type.STRING },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['score', 'critique', 'suggestions']
      }
    }
  });
  return JSON.parse(response.text.trim());
};

export const testPrompt = async (fullPrompt: string, onChunk: (chunk: string) => void, thinkingBudget: number = 0) => {
  const ai = getAiClient();
  const config: any = {};
  if (thinkingBudget > 0) {
    // Thinking Config is available for the Gemini 3 and 2.5 series models.
    config.thinkingConfig = { thinkingBudget };
  }

  const stream = await ai.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents: fullPrompt,
    config
  });

  for await (const chunk of stream) {
    // chunk.text is a property
    const responseChunk = chunk as GenerateContentResponse;
    onChunk(responseChunk.text || "");
  }
};

export const editImageWithAi = async (imageBase64: string, prompt: string): Promise<string | null> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64.split(',')[1] || imageBase64,
          },
        },
        { text: prompt },
      ],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    // Iterate through all parts to find the image part
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  return null;
};

export const createChat = (systemInstruction?: string): Chat => {
  const ai = getAiClient();
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: systemInstruction || "You are PromptSynthesis AI, a helpful assistant specialized in AI, Synthesis Engineering, and Creative Design.",
    },
  });
};
