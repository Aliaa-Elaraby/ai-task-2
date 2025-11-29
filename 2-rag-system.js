import { loadJSON, createEmbedding, getChatCompletion, cosineSimilarity, formatSimilarityScore, formatCost, calculateCost } from "./utils.js";


async function retrieveRelevantChunks(query, topK = 3) {

    //step1: load knowledge base index
    const index = await loadJSON('./knowledge-base-index.json');

    //step2: create embedding for query
    const queryEmbedding = await createEmbedding(query)

    //step3: calculate similarity between query embedding and each chunk embedding
    const similarChunks = index.map(item => ({
        ...item,
        similarityScore: cosineSimilarity(queryEmbedding, item.embedding)
    }))

    //step4: sort chunks by similarity score in descending order
    similarChunks.sort((a, b) => b.similarityScore - a.similarityScore)

    //step5: return top most similar chunks
    return similarChunks.slice(0, topK)
}

async function answerQueryWithDetails(question, showSources = true, showCosts = true) {

    //step1: retrieve relevant chunks
    const relevantChunks = await retrieveRelevantChunks(question, 3)
    
    if (showSources) {
        console.log("\n📚 TOP RELEVANT SOURCES:");
        console.log("=" .repeat(50));
        relevantChunks.forEach((chunk, index) => {
            console.log(`${index + 1}. Source: ${chunk.filename}`);
            console.log(`   Similarity: ${formatSimilarityScore(chunk.similarityScore)}`);
            console.log(`   Preview: ${chunk.text.substring(0, 150)}...`);
            console.log("");
        });
    }

    //step2: construct prompt with source attribution
    const context = relevantChunks.map((chunk, index) => 
        `[Source ${index + 1}: ${chunk.filename}]\n${chunk.text}`
    ).join("\n\n---\n\n");
    
    const messages = [
        {
            role: "system",
            content: "You are a helpful AI assistant. Use the provided context to answer the question. Always cite your sources using the [Source X] format provided in the context. If you use information from multiple sources, mention all relevant sources."
        },
        {
            role: "user",
            content: `Context:\n${context}\n\nQuestion: ${question}\n\nPlease provide a comprehensive answer and cite your sources.`
        }
    ]

    const result = await getChatCompletion(messages, { maxTokens: 800 })

    console.log("\n ANSWER:");
    console.log("=" .repeat(50));
    console.log(result.content);
    
    if (showCosts) {
        const cost = calculateCost(result.usage, result.model);
        console.log("\n QUERY STATISTICS:");
        console.log("=" .repeat(50));
        console.log(`Tokens used: ${result.usage.prompt_tokens} input + ${result.usage.completion_tokens} output = ${result.usage.total_tokens} total`);
        console.log(`Estimated cost: ${formatCost(cost)}`);
    }

    return {
        answer: result.content,
        sources: relevantChunks,
        usage: result.usage,
        cost: calculateCost(result.usage, result.model)
    };
}

// Legacy function for compatibility
async function answerQuery(question) {
    return await answerQueryWithDetails(question, false, false);
}

export { retrieveRelevantChunks, answerQueryWithDetails, answerQuery };


async function main() {
    const questions = [
    "How many vacation days do full-time employees get?",
    "What is the price of CloudSync Pro?",
    "How do I reset my password?"
  ];

  for (const question of questions) {
    await answerQueryWithDetails(question)
    console.log("=".repeat(70));  
  }
}