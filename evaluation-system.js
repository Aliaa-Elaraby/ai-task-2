import { retrieveRelevantChunks, answerQueryWithDetails } from './2-rag-system.js';
import { formatSimilarityScore, formatCost } from './utils.js';

// Test questions with expected source documents
const testQuestions = [
    {
        id: 1,
        question: "What is the useState hook in React?",
        expectedSources: ["react-hooks-guide.txt"],
        expectedKeywords: ["useState", "state", "functional components", "array"]
    },
    {
        id: 2,
        question: "How do arrow functions work in JavaScript?",
        expectedSources: ["modern-javascript-features.txt"],
        expectedKeywords: ["arrow functions", "concise", "this context", "=>"]
    },
    {
        id: 3,
        question: "What is Express.js used for?",
        expectedSources: ["nodejs-express-backend.txt"],
        expectedKeywords: ["Express.js", "web framework", "Node.js", "routing"]
    },
    {
        id: 4,
        question: "How does CSS Grid differ from Flexbox?",
        expectedSources: ["css-grid-flexbox.txt"],
        expectedKeywords: ["CSS Grid", "Flexbox", "two-dimensional", "one-dimensional"]
    },
    {
        id: 5,
        question: "What are Core Web Vitals?",
        expectedSources: ["web-performance-optimization.txt"],
        expectedKeywords: ["Core Web Vitals", "LCP", "FID", "CLS", "Google"]
    },
    {
        id: 6,
        question: "How do you use template literals in JavaScript?",
        expectedSources: ["modern-javascript-features.txt"],
        expectedKeywords: ["template literals", "backticks", "${}", "string interpolation"]
    },
    {
        id: 7,
        question: "What is the event loop in Node.js?",
        expectedSources: ["nodejs-express-backend.txt"],
        expectedKeywords: ["event loop", "asynchronous", "non-blocking", "callbacks"]
    },
    {
        id: 8,
        question: "How do you optimize images for web performance?",
        expectedSources: ["web-performance-optimization.txt"],
        expectedKeywords: ["image optimization", "WebP", "AVIF", "lazy loading", "responsive images"]
    },
    {
        id: 9,
        question: "What are custom hooks in React?",
        expectedSources: ["react-hooks-guide.txt"],
        expectedKeywords: ["custom hooks", "reusable", "use", "component logic"]
    },
    {
        id: 10,
        question: "How do you create responsive layouts with CSS Grid?",
        expectedSources: ["css-grid-flexbox.txt"],
        expectedKeywords: ["responsive", "auto-fit", "auto-fill", "minmax", "media queries"]
    }
];

class RAGEvaluator {
    constructor() {
        this.results = [];
    }

    async runEvaluation() {
        console.log("🧪 RAG SYSTEM EVALUATION");
        console.log("=" .repeat(60));
        console.log(`Running ${testQuestions.length} test questions...`);
        console.log("");

        for (const test of testQuestions) {
            console.log(`Question ${test.id}: ${test.question}`);
            
            try {
                // Retrieve relevant chunks
                const chunks = await retrieveRelevantChunks(test.question, 3);
                
                // Get full answer with details
                const result = await answerQueryWithDetails(test.question, false, false);
                
                // Evaluate retrieval accuracy
                const evaluation = this.evaluateRetrieval(test, chunks, result.answer);
                
                this.results.push({
                    ...test,
                    retrievedChunks: chunks,
                    answer: result.answer,
                    evaluation: evaluation,
                    cost: result.cost,
                    usage: result.usage
                });

                console.log(`  ✓ Retrieval Accuracy: ${evaluation.retrievalAccuracy}%`);
                console.log(`  ✓ Answer Quality: ${evaluation.answerQuality}/5`);
                console.log(`  ✓ Top Source: ${chunks[0]?.filename} (${formatSimilarityScore(chunks[0]?.similarityScore)})`);
                console.log("");

            } catch (error) {
                console.error(`  ❌ Error: ${error.message}`);
                console.log("");
            }
        }

        this.generateReport();
    }

    evaluateRetrieval(test, retrievedChunks, answer) {
        // Check if expected sources are in top 3 retrieved chunks
        const retrievedSources = retrievedChunks.map(chunk => chunk.filename);
        const expectedFound = test.expectedSources.filter(source => 
            retrievedSources.includes(source)
        ).length;
        
        const retrievalAccuracy = (expectedFound / test.expectedSources.length) * 100;

        // Check if expected keywords appear in the answer
        const answerLower = answer.toLowerCase();
        const keywordsFound = test.expectedKeywords.filter(keyword => 
            answerLower.includes(keyword.toLowerCase())
        ).length;
        
        // Simple answer quality score (1-5) based on keyword coverage and source accuracy
        let answerQuality = Math.min(5, Math.max(1, 
            Math.round((keywordsFound / test.expectedKeywords.length) * 3 + 
                      (retrievalAccuracy / 100) * 2)
        ));

        return {
            retrievalAccuracy,
            keywordCoverage: (keywordsFound / test.expectedKeywords.length) * 100,
            answerQuality,
            topSourceRelevance: retrievedChunks[0]?.similarityScore || 0,
            expectedSourcesFound: expectedFound,
            keywordsFound: keywordsFound
        };
    }

    generateReport() {
        console.log("\n📊 EVALUATION REPORT");
        console.log("=" .repeat(60));

        // Calculate overall metrics
        const avgRetrievalAccuracy = this.results.reduce((sum, r) => 
            sum + r.evaluation.retrievalAccuracy, 0) / this.results.length;
        
        const avgAnswerQuality = this.results.reduce((sum, r) => 
            sum + r.evaluation.answerQuality, 0) / this.results.length;
        
        const avgKeywordCoverage = this.results.reduce((sum, r) => 
            sum + r.evaluation.keywordCoverage, 0) / this.results.length;
        
        const avgTopSourceRelevance = this.results.reduce((sum, r) => 
            sum + r.evaluation.topSourceRelevance, 0) / this.results.length;

        const totalCost = this.results.reduce((sum, r) => sum + r.cost, 0);
        const totalTokens = this.results.reduce((sum, r) => sum + r.usage.total_tokens, 0);

        console.log("📈 PERFORMANCE METRICS:");
        console.log(`  Average Retrieval Accuracy: ${avgRetrievalAccuracy.toFixed(1)}%`);
        console.log(`  Average Answer Quality: ${avgAnswerQuality.toFixed(1)}/5`);
        console.log(`  Average Keyword Coverage: ${avgKeywordCoverage.toFixed(1)}%`);
        console.log(`  Average Top Source Relevance: ${formatSimilarityScore(avgTopSourceRelevance)}`);

        console.log("\n💰 COST ANALYSIS:");
        console.log(`  Total Cost: ${formatCost(totalCost)}`);
        console.log(`  Average Cost per Question: ${formatCost(totalCost / this.results.length)}`);
        console.log(`  Total Tokens Used: ${totalTokens}`);
        console.log(`  Average Tokens per Question: ${Math.round(totalTokens / this.results.length)}`);

        // Identify best and worst performing questions
        const bestResult = this.results.reduce((best, current) => 
            current.evaluation.retrievalAccuracy > best.evaluation.retrievalAccuracy ? current : best
        );
        
        const worstResult = this.results.reduce((worst, current) => 
            current.evaluation.retrievalAccuracy < worst.evaluation.retrievalAccuracy ? current : worst
        );

        console.log("\n🏆 BEST PERFORMANCE:");
        console.log(`  Question: ${bestResult.question}`);
        console.log(`  Retrieval Accuracy: ${bestResult.evaluation.retrievalAccuracy}%`);
        console.log(`  Answer Quality: ${bestResult.evaluation.answerQuality}/5`);

        console.log("\n⚠️ NEEDS IMPROVEMENT:");
        console.log(`  Question: ${worstResult.question}`);
        console.log(`  Retrieval Accuracy: ${worstResult.evaluation.retrievalAccuracy}%`);
        console.log(`  Answer Quality: ${worstResult.evaluation.answerQuality}/5`);

        // Source accuracy breakdown
        console.log("\n📚 SOURCE ACCURACY BREAKDOWN:");
        const sourceAccuracy = {};
        this.results.forEach(result => {
            result.retrievedChunks.forEach((chunk, index) => {
                if (!sourceAccuracy[chunk.filename]) {
                    sourceAccuracy[chunk.filename] = { total: 0, topRank: 0 };
                }
                sourceAccuracy[chunk.filename].total++;
                if (index === 0) sourceAccuracy[chunk.filename].topRank++;
            });
        });

        Object.entries(sourceAccuracy).forEach(([source, stats]) => {
            const topRankPercentage = (stats.topRank / stats.total) * 100;
            console.log(`  ${source}: Retrieved ${stats.total} times, top rank ${stats.topRank} times (${topRankPercentage.toFixed(1)}%)`);
        });
    }

    async saveDetailedResults() {
        const reportData = {
            timestamp: new Date().toISOString(),
            summary: {
                totalQuestions: this.results.length,
                avgRetrievalAccuracy: this.results.reduce((sum, r) => sum + r.evaluation.retrievalAccuracy, 0) / this.results.length,
                avgAnswerQuality: this.results.reduce((sum, r) => sum + r.evaluation.answerQuality, 0) / this.results.length,
                totalCost: this.results.reduce((sum, r) => sum + r.cost, 0),
                totalTokens: this.results.reduce((sum, r) => sum + r.usage.total_tokens, 0)
            },
            results: this.results
        };

        const fs = await import('fs/promises');
        await fs.writeFile('./evaluation-report.json', JSON.stringify(reportData, null, 2));
        console.log("\n💾 Detailed results saved to evaluation-report.json");
    }
}

// Run evaluation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const evaluator = new RAGEvaluator();
    evaluator.runEvaluation()
        .then(() => evaluator.saveDetailedResults())
        .catch(console.error);
}

export { RAGEvaluator, testQuestions };