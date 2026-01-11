/**
 * Document/Research Diff Agent
 * 
 * Verifies whether submitted document matches the requested structure and scope.
 * - Parses PDF, Markdown, or text documents
 * - Extracts and analyzes structure
 * - Compares against specification
 * - Generates confidence score and evidence
 */

import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
// @ts-ignore - pdf-parse doesn't have perfect types
import pdfParse from 'pdf-parse';
import { GEMINI_API_KEY } from '../../config/index.js';
import { uploadJSON } from '../ipfsService.js';
import type { DocumentAgentInput, DocumentAgentResult, DocumentAgentDetails } from '../../types/agents.js';

let genAI: GoogleGenerativeAI | null = null;

/**
 * Initialize Gemini client
 */
function initGemini(): void {
    if (!genAI && GEMINI_API_KEY) {
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    }
}

/**
 * Detect document type from URL or content
 */
function detectDocumentType(url: string, contentType?: string): 'pdf' | 'markdown' | 'text' | 'unknown' {
    const lowerUrl = url.toLowerCase();
    const lowerType = contentType?.toLowerCase() || '';

    if (lowerUrl.endsWith('.pdf') || lowerType.includes('pdf')) return 'pdf';
    if (lowerUrl.endsWith('.md') || lowerUrl.endsWith('.markdown')) return 'markdown';
    if (lowerUrl.endsWith('.txt') || lowerType.includes('text/plain')) return 'text';
    if (lowerType.includes('text/')) return 'text';

    return 'unknown';
}

/**
 * Extract text from PDF buffer
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
    const data = await pdfParse(buffer);
    return data.text;
}

/**
 * Extract headings from markdown
 */
function extractMarkdownSections(text: string): string[] {
    const headingRegex = /^#{1,3}\s+(.+)$/gm;
    const sections: string[] = [];
    let match;

    while ((match = headingRegex.exec(text)) !== null) {
        const section = match[1];
        if (section) {
            sections.push(section.trim());
        }
    }

    return sections;
}

/**
 * Extract sections from plain text (by common patterns)
 */
function extractTextSections(text: string): string[] {
    const sections: string[] = [];

    // Look for numbered sections
    const numberedRegex = /^\d+\.\s+(.+)$/gm;
    let match;
    while ((match = numberedRegex.exec(text)) !== null) {
        const section = match[1];
        if (section && section.length > 2 && section.length < 100) {
            sections.push(section.trim());
        }
    }

    // Look for all-caps headings
    const capsRegex = /^([A-Z][A-Z\s]{2,})$/gm;
    while ((match = capsRegex.exec(text)) !== null) {
        const section = match[1];
        if (section && section.length > 2 && section.length < 100) {
            sections.push(section.trim());
        }
    }

    return [...new Set(sections)]; // Remove duplicates
}

/**
 * Analyze document with Gemini AI
 */
async function analyzeDocumentWithAI(
    documentSpec: string,
    documentContent: string,
    sectionsFound: string[]
): Promise<{
    analysis: string;
    confidence: number;
    sectionsMissing: string[];
    sectionDetails: Array<{ name: string; found: boolean; summary?: string }>;
    structureScore: number;
    relevanceScore: number;
}> {
    if (!genAI) {
        return {
            analysis: 'AI analysis unavailable - Gemini not configured',
            confidence: 50,
            sectionsMissing: [],
            sectionDetails: [],
            structureScore: 50,
            relevanceScore: 50,
        };
    }

    // Truncate content if too long
    const truncatedContent = documentContent.slice(0, 30000); // Gemini has larger context

    const prompt = `You are a document review agent. Analyze whether the submitted document matches the specification.

## Document Specification/Requirements
${documentSpec}

## Detected Sections in Document
${sectionsFound.length > 0 ? sectionsFound.join(', ') : 'No clear sections detected'}

## Document Content (truncated)
${truncatedContent}

## Instructions
1. Check if the document covers all required topics/sections
2. Assess the structure and organization
3. Evaluate topic relevance and completeness
4. Identify missing or inadequate sections
5. Provide scores for structure (0-100) and relevance (0-100)
6. Provide overall confidence score (0-100)

Respond ONLY with valid JSON in this exact format:
{
  "analysis": "Your detailed analysis here",
  "confidence": 85,
  "structureScore": 80,
  "relevanceScore": 90,
  "requiredSections": ["Introduction", "Methods", "Results"],
  "sectionsMissing": ["Conclusion"],
  "sectionDetails": [
    {"name": "Introduction", "found": true, "summary": "Brief overview of the topic"},
    {"name": "Conclusion", "found": false, "summary": null}
  ]
}`;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        const content = result.response.text();

        // Extract JSON from response
        let jsonContent = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonContent = jsonMatch[1];
        }

        const parsed = JSON.parse(jsonContent.trim());

        return {
            analysis: parsed.analysis || 'Analysis completed',
            confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
            sectionsMissing: parsed.sectionsMissing || [],
            sectionDetails: parsed.sectionDetails || [],
            structureScore: Math.min(100, Math.max(0, parsed.structureScore || 50)),
            relevanceScore: Math.min(100, Math.max(0, parsed.relevanceScore || 50)),
        };
    } catch (error) {
        console.error('AI document analysis error:', error);
        return {
            analysis: 'AI analysis failed - using basic scoring',
            confidence: 50,
            sectionsMissing: [],
            sectionDetails: [],
            structureScore: 50,
            relevanceScore: 50,
        };
    }
}

/**
 * Run Document/Research Diff verification
 */
export async function runDocumentAgent(input: DocumentAgentInput): Promise<DocumentAgentResult> {
    initGemini();

    let documentContent = '';
    let documentType: 'pdf' | 'markdown' | 'text' | 'unknown' = 'unknown';

    // Get document content
    if (input.submittedContent) {
        documentContent = input.submittedContent;
        documentType = 'text';
    } else if (input.submittedDocUrl) {
        try {
            const response = await axios.get(input.submittedDocUrl, {
                responseType: 'arraybuffer',
                headers: { 'Accept': '*/*' },
            });

            const contentType = response.headers['content-type'] as string | undefined;
            documentType = detectDocumentType(input.submittedDocUrl, contentType);

            if (documentType === 'pdf') {
                documentContent = await extractPdfText(Buffer.from(response.data));
            } else {
                documentContent = Buffer.from(response.data).toString('utf-8');
            }
        } catch (error) {
            // Return fallback instead of throwing
            console.error('[Agent:Document] Failed to fetch document:', error);
            return {
                confidenceScore: 55,
                evidenceCid: 'fetch-failed',
                summary: '⚠️ Could not fetch document. Please verify URL is accessible.',
                details: {
                    documentType: 'unknown',
                    wordCount: 0,
                    sectionsFound: [],
                    sectionsMissing: [],
                    structureScore: 50,
                    relevanceScore: 50,
                    aiAnalysis: `Failed to fetch: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    sectionDetails: [],
                },
            };
        }
    } else {
        // Return fallback instead of throwing
        return {
            confidenceScore: 50,
            evidenceCid: 'no-content',
            summary: '⚠️ No document content provided for verification.',
            details: {
                documentType: 'unknown',
                wordCount: 0,
                sectionsFound: [],
                sectionsMissing: [],
                structureScore: 50,
                relevanceScore: 50,
                aiAnalysis: 'No document content provided',
                sectionDetails: [],
            },
        };
    }

    if (!documentContent || documentContent.trim().length === 0) {
        // Return fallback instead of throwing
        return {
            confidenceScore: 50,
            evidenceCid: 'empty-doc',
            summary: '⚠️ Document is empty or could not be parsed.',
            details: {
                documentType,
                wordCount: 0,
                sectionsFound: [],
                sectionsMissing: [],
                structureScore: 50,
                relevanceScore: 50,
                aiAnalysis: 'Document is empty',
                sectionDetails: [],
            },
        };
    }

    try {

    // Extract sections
    let sectionsFound: string[] = [];
    if (documentType === 'markdown') {
        sectionsFound = extractMarkdownSections(documentContent);
    } else {
        sectionsFound = extractTextSections(documentContent);
    }

    // Count words
    const wordCount = documentContent.split(/\s+/).filter(w => w.length > 0).length;

    // AI Analysis
    const aiResult = await analyzeDocumentWithAI(input.documentSpec, documentContent, sectionsFound);

    // Build details
    const details: DocumentAgentDetails = {
        documentType,
        wordCount,
        sectionsFound: sectionsFound.length > 0 ? sectionsFound : aiResult.sectionDetails.filter(s => s.found).map(s => s.name),
        sectionsMissing: aiResult.sectionsMissing,
        structureScore: aiResult.structureScore,
        relevanceScore: aiResult.relevanceScore,
        aiAnalysis: aiResult.analysis,
        sectionDetails: aiResult.sectionDetails,
    };

    // Calculate final confidence score
    const confidenceScore = aiResult.confidence;

    // Build evidence object
    const evidence = {
        timestamp: new Date().toISOString(),
        type: 'document-research-diff',
        input: {
            documentSpec: input.documentSpec,
            submittedDocUrl: input.submittedDocUrl,
            hasDirectContent: !!input.submittedContent,
        },
        result: {
            confidenceScore,
            details,
        },
    };

    // Upload to IPFS
    const evidenceCid = await uploadJSON(evidence, `document-evidence-${Date.now()}`);

    // Build summary
    const foundCount = details.sectionsFound.length;
    const missingCount = details.sectionsMissing.length;
    const summary = `Document analysis: ${confidenceScore}% match, ${wordCount} words, ${foundCount} sections found, ${missingCount} missing. ${aiResult.analysis.slice(0, 200)}...`;

    return {
        confidenceScore,
        evidenceCid,
        summary,
        details,
    };
    } catch (error) {
        console.error('[Agent:Document] Error during analysis:', error);
        return {
            confidenceScore: 60,
            evidenceCid: 'error',
            summary: '⚠️ Document verification encountered an error. Manual review recommended.',
            details: {
                documentType,
                wordCount: 0,
                sectionsFound: [],
                sectionsMissing: [],
                structureScore: 50,
                relevanceScore: 50,
                aiAnalysis: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                sectionDetails: [],
            },
        };
    }
}
