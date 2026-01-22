
import { GoogleGenAI, Type, GenerateContentResponse, Chat } from "@google/genai";
import { RiccePrompt, EvaluationResult, AnalysisResult } from "../types";

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
};

export const refinePrompt = async (userInput: string): Promise<RiccePrompt> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Refine this vague idea into a high-fidelity LLM System Instruction using the RICCE framework: "${userInput}"`,
    config: {
      systemInstruction: `You are a world-class Prompt Engineer and Synthesis Architect. Your task is to transform vague user inputs into extremely precise, professional System Instructions for LLMs.
      
      You must use the RICCE Framework:
      - R (Role): An expert persona with deep specific background.
      - I (Instruction): The core operational logic and primary task.
      - C (Context): The environmental variables and background state.
      - C (Constraints): Explicit boundaries, formatting rules, and style guidelines.
      - E (Evaluation): Examples of perfect outputs or success criteria.
      
      Focus on generating instructions that are robust, clear, and optimized for "System" fields in LLM interfaces. Use sophisticated vocabulary and clear structural formatting.
      
      Respond ONLY in valid JSON format matching the schema provided.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          role: { type: Type.STRING, description: 'The expert persona and authority' },
          instruction: { type: Type.STRING, description: 'The operational logic and task' },
          context: { type: Type.STRING, description: 'Background state and environmental details' },
          constraints: { type: Type.STRING, description: 'Explicit boundaries and style rules' },
          evaluation: { type: Type.STRING, description: 'Success metrics and output standards' },
        },
        required: ['role', 'instruction', 'context', 'constraints', 'evaluation'],
      },
    },
  });

  try {
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
    contents: `Analyze this System Instruction and suggest optimizations for LLM performance: ${JSON.stringify(data)}`,
    config: {
      systemInstruction: "You are a Meta-Synthesis Engineer. Critique the provided LLM instruction block. Identify logical loopholes and suggest professional improvements to the RICCE components. Output JSON only.",
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
    contents: `System Instruction Standard: ${JSON.stringify(prompt)}\n\nActual Model Output to Audit:\n${output}`,
    config: {
      systemInstruction: "You are an objective auditor. Grade how well the LLM output adhered to the System Instruction. Score 0-100. Provide a concise technical critique. Output JSON only.",
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

export const testPrompt = async (
  fullPrompt: string, 
  onChunk: (chunk: string) => void, 
  thinkingBudget: number = 0,
  modelName: string = 'gemini-3-flash-preview'
) => {
  const ai = getAiClient();
  const config: any = {};
  if (thinkingBudget > 0) {
    config.thinkingConfig = { thinkingBudget };
  }

  const stream = await ai.models.generateContentStream({
    model: modelName,
    contents: fullPrompt,
    config
  });

  for await (const chunk of stream) {
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
