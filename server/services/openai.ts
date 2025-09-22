import { GoogleGenAI } from "@google/genai";

// Using Gemini 2.5 Flash as the default model for content generation
// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export class AIService {
  async generateContent(topic: string, contentType: string, tone: string): Promise<string> {
    try {
      const prompt = this.buildContentPrompt(topic, contentType, tone);

      const systemInstruction = "You are an expert content creator for Farcaster, a decentralized social network. Create engaging, authentic content that follows Farcaster's culture and best practices. IMPORTANT: Keep content SHORT and CONCISE - maximum 1 paragraph only. Always include relevant emojis and structure content for social media engagement.";
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction,
        },
        contents: prompt,
      });

      const content = response.text;
      if (!content) {
        throw new Error("No content generated");
      }

      return content;
    } catch (error: any) {
      console.error("Error generating content with OpenAI:", error);
      if (error.code === 'invalid_api_key') {
        throw new Error("Invalid Gemini API key. Please check your configuration.");
      }
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }

  private buildContentPrompt(topic: string, contentType: string, tone: string): string {
    const basePrompt = `Create a ${contentType.toLowerCase()} about "${topic}" in a ${tone.toLowerCase()} tone for Farcaster.`;
    
    let specificInstructions = "";

    switch (contentType.toLowerCase()) {
      case "educational":
        specificInstructions = `
        - Share one key insight or takeaway in a single paragraph
        - Use clear, digestible information 
        - Add 1-2 relevant emojis to enhance readability
        - End with a brief thought-provoking question
        - Keep it concise and focused on one main point`;
        break;
      
      case "news":
        specificInstructions = `
        - Start with the key news point in one sentence
        - Briefly explain why it matters
        - Keep it timely and relevant
        - Use 1-2 emojis to highlight importance`;
        break;
      
      case "personal":
        specificInstructions = `
        - Share a brief personal perspective
        - Be authentic and relatable
        - Include one key lesson learned
        - Connect with the audience on a personal level`;
        break;
      
      case "analysis":
        specificInstructions = `
        - Focus on one key industry insight
        - Provide the most important data point
        - Mention the main implication
        - End with a brief future outlook`;
        break;
      
      case "creative":
        specificInstructions = `
        - Tell a brief, engaging story
        - Use one creative element
        - Create emotional connection
        - Have a satisfying conclusion`;
        break;
      
      default:
        specificInstructions = `
        - Create engaging, shareable content in one paragraph
        - Use 1-2 appropriate emojis
        - Keep it concise but informative
        - Include a call to action or question`;
    }

    const toneGuidance = this.getToneGuidance(tone.toLowerCase());

    return `${basePrompt}

Requirements:
${specificInstructions}

Tone guidance:
${toneGuidance}

Format:
- Write for Farcaster's audience (crypto-native, tech-savvy, engaged)
- MAXIMUM 1 PARAGRAPH - keep it short and to the point
- Aim for 100-200 characters total (very concise)
- Include 1-2 relevant emojis maximum
- Make it engaging and likely to generate replies/recasts
- NO long explanations or multiple points

Generate SHORT, FOCUSED content ready to be posted to Farcaster.`;
  }

  private getToneGuidance(tone: string): string {
    switch (tone) {
      case "professional":
        return `
        - Use authoritative but approachable language
        - Include industry terminology appropriately
        - Maintain credibility while being accessible
        - Focus on value and insights`;
      
      case "casual":
        return `
        - Use conversational, friendly language
        - Include casual expressions and slang when appropriate
        - Be relatable and down-to-earth
        - Feel like talking to a knowledgeable friend`;
      
      case "humorous":
        return `
        - Include appropriate humor and wit
        - Use clever observations or funny analogies
        - Keep it light but still informative
        - Make people smile while learning`;
      
      default:
        return `
        - Use clear, engaging language
        - Be authentic and genuine
        - Focus on providing value to readers`;
    }
  }

  async analyzeContent(content: string): Promise<{
    sentiment: string;
    readability: string;
    engagement_potential: string;
    suggestions: string[];
  }> {
    try {
      const systemInstruction = `You are a social media content analyst. Analyze content for Farcaster and provide insights in JSON format with these fields:
            - sentiment: overall sentiment (positive/negative/neutral)
            - readability: how easy it is to read (high/medium/low)
            - engagement_potential: likelihood of engagement (high/medium/low)
            - suggestions: array of 2-3 specific improvement suggestions`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              sentiment: { type: "string" },
              readability: { type: "string" },
              engagement_potential: { type: "string" },
              suggestions: { type: "array", items: { type: "string" } }
            },
            required: ["sentiment", "readability", "engagement_potential", "suggestions"]
          }
        },
        contents: `Analyze this Farcaster content: "${content}"`
      });

      const analysis = JSON.parse(response.text || "{}");
      return {
        sentiment: analysis.sentiment || "neutral",
        readability: analysis.readability || "medium",
        engagement_potential: analysis.engagement_potential || "medium",
        suggestions: analysis.suggestions || []
      };
    } catch (error: any) {
      console.error("Error analyzing content:", error);
      throw new Error("Failed to analyze content");
    }
  }

  async generateImagePrompt(content: string): Promise<string> {
    try {
      const systemInstruction = "You are an expert at creating search queries for stock photos. Based on content, generate a concise search term that would find relevant, professional images.";
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction,
        },
        contents: `Generate a search term for finding relevant images for this content: "${content.slice(0, 500)}"`
      });

      return response.text?.trim() || "technology";
    } catch (error: any) {
      console.error("Error generating image prompt:", error);
      return "technology"; // Fallback
    }
  }
}

export const aiService = new AIService();
