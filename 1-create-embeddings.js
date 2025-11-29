
import { loadKnowledgeBase, createEmbedding, saveJSON } from "./utils.js";



async function createKnowledgeBaseIndex() {
    console.log("==== creating knowledge base index ====");
    

    //step1: load documents
    console.log("loading documents from knowledge base");
    const documents = await loadKnowledgeBase('./knowledge-base');


    console.log(documents);
    
    //step2 : create embeddings for each chunk
    const index = [];
    let totalChunks = 0;

    for (const doc of documents) {
        console.log(doc.filename);
        console.log(doc.chunks.length);

        for (const chunk in doc.chunks) {
            const embedding = await createEmbedding(doc.chunks[chunk])

            index.push({
                id: `${doc.filename}-chunk-${chunk}`,
                filename: doc.filename,
                text: doc.chunks[chunk],
                embedding: embedding
            })

            totalChunks++;
        }
    }

    //step3: save index to file
    console.log("saving chunks");
    await saveJSON('./knowledge-base-index.json', index);
}


createKnowledgeBaseIndex();