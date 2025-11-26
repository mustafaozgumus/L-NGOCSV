import { GoogleGenAI } from "@google/genai";
import { Word } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateWordContext = async (word: Word): Promise<{ sentence: string; translation: string; definition: string }> => {
  try {
    const prompt = `
      I am learning English. 
      The word is "${word.english}" (which means "${word.turkish}" in Turkish).
      
      Please provide:
      1. A simple English definition.
      2. A simple example sentence in English using this word.
      3. The Turkish translation of that example sentence.
      
      Format the output strictly as JSON:
      {
        "definition": "...",
        "sentence": "...",
        "translation": "..."
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      definition: "AI servisine ulaşılamadı.",
      sentence: "...",
      translation: "..."
    };
  }
};

export const validateUserSentence = async (word: string, userSentence: string): Promise<{ isCorrect: boolean; feedback: string; correction?: string }> => {
  try {
    const prompt = `
      I am learning the English word "${word}".
      I wrote this sentence using it: "${userSentence}"
      
      Please check:
      1. Is the grammar correct?
      2. Did I use the word "${word}" correctly?
      
      If it is correct, congratulate me briefly in Turkish.
      If it is incorrect, explain the mistake in Turkish and provide the corrected English sentence.

      Format the output strictly as JSON:
      {
        "isCorrect": boolean,
        "feedback": "Turkish explanation...",
        "correction": "Corrected English sentence (if needed, otherwise null)"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Validation Error:", error);
    return {
      isCorrect: false,
      feedback: "Kontrol sırasında bir hata oluştu.",
    };
  }
};