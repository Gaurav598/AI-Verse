'use strict';

/**
 * AI Prompt Templates
 * AI Content Intelligence Platform
 *
 * Structured, battle-tested prompt templates for all AI operations.
 * Each template uses variable interpolation for dynamic content.
 */

const TEMPLATES = {
  // ----------------------------------------------------------------
  // SYSTEM PROMPTS
  // ----------------------------------------------------------------
  SYSTEM_CONTENT_WRITER: `You are an expert content writer and SEO specialist with 10+ years of experience
creating high-quality, engaging blog content. You write in a clear, professional tone that is
accessible to general audiences while demonstrating subject matter expertise.

Core principles:
- Always provide accurate, well-structured content
- Use active voice and concrete examples
- Optimize for readability (aim for Flesch-Kincaid grade 8-10)
- Format responses as valid JSON when asked
- Never fabricate facts or statistics`,

  SYSTEM_SEO_SPECIALIST: `You are a senior SEO specialist and content strategist with deep expertise in
search engine optimization, keyword research, and content marketing. You understand how to
optimize content for both search engines and human readers.

You follow Google's E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) guidelines.
Always return valid JSON when asked.`,

  SYSTEM_CONTENT_ANALYST: `You are an expert content quality analyst trained to evaluate blog posts and
articles across multiple dimensions: grammar, readability, SEO, originality, and engagement potential.
You provide specific, actionable feedback with concrete scores. Always return valid JSON.`,

  // ----------------------------------------------------------------
  // ARTICLE GENERATION
  // ----------------------------------------------------------------
  GENERATE_ARTICLE: ({ topic, tone, audience, wordCount, outline }) => ({
    system: TEMPLATES.SYSTEM_CONTENT_WRITER,
    user: `Generate a complete, high-quality blog article with the following specifications:

**Topic:** ${topic}
**Tone:** ${tone || 'professional and informative'}
**Target Audience:** ${audience || 'general tech-savvy readers'}
**Target Word Count:** ${wordCount || 1200} words
${outline ? `**Outline to follow:**\n${outline}\n` : ''}

Return a valid JSON object with this exact structure:
{
  "title": "Engaging, SEO-friendly title (50-60 characters)",
  "slug": "url-friendly-slug-from-title",
  "description": "Compelling meta description (140-160 characters)",
  "content": "Full markdown article content with proper headings, paragraphs, lists where appropriate",
  "readingTimeMinutes": number,
  "wordCount": number,
  "keyTakeaways": ["takeaway 1", "takeaway 2", "takeaway 3"]
}

Requirements:
- Use H2 and H3 headings for structure
- Include a compelling introduction that hooks the reader
- Provide actionable insights and examples
- Include a strong conclusion with call-to-action
- Content must be original and well-researched
- Do NOT include the title as H1 in content (it will be added separately)`,
  }),

  GENERATE_OUTLINE: ({ topic, depth }) => ({
    system: TEMPLATES.SYSTEM_CONTENT_WRITER,
    user: `Create a detailed article outline for the following topic:

**Topic:** ${topic}
**Depth:** ${depth || 'comprehensive'} (quick/standard/comprehensive)

Return valid JSON:
{
  "title": "Suggested article title",
  "outline": [
    {
      "section": "H2 Section Title",
      "points": ["Key point 1", "Key point 2"],
      "subsections": [
        { "heading": "H3 Subsection", "points": ["point"] }
      ]
    }
  ],
  "estimatedWordCount": number,
  "targetKeywords": ["keyword1", "keyword2"]
}`,
  }),

  GENERATE_TITLES: ({ topic, count, existingTitle }) => ({
    system: TEMPLATES.SYSTEM_SEO_SPECIALIST,
    user: `Generate ${count || 5} compelling, SEO-optimized article title options for this topic:

**Topic:** ${topic}
${existingTitle ? `**Existing title (improve on this):** ${existingTitle}` : ''}

Requirements for each title:
- 50-60 characters for optimal SEO
- Include the primary keyword naturally
- Use power words to increase CTR
- Avoid clickbait but maximize curiosity

Return valid JSON:
{
  "titles": [
    {
      "title": "The title text",
      "characterCount": number,
      "seoScore": number (0-100),
      "rationale": "Why this title works"
    }
  ]
}`,
  }),

  // ----------------------------------------------------------------
  // CONTENT IMPROVEMENT
  // ----------------------------------------------------------------
  GENERATE_SUMMARY: ({ content, maxLength }) => ({
    system: TEMPLATES.SYSTEM_CONTENT_WRITER,
    user: `Analyze the following article and generate a compelling executive summary.

**Article Content:**
${content.slice(0, 8000)}

**Requirements:**
- Maximum length: ${maxLength || 300} words
- Capture the key insights and value
- Written in a clear, engaging style
- Include 3 key takeaways as bullet points

Return valid JSON:
{
  "summary": "The full summary text",
  "keyTakeaways": ["takeaway 1", "takeaway 2", "takeaway 3"],
  "wordCount": number,
  "toneAnalysis": "professional|conversational|technical|academic"
}`,
  }),

  IMPROVE_CONTENT: ({ content, improvements }) => ({
    system: TEMPLATES.SYSTEM_CONTENT_WRITER,
    user: `Improve the following article content based on the requested improvements.

**Requested Improvements:** ${improvements.join(', ')}

**Original Content:**
${content.slice(0, 6000)}

Available improvement types:
- grammar: Fix grammatical errors
- readability: Simplify complex sentences, improve flow
- engagement: Add hooks, examples, and more compelling language
- structure: Improve heading hierarchy and paragraph organization
- conciseness: Remove redundancy and tighten prose

Return valid JSON:
{
  "improvedContent": "The full improved content in markdown",
  "changes": [
    { "type": "grammar|readability|engagement|structure|conciseness", "description": "What was changed" }
  ],
  "improvementScore": number (0-100, how much it improved),
  "readabilityGrade": number (Flesch-Kincaid grade level)
}`,
  }),

  // ----------------------------------------------------------------
  // SEO GENERATION
  // ----------------------------------------------------------------
  GENERATE_SEO: ({ title, content, targetKeyword }) => ({
    system: TEMPLATES.SYSTEM_SEO_SPECIALIST,
    user: `Generate comprehensive SEO metadata for the following article.

**Article Title:** ${title}
${targetKeyword ? `**Primary Keyword:** ${targetKeyword}` : ''}
**Article Content (excerpt):**
${content.slice(0, 3000)}

SEO Best Practices to follow:
- Title tag: 50-60 characters, primary keyword near the front
- Meta description: 140-160 characters, include CTA, naturally include keyword
- Keywords: semantic variations, LSI keywords, long-tail variants

Return valid JSON:
{
  "seoTitle": "Optimized title tag (50-60 chars)",
  "seoDescription": "Compelling meta description with keyword (140-160 chars)",
  "ogTitle": "Open Graph title for social sharing",
  "ogDescription": "OG description (200 chars max)",
  "primaryKeyword": "main target keyword",
  "secondaryKeywords": ["keyword1", "keyword2", "keyword3"],
  "longTailKeywords": ["long tail 1", "long tail 2"],
  "readabilityScore": number (0-100),
  "keywordDensity": number (percentage),
  "seoScore": number (0-100),
  "recommendations": ["Specific improvement 1", "Improvement 2"]
}`,
  }),

  // ----------------------------------------------------------------
  // TAGS & CATEGORIES
  // ----------------------------------------------------------------
  GENERATE_TAGS: ({ title, content, existingCategories }) => ({
    system: TEMPLATES.SYSTEM_SEO_SPECIALIST,
    user: `Analyze this article and generate relevant tags and suggest a category.

**Title:** ${title}
**Content:**
${content.slice(0, 4000)}

${existingCategories?.length ? `**Available Categories:** ${existingCategories.join(', ')}` : ''}

Requirements:
- Generate 5-10 specific, searchable tags
- Tags should be lowercase, hyphenated if multi-word
- Suggest the most appropriate category
- Identify the primary topic and subtopics

Return valid JSON:
{
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "primaryCategory": "Best matching category name",
  "suggestedNewCategory": "New category if none fit",
  "primaryTopic": "The main subject",
  "subtopics": ["subtopic1", "subtopic2"],
  "contentType": "tutorial|opinion|news|guide|case-study|review"
}`,
  }),

  // ----------------------------------------------------------------
  // CONTENT QUALITY ANALYSIS
  // ----------------------------------------------------------------
  ANALYZE_QUALITY: ({ title, content }) => ({
    system: TEMPLATES.SYSTEM_CONTENT_ANALYST,
    user: `Perform a comprehensive quality analysis of this article.

**Title:** ${title}
**Content:**
${content.slice(0, 6000)}

Evaluate across all dimensions and return valid JSON:
{
  "overallScore": number (0-100),
  "scores": {
    "grammar": number (0-100),
    "readability": number (0-100),
    "structure": number (0-100),
    "engagement": number (0-100),
    "originality": number (0-100),
    "depth": number (0-100)
  },
  "readingLevel": "Elementary|Middle School|High School|College|Graduate",
  "sentimentTone": "positive|neutral|negative|mixed",
  "wordCount": number,
  "avgSentenceLength": number,
  "passiveVoicePercentage": number,
  "strengths": ["strength 1", "strength 2"],
  "improvements": [
    { "severity": "critical|major|minor", "issue": "Description", "suggestion": "How to fix" }
  ],
  "verdict": "Brief overall assessment"
}`,
  }),
};

/**
 * Build a prompt pair from a template
 * @param {string} templateKey - Key from TEMPLATES
 * @param {Object} variables - Template variables
 */
function buildPrompt(templateKey, variables) {
  const template = TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`Unknown prompt template: ${templateKey}`);
  }

  if (typeof template === 'function') {
    return template(variables);
  }

  return { system: template, user: '' };
}

module.exports = { TEMPLATES, buildPrompt };
