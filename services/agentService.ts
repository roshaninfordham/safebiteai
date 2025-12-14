import { ai, GEMINI_MODEL_FAST } from './gemini';
import { AgentStep, InputType, SafeBiteResponse, UserPrefs } from '../types';
import { toolsDef, executeTool } from './tools';
import { Type, Part } from '@google/genai';

type StepCallback = (step: AgentStep) => void;

// JSON Schema for the final structured output
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    product_name: { type: Type.STRING },
    ingredient_list: { type: Type.ARRAY, items: { type: Type.STRING } },
    allergen_risk: { type: Type.STRING },
    safety_score: { type: Type.INTEGER },
    safety_flag: { type: Type.STRING, enum: ['Unsafe', 'Caution', 'Low risk'] },
    sustainability_score: { type: Type.INTEGER },
    sustainability_flag: { type: Type.STRING },
    explanation_short: { type: Type.STRING },
    explanation_detailed: { type: Type.STRING },
    alternatives: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          why: { type: Type.STRING },
          taste_similarity: { type: Type.STRING }
        }
      }
    },
    next_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
    sources: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          uri: { type: Type.STRING }
        }
      }
    }
  },
  required: ['product_name', 'safety_score', 'explanation_short', 'safety_flag']
};

export class AgentService {
  private onStep: StepCallback;

  constructor(onStep: StepCallback) {
    this.onStep = onStep;
  }

  private emit(id: string, label: string, status: AgentStep['status'] = 'running', details?: string) {
    this.onStep({
      id,
      label,
      status,
      timestamp: new Date().toISOString(),
      details
    });
  }

  async runAgent(
    input: string | { mimeType: string; data: string },
    inputType: InputType,
    prefs: UserPrefs
  ): Promise<SafeBiteResponse> {
    const sessionId = Math.random().toString(36).substring(7);

    try {
      this.emit('init', 'Initializing Agent...', 'running');

      // 1. Initialize Chat with Tools
      const chat = ai.chats.create({
        model: GEMINI_MODEL_FAST,
        config: {
          tools: [{ functionDeclarations: toolsDef }],
          systemInstruction: `
            You are SafeBite, a food risk intelligence agent.
            Your goal is to assess food safety and sustainability using official databases AND real-time news.
            
            User Preferences:
            - Diet: ${prefs.diet_restriction}
            - Location: ${prefs.location}
            - Language: ${prefs.user_language}

            Workflow:
            1. Analyze the input.
            2. USE TOOLS to gather facts. 
               - ALWAYS call 'check_food_safety_news' to see if there are recent outbreaks (E. coli, etc) mentioned on social media or news.
               - If barcode, call 'lookup_product_by_barcode'.
               - If product identified, call 'check_food_recalls' and 'check_sustainability_impact'.
            3. When generating the final report:
               - Include the URLs returned by 'check_food_safety_news' in the 'sources' field.
               - If news mentions an outbreak, drastically lower the safety score (-40 points).
            
            Do not generate the JSON report yet. Just gather facts using the tools.
          `
        }
      });

      this.emit('init', 'Agent Ready', 'completed');

      // 2. Prepare User Input
      const userParts: Part[] = [];
      if (inputType === InputType.IMAGE) {
        userParts.push({ inlineData: input as { mimeType: string; data: string } });
        userParts.push({ text: "Analyze this image. Identify the food/product and check its safety." });
      } else if (inputType === InputType.BARCODE) {
        userParts.push({ text: `Analyze this barcode: ${input}. Check safety.` });
      } else {
        userParts.push({ text: input as string });
      }

      // 3. Agent Reasoning Loop
      this.emit('reasoning', 'Agent is thinking...', 'running');
      
      // Use 'message' property correctly as per SDK requirements
      let response = await chat.sendMessage({ message: userParts });
      let turnCount = 0;
      const MAX_TURNS = 7; // Increased turns for news search

      while (response.functionCalls && response.functionCalls.length > 0 && turnCount < MAX_TURNS) {
        turnCount++;
        const functionCalls = response.functionCalls;
        
        const toolResponses: Part[] = [];

        // Execute all tools requested by the model
        for (const call of functionCalls) {
          const { name, args, id } = call;
          
          let displayLabel = `Executing tool: ${name}`;
          if (name === 'check_food_safety_news') displayLabel = `Scanning News & Social Media for ${args.query}...`;

          this.emit(`tool_${id}`, displayLabel, 'running');
          
          console.log(`[Agent] Calling Tool: ${name}`, args);
          const functionResponse = await executeTool(name, args);
          
          this.emit(`tool_${id}`, `Tool finished: ${name}`, 'completed');

          toolResponses.push({
            functionResponse: {
              name: name,
              response: { result: functionResponse },
              id: id
            }
          });
        }

        // Send tool results back to the model
        this.emit('reasoning', 'Processing gathered info...', 'running');
        response = await chat.sendMessage({ message: toolResponses });
      }

      this.emit('reasoning', 'Information gathering complete', 'completed');

      // 4. Final Generation Step (Structured JSON)
      this.emit('finalizing', 'Generating Safety Report...', 'running');

      const finalRes = await chat.sendMessage({
        message: [{ text: "Based on all the information gathered (including news sources), generate the final SafeBite JSON report now." }],
        config: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA
        }
      });

      const text = finalRes.text;
      if (!text) throw new Error("Agent failed to generate final report.");

      const parsed: SafeBiteResponse = JSON.parse(text);
      parsed.session_id = sessionId;

      this.emit('finalizing', 'Report Ready', 'completed');

      return parsed;

    } catch (error) {
      this.emit('error', 'Agent crashed', 'error');
      console.error(error);
      throw error;
    }
  }
}
