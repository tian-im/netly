export interface Rule {
  id: string;
  pattern: string;
}

export interface Category {
  id: string;
  name: string;
  type: string;
  cashFlowType: string;
  transactionsCount: number;
  rulesCount: number;
  rules: Rule[];
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}
