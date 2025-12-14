import { FunctionDeclaration, Type } from "@google/genai";
import { ai } from './gemini';

// --- Mock Implementations ---

export const fetchOpenFoodFacts = async (barcode: string): Promise<any> => {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    if (!response.ok) return { found: false };
    const data = await response.json();
    if (!data.product) return { found: false };
    
    return {
      found: true,
      product_name: data.product.product_name,
      ingredients_text: data.product.ingredients_text,
      nutriscore: data.product.nutriscore_grade,
      nova_group: data.product.nova_group,
      categories: data.product.categories
    };
  } catch (e) {
    console.error("OpenFoodFacts Error", e);
    return { error: "Failed to fetch data" };
  }
};

export const checkRecalls = async (product_name: string): Promise<{ has_recall: boolean; details: string }> => {
  await new Promise(r => setTimeout(r, 800)); // Simulate API latency
  const lower = product_name.toLowerCase();
  
  if (lower.includes('romaine') || lower.includes('lettuce')) {
    return { has_recall: true, details: "Active recall for Romaine Lettuce due to E. coli risk." };
  }
  if (lower.includes('cantaloupe')) {
     return { has_recall: true, details: "Potential salmonella risk in pre-cut cantaloupe." };
  }
  return { has_recall: false, details: "No active recalls found in FDA database." };
};

export const checkSustainability = async (category: string): Promise<{ score: number; impact: string }> => {
    const cat = category.toLowerCase();
    if (cat.includes('beef') || cat.includes('lamb')) return { score: 20, impact: "High Carbon Footprint" };
    if (cat.includes('pork') || cat.includes('cheese')) return { score: 40, impact: "Medium-High Impact" };
    if (cat.includes('chicken') || cat.includes('egg')) return { score: 60, impact: "Medium Impact" };
    if (cat.includes('plant') || cat.includes('vegetable') || cat.includes('fruit') || cat.includes('grain')) {
        return { score: 90, impact: "Low Environmental Impact" };
    }
    return { score: 50, impact: "Moderate Impact (General)" };
};

// --- Real-Time News via Google Search ---

export const checkRealTimeNews = async (query: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Search for recent food safety alerts, bacterial outbreaks (E. coli, Salmonella, Listeria), and virus reports on news sites, Reddit, and TikTok regarding: ${query}. Summarize any active threats.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const summary = response.text;
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // Extract sources from grounding chunks
    const sources = chunks
      .map((c: any) => c.web ? { title: c.web.title, uri: c.web.uri } : null)
      .filter((s: any) => s !== null);

    return {
      news_summary: summary,
      sources: sources
    };
  } catch (error) {
    console.error("News Search Error", error);
    return { error: "Failed to fetch news", details: error };
  }
};

// --- Tool Definitions (Schema) ---

export const lookupBarcodeTool: FunctionDeclaration = {
  name: 'lookup_product_by_barcode',
  description: 'Get product details (ingredients, nutriscore) from a barcode.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      barcode: { type: Type.STRING, description: 'The barcode number' }
    },
    required: ['barcode']
  }
};

export const checkRecallsTool: FunctionDeclaration = {
  name: 'check_food_recalls',
  description: 'Check FDA database for official recalls.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      product_name: { type: Type.STRING, description: 'Product name' }
    },
    required: ['product_name']
  }
};

export const sustainabilityTool: FunctionDeclaration = {
    name: 'check_sustainability_impact',
    description: 'Estimate sustainability impact score (0-100) of a food category.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            category: { type: Type.STRING, description: 'Food category' }
        },
        required: ['category']
    }
}

export const checkOutbreaksTool: FunctionDeclaration = {
    name: 'check_food_safety_news',
    description: 'Search real-time news, social media (Reddit, TikTok), and reports for recent outbreaks, viruses, or bacteria.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            query: { type: Type.STRING, description: 'The food item or topic to search for (e.g. "raw oysters outbreaks", "Costco chicken recall")' }
        },
        required: ['query']
    }
}

export const toolsDef = [lookupBarcodeTool, checkRecallsTool, sustainabilityTool, checkOutbreaksTool];

// --- Tool Router ---

export async function executeTool(name: string, args: any) {
    if (name === 'lookup_product_by_barcode') {
        return await fetchOpenFoodFacts(args.barcode);
    }
    if (name === 'check_food_recalls') {
        return await checkRecalls(args.product_name);
    }
    if (name === 'check_sustainability_impact') {
        return await checkSustainability(args.category);
    }
    if (name === 'check_food_safety_news') {
        return await checkRealTimeNews(args.query);
    }
    return { error: `Unknown tool: ${name}` };
}
