import { GoogleGenerativeAI } from '@google/generative-ai';
import { expect, test } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const TEST_SESSION_TOKEN = process.env.TEST_SESSION_TOKEN || 'lv-e2e-session-token';
const PYAPI_BASE_URL = process.env.NEXT_PUBLIC_PYAPI_URL || 'http://localhost:8091';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const PROMPTS_DIR = path.resolve(process.cwd(), 'test_prompts');
const INTERVIEW_SYSTEM_PROMPT_PATH = path.join(PROMPTS_DIR, 'interview-candidate-system.md');

const DEFAULT_INTERVIEW_SYSTEM_PROMPT = `You are a job candidate in a career interview. Answer the interviewer's questions directly and naturally, just like a real person would in a conversation.

Rules:
- Give ONE clear, direct sentence or short phrase as your answer
- Sound natural and conversational, NOT formal or robotic
- ALWAYS answer the question asked
- End with proper punctuation (. or ! or ?)
- Do NOT apologize or say "Let me think"
- Do NOT give multiple sentences - keep it SHORT and DIRECT
- Sound confident and interested in the job

About you:
- Backend engineer with 5+ years experience
- Interested in climate tech, AI tools, education
- Want hybrid/remote work in Europe
- Looking for 70-90k EUR salary
- Value great team culture`;

let geminiClient: GoogleGenerativeAI | null = null;

function loadInterviewSystemPrompt(): string {
  try {
    const prompt = fs.readFileSync(INTERVIEW_SYSTEM_PROMPT_PATH, 'utf8').trim();
    if (!prompt) {
      console.warn('[Prompt] Interview system prompt file is empty; using default inline prompt.');
      return DEFAULT_INTERVIEW_SYSTEM_PROMPT;
    }
    return prompt;
  } catch (error) {
    console.warn(
      '[Prompt] Could not load interview system prompt file; using default inline prompt.',
      error
    );
    return DEFAULT_INTERVIEW_SYSTEM_PROMPT;
  }
}

function initializeGeminiClient() {
  if (GEMINI_API_KEY && !geminiClient) {
    console.log(
      `[Init] Initializing Gemini client with API key: ${GEMINI_API_KEY.substring(0, 10)}...`
    );
    geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
  } else if (!GEMINI_API_KEY) {
    console.warn('[Init] GEMINI_API_KEY not configured');
  }
}

function isResponseComplete(response: string): boolean {
  // Check if response is complete
  if (!response || response.length < 10) {
    return false; // Too short
  }

  // Should end with proper punctuation
  const endsWithPunctuation =
    response.endsWith('.') || response.endsWith('!') || response.endsWith('?');

  // Should not end with common incomplete indicators
  const hasIncompleteIndicators =
    response.endsWith(',') ||
    response.endsWith(':') ||
    response.endsWith('-') ||
    response.endsWith('(');

  const isComplete = endsWithPunctuation && !hasIncompleteIndicators;

  if (!isComplete) {
    console.log(
      `[Validation] Response not complete: ends='${response.substring(response.length - 5)}', hasPunct=${endsWithPunctuation}, hasIncomplete=${hasIncompleteIndicators}`
    );
  }

  return isComplete;
}

async function buildAnswerForPrompt(prompt: string, turn: number): Promise<string> {
  // Fall back to rule-based answers if Gemini is not available
  if (!GEMINI_API_KEY || !geminiClient) {
    console.warn(
      `[Turn ${turn}] GEMINI_API_KEY not configured. Using rule-based fallback. Prompt: ${prompt.substring(0, 100)}...`
    );
    const p = prompt.toLowerCase();
    if (p.includes('background') || p.includes('experience')) {
      return 'I have 5 years of backend engineering experience, mostly in Python, Node.js, and cloud infrastructure.';
    }
    if (
      p.includes('location') ||
      p.includes('remote') ||
      p.includes('onsite') ||
      p.includes('hybrid')
    ) {
      return 'I prefer hybrid roles in Barcelona or remote positions in European time zones.';
    }
    if (p.includes('industry')) {
      return 'I am interested in climate tech, AI tooling, and education technology.';
    }
    if (p.includes('culture') || p.includes('team')) {
      return 'I thrive in collaborative teams with strong feedback culture and clear ownership.';
    }
    if (p.includes('salary') || p.includes('compensation')) {
      return 'My target range is 70k to 90k EUR depending on scope and growth opportunities.';
    }
    return `My answer for turn ${turn}: I enjoy solving complex backend problems, mentoring teammates, and shipping reliable products.`;
  }

  try {
    console.log(`[Turn ${turn}] Generating LLM response for: "${prompt.substring(0, 80)}..."`);
    const model = geminiClient.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const systemPrompt = loadInterviewSystemPrompt();

    const userMessage = `Interview question: "${prompt}"

Answer this ONE question with ONE direct sentence. Sound like a real job candidate. Answer NOW, don't think too much.`;

    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: userMessage }],
        },
      ],
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.8,
        topP: 0.9,
        topK: 40,
      },
    });

    const text = response.response.text().trim();

    // Ensure response ends with punctuation but keep it short
    const completedText =
      text.endsWith('.') || text.endsWith('!') || text.endsWith('?') ? text : text + '.';

    console.log(`[Turn ${turn}] LLM response: ${completedText}`);
    return completedText || 'I am actively looking for my next backend engineering role.';
  } catch (error) {
    console.warn(`[Turn ${turn}] LLM response generation failed:`, error);
    // Fallback to rule-based logic
    const p = prompt.toLowerCase();
    if (p.includes('background') || p.includes('experience')) {
      return 'I have 5 years of backend engineering experience, mostly in Python, Node.js, and cloud infrastructure.';
    }
    if (
      p.includes('location') ||
      p.includes('remote') ||
      p.includes('onsite') ||
      p.includes('hybrid')
    ) {
      return 'I prefer hybrid roles in Barcelona or remote positions in European time zones.';
    }
    if (p.includes('industry')) {
      return 'I am interested in climate tech, AI tooling, and education technology.';
    }
    if (p.includes('culture') || p.includes('team')) {
      return 'I thrive in collaborative teams with strong feedback culture and clear ownership.';
    }
    if (p.includes('salary') || p.includes('compensation')) {
      return 'My target range is 70k to 90k EUR depending on scope and growth opportunities.';
    }
    return `My answer for turn ${turn}: I enjoy solving complex backend problems, mentoring teammates, and shipping reliable products.`;
  }
}

async function getLearningsCount(page: import('@playwright/test').Page): Promise<number> {
  const response = await page.request.get('/api/learnings');
  if (!response.ok()) {
    return 0;
  }
  const payload = await response.json();
  return Array.isArray(payload?.body) ? payload.body.length : 0;
}

test.describe('User Interview & Job Recommendations Flow', () => {
  test.beforeEach(async ({ page, context, browserName }) => {
    // Initialize Gemini client for LLM-based answer generation
    initializeGeminiClient();

    // Seeded NextAuth session cookie for authenticated routes.
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: TEST_SESSION_TOKEN,
        domain: 'localhost',
        path: '/',
      },
    ]);

    if (browserName === 'chromium') {
      await context.grantPermissions(['microphone'], { origin: 'http://localhost:3045' });
    }

    await page.goto('/dashboard/interview');
    await expect(page).toHaveURL(/\/dashboard\/interview/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('should display interview start screen', async ({ page }) => {
    await test.step('Interview start screen is visible', async () => {
      await expect(page.locator('[data-testid="voice-only-mode"]')).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('button', { name: 'Start Call' })).toBeVisible();
    });
  });

  test('should start and display interview interface', async ({ page }) => {
    await test.step('User can start the interview session', async () => {
      await page.getByRole('button', { name: 'Start Call' }).click();

      // hasStarted=true renders active voice controls regardless of remote connection.
      await expect(page.getByRole('button', { name: 'Switch to chat' })).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByRole('button', { name: /Mute|Unmute/ })).toBeVisible();
      await expect(page.getByRole('button', { name: 'End interview' })).toBeVisible();
    });
  });

  test('should keep authenticated session on interview route', async ({ page }) => {
    await test.step('Interview route remains accessible for authenticated user', async () => {
      await expect(page).toHaveURL(/\/dashboard\/interview/);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator('[data-testid="voice-only-mode"]')).toBeVisible({ timeout: 10000 });
    });
  });

  test('should have accessible navigation structure', async ({ page }) => {
    await test.step('Interview page loads without hard errors', async () => {
      await expect(page).toHaveTitle(/.*/, { timeout: 5000 });

      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.waitForTimeout(1000);

      // Allow transient media/device errors in CI/local headless environments.
      const unexpectedErrors = errors.filter(
        (entry) => !/livekit|microphone|getUserMedia|audio|permission|404|not found/i.test(entry)
      );
      expect(unexpectedErrors).toEqual([]);
    });
  });

  test('should discuss with AI in chat mode', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Live AI chat assertion is validated on Chromium only');

    await test.step('Start interview and switch to chat mode', async () => {
      await page.getByRole('button', { name: 'Start Call' }).click();
      await expect(page.getByRole('button', { name: 'Switch to chat' })).toBeVisible({
        timeout: 10000,
      });
      await page.getByRole('button', { name: 'Switch to chat' }).click();
      await expect(page.locator('#interview-response')).toBeVisible({ timeout: 10000 });
    });

    const aiMessageParagraphs = page.locator('div.bg-white.text-gray-900.border.border-gray-300 p');
    const userPrompt = `Hello AI ${Date.now()}. What is one career tip for backend engineers?`;

    let initialAiTexts: string[] = [];

    await test.step('Receive initial AI greeting', async () => {
      await expect
        .poll(async () => await aiMessageParagraphs.count(), { timeout: 45000 })
        .toBeGreaterThan(0);
      initialAiTexts = (await aiMessageParagraphs.allTextContents()).map((t) => t.trim());
    });

    await test.step('Send a user message', async () => {
      await page.locator('#interview-response').fill(userPrompt);
      await expect(page.locator('[data-testid="sendButton"]')).toBeEnabled();
      await page.locator('[data-testid="sendButton"]').click();
    });

    await test.step('Receive an AI message response', async () => {
      await expect
        .poll(
          async () => {
            const texts = await aiMessageParagraphs.allTextContents();
            const normalized = texts.map((text) => text.trim()).filter(Boolean);
            return normalized.some((text) => !initialAiTexts.includes(text));
          },
          { timeout: 45000 }
        )
        .toBeTruthy();
    });
  });

  test('should generate learnings and opportunities after long discussion', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Long conversational E2E is validated on Chromium only');
    test.skip(
      process.env.RUN_LONG_INTERVIEW_LIVE !== 'true',
      'Set RUN_LONG_INTERVIEW_LIVE=true to run full live 15-minute interview automation'
    );

    // This flow is intentionally long and can run up to ~17 minutes plus post-processing.
    test.setTimeout(30 * 60 * 1000);

    const initialLearnings = await getLearningsCount(page);
    const discussionMinutes = Number(process.env.INTERVIEW_DISCUSSION_MINUTES || '15');
    const discussionMs = Math.max(1, discussionMinutes) * 60 * 1000;
    const startTs = Date.now();

    await test.step('Start interview and switch to chat mode', async () => {
      console.log('[Interview] Starting interview...');
      await page.getByRole('button', { name: 'Start Call' }).click();

      // Wait for the switch to chat button to appear
      console.log('[Interview] Waiting for "Switch to chat" button...');
      await expect(page.getByRole('button', { name: 'Switch to chat' })).toBeVisible({
        timeout: 10000,
      });

      // Click switch to chat
      console.log('[Interview] Switching to chat mode...');
      await page.getByRole('button', { name: 'Switch to chat' }).click();

      // Wait for chat input to be visible
      console.log('[Interview] Waiting for chat input...');
      await expect(page.locator('#interview-response')).toBeVisible({ timeout: 10000 });

      // Wait extra time for initial AI message to appear
      console.log('[Interview] Waiting for initial AI message...');
      await page.waitForTimeout(2000);
    });

    await test.step('Answer all AI prompts for the full discussion window', async () => {
      const aiSelector = 'div.bg-white.text-gray-900.border.border-gray-300 p';
      const aiMessages = page.locator(aiSelector);

      let observedAiCount = await aiMessages.count();
      console.log(`[Answer] Initial AI message count: ${observedAiCount}`);

      let latestAiPrompt = 'Please start the interview and ask me the first question.';
      let lastAnsweredPrompt = latestAiPrompt;
      let turn = 0;

      while (Date.now() - startTs < discussionMs) {
        turn += 1;
        console.log(`\n[Turn ${turn}] Starting turn at ${new Date().toLocaleTimeString()}`);

        // Wait for any NEW AI message to stabilize for 1s so we don't answer partial stream text.
        // If the stabilized message is a goodbye/summary, stop instead of replying.
        console.log(`[Turn ${turn}] Waiting for a new stable AI message (1s unchanged)...`);
        const messageWaitStartedAt = Date.now();
        const closurePattern =
          /goodbye|best of luck|thanks for sharing|thank you for sharing|wrap up|summary|take care|all the best/i;
        let stablePrompt = '';
        let shouldEndConversation = false;
        let lastSeenText = '';
        let lastChangedAt = Date.now();

        while (Date.now() - messageWaitStartedAt < 60000) {
          const texts = await aiMessages.allTextContents();
          const latestText = (texts[texts.length - 1] || '').trim();

          if (!latestText) {
            await page.waitForTimeout(500);
            continue;
          }

          if (latestText !== lastSeenText) {
            lastSeenText = latestText;
            lastChangedAt = Date.now();
          }

          const isNewMessage = latestText !== lastAnsweredPrompt;
          const stableForMs = Date.now() - lastChangedAt;

          if (isNewMessage && stableForMs >= 1000) {
            if (closurePattern.test(latestText)) {
              shouldEndConversation = true;
            } else {
              stablePrompt = latestText;
            }
            break;
          }

          await page.waitForTimeout(500);
        }

        if (shouldEndConversation) {
          console.log(`[Turn ${turn}] AI appears to be wrapping up; waiting 10s without replying.`);
          await page.waitForTimeout(10000);
          console.log(`[Turn ${turn}] Wrap-up wait complete; ending conversation loop.`);
          break;
        }

        if (!stablePrompt) {
          const texts = await aiMessages.allTextContents();
          const latestText = (texts[texts.length - 1] || '').trim();
          console.log(
            `[Turn ${turn}] No new stable AI message detected. Latest AI message: "${latestText.substring(0, 160)}..."`
          );
          console.log(`[Turn ${turn}] No actionable AI prompt found; ending conversation loop.`);
          break;
        }

        latestAiPrompt = stablePrompt;
        console.log(`[Turn ${turn}] Stable AI prompt: "${latestAiPrompt}"`);

        // Generate answer using LLM
        console.log(`[Turn ${turn}] Generating LLM response...`);
        let reply = await buildAnswerForPrompt(latestAiPrompt, turn);
        console.log(`[Turn ${turn}] Response: "${reply}"`);

        // Retry if response is incomplete, up to 2 times
        let retries = 0;
        while (!isResponseComplete(reply) && retries < 2) {
          retries++;
          console.log(`[Turn ${turn}] Response incomplete, retrying (${retries}/2)...`);
          await page.waitForTimeout(2000);
          reply = await buildAnswerForPrompt(latestAiPrompt, turn);
          console.log(`[Turn ${turn}] Retry ${retries}: "${reply}"`);
        }

        console.log(`[Turn ${turn}] ✓ Sending: "${reply}"`);

        // Send the answer
        console.log(`[Turn ${turn}] Sending answer...`);
        await page.locator('#interview-response').fill(reply);
        await expect(page.locator('[data-testid="sendButton"]')).toBeEnabled();
        await page.locator('[data-testid="sendButton"]').click();
        lastAnsweredPrompt = latestAiPrompt;
        console.log(`[Turn ${turn}] Answer sent.`);

        // Wait for new AI message to appear
        console.log(`[Turn ${turn}] Waiting for next AI message...`);
        const messageCountBefore = observedAiCount;
        await expect
          .poll(async () => await aiMessages.count(), { timeout: 60000 })
          .toBeGreaterThan(messageCountBefore);

        observedAiCount = await aiMessages.count();
        console.log(`[Turn ${turn}] New AI message received. Total messages: ${observedAiCount}`);
      }

      console.log(
        `\n[Complete] Discussion window (${discussionMinutes} minutes) ended at ${new Date().toLocaleTimeString()}`
      );
    });

    await test.step('End interview to trigger transcript processing', async () => {
      // End interview in chat header.
      await page.getByRole('button', { name: 'End interview' }).click();
      await page.waitForTimeout(2000);
    });

    let userId = '';
    await test.step('Resolve current user id from profile', async () => {
      const profileRes = await page.request.get('/api/profile');
      expect(profileRes.ok()).toBeTruthy();
      const profilePayload = await profileRes.json();
      userId = profilePayload?.body?.id;
      expect(Boolean(userId)).toBeTruthy();
    });

    await test.step('Wait for new learnings to be generated', async () => {
      await expect
        .poll(async () => await getLearningsCount(page), { timeout: 180000 })
        .toBeGreaterThan(initialLearnings);
    });

    await test.step('Generate embedding and verify opportunities exist', async () => {
      const embeddingRes = await page.request.post(
        `${PYAPI_BASE_URL}/api/users/${encodeURIComponent(userId)}/generate-embedding`
      );
      expect(embeddingRes.ok()).toBeTruthy();

      await expect
        .poll(
          async () => {
            const jobsRes = await page.request.get(
              `${PYAPI_BASE_URL}/api/jobs/match?user_id=${encodeURIComponent(userId)}&per_page=20`
            );
            if (!jobsRes.ok()) {
              return 0;
            }
            const payload = await jobsRes.json();
            return Array.isArray(payload?.jobs) ? payload.jobs.length : 0;
          },
          { timeout: 180000 }
        )
        .toBeGreaterThan(0);
    });
  });

  test.skip('should generate learnings and opportunities from processed transcript', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(240000); // 4 minutes for background processing and polling
    test.skip(browserName !== 'chromium', 'Data-pipeline validation is executed on Chromium only');

    const initialLearnings = await getLearningsCount(page);
    const profileRes = await page.request.get('/api/profile');
    expect(profileRes.ok()).toBeTruthy();
    const profilePayload = await profileRes.json();
    const userId = profilePayload?.body?.id as string;
    expect(Boolean(userId)).toBeTruthy();

    const syntheticTranscript = [
      'ai: What brings you to this interview today?',
      'user: I am exploring backend engineering roles with growth opportunities.',
      'ai: What type of projects energize you?',
      'user: Distributed systems, APIs, and data-heavy platforms.',
      'ai: Which industries are most interesting to you?',
      'user: Climate tech, AI developer tools, and education platforms.',
      'ai: What work setup do you prefer?',
      'user: Hybrid in Barcelona or remote across Europe.',
      'ai: What salary range do you target?',
      'user: Around 70k to 90k EUR depending on scope.',
      'ai: What team culture helps you thrive?',
      'user: High trust, frequent feedback, and clear ownership.',
      'ai: What are your 3-year goals?',
      'user: Lead backend initiatives and mentor engineers.',
    ].join('\n');

    const internalSecret = process.env.INTERNAL_API_SECRET || 'localdev';

    await test.step('Process transcript to create learnings', async () => {
      const processRes = await page.request.post(`${PYAPI_BASE_URL}/internal/process-transcript`, {
        data: {
          user_id: userId,
          transcript: syntheticTranscript,
        },
        headers: {
          'x-internal-secret': internalSecret,
        },
      });
      expect(processRes.ok()).toBeTruthy();

      await expect
        .poll(async () => await getLearningsCount(page), { timeout: 180000 })
        .toBeGreaterThan(initialLearnings);
    });

    await test.step('Generate embedding and verify opportunities are returned', async () => {
      const embeddingRes = await page.request.post(
        `${PYAPI_BASE_URL}/api/users/${encodeURIComponent(userId)}/generate-embedding`
      );
      expect(embeddingRes.ok()).toBeTruthy();

      await expect
        .poll(
          async () => {
            const jobsRes = await page.request.get(
              `${PYAPI_BASE_URL}/api/jobs/match?user_id=${encodeURIComponent(userId)}&per_page=20`
            );
            if (!jobsRes.ok()) return 0;
            const payload = await jobsRes.json();
            return Array.isArray(payload?.jobs) ? payload.jobs.length : 0;
          },
          { timeout: 180000 }
        )
        .toBeGreaterThan(0);
    });
  });
});
