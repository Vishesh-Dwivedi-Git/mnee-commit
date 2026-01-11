/**
 * GitHub Code Diff Agent
 * 
 * Verifies whether submitted code matches the agreed development task.
 * - Checks PR status and CI results
 * - Analyzes code changes
 * - Generates confidence score and evidence
 */

import { Octokit } from '@octokit/rest';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GITHUB_TOKEN, GEMINI_API_KEY } from '../../config/index.js';
import { uploadJSON } from '../ipfsService.js';
import type { GitHubAgentInput, GitHubAgentResult, GitHubAgentDetails } from '../../types/agents.js';

let octokit: Octokit | null = null;
let genAI: GoogleGenerativeAI | null = null;

/**
 * Initialize GitHub and Gemini clients
 */
function initClients(): void {
    if (!octokit && GITHUB_TOKEN) {
        octokit = new Octokit({ auth: GITHUB_TOKEN });
    }
    if (!genAI && GEMINI_API_KEY) {
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    }
}

/**
 * Parse GitHub PR URL to extract owner, repo, and PR number
 */
function parsePRUrl(url: string): { owner: string; repo: string; pullNumber: number } | null {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
    if (!match || !match[1] || !match[2] || !match[3]) return null;
    return {
        owner: match[1],
        repo: match[2],
        pullNumber: parseInt(match[3], 10),
    };
}

/**
 * Parse GitHub repo URL
 */
function parseRepoUrl(url: string): { owner: string; repo: string } | null {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match || !match[1] || !match[2]) return null;
    return {
        owner: match[1],
        repo: match[2].replace('.git', ''),
    };
}

/**
 * Analyze code diff with Gemini AI
 */
async function analyzeWithAI(
    taskSpec: string,
    prTitle: string,
    prBody: string,
    files: Array<{ filename: string; patch: string | undefined; status: string }>,
    ciStatus: string
): Promise<{ analysis: string; confidence: number }> {
    if (!genAI) {
        return {
            analysis: 'AI analysis unavailable - Gemini not configured',
            confidence: 50,
        };
    }

    const filesContext = files
        .slice(0, 20) // Limit files to avoid token limits
        .map(f => `- ${f.filename} (${f.status}):\n${f.patch?.slice(0, 500) || 'No patch available'}`)
        .join('\n\n');

    const prompt = `You are a code review agent. Analyze whether the submitted PR fulfills the task specification.

## Task Specification
${taskSpec}

## PR Title
${prTitle}

## PR Description
${prBody || 'No description provided'}

## CI Status
${ciStatus}

## Changed Files (limited preview)
${filesContext}

## Instructions
1. Assess how well the code changes match the task specification
2. Check if the implementation appears complete
3. Note any concerns or missing items
4. Provide a confidence score (0-100) indicating how well the work matches the spec

Respond ONLY with valid JSON in this exact format:
{
  "analysis": "Your detailed analysis here",
  "confidence": 85,
  "matchedRequirements": ["requirement 1", "requirement 2"],
  "missingItems": ["missing item 1"],
  "concerns": ["concern 1"]
}`;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        const content = result.response.text();

        // Extract JSON from response (handle markdown code blocks)
        let jsonContent = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonContent = jsonMatch[1];
        }

        const parsed = JSON.parse(jsonContent.trim());

        return {
            analysis: parsed.analysis || 'Analysis completed',
            confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
        };
    } catch (error) {
        console.error('AI analysis error:', error);
        return {
            analysis: 'AI analysis failed - using heuristic scoring',
            confidence: 50,
        };
    }
}

/**
 * Run GitHub Code Diff verification
 */
export async function runGitHubAgent(input: GitHubAgentInput): Promise<GitHubAgentResult> {
    initClients();

    // If GitHub API not configured, return a fallback result
    if (!octokit) {
        console.warn('[Agent:GitHub] GitHub API not configured - returning fallback result');
        return {
            confidenceScore: 65,
            evidenceCid: 'unavailable',
            summary: '⚠️ GitHub API not configured. Manual verification recommended.',
            details: {
                prNumber: 0,
                prTitle: 'Unknown',
                prStatus: 'open',
                ciStatus: 'unknown',
                filesChanged: 0,
                additions: 0,
                deletions: 0,
                testsAdded: 0,
                codeDiffSummary: 'Unable to fetch',
                aiAnalysis: 'GitHub verification unavailable - please verify manually',
                files: [],
            },
        };
    }

    // Parse PR URL
    const prInfo = input.prUrl ? parsePRUrl(input.prUrl) : null;

    if (!prInfo) {
        // Return fallback instead of throwing
        console.warn('[Agent:GitHub] Invalid PR URL provided');
        return {
            confidenceScore: 50,
            evidenceCid: 'invalid-url',
            summary: '⚠️ Invalid GitHub PR URL. Please provide a valid PR link.',
            details: {
                prNumber: 0,
                prTitle: 'Invalid URL',
                prStatus: 'open',
                ciStatus: 'unknown',
                filesChanged: 0,
                additions: 0,
                deletions: 0,
                testsAdded: 0,
                codeDiffSummary: 'Could not parse PR URL',
                aiAnalysis: 'Invalid PR URL format',
                files: [],
            },
        };
    }

    try {

    // Fetch PR details
    const { data: pr } = await octokit.pulls.get({
        owner: prInfo.owner,
        repo: prInfo.repo,
        pull_number: prInfo.pullNumber,
    });

    // Fetch PR files
    const { data: files } = await octokit.pulls.listFiles({
        owner: prInfo.owner,
        repo: prInfo.repo,
        pull_number: prInfo.pullNumber,
        per_page: 100,
    });

    // Determine PR status
    let prStatus: 'open' | 'merged' | 'closed' = 'open';
    if (pr.merged) {
        prStatus = 'merged';
    } else if (pr.state === 'closed') {
        prStatus = 'closed';
    }

    // Get CI status
    let ciStatus: 'passed' | 'failed' | 'pending' | 'unknown' = 'unknown';
    try {
        const { data: checks } = await octokit.checks.listForRef({
            owner: prInfo.owner,
            repo: prInfo.repo,
            ref: pr.head.sha,
        });

        if (checks.total_count > 0) {
            const allPassed = checks.check_runs.every(
                run => run.conclusion === 'success' || run.conclusion === 'skipped'
            );
            const anyFailed = checks.check_runs.some(run => run.conclusion === 'failure');
            const anyPending = checks.check_runs.some(
                run => run.status === 'in_progress' || run.status === 'queued'
            );

            if (anyFailed) ciStatus = 'failed';
            else if (anyPending) ciStatus = 'pending';
            else if (allPassed) ciStatus = 'passed';
        }
    } catch (error) {
        console.warn('Could not fetch CI status:', error);
    }

    // Count test files
    const testFiles = files.filter(f =>
        f.filename.includes('test') ||
        f.filename.includes('spec') ||
        f.filename.endsWith('.test.ts') ||
        f.filename.endsWith('.spec.ts')
    );

    // Prepare file summary for diff
    const filesSummary = files.map(f => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
    }));

    // AI Analysis
    const aiResult = await analyzeWithAI(
        input.taskSpec,
        pr.title,
        pr.body || '',
        files.map(f => ({ filename: f.filename, patch: f.patch ?? undefined, status: f.status })),
        ciStatus
    );

    // Create code diff summary
    const codeDiffSummary = `Changed ${files.length} files: +${pr.additions} / -${pr.deletions} lines`;

    // Build details
    const details: GitHubAgentDetails = {
        prNumber: pr.number,
        prTitle: pr.title,
        prStatus,
        ciStatus,
        filesChanged: files.length,
        additions: pr.additions,
        deletions: pr.deletions,
        testsAdded: testFiles.length,
        codeDiffSummary,
        aiAnalysis: aiResult.analysis,
        files: filesSummary,
    };

    // Calculate final confidence score
    let confidenceScore = aiResult.confidence;

    // Adjust based on PR status and CI
    if (prStatus === 'merged') confidenceScore = Math.min(100, confidenceScore + 10);
    if (ciStatus === 'passed') confidenceScore = Math.min(100, confidenceScore + 5);
    if (ciStatus === 'failed') confidenceScore = Math.max(0, confidenceScore - 20);
    if (testFiles.length > 0) confidenceScore = Math.min(100, confidenceScore + 5);

    // Build evidence object
    const evidence = {
        timestamp: new Date().toISOString(),
        type: 'github-code-diff',
        input: {
            taskSpec: input.taskSpec,
            prUrl: input.prUrl,
        },
        result: {
            confidenceScore,
            details,
        },
    };

    // Upload to IPFS
    const evidenceCid = await uploadJSON(evidence, `github-evidence-${pr.number}`);

    // Build summary
    const summary = `PR #${pr.number} "${pr.title}" - ${prStatus}, CI: ${ciStatus}, ${files.length} files changed. ${aiResult.analysis.slice(0, 200)}...`;

    return {
        confidenceScore,
        evidenceCid,
        summary,
        details,
    };
    } catch (error) {
        // Return fallback on any error
        console.error('[Agent:GitHub] Error during analysis:', error);
        return {
            confidenceScore: 60,
            evidenceCid: 'error',
            summary: '⚠️ GitHub verification encountered an error. Manual review recommended.',
            details: {
                prNumber: prInfo?.pullNumber || 0,
                prTitle: 'Error fetching',
                prStatus: 'open',
                ciStatus: 'unknown',
                filesChanged: 0,
                additions: 0,
                deletions: 0,
                testsAdded: 0,
                codeDiffSummary: 'Error during fetch',
                aiAnalysis: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                files: [],
            },
        };
    }
}
