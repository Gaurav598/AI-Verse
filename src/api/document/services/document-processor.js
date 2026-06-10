'use strict';

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini for embeddings
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock');

/**
 * Text splitting utility
 */
function chunkText(text, chunkSize = 1000, chunkOverlap = 200) {
  const words = text.split(/\s+/);
  const chunks = [];
  let i = 0;
  
  while (i < words.length) {
    const chunkWords = words.slice(i, i + chunkSize);
    chunks.push(chunkWords.join(' '));
    i += chunkSize - chunkOverlap;
  }
  return chunks;
}

/**
 * Generates an embedding array
 */
async function generateEmbedding(text) {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

module.exports = {
  async processDocument(documentId) {
    const strapiDb = strapi.db.connection;
    try {
      // 1. Fetch document and file details
      const doc = await strapi.documents('api::document.document').findOne({
        documentId,
      });
      
      if (!doc) throw new Error('Document not found');
      
      await strapi.documents('api::document.document').update({
        documentId,
        data: { status: 'processing' }
      });

      // 2. Resolve file path (assuming local upload provider for now)
      // doc.file_url is likely something like /uploads/filename.pdf
      const relativePath = doc.file_url.startsWith('/') ? doc.file_url.slice(1) : doc.file_url;
      const filePath = path.join(strapi.dirs.static.public, relativePath);
      
      if (!fs.existsSync(filePath)) {
         throw new Error(`File not found at path: ${filePath}`);
      }

      // 3. Extract text
      let extractedText = '';
      const ext = path.extname(filePath).toLowerCase();
      
      if (ext === '.pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        extractedText = data.text;
      } else if (ext === '.docx') {
        const result = await mammoth.extractRawText({ path: filePath });
        extractedText = result.value;
      } else if (ext === '.txt' || ext === '.md') {
        extractedText = fs.readFileSync(filePath, 'utf8');
      } else {
        throw new Error(`Unsupported file type: ${ext}`);
      }
      
      // Clean text
      extractedText = extractedText.replace(/\0/g, '').replace(/\s+/g, ' ').trim();
      if (!extractedText) throw new Error('No text extracted');

      // 4. Chunk text
      const chunks = chunkText(extractedText);
      
      // 5. Generate Embeddings & Store in DB
      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        const embeddingValues = await generateEmbedding(chunkContent);
        
        // Insert into Strapi's document_chunks table directly with raw query
        // so we can cast the embedding array to the vector type
        const embeddingString = `[${embeddingValues.join(',')}]`;
        
        // Strapi creates 'document_chunks' table
        // First we insert the basic entry using knex
        const [insertedChunk] = await strapiDb('document_chunks').insert({
           content: chunkContent,
           chunk_index: i,
           document_id: doc.id,
           created_at: new Date(),
           updated_at: new Date(),
           published_at: new Date()
        }).returning('id');
        
        // Then we update the vector column using raw SQL
        await strapiDb.raw(
          `UPDATE document_chunks SET embedding = ?::vector WHERE id = ?`,
          [embeddingString, insertedChunk.id]
        );
        
        // Also need to create the relation link in document_chunks_document_links
        // Wait, strapi document_id field might not exist on document_chunks table.
        // Let's create the link in Strapi's linking table.
        await strapiDb('document_chunks_document_links').insert({
           document_chunk_id: insertedChunk.id,
           document_id: doc.id
        });
      }

      // 6. Update Status
      await strapi.documents('api::document.document').update({
        documentId,
        data: { 
          status: 'success',
          chunk_count: chunks.length 
        }
      });
      
      return { success: true, chunksProcessed: chunks.length };

    } catch (error) {
      console.error('Document processing failed', error);
      await strapi.documents('api::document.document').update({
        documentId,
        data: { 
          status: 'failed',
          error_message: error.message
        }
      });
      throw error;
    }
  }
};
