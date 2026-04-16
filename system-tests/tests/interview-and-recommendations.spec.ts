import { GoogleGenerativeAI } from '@google/generative-ai';
import { expect, test } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const TEST_SESSION_TOKEN = process.env.TEST_SESSION_TOKEN || 'lv-e2e-session-token';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const PROMPTS_DIR = path.resolve(process.cwd(), 'test_prompts');
const INTERVIEW_SYSTEM_PROMPT_PATH = path.join(PROMPTS_DIR, 'interview-candidate-0.md');

let geminiClient: GoogleGenerativeAI | null = null;

function initializeGeminiClient() {
  if (GEMINI_API_KEY && !geminiClient) {
    console.log('[Init] Initializing Gemini client with configured API key');
    geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
}

function loadInterviewSystemPrompt(): string {
  const prompt = fs.readFileSync(INTERVIEW_SYSTEM_PROMPT_PATH, 'utf8').trim();
  if (!prompt) {
    throw new Error(
      `[Prompt] Interview system prompt file is empty: ${INTERVIEW_SYSTEM_PROMPT_PATH}`
    );
  }
  return prompt;
}

async function buildAnswerForPrompt(prompt: string, turn: number): Promise<string> {
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
    return `I enjoy solving complex backend problems, mentoring teammates, and shipping reliable products.`;
  }

  const model = geminiClient.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const systemPrompt = loadInterviewSystemPrompt();
  const userMessage = `Interview question: "${prompt}"\n\nAnswer this ONE question with ONE direct sentence. Sound like a real job candidate. Answer NOW, don't think too much.`;
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
  return text.endsWith('.') || text.endsWith('!') || text.endsWith('?') ? text : `${text}.`;
}

async function startInterviewChat(page: import('@playwright/test').Page) {
  initializeGeminiClient();
  await page.getByRole('button', { name: 'Start Call' }).click();

  await expect(page.getByRole('button', { name: 'Switch to chat' })).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole('button', { name: 'Switch to chat' }).click();
  await expect(page.locator('#interview-response')).toBeVisible({ timeout: 10000 });

  const aiMessages = page.locator('div.bg-white.text-gray-900.border.border-gray-300 p');
  await expect.poll(async () => await aiMessages.count(), { timeout: 180000 }).toBeGreaterThan(0);

  const muteButton = page.getByRole('button', { name: 'Mute' });
  const unmuteButton = page.getByRole('button', { name: 'Unmute' });
  await expect(muteButton.or(unmuteButton)).toBeVisible({ timeout: 15000 });

  if ((await unmuteButton.count()) > 0 && (await unmuteButton.first().isVisible())) {
    await expect(unmuteButton).toBeVisible({ timeout: 10000 });
  } else {
    await muteButton.first().click();
    await expect(unmuteButton).toBeVisible({ timeout: 10000 });
  }
}

async function completeInterview(page: import('@playwright/test').Page) {
  const aiMessages = page.locator('div.bg-white.text-gray-900.border.border-gray-300 p');
  const maxDurationMs = 10 * 60 * 1000;
  const startedAt = Date.now();
  let lastAnsweredPrompt = '';

  const isInterviewRoute = () => page.url().includes('/dashboard/interview');
  const isOpportunitiesRoute = () => page.url().includes('/dashboard/opportunities');

  await expect.poll(async () => await aiMessages.count(), { timeout: 45000 }).toBeGreaterThan(0);

  for (let turn = 1; Date.now() - startedAt < maxDurationMs; turn += 1) {
    if (isOpportunitiesRoute()) {
      return;
    }

    if (!isInterviewRoute()) {
      throw new Error(`Unexpected navigation during interview flow: ${page.url()}`);
    }

    const waitStartedAt = Date.now();
    let lastSeenText = '';
    let lastChangedAt = Date.now();
    let latestPrompt = '';

    while (Date.now() - waitStartedAt < 60000) {
      const texts = await aiMessages.allTextContents();
      const currentText = (texts[texts.length - 1] || '').trim();

      if (!currentText) {
        await page.waitForTimeout(250);
        continue;
      }

      if (currentText !== lastSeenText) {
        lastSeenText = currentText;
        lastChangedAt = Date.now();
      }

      if (Date.now() - lastChangedAt >= 1000) {
        latestPrompt = currentText;
        break;
      }

      await page.waitForTimeout(250);
    }

    if (!latestPrompt) {
      break;
    }

    if (latestPrompt === lastAnsweredPrompt) {
      await page.waitForTimeout(500);
      continue;
    }

    const countBefore = await aiMessages.count();
    const response = await buildAnswerForPrompt(latestPrompt, turn);

    if (isOpportunitiesRoute()) {
      return;
    }
    if (!isInterviewRoute()) {
      throw new Error(`Unexpected navigation before sending response: ${page.url()}`);
    }

    await page.locator('#interview-response').fill(response);
    await expect(page.locator('[data-testid="sendButton"]')).toBeEnabled();
    await page.locator('[data-testid="sendButton"]').click();
    lastAnsweredPrompt = latestPrompt;

    const nextMessageWaitStartedAt = Date.now();
    let nextMessageArrived = false;
    while (Date.now() - nextMessageWaitStartedAt < 45000) {
      if (isOpportunitiesRoute()) {
        return;
      }
      if (!isInterviewRoute()) {
        throw new Error(`Unexpected navigation after sending response: ${page.url()}`);
      }

      const nextCount = await aiMessages.count();
      if (nextCount > countBefore) {
        nextMessageArrived = true;
        break;
      }

      await page.waitForTimeout(250);
    }

    if (!nextMessageArrived) {
      break;
    }

    if (isOpportunitiesRoute()) {
      return;
    }
  }

  await page.waitForURL(/\/dashboard\/opportunities/, { timeout: 300000 });
}

async function waitForJobsOnOpportunitiesPage(page: import('@playwright/test').Page) {
  const maxWaitMs = 10 * 60 * 1000;
  const startedAt = Date.now();

  await page.goto('/dashboard/opportunities');
  await expect(page).toHaveURL(/\/dashboard\/opportunities/);

  while (Date.now() - startedAt < maxWaitMs) {
    const jobCards = page.locator('h3');
    const jobCount = await jobCards.count();
    if (jobCount > 0) {
      return;
    }

    await page.waitForTimeout(30_000);
    await page.reload({ waitUntil: 'networkidle' });
  }

  throw new Error('Jobs did not appear on the opportunities page within the expected time');
}

test.describe('User Interview & Job Recommendations Flow', () => {
  test.beforeEach(async ({ page, context, browserName }) => {
    // Ensure voice mode is active so mute/unmute controls exist after call start.
    await page.addInitScript(() => {
      window.sessionStorage.setItem('interview-voiceOnlyMode', JSON.stringify(true));
    });

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
  });

  test('should complete the interview flow end-to-end', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Interview E2E is validated on Chromium only');
    test.setTimeout(10 * 60 * 1000);

    await page.goto('/dashboard/interview');
    await expect(page).toHaveURL(/\/dashboard\/interview/);
    await expect(page).not.toHaveURL(/\/login/);

    await startInterviewChat(page);
    await completeInterview(page);

    await expect(page).toHaveURL(/\/dashboard\/opportunities/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('should show job opportunities after interview processing', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Opportunities E2E is validated on Chromium only');
    test.setTimeout(10 * 60 * 1000);

    await waitForJobsOnOpportunitiesPage(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Recommended for You' })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByRole('tab', { name: 'Show all jobs' })).toBeVisible();

    await page.locator('h3').first().click();
    await expect(page.getByRole('button', { name: 'Apply Now' })).toBeVisible({ timeout: 20000 });
  });
});
