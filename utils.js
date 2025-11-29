import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function createEmbedding(text) {
  try {
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return res.data[0].embedding;
  } catch (error) {
    console.error("Error creating embeddings:", error);
  }
}

export function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export function chunkText(text, chunkSize = 500, overlap = 50) {
  const chunks = [];

  const words = text.split(/\s+/);

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim());
    }
  }

  return chunks;
}

export async function loadKnowledgeBase(directory = "./knowledge-base") {
  const documents = [];

  try {
    const files = await fs.readdir(directory);

    for (const file of files) {
      if (file.endsWith(".txt")) {
        const filePath = path.join(directory, file);
        const content = await fs.readFile(filePath, "utf-8");

        documents.push({
          filename: file,
          content: content,
          chunks: chunkText(content),
        });
      }
    }
    return documents;
  } catch (error) {
    console.error("Error loading knowledge base:", error);
  }
}

export async function getChatCompletion(messages, options = {}) {
    try {
        const res = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages,
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 500,
        })

        return {
            content: res.choices[0].message.content,
            usage: res.usage,
            model: "gpt-3.5-turbo"
        }
    }
    catch (error) {
        console.error("Error getting chat completion:", error);
    }
}

export function calculateCost(usage, model = "gpt-3.5-turbo") {
    // OpenAI pricing as of 2024 (per 1K tokens)
    const pricing = {
        "gpt-3.5-turbo": { input: 0.0015, output: 0.002 },
        "text-embedding-3-small": { input: 0.00002, output: 0 }
    };
    
    if (!pricing[model]) return 0;
    
    const inputCost = (usage.prompt_tokens / 1000) * pricing[model].input;
    const outputCost = (usage.completion_tokens / 1000) * pricing[model].output;
    
    return inputCost + outputCost;
}

export function formatSimilarityScore(score) {
    return `${(score * 100).toFixed(1)}%`;
}

export function formatCost(cost) {
    return `$${cost.toFixed(6)}`;
}

export async function saveJSON(filename, data) {
    await fs.writeFile(filename, JSON.stringify(data))
}


export async function loadJSON(filename) {
    const content = await fs.readFile(filename, "utf-8");
    return JSON.parse(content)
}
