import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, QuizQuestion } from "../types";

const SYSTEM_INSTRUCTION = `
You are an expert educational assistant specializing in explaining technical diagrams to high school students (10th-grade reading level).

Your goal is to provide a detailed, easy-to-read explanation of the uploaded diagram's overall function and purpose.

Structure your response as follows:
1. **Title**: A catchy title.
2. **Explanation**:
   - **Main Purpose**: Explain the overall function and goal of what is shown in the diagram. Why does it exist?
   - **Key Terms & Concepts**: Extract exactly 5 most important terms directly labeled in the diagram. Provide a one-sentence, concise definition for each. Format this as a bulleted list.
   - **Key Components**: Break down the most important parts shown. Use bullet points.
   - **How it Works**: Explain the relationships, flows, or processes depicted.
   - **Summary**: A brief wrap-up.
   - *Formatting Rules*: Use Markdown headers (e.g., ### Main Purpose), **bold** for important terms to emphasize them, and simple paragraph structures.
3. **Specific Relationship**: Identify one specific relationship (not just a single component) shown in the diagram, such as a process flow, connection line, or interaction between parts. Describe this specific relationship in detail.
4. **Quiz**: Create exactly 3 multiple-choice questions based ONLY on the diagram content.
   - Each question must have 4 options (A, B, C, D).
   - Indicate the correct answer index (0-3).
   - Provide a brief explanation for the correct answer.

If the image is not a diagram or is unclear, return a polite error in the explanation.
`;

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A short, engaging title for the diagram.",
    },
    explanation: {
      type: Type.STRING,
      description: "The structured explanation in Markdown format. Use '###' for section headers and '**' for bold text.",
    },
    relationshipDescription: {
      type: Type.STRING,
      description: "A detailed description of one specific relationship, process flow, or connection line identified in the diagram.",
    },
    quiz: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of exactly 4 possible answers.",
          },
          correctAnswerIndex: {
            type: Type.INTEGER,
            description: "The index (0-3) of the correct answer.",
          },
          explanation: {
            type: Type.STRING,
            description: "Briefly explain why the answer is correct.",
          },
        },
        required: ["question", "options", "correctAnswerIndex", "explanation"],
      },
    },
  },
  required: ["title", "explanation", "relationshipDescription", "quiz"],
};

const QUIZ_ONLY_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    quiz: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of exactly 4 possible answers.",
          },
          correctAnswerIndex: {
            type: Type.INTEGER,
            description: "The index (0-3) of the correct answer.",
          },
          explanation: {
            type: Type.STRING,
            description: "Briefly explain why the answer is correct.",
          },
        },
        required: ["question", "options", "correctAnswerIndex", "explanation"],
      },
    },
  },
  required: ["quiz"],
};

export const analyzeImage = async (base64Data: string, mimeType: string): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: "Analyze this diagram. Provide a 10th-grade level explanation, key terms, a specific relationship description, and a 3-question practice quiz.",
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response received from the model.");
    }

    const result = JSON.parse(text) as AnalysisResult;
    return result;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze the diagram. Please try again.");
  }
};

export const generateMoreQuestions = async (base64Data: string, mimeType: string): Promise<QuizQuestion[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: "Generate 3 NEW and DIFFERENT multiple-choice practice questions based on this diagram. Focus on different aspects than standard identification if possible.",
          },
        ],
      },
      config: {
        systemInstruction: "You are a quiz generator. Create 3 challenging multiple choice questions based on the provided diagram. Output strictly JSON.",
        responseMimeType: "application/json",
        responseSchema: QUIZ_ONLY_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response");

    const result = JSON.parse(text) as { quiz: QuizQuestion[] };
    return result.quiz;
  } catch (error) {
    console.error("Gemini Quiz Generation Error:", error);
    throw new Error("Failed to generate new questions.");
  }
};

export const askAiTutor = async (base64Data: string, mimeType: string, question: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: question,
          },
        ],
      },
      config: {
        systemInstruction: "You are a friendly and helpful tutor. The user is looking at a diagram and has a specific question about it. Answer their question concisely (under 3 sentences) and clearly based ONLY on the visual evidence in the provided diagram. If the answer isn't in the diagram, politely say so.",
      },
    });

    return response.text || "I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Gemini Tutor Error:", error);
    throw new Error("Failed to get an answer.");
  }
};