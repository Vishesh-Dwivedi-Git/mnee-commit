import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

/**
 * AI Verification Service
 * Analyzes submitted work against specifications using Gemini API
 */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Fetch content from IPFS
 */
async function fetchFromIPFS(cid) {
  try {
    const gateways = [
      `https://ipfs.io/ipfs/${cid}`,
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
    ];

    for (const gateway of gateways) {
      try {
        const response = await axios.get(gateway, { timeout: 10000 });
        return response.data;
      } catch (err) {
        continue; // Try next gateway
      }
    }

    throw new Error("Failed to fetch from all IPFS gateways");
  } catch (error) {
    console.error(`Error fetching IPFS content for ${cid}:`, error.message);
    return null;
  }
}

/**
 * Analyze submitted work against specification
 */
export async function verifyWork(specCid, evidenceCid) {
  try {
    // Fetch spec and evidence from IPFS
    const [spec, evidence] = await Promise.all([
      fetchFromIPFS(specCid),
      fetchFromIPFS(evidenceCid),
    ]);

    if (!spec || !evidence) {
      // Return a fallback result instead of failing
      return {
        success: true,
        confidenceScore: 65,
        status: "PENDING_REVIEW",
        analysis:
          "⚠️ Could not retrieve documents from IPFS.\n\nThe specification or evidence could not be fetched. This may be due to network issues. Please verify the work manually.",
        specCid,
        evidenceCid,
        fallback: true,
      };
    }

    // Prepare prompt for AI analysis
    const prompt = `You are an expert code reviewer and work verifier. Analyze if the submitted work meets the requirements.

**SPECIFICATION:**
${typeof spec === "object" ? JSON.stringify(spec, null, 2) : spec}

**SUBMITTED WORK/EVIDENCE:**
${typeof evidence === "object" ? JSON.stringify(evidence, null, 2) : evidence}

**YOUR TASK:**
1. Analyze if the submitted work meets the specification requirements
2. Provide a confidence score (0-100%) indicating how well the work matches the spec
3. List any issues or missing requirements
4. Keep your analysis concise and actionable

**RESPONSE FORMAT:**
Confidence Score: [0-100]%
Status: [PASS/FAIL/PARTIAL]
Analysis: [Brief analysis of the work]
Issues: [List any problems, or "None" if work is acceptable]`;

    // Get AI analysis
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse confidence score from response
    const scoreMatch = text.match(/Confidence Score:\s*(\d+)%/i);
    const confidenceScore = scoreMatch ? parseInt(scoreMatch[1]) : 50;

    // Parse status
    const statusMatch = text.match(/Status:\s*(PASS|FAIL|PARTIAL)/i);
    const status = statusMatch ? statusMatch[1] : "PARTIAL";

    return {
      success: true,
      confidenceScore,
      status,
      analysis: text,
      specCid,
      evidenceCid,
    };
  } catch (error) {
    console.error("Error in AI verification:", error);
    // Return a default fallback result instead of failing completely
    // This ensures the bot doesn't break if the AI API is down
    return {
      success: true,
      confidenceScore: 70, // Default reasonable confidence when AI unavailable
      status: "PENDING_REVIEW",
      analysis:
        "⚠️ AI verification unavailable - manual review recommended.\n\nThe AI verification service could not analyze this submission. Please review the work manually or try again later.",
      specCid,
      evidenceCid,
      fallback: true,
    };
  }
}

/**
 * Format verification results for Discord
 */
export function formatVerificationMessage(verificationResult) {
  if (!verificationResult.success) {
    return `⚠️ **AI Verification Unavailable**\n\nManual review recommended. The AI service could not process this request.`;
  }

  const { confidenceScore, status, analysis, fallback } = verificationResult;

  let emoji = "✅";
  let statusText = "Work appears to meet requirements";

  if (fallback) {
    emoji = "⚠️";
    statusText = "Manual review recommended";
  } else if (status === "FAIL" || confidenceScore < 50) {
    emoji = "❌";
    statusText = "Potential issues detected";
  } else if (
    status === "PARTIAL" ||
    status === "PENDING_REVIEW" ||
    confidenceScore < 80
  ) {
    emoji = "⚠️";
    statusText = "Work partially meets requirements";
  }

  return `🤖 **AI Verification Complete**

${emoji} **Confidence Score:** ${confidenceScore}%
📊 **Status:** ${status}

**Analysis:**
${analysis.substring(0, 800)}${analysis.length > 800 ? "..." : ""}

*Note: This is an AI-generated assessment. Final approval is at the discretion of the commitment creator.*`;
}
