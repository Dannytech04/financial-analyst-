import { Trade, User, SubscriptionTier, ChartAnalysisResult, TradeAuditResult } from "@/types";
import { auth } from "./firebase";
import { billingService } from "./billingService";

/**
 * Clean client-side service layer communicating with the secure server-side AI Gateway.
 * All Gemini API calls, GEMINI_API_KEY secrets, and model routing reside exclusively on the server.
 * Authentication tokens are attached to every request.
 * Quotas and subscription entitlements are enforced server-side.
 */
class AIGateway {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Authentication required to access terminal intelligence. Please initialize session.");
    }
    const token = await currentUser.getIdToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  private async postJson<T>(url: string, body: unknown): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      let errorMessage = `Server error (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData?.error) errorMessage = errorData.error;
      } catch {
        // Fallback to status text
      }
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  async verifyPayment(sessionId: string, tier: SubscriptionTier, user?: User): Promise<User> {
    if (!auth.currentUser) {
      throw new Error("Authentication required to upgrade plan.");
    }
    const baseUser: User = user || {
      id: auth.currentUser.uid,
      userId: auth.currentUser.uid,
      username: auth.currentUser.displayName || 'TRADER',
      balance: 100000,
      tier: SubscriptionTier.FREE,
      usageCount: { vision: 0, audit: 0 }
    };
    return billingService.activateTier(baseUser, tier, sessionId);
  }

  // --- AI Server-Side Proxied Calls with Authoritative Enforcement ---

  /**
   * 1. Market/News Intelligence Briefing
   * Routed to gemini-3.6-flash with Google Search Grounding
   */
  async fetchMarketNews(query = "Global market sentiment"): Promise<{ text: string; sources: { title: string; uri: string }[]; modelUsed?: string }> {
    try {
      return await this.postJson<{ text: string; sources: { title: string; uri: string }[]; modelUsed?: string }>('/api/ai/news', { query });
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("rate limit") || msg.includes("429") || msg.includes("quota")) {
        return {
          text: `Market Briefing (${query}):\n\nCentral bank policies and macroeconomic data continue to drive market sentiment. Major currency pairs are consolidating near key support and resistance zones. Traders are advised to monitor high-impact economic releases and adhere strictly to risk management guidelines.\n\n(Note: Live search quota temporarily reached. Displaying baseline market outlook.)`,
          sources: []
        };
      }
      throw new Error(msg || "Failed to load market intelligence.");
    }
  }

  /**
   * Performance Report Generation
   */
  async generateReport(username: string, _trades: Trade[], stats: { winRate: number; totalPnl: number }): Promise<string> {
    try {
      const res = await this.postJson<{ text: string }>('/api/ai/report', { username, stats });
      return res.text || "Failed to generate report.";
    } catch (e: any) {
      throw new Error(e?.message || "Report generation failed.");
    }
  }

  /**
   * 2. Single Trade Audit
   * Routed to gemini-3.6-flash with Structured Output schema
   */
  async auditTrade(trade: Trade): Promise<TradeAuditResult & { usageCount?: { vision: number; audit: number }; tier?: SubscriptionTier }> {
    try {
      return await this.postJson<TradeAuditResult & { usageCount?: { vision: number; audit: number }; tier?: SubscriptionTier }>('/api/ai/audit', { trade });
    } catch (e: any) {
      throw new Error(e?.message || "Trade audit failed.");
    }
  }

  /**
   * 3. Deep Trade Analysis
   * Routed to gemini-3.1-pro-preview with ThinkingLevel.HIGH
   */
  async deepAudit(trades: Trade[]): Promise<TradeAuditResult & { modelUsed?: string; thinkingApplied?: boolean }> {
    try {
      return await this.postJson<TradeAuditResult & { modelUsed?: string; thinkingApplied?: boolean }>('/api/ai/deep-audit', { trades });
    } catch (e: any) {
      throw new Error(e?.message || "Deep audit failed.");
    }
  }

  /**
   * 4. Alpha Vision Chart Analysis
   * Routed to gemini-3.6-flash with Structured Output schema
   */
  async analyzeChart(imageBase64: string, mimeType: string): Promise<ChartAnalysisResult & { modelUsed?: string }> {
    try {
      return await this.postJson<ChartAnalysisResult & { modelUsed?: string }>('/api/ai/vision', { imageBase64, mimeType });
    } catch (e: any) {
      throw new Error(e?.message || "Chart analysis failed.");
    }
  }

  /**
   * 5. General Chat
   * Routed to gemini-3.1-pro-preview when thinkingMode is true, gemini-3.6-flash otherwise
   */
  async chat(
    history: { role: 'user' | 'model'; parts: { text: string }[] }[],
    thinkingMode = false
  ): Promise<{ text: string; modelUsed?: string; thinkingApplied?: boolean }> {
    try {
      return await this.postJson<{ text: string; modelUsed?: string; thinkingApplied?: boolean }>('/api/ai/chat', {
        history,
        thinkingMode
      });
    } catch (e: any) {
      throw new Error(e?.message || "Chat service temporarily unavailable.");
    }
  }
}

export const Gateway = new AIGateway();
export const getMarketNews = (q?: string) => Gateway.fetchMarketNews(q);
export const generateEmailReport = (e: string, t: Trade[], s: any) => Gateway.generateReport(e, t, s);
export const analyzeIndividualTrade = (t: Trade) => Gateway.auditTrade(t);
export const analyzeTradeChart = (i: string, m: string) => Gateway.analyzeChart(i, m);
export const analyzeTradesDeeply = (t: Trade[]) => Gateway.deepAudit(t);
export const getChatResponse = (h: any[], thinking = false) => Gateway.chat(h, thinking);
