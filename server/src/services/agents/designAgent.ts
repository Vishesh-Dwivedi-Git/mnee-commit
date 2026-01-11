/**
 * Visual Design Diff Agent
 * 
 * Verifies whether submitted design matches the requested design specification.
 * - Fetches and analyzes design images
 * - Compares layouts, colors, and structure
 * - Generates confidence score and evidence
 */

import axios from 'axios';
import sharp from 'sharp';
import { GoogleGenerativeAI, type Part } from '@google/generative-ai';
import { GEMINI_API_KEY } from '../../config/index.js';
import { uploadJSON } from '../ipfsService.js';
import type { DesignAgentInput, DesignAgentResult, DesignAgentDetails } from '../../types/agents.js';

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
 * Download image from URL and convert to base64
 */
async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    // Resize if too large (max 2000px) and convert to JPEG for consistency
    const processed = await sharp(buffer)
        .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

    return {
        base64: processed.toString('base64'),
        mimeType: 'image/jpeg',
    };
}

/**
 * Calculate basic image similarity using histogram comparison
 */
async function calculateImageSimilarity(
    baselineBuffer: Buffer,
    submittedBuffer: Buffer
): Promise<number> {
    try {
        // Get image stats
        const baselineStats = await sharp(baselineBuffer).stats();
        const submittedStats = await sharp(submittedBuffer).stats();

        // Compare channel means (simple similarity metric)
        let similarity = 0;
        const channelCount = Math.min(baselineStats.channels.length, submittedStats.channels.length);
        for (let i = 0; i < channelCount; i++) {
            const baselineChannel = baselineStats.channels[i];
            const submittedChannel = submittedStats.channels[i];
            if (baselineChannel && submittedChannel) {
                const baselineMean = baselineChannel.mean;
                const submittedMean = submittedChannel.mean;
                const diff = Math.abs(baselineMean - submittedMean) / 255;
                similarity += (1 - diff);
            }
        }

        return channelCount > 0 ? similarity / channelCount : 0.5;
    } catch (error) {
        console.warn('Image similarity calculation failed:', error);
        return 0.5; // Default to neutral
    }
}

/**
 * Analyze design with Gemini Vision
 */
async function analyzeDesignWithAI(
    designSpec: string,
    imageUrls: string[]
): Promise<{ analysis: string; confidence: number; differences: Array<{ area: string; severity: 'minor' | 'moderate' | 'major'; description: string }> }> {
    if (!genAI) {
        return {
            analysis: 'AI analysis unavailable - Gemini not configured',
            confidence: 50,
            differences: [],
        };
    }

    try {
        // Fetch images and convert to base64
        const imageParts: Part[] = [];
        for (const url of imageUrls.slice(0, 4)) {
            try {
                const { base64, mimeType } = await fetchImageAsBase64(url);
                imageParts.push({
                    inlineData: { data: base64, mimeType },
                });
            } catch (error) {
                console.warn(`Failed to fetch image: ${url}`, error);
            }
        }

        if (imageParts.length === 0) {
            return {
                analysis: 'Could not fetch any images for analysis',
                confidence: 30,
                differences: [],
            };
        }

        const prompt = `You are a design review agent. Analyze whether the submitted design(s) match the design specification.

## Design Specification
${designSpec}

## Instructions
1. Examine the submitted design image(s)
2. Check if the design matches the specification
3. Identify any differences in layout, colors, typography, spacing
4. Note missing or extra elements
5. Provide a confidence score (0-100) indicating how well the design matches the spec

Respond ONLY with valid JSON in this exact format:
{
  "analysis": "Your detailed analysis here",
  "confidence": 85,
  "layoutMatch": true,
  "colorConsistency": 0.95,
  "differences": [
    {"area": "header", "severity": "minor", "description": "Font size slightly smaller than specified"}
  ],
  "matchedElements": ["login form", "logo", "footer"],
  "missingElements": []
}`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent([prompt, ...imageParts]);
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
            differences: parsed.differences || [],
        };
    } catch (error) {
        console.error('AI design analysis error:', error);
        return {
            analysis: 'AI analysis failed - using basic scoring',
            confidence: 50,
            differences: [],
        };
    }
}

/**
 * Run Visual Design Diff verification
 */
export async function runDesignAgent(input: DesignAgentInput): Promise<DesignAgentResult> {
    initGemini();

    if (!input.submittedImages || input.submittedImages.length === 0) {
        // Return fallback instead of throwing
        return {
            confidenceScore: 50,
            evidenceCid: 'no-images',
            summary: '⚠️ No images provided for design verification.',
            details: {
                structuralSimilarity: undefined,
                colorConsistency: undefined,
                layoutMatch: false,
                comparedImages: 0,
                aiAnalysis: 'No images provided',
                differences: [],
            },
        };
    }

    try {
    // Fetch submitted images
    const submittedBuffers: Buffer[] = [];
    for (const url of input.submittedImages.slice(0, 5)) {
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            submittedBuffers.push(Buffer.from(response.data));
        } catch (error) {
            console.warn(`Failed to fetch image: ${url}`, error);
        }
    }

    if (submittedBuffers.length === 0) {
        // Return fallback instead of throwing
        return {
            confidenceScore: 55,
            evidenceCid: 'fetch-failed',
            summary: '⚠️ Could not fetch design images. Please verify URLs are accessible.',
            details: {
                structuralSimilarity: undefined,
                colorConsistency: undefined,
                layoutMatch: false,
                comparedImages: 0,
                aiAnalysis: 'Failed to fetch images',
                differences: [],
            },
        };
    }

    // Calculate similarity if baseline provided
    let structuralSimilarity: number | undefined;
    if (input.baselineImages && input.baselineImages.length > 0) {
        const firstBaseline = input.baselineImages[0];
        const firstSubmitted = submittedBuffers[0];
        if (firstBaseline && firstSubmitted) {
            try {
                const baselineResponse = await axios.get(firstBaseline, { responseType: 'arraybuffer' });
                const baselineBuffer = Buffer.from(baselineResponse.data);
                structuralSimilarity = await calculateImageSimilarity(baselineBuffer, firstSubmitted);
            } catch (error) {
                console.warn('Could not calculate baseline similarity:', error);
            }
        }
    }

    // AI Analysis
    const aiResult = await analyzeDesignWithAI(input.designSpec, input.submittedImages);

    // Build details
    const details: DesignAgentDetails = {
        structuralSimilarity,
        colorConsistency: undefined,
        layoutMatch: aiResult.confidence >= 70,
        comparedImages: submittedBuffers.length,
        aiAnalysis: aiResult.analysis,
        differences: aiResult.differences,
    };

    // Calculate final confidence score
    let confidenceScore = aiResult.confidence;

    // Adjust based on structural similarity if available
    if (structuralSimilarity !== undefined) {
        const similarityBonus = (structuralSimilarity - 0.5) * 20; // -10 to +10
        confidenceScore = Math.min(100, Math.max(0, confidenceScore + similarityBonus));
    }

    // Build evidence object
    const evidence = {
        timestamp: new Date().toISOString(),
        type: 'visual-design-diff',
        input: {
            designSpec: input.designSpec,
            submittedImages: input.submittedImages,
            baselineImages: input.baselineImages,
        },
        result: {
            confidenceScore,
            details,
        },
    };

    // Upload to IPFS
    const evidenceCid = await uploadJSON(evidence, `design-evidence-${Date.now()}`);

    // Build summary
    const diffCount = aiResult.differences.length;
    const summary = `Design analysis: ${aiResult.confidence}% match, ${diffCount} difference(s) found. ${aiResult.analysis.slice(0, 200)}...`;

    return {
        confidenceScore,
        evidenceCid,
        summary,
        details,
    };
    } catch (error) {
        console.error('[Agent:Design] Error during analysis:', error);
        return {
            confidenceScore: 60,
            evidenceCid: 'error',
            summary: '⚠️ Design verification encountered an error. Manual review recommended.',
            details: {
                structuralSimilarity: undefined,
                colorConsistency: undefined,
                layoutMatch: false,
                comparedImages: 0,
                aiAnalysis: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                differences: [],
            },
        };
    }
}
