import readline from 'readline';
import fs from 'fs/promises';
import path from 'path';
import { answerQueryWithDetails, retrieveRelevantChunks } from './2-rag-system.js';
import { loadJSON } from './utils.js';

class SmartDocumentQA {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.knowledgeBasePath = './knowledge-base';
        this.sessionCosts = [];
    }

    async start() {
        console.log("Smart Document Q&A System");
        console.log("=" .repeat(50));
        console.log("Ask questions about web development topics!");
        console.log("Available commands:");
        console.log("  - Ask any question");
        console.log("  - 'view sources' - See all available documents");
        console.log("  - 'view [filename]' - Read a specific document");
        console.log("  - 'stats' - View session statistics");
        console.log("  - 'exit' - Quit the application");
        console.log("=" .repeat(50));

        this.askQuestion();
    }

    askQuestion() {
        this.rl.question("\n Your question: ", async (input) => {
            const command = input.trim().toLowerCase();

            if (command === 'exit') {
                await this.showSessionStats();
                console.log("\nGoodbye!");
                this.rl.close();
                return;
            }

            if (command === 'stats') {
                await this.showSessionStats();
                this.askQuestion();
                return;
            }

            if (command === 'view sources') {
                await this.showAvailableDocuments();
                this.askQuestion();
                return;
            }

            if (command.startsWith('view ')) {
                const filename = command.substring(5).trim();
                await this.viewDocument(filename);
                this.askQuestion();
                return;
            }

            if (input.trim() === '') {
                console.log("Please enter a question or command.");
                this.askQuestion();
                return;
            }

            try {
                const result = await answerQueryWithDetails(input, true, true);
                this.sessionCosts.push(result.cost);
                
                console.log("\n Sources used:");
                result.sources.forEach((source, index) => {
                    console.log(`  ${index + 1}. ${source.filename} (${(source.similarityScore * 100).toFixed(1)}% match)`);
                });

            } catch (error) {
                console.error("Error processing your question:", error.message);
            }

            this.askQuestion();
        });
    }

    async showAvailableDocuments() {
        try {
            const files = await fs.readdir(this.knowledgeBasePath);
            const txtFiles = files.filter(file => file.endsWith('.txt'));

            console.log("\n Available Documents:");
            console.log("=" .repeat(50));
            
            if (txtFiles.length === 0) {
                console.log("No documents found in knowledge base.");
                return;
            }

            for (const file of txtFiles) {
                const filePath = path.join(this.knowledgeBasePath, file);
                const content = await fs.readFile(filePath, 'utf-8');
                const wordCount = content.split(/\s+/).length;
                console.log(` ${file} (${wordCount} words)`);
                console.log(`   Preview: ${content.substring(0, 100)}...`);
                console.log("");
            }

        } catch (error) {
            console.error("Error reading knowledge base:", error.message);
        }
    }

    async viewDocument(filename) {
        try {
            // Add .txt extension if not provided
            if (!filename.endsWith('.txt')) {
                filename += '.txt';
            }

            const filePath = path.join(this.knowledgeBasePath, filename);
            const content = await fs.readFile(filePath, 'utf-8');
            
            console.log(`\n Document: ${filename}`);
            console.log("=" .repeat(50));
            console.log(content);

        } catch (error) {
            console.error(`Document '${filename}' not found. Use 'view sources' to see available documents.`);
        }
    }

    async showSessionStats() {
        console.log("\n SESSION STATISTICS:");
        console.log("=" .repeat(50));
        
        if (this.sessionCosts.length === 0) {
            console.log("No queries processed in this session.");
            return;
        }

        const totalCost = this.sessionCosts.reduce((sum, cost) => sum + cost, 0);
        const avgCost = totalCost / this.sessionCosts.length;

        console.log(`Queries processed: ${this.sessionCosts.length}`);
        console.log(`Total cost: $${totalCost.toFixed(6)}`);
        console.log(`Average cost per query: $${avgCost.toFixed(6)}`);
        console.log(`Estimated cost per 100 queries: $${(avgCost * 100).toFixed(4)}`);
    }

    async searchDocuments(query, topK = 3) {
        try {
            const chunks = await retrieveRelevantChunks(query, topK);
            
            console.log(`\n Search Results for: "${query}"`);
            console.log("=" .repeat(50));
            
            chunks.forEach((chunk, index) => {
                console.log(`${index + 1}. ${chunk.filename}`);
                console.log(`   Relevance: ${(chunk.similarityScore * 100).toFixed(1)}%`);
                console.log(`   Content: ${chunk.text.substring(0, 200)}...`);
                console.log("");
            });

        } catch (error) {
            console.error("Error searching documents:", error.message);
        }
    }
}

// Run the interactive CLI
const qa = new SmartDocumentQA();
qa.start().catch(console.error);