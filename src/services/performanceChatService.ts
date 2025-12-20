/**
 * Performance Chat Service
 * AI-powered interview performance analysis using Google Gemini (primary) and OpenAI (fallback)
 * 
 * Features:
 * - Contextual performance chat based on interview transcripts
 * - Role and company filtering
 * - Chat session management
 * - Automatic fallback to OpenAI if Gemini fails
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import OpenAI from 'openai';
import { prisma, dbLogger } from './databaseService';
import { getScoresByRole, getScoresByCompany, getAvailableFilters } from './analyticsService';

// ========================================
// CONFIGURATION
// ========================================

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
const OPENAI_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o';
const MAX_CONTEXT_TOKENS = 100000; // Leave room for response
const MAX_INTERVIEWS_IN_CONTEXT = 10;

// LLM Provider enum
type LLMProvider = 'gemini' | 'openai';

// ========================================
// SYSTEM PROMPT - UNIFIED SUPPORT HUB
// ========================================

const PERFORMANCE_ANALYST_PROMPT = `You are Vocaid's AI Assistant - a unified support hub that serves two primary roles:

## 🎭 DUAL PERSONALITY MODES:

### 1. 📊 PERFORMANCE ANALYST MODE
When users ask about their interview performance, scores, feedback, or how to improve:
- Analyze interview transcripts to identify patterns in responses
- Provide specific, actionable feedback on communication style
- Identify technical knowledge gaps based on role requirements
- Compare performance across different roles and companies
- Track improvement trends over time
- Suggest targeted practice areas
- Be specific and cite examples from transcripts when possible
- Use encouraging but honest language

### 2. 🛟 SUPPORT GUIDE MODE
When users ask about the app, billing, credits, technical issues, or how Vocaid works:
- Provide clear, helpful answers about Vocaid's features
- Guide users through troubleshooting steps
- Explain billing, credits, and packages
- Help with audio/technical issues
- Reference the FAQ knowledge base provided

## AUTOMATIC MODE DETECTION:
Analyze the user's question to determine which mode to use:
- **Performance Mode keywords**: "score", "performance", "improve", "feedback", "interview", "transcript", "how did I do", "my interviews", "strengths", "weaknesses", "trends"
- **Support Mode keywords**: "credits", "billing", "payment", "refund", "audio", "microphone", "browser", "error", "help", "how do I", "how does", "troubleshoot", "purchase"

## PERFORMANCE CONTEXT (When Available):
- Interview transcripts (AI interviewer and user responses)
- Performance scores (overall, technical, communication, confidence)
- Role and company information for each interview
- Historical score progression

## SCORE INTERPRETATION:
- 0-40: Needs significant improvement - focus on fundamentals
- 40-60: Developing skills - specific areas to focus on
- 60-80: Good performance - minor refinements needed
- 80-100: Excellent - focus on edge cases and advanced topics

## RESPONSE GUIDELINES:
1. Always be friendly, professional, and empathetic
2. Keep responses concise but comprehensive
3. Use bullet points and formatting for clarity
4. For support questions, provide step-by-step guidance
5. For performance questions, cite specific examples from data
6. End with a helpful follow-up question or next step
7. If unsure, ask clarifying questions rather than guessing

## FAQ KNOWLEDGE BASE:
{{FAQ_CONTEXT}}

Remember: You're here to help the user succeed with Vocaid. Be supportive, accurate, and proactive.`;

// ========================================
// TYPES
// ========================================

export interface ChatContext {
  roleFilter?: string;
  companyFilter?: string;
  interviewIds?: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface InterviewContext {
  id: string;
  role: string;
  company: string;
  score: number | null;
  date: string;
  transcript: string | null;
  feedbackText: string | null;
  duration: number | null;
}

export interface PerformanceContext {
  interviews: InterviewContext[];
  aggregatedMetrics: {
    totalInterviews: number;
    avgScore: number;
    scoresByRole: { role: string; avgScore: number; count: number }[];
    scoresByCompany: { company: string; avgScore: number; count: number }[];
  };
  filters: {
    roles: string[];
    companies: string[];
  };
}

// ========================================
// LLM CLIENT INITIALIZATION
// ========================================

/**
 * Initialize Gemini client
 */
function getGeminiClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    dbLogger.warn('GEMINI_API_KEY is not set, will use fallback provider');
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Initialize OpenAI client
 */
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    dbLogger.warn('OPENAI_API_KEY is not set');
    return null;
  }
  return new OpenAI({ apiKey });
}

/**
 * Determine which LLM provider to use
 */
function getAvailableProvider(): LLMProvider {
  if (process.env.GEMINI_API_KEY) {
    return 'gemini';
  }
  if (process.env.OPENAI_API_KEY) {
    return 'openai';
  }
  throw new Error('No LLM API key configured. Set either GEMINI_API_KEY or OPENAI_API_KEY');
}

// ========================================
// CONTEXT BUILDING
// ========================================

/**
 * Build performance context for a user
 */
export async function buildPerformanceContext(
  clerkId: string,
  filters: ChatContext = {}
): Promise<PerformanceContext> {
  // Get user's UUID
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Build where clause for interviews
  const where: any = {
    userId: user.id,
    status: 'COMPLETED'
  };

  if (filters.roleFilter) {
    where.jobTitle = { contains: filters.roleFilter, mode: 'insensitive' };
  }

  if (filters.companyFilter) {
    where.companyName = { contains: filters.companyFilter, mode: 'insensitive' };
  }

  if (filters.interviewIds && filters.interviewIds.length > 0) {
    where.id = { in: filters.interviewIds };
  }

  // Get interviews with transcripts
  const interviews = await prisma.interview.findMany({
    where,
    select: {
      id: true,
      jobTitle: true,
      companyName: true,
      score: true,
      createdAt: true,
      transcript: true,
      feedbackText: true,
      callDuration: true
    },
    orderBy: { createdAt: 'desc' },
    take: MAX_INTERVIEWS_IN_CONTEXT
  });

  // Get aggregated metrics
  const [scoresByRole, scoresByCompany, availableFilters] = await Promise.all([
    getScoresByRole(clerkId, { limit: 10 }),
    getScoresByCompany(clerkId, { limit: 10 }),
    getAvailableFilters(clerkId)
  ]);

  // Calculate overall stats
  const totalInterviews = interviews.length;
  const avgScore = totalInterviews > 0
    ? interviews.reduce((sum, i) => sum + (i.score || 0), 0) / totalInterviews
    : 0;

  const interviewContexts: InterviewContext[] = interviews.map(interview => ({
    id: interview.id,
    role: interview.jobTitle,
    company: interview.companyName,
    score: interview.score,
    date: interview.createdAt.toISOString().split('T')[0],
    transcript: interview.transcript,
    feedbackText: interview.feedbackText,
    duration: interview.callDuration
  }));

  return {
    interviews: interviewContexts,
    aggregatedMetrics: {
      totalInterviews,
      avgScore: Math.round(avgScore * 10) / 10,
      scoresByRole: scoresByRole.map(s => ({ 
        role: s.role, 
        avgScore: s.avgScore, 
        count: s.count 
      })),
      scoresByCompany: scoresByCompany.map(s => ({ 
        company: s.company, 
        avgScore: s.avgScore, 
        count: s.count 
      }))
    },
    filters: availableFilters
  };
}

/**
 * Format context for LLM
 */
function formatContextForLLM(context: PerformanceContext): string {
  let contextText = '## User Interview Performance Data\n\n';

  // Aggregated metrics
  contextText += '### Overall Performance Summary\n';
  contextText += `- Total Completed Interviews: ${context.aggregatedMetrics.totalInterviews}\n`;
  contextText += `- Average Score: ${context.aggregatedMetrics.avgScore}/100\n\n`;

  // Scores by role
  if (context.aggregatedMetrics.scoresByRole.length > 0) {
    contextText += '### Performance by Role\n';
    for (const role of context.aggregatedMetrics.scoresByRole) {
      contextText += `- ${role.role}: ${role.avgScore}/100 (${role.count} interviews)\n`;
    }
    contextText += '\n';
  }

  // Scores by company
  if (context.aggregatedMetrics.scoresByCompany.length > 0) {
    contextText += '### Performance by Company\n';
    for (const company of context.aggregatedMetrics.scoresByCompany) {
      contextText += `- ${company.company}: ${company.avgScore}/100 (${company.count} interviews)\n`;
    }
    contextText += '\n';
  }

  // Individual interviews with transcripts
  contextText += '### Interview Details\n\n';
  
  for (const interview of context.interviews) {
    contextText += `#### Interview: ${interview.role} at ${interview.company}\n`;
    contextText += `- Date: ${interview.date}\n`;
    contextText += `- Score: ${interview.score !== null ? `${interview.score}/100` : 'N/A'}\n`;
    contextText += `- Duration: ${interview.duration ? `${Math.round(interview.duration / 60)} minutes` : 'N/A'}\n`;
    
    if (interview.feedbackText) {
      contextText += `\nFeedback Summary:\n${interview.feedbackText.substring(0, 2000)}\n`;
    }
    
    if (interview.transcript) {
      // Truncate transcript if too long
      const transcriptPreview = interview.transcript.length > 5000
        ? interview.transcript.substring(0, 5000) + '... [transcript truncated]'
        : interview.transcript;
      contextText += `\nTranscript:\n${transcriptPreview}\n`;
    }
    
    contextText += '\n---\n\n';
  }

  return contextText;
}

// ========================================
// CHAT SESSION MANAGEMENT
// ========================================

/**
 * Create a new chat session
 */
export async function createChatSession(
  clerkId: string,
  filters: ChatContext = {}
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const session = await prisma.chatSession.create({
    data: {
      userId: user.id,
      roleFilter: filters.roleFilter,
      companyFilter: filters.companyFilter,
      isActive: true
    }
  });

  dbLogger.info('Chat session created', { 
    sessionId: session.id, 
    userId: user.id 
  });

  return session.id;
}

/**
 * Get chat session with messages
 */
export async function getChatSession(sessionId: string) {
  return prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });
}

/**
 * Save a message to a chat session
 */
export async function saveChatMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: Record<string, any>
) {
  return prisma.chatMessage.create({
    data: {
      sessionId,
      role,
      content,
      metadata
    }
  });
}

/**
 * Close a chat session
 */
export async function closeChatSession(sessionId: string) {
  return prisma.chatSession.update({
    where: { id: sessionId },
    data: { isActive: false }
  });
}

// ========================================
// GEMINI CHAT COMPLETION
// ========================================

/**
 * Get chat completion from Gemini
 */
async function getGeminiCompletion(
  systemPrompt: string,
  messages: ChatMessage[],
  userMessage: string
): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number } }> {
  const genAI = getGeminiClient();
  if (!genAI) {
    throw new Error('Gemini client not available');
  }

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
    ],
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.7,
    },
  });

  // Build chat history
  const history = messages.map(m => ({
    role: m.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: m.content }]
  }));

  const chat = model.startChat({ history });

  const result = await chat.sendMessage(userMessage);
  const response = result.response;

  const content = response.text();
  const usageMetadata = response.usageMetadata;

  return {
    content,
    usage: {
      inputTokens: usageMetadata?.promptTokenCount || 0,
      outputTokens: usageMetadata?.candidatesTokenCount || 0
    }
  };
}

// ========================================
// OPENAI CHAT COMPLETION (FALLBACK)
// ========================================

/**
 * Get chat completion from OpenAI (fallback)
 */
async function getOpenAICompletion(
  systemPrompt: string,
  messages: ChatMessage[],
  userMessage: string
): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number } }> {
  const openai = getOpenAIClient();
  if (!openai) {
    throw new Error('OpenAI client not available');
  }

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    })),
    { role: 'user', content: userMessage }
  ];

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: openaiMessages,
    max_tokens: 4096,
    temperature: 0.7
  });

  const content = response.choices[0]?.message?.content || '';

  return {
    content,
    usage: {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0
    }
  };
}

// ========================================
// UNIFIED CHAT COMPLETION
// ========================================

/**
 * Default FAQ context if not provided from frontend
 */
const DEFAULT_FAQ_CONTEXT = `
Q: How do credits work?
A: Each mock interview costs 1 credit. Credits never expire and can be purchased in packages.

Q: How do I purchase more credits?
A: Navigate to the Credits page. We offer Starter (5), Professional (15), and Enterprise (50) packages.

Q: Can I get a refund?
A: Credits are non-refundable. Contact support for technical issues.

Q: How does Vocaid work?
A: Upload your resume, select a role and company, have a voice interview with AI, get feedback and score.

Q: What happens during an interview?
A: Voice conversation with AI interviewer. Role-specific questions. 10-15 minute sessions.

Q: How is my score calculated?
A: Based on Technical Knowledge, Communication, Confidence, and Overall Performance (0-100 scale).

Q: Audio issues / AI can't hear me?
A: Check browser microphone permissions. Use Chrome/Edge. Use headphones. Ensure quiet environment.

Q: My interview disconnected?
A: Network issues can cause this. Credit typically restored automatically within 24 hours.

Q: Supported browsers?
A: Chrome (recommended), Edge, Safari (latest). Firefox has limited audio support.

Q: Can I practice for specific companies?
A: Yes! Enter company name during setup. AI tailors questions to company style.

Q: What roles can I practice for?
A: All professional roles: Engineering, Data Science, Product, Design, Marketing, Sales, Finance, etc.

Q: Can I review past interviews?
A: Yes, check Dashboard for full transcript, feedback, and performance breakdown.
`;

/**
 * Get chat completion with automatic fallback and FAQ context
 */
export async function getChatCompletion(
  clerkId: string,
  message: string,
  sessionId?: string,
  filters: ChatContext = {},
  faqContext?: string
): Promise<{ message: string; sessionId: string; category: 'performance' | 'support' }> {
  // Build context
  const context = await buildPerformanceContext(clerkId, filters);
  const contextText = formatContextForLLM(context);
  
  // Inject FAQ context into system prompt
  const faqToInject = faqContext || DEFAULT_FAQ_CONTEXT;
  const basePrompt = PERFORMANCE_ANALYST_PROMPT.replace('{{FAQ_CONTEXT}}', faqToInject);
  const systemPrompt = `${basePrompt}\n\n${contextText}`;

  // Detect message category for response metadata
  const supportKeywords = ['credit', 'billing', 'payment', 'refund', 'audio', 'microphone', 'browser', 'error', 'how does', 'how do i', 'troubleshoot', 'purchase', 'buy', 'price', 'cost'];
  const messageLower = message.toLowerCase();
  const category: 'performance' | 'support' = supportKeywords.some(k => messageLower.includes(k)) 
    ? 'support' 
    : 'performance';

  // Get previous messages if session exists
  let previousMessages: ChatMessage[] = [];
  if (sessionId) {
    const session = await getChatSession(sessionId);
    if (session) {
      previousMessages = session.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));
    }
  }

  // Create session if not exists
  const activeSessionId = sessionId || await createChatSession(clerkId, filters);

  // Save user message
  await saveChatMessage(activeSessionId, 'user', message, { category });

  let provider: LLMProvider = getAvailableProvider();
  let assistantMessage: string;
  let usage: { inputTokens: number; outputTokens: number };

  try {
    // Try primary provider (Gemini)
    if (provider === 'gemini') {
      try {
        const result = await getGeminiCompletion(systemPrompt, previousMessages, message);
        assistantMessage = result.content;
        usage = result.usage;
        
        dbLogger.info('Chat completion generated via Gemini', {
          sessionId: activeSessionId,
          category,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens
        });
      } catch (geminiError: any) {
        dbLogger.warn('Gemini completion failed, falling back to OpenAI', {
          error: geminiError.message,
          sessionId: activeSessionId
        });
        
        // Fallback to OpenAI
        if (!process.env.OPENAI_API_KEY) {
          throw geminiError; // Re-throw if no fallback available
        }
        
        provider = 'openai';
        const result = await getOpenAICompletion(systemPrompt, previousMessages, message);
        assistantMessage = result.content;
        usage = result.usage;
        
        dbLogger.info('Chat completion generated via OpenAI (fallback)', {
          sessionId: activeSessionId,
          category,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens
        });
      }
    } else {
      // Use OpenAI directly
      const result = await getOpenAICompletion(systemPrompt, previousMessages, message);
      assistantMessage = result.content;
      usage = result.usage;
      
      dbLogger.info('Chat completion generated via OpenAI', {
        sessionId: activeSessionId,
        category,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens
      });
    }

    // Save assistant message
    await saveChatMessage(activeSessionId, 'assistant', assistantMessage, {
      provider,
      category,
      model: provider === 'gemini' ? GEMINI_MODEL : OPENAI_MODEL,
      usage
    });

    return { 
      message: assistantMessage, 
      sessionId: activeSessionId,
      category 
    };
  } catch (error: any) {
    dbLogger.error('Chat completion failed', {
      error: error.message,
      sessionId: activeSessionId,
      provider
    });
    throw new Error('Failed to generate response. Please try again.');
  }
}

/**
 * Stream chat completion (for real-time UI updates)
 * Note: Uses Gemini streaming with OpenAI fallback
 */
export async function streamChatCompletion(
  clerkId: string,
  message: string,
  onChunk: (chunk: string) => void,
  sessionId?: string,
  filters: ChatContext = {}
): Promise<string> {
  // Build context
  const context = await buildPerformanceContext(clerkId, filters);
  const contextText = formatContextForLLM(context);
  const systemPrompt = `${PERFORMANCE_ANALYST_PROMPT}\n\n${contextText}`;

  // Get previous messages if session exists
  let previousMessages: ChatMessage[] = [];
  if (sessionId) {
    const session = await getChatSession(sessionId);
    if (session) {
      previousMessages = session.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));
    }
  }

  // Create session if not exists
  const activeSessionId = sessionId || await createChatSession(clerkId, filters);

  // Save user message
  await saveChatMessage(activeSessionId, 'user', message);

  let provider: LLMProvider = getAvailableProvider();
  let fullResponse = '';

  try {
    if (provider === 'gemini') {
      try {
        fullResponse = await streamGeminiCompletion(systemPrompt, previousMessages, message, onChunk);
      } catch (geminiError: any) {
        dbLogger.warn('Gemini streaming failed, falling back to OpenAI', {
          error: geminiError.message,
          sessionId: activeSessionId
        });
        
        if (!process.env.OPENAI_API_KEY) {
          throw geminiError;
        }
        
        provider = 'openai';
        fullResponse = await streamOpenAICompletion(systemPrompt, previousMessages, message, onChunk);
      }
    } else {
      fullResponse = await streamOpenAICompletion(systemPrompt, previousMessages, message, onChunk);
    }

    // Save complete assistant message
    await saveChatMessage(activeSessionId, 'assistant', fullResponse, {
      provider,
      model: provider === 'gemini' ? GEMINI_MODEL : OPENAI_MODEL
    });

    return fullResponse;
  } catch (error: any) {
    dbLogger.error('Chat stream failed', {
      error: error.message,
      sessionId: activeSessionId,
      provider
    });
    throw new Error('Failed to generate response. Please try again.');
  }
}

/**
 * Stream completion from Gemini
 */
async function streamGeminiCompletion(
  systemPrompt: string,
  messages: ChatMessage[],
  userMessage: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const genAI = getGeminiClient();
  if (!genAI) {
    throw new Error('Gemini client not available');
  }

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
    ],
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.7,
    },
  });

  const history = messages.map(m => ({
    role: m.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: m.content }]
  }));

  const chat = model.startChat({ history });

  const result = await chat.sendMessageStream(userMessage);

  let fullResponse = '';
  for await (const chunk of result.stream) {
    const text = chunk.text();
    fullResponse += text;
    onChunk(text);
  }

  return fullResponse;
}

/**
 * Stream completion from OpenAI
 */
async function streamOpenAICompletion(
  systemPrompt: string,
  messages: ChatMessage[],
  userMessage: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const openai = getOpenAIClient();
  if (!openai) {
    throw new Error('OpenAI client not available');
  }

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    })),
    { role: 'user', content: userMessage }
  ];

  const stream = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: openaiMessages,
    max_tokens: 4096,
    temperature: 0.7,
    stream: true
  });

  let fullResponse = '';
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) {
      fullResponse += text;
      onChunk(text);
    }
  }

  return fullResponse;
}

// ========================================
// QUICK INSIGHTS
// ========================================

/**
 * Generate quick performance insights without chat context
 */
export async function generateQuickInsights(clerkId: string): Promise<string> {
  const context = await buildPerformanceContext(clerkId);
  
  if (context.aggregatedMetrics.totalInterviews === 0) {
    return "You haven't completed any interviews yet. Start a practice interview to get personalized insights!";
  }

  const prompt = `Based on this user's interview data, provide 3-5 brief, actionable insights to help them improve. Be specific and encouraging.

${formatContextForLLM(context)}

Format your response as bullet points, each starting with an emoji that represents the insight type (💪 for strengths, 📈 for improvement areas, 💡 for tips).`;

  let provider: LLMProvider = getAvailableProvider();

  try {
    if (provider === 'gemini') {
      try {
        const genAI = getGeminiClient();
        if (!genAI) throw new Error('Gemini not available');
        
        const model = genAI.getGenerativeModel({
          model: GEMINI_MODEL,
          generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
        });
        
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (geminiError: any) {
        dbLogger.warn('Gemini quick insights failed, falling back to OpenAI', { 
          error: geminiError.message 
        });
        
        if (!process.env.OPENAI_API_KEY) throw geminiError;
        provider = 'openai';
      }
    }
    
    // OpenAI fallback or primary
    const openai = getOpenAIClient();
    if (!openai) throw new Error('OpenAI not available');
    
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0.7
    });
    
    return response.choices[0]?.message?.content || 'Unable to generate insights.';
  } catch (error: any) {
    dbLogger.error('Quick insights generation failed', { error: error.message });
    return 'Unable to generate insights at this time. Please try again later.';
  }
}

/**
 * Get user's chat sessions
 */
export async function getUserChatSessions(clerkId: string, limit = 10) {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true }
  });

  if (!user) {
    return [];
  }

  return prisma.chatSession.findMany({
    where: { userId: user.id },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' }
      },
      _count: {
        select: { messages: true }
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: limit
  });
}
