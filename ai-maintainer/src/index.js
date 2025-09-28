const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const { OpenAI } = require('openai');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize PostgreSQL
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const REPO_OWNER = process.env.REPOSITORY_OWNER;
const REPO_NAME = process.env.REPOSITORY_NAME;

// Allowlisted paths for automatic approval
const ALLOWLISTED_PATHS = [
  'resources/',
  'docs/',
  'README.md',
  '.github/workflows/',
];

// Verify GitHub webhook signature
function verifySignature(payload, signature) {
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Check if PR only touches allowlisted paths
function isAllowlisted(files) {
  return files.every(file =>
    ALLOWLISTED_PATHS.some(allowedPath =>
      file.filename.startsWith(allowedPath)
    )
  );
}

// Get PR files from GitHub API
async function getPRFiles(prNumber) {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${prNumber}/files`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching PR files:', error.message);
    throw error;
  }
}

// Get PR diff
async function getPRDiff(prNumber) {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${prNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3.diff',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching PR diff:', error.message);
    throw error;
  }
}

// AI code review
async function performAIReview(diff, files) {
  const prompt = `You are an AI code reviewer for a FiveM server project. Review the following code changes and provide a security and safety assessment.

Focus on:
1. Security vulnerabilities (SQL injection, XSS, unsafe file operations)
2. FiveM-specific issues (resource conflicts, performance problems)
3. Breaking changes that could crash the server
4. Malicious code or backdoors

Files changed: ${files.map(f => f.filename).join(', ')}

Code diff:
${diff}

Respond with either:
- "PASS: [brief reason]" if the changes are safe
- "FAIL: [specific security concern]" if there are issues

Keep your response concise (max 200 characters).`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.1,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error performing AI review:', error.message);
    return 'FAIL: AI review service unavailable';
  }
}

// Post comment on PR
async function postPRComment(prNumber, comment) {
  try {
    await axios.post(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${prNumber}/comments`,
      { body: comment },
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );
  } catch (error) {
    console.error('Error posting PR comment:', error.message);
    throw error;
  }
}

// Merge PR
async function mergePR(prNumber) {
  try {
    await axios.put(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${prNumber}/merge`,
      {
        commit_title: `Auto-merge PR #${prNumber}`,
        commit_message: 'Automatically merged by AI maintainer after safety checks passed.',
        merge_method: 'squash',
      },
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );
  } catch (error) {
    console.error('Error merging PR:', error.message);
    throw error;
  }
}

// Check CI status
async function checkCIStatus(prNumber) {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${prNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    // Check if PR is mergeable and CI checks passed
    return {
      mergeable: response.data.mergeable,
      mergeable_state: response.data.mergeable_state,
    };
  } catch (error) {
    console.error('Error checking CI status:', error.message);
    throw error;
  }
}

// Store review result in database
async function storeReviewResult(prNumber, result, files) {
  try {
    await pool.query(
      'INSERT INTO pr_reviews (pr_number, review_result, files_changed, reviewed_at) VALUES ($1, $2, $3, NOW())',
      [prNumber, result, JSON.stringify(files.map(f => f.filename))]
    );
  } catch (error) {
    console.error('Error storing review result:', error.message);
  }
}

// Main PR review handler
async function handlePRReview(prNumber) {
  try {
    console.log(`Starting review for PR #${prNumber}`);

    // Get PR files and diff
    const files = await getPRFiles(prNumber);
    const diff = await getPRDiff(prNumber);

    // Check allowlist
    const isAllowlistedPR = isAllowlisted(files);
    console.log(`PR #${prNumber} allowlist check: ${isAllowlistedPR}`);

    // Perform AI review
    const aiReview = await performAIReview(diff, files);
    console.log(`AI review result: ${aiReview}`);

    // Store result
    await storeReviewResult(prNumber, aiReview, files);

    // Post AI review comment
    await postPRComment(prNumber, `🤖 **AI Review Result**\\n\\n${aiReview}\\n\\n${isAllowlistedPR ? '✅ Files are in allowlisted paths' : '⚠️ Files outside allowlisted paths detected'}`);

    // Check if we should auto-merge
    const ciStatus = await checkCIStatus(prNumber);
    const shouldMerge =
      isAllowlistedPR &&
      aiReview.startsWith('PASS:') &&
      ciStatus.mergeable &&
      ciStatus.mergeable_state === 'clean';

    if (shouldMerge) {
      console.log(`Auto-merging PR #${prNumber}`);
      await mergePR(prNumber);
      await postPRComment(prNumber, '✅ **Auto-merged** by AI maintainer after all safety checks passed.');
    } else {
      console.log(`PR #${prNumber} not auto-merged. Reasons: allowlist=${isAllowlistedPR}, ai_pass=${aiReview.startsWith('PASS:')}, mergeable=${ciStatus.mergeable}, clean=${ciStatus.mergeable_state === 'clean'}`);
    }

  } catch (error) {
    console.error(`Error reviewing PR #${prNumber}:`, error.message);
    await postPRComment(prNumber, '❌ **AI Review Failed** - Manual review required.');
  }
}

// Routes
app.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);

  // Verify webhook signature
  if (!verifySignature(payload, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.headers['x-github-event'];
  const action = req.body.action;

  // Handle PR events
  if (event === 'pull_request' && (action === 'opened' || action === 'synchronize')) {
    const prNumber = req.body.number;

    // Process review asynchronously
    setImmediate(() => handlePRReview(prNumber));

    res.json({ message: 'PR review started' });
  } else {
    res.json({ message: 'Event ignored' });
  }
});

// Initialize database
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pr_reviews (
        id SERIAL PRIMARY KEY,
        pr_number INTEGER NOT NULL,
        review_result TEXT NOT NULL,
        files_changed JSONB,
        reviewed_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Database initialized');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
  }
}

// Start server
app.listen(port, async () => {
  console.log(`AI Maintainer running on port ${port}`);
  await initDatabase();
});