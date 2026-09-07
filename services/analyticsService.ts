import { Trade, TradeStatus, TradingSession, DashboardStats } from '@/types';

export interface EquityPoint {
  trade: number;
  pnl: number;
  date: string;
}

export const analyticsService = {
  calculateStats(trades: Trade[]): DashboardStats {
    const total = trades.length;
    const wins = trades.filter(t => t.status === TradeStatus.WIN).length;
    const losses = trades.filter(t => t.status === TradeStatus.LOSS).length;
    const be = trades.filter(t => t.status === TradeStatus.BREAK_EVEN).length;
    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = total > 0 ? (wins / total) * 100 : 0;

    const distributionData = [
      { name: 'Wins', value: wins, color: '#8b5cf6' },
      { name: 'Losses', value: losses, color: '#ec4899' },
      { name: 'BE', value: be, color: '#475569' }
    ].filter(d => d.value > 0);

    const sessions = [TradingSession.LONDON, TradingSession.NEW_YORK, TradingSession.ASIAN, TradingSession.OVERLAP];
    const sessionPerformance = sessions.map(session => {
      const sessionTrades = trades.filter(t => t.session === session);
      const sTotal = sessionTrades.length;
      const sWins = sessionTrades.filter(t => t.status === TradeStatus.WIN).length;
      const sPnl = sessionTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const sWinRate = sTotal > 0 ? (sWins / sTotal) * 100 : 0;
      return {
        name: session.replace('_', ' '),
        total: sTotal,
        pnl: sPnl,
        winRate: sWinRate.toFixed(1)
      };
    });

    return { total, wins, totalPnl, winRate, distributionData, sessionPerformance };
  },

  calculateEquityCurve(trades: Trade[]): EquityPoint[] {
    let runningPnl = 0;
    return [...trades]
      .filter(t => typeof t.pnl === 'number')
      .reverse()
      .map((t, i) => {
        runningPnl += (t.pnl || 0);
        return {
          trade: i + 1,
          pnl: runningPnl,
          date: t.timestamp ? new Date(t.timestamp).toLocaleDateString() : 'N/A'
        };
      });
  }
};
