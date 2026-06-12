export type MoneyType = "income" | "expense"

export type BudgetSettings = {
  id: string
  owner_id: string
  required_savings: number
  currency: string
  created_at: string
  updated_at: string
}

export const INCOME_CATEGORIES = [
  "Salariu",
  "Ore noapte",
  "Spor weekend",
  "Restanta",
  "Vanzare",
  "Rambursare",
  "Altul",
] as const

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number]

export type IncomeEntry = {
  id: string
  owner_id: string
  amount: number
  category: IncomeCategory | string
  source_name: string
  note: string
  income_date: string
  created_at: string
  updated_at: string
}

export type Transaction = {
  id: string
  owner_id: string
  type: MoneyType
  amount: number
  category: string
  note: string
  transaction_date: string
  created_at: string
}

export type FixedCost = {
  id: string
  owner_id: string
  name: string
  amount: number
  due_day: number
  category: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Goal = {
  id: string
  owner_id: string
  name: string
  target_amount: number | null
  current_amount: number
  monthly_contribution: number
  priority: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type PurchaseRecommendation = "recommended" | "caution" | "not recommended"

export type PurchaseCheck = {
  id: string
  owner_id: string
  item_name: string
  price: number
  category: string
  result: PurchaseRecommendation
  daily_limit_before: number
  daily_limit_after: number
  recommendation: string
  created_at: string
}

export type FinanceState = {
  budgetSettings: BudgetSettings
  incomeEntries: IncomeEntry[]
  transactions: Transaction[]
  fixedCosts: FixedCost[]
  goals: Goal[]
  purchaseChecks: PurchaseCheck[]
}

const now = new Date()

export const seedFinanceState: FinanceState = {
  budgetSettings: {
    id: "budget-settings-vlad",
    owner_id: "vlad",
    required_savings: 500,
    currency: "RON",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
  incomeEntries: [],
  transactions: [],
  fixedCosts: [
    {
      id: "fixed-car",
      owner_id: "vlad",
      name: "CAR",
      amount: 600,
      due_day: 5,
      category: "Transport",
      is_active: true,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: "fixed-fuel",
      owner_id: "vlad",
      name: "Fuel estimate",
      amount: 900,
      due_day: 12,
      category: "Transport",
      is_active: true,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: "fixed-tools",
      owner_id: "vlad",
      name: "ChatGPT + Apple Music",
      amount: 47,
      due_day: 18,
      category: "Software",
      is_active: true,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: "fixed-repair",
      owner_id: "vlad",
      name: "Car repair",
      amount: 500,
      due_day: 27,
      category: "Transport",
      is_active: true,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
  ],
  goals: [
    {
      id: "goal-corfu-stay",
      owner_id: "vlad",
      name: "Corfu accommodation",
      target_amount: 1100,
      current_amount: 0,
      monthly_contribution: 0,
      priority: 1,
      is_active: true,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: "goal-corfu-flight",
      owner_id: "vlad",
      name: "Corfu flight",
      target_amount: 600,
      current_amount: 0,
      monthly_contribution: 0,
      priority: 2,
      is_active: true,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: "goal-emergency-fund",
      owner_id: "vlad",
      name: "Emergency fund",
      target_amount: null,
      current_amount: 0,
      monthly_contribution: 0,
      priority: 3,
      is_active: false,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: "goal-investments",
      owner_id: "vlad",
      name: "Investments",
      target_amount: null,
      current_amount: 0,
      monthly_contribution: 0,
      priority: 4,
      is_active: false,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
  ],
  purchaseChecks: [],
}

export function normalizeFinanceState(input: Partial<FinanceState> | null | undefined): FinanceState {
  const budgetSettings = input?.budgetSettings ?? seedFinanceState.budgetSettings

  return {
    budgetSettings: {
      ...seedFinanceState.budgetSettings,
      ...budgetSettings,
      required_savings: Number(budgetSettings.required_savings ?? seedFinanceState.budgetSettings.required_savings),
    },
    incomeEntries: Array.isArray(input?.incomeEntries) ? input!.incomeEntries : [],
    transactions: Array.isArray(input?.transactions) ? input!.transactions : [],
    fixedCosts: Array.isArray(input?.fixedCosts) ? input!.fixedCosts : seedFinanceState.fixedCosts,
    goals: Array.isArray(input?.goals) ? input!.goals : seedFinanceState.goals,
    purchaseChecks: Array.isArray(input?.purchaseChecks) ? input!.purchaseChecks : [],
  }
}

export function currencyLabel(currency: string) {
  return currency === "RON" ? "RON" : currency
}

export function formatMoney(amount: number, currency = "RON") {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

export function formatDay(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value))
}

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export function isInCurrentMonth(dateValue: string, reference = new Date()) {
  const date = new Date(dateValue)
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth()
  )
}

export function getDaysInMonth(reference = new Date()) {
  return new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate()
}

export function getRemainingDaysInMonth(reference = new Date()) {
  const daysInMonth = getDaysInMonth(reference)
  return Math.max(daysInMonth - reference.getDate() + 1, 1)
}

export function sumAmounts<T>(items: T[], getter: (item: T) => number) {
  return items.reduce((total, item) => total + getter(item), 0)
}

export function calculateBudget(state: FinanceState, reference = new Date()) {
  const activeGoals = state.goals.filter((goal) => goal.is_active)
  const activeFixedCosts = state.fixedCosts.filter((cost) => cost.is_active)
  const incomeEntries = Array.isArray(state.incomeEntries) ? state.incomeEntries : []
  const transactions = Array.isArray(state.transactions) ? state.transactions : []

  const incomeThisMonth = incomeEntries.filter((entry) =>
    isInCurrentMonth(entry.income_date, reference),
  )
  const expensesThisMonth = transactions.filter(
    (transaction) =>
      transaction.type === "expense" && isInCurrentMonth(transaction.transaction_date, reference),
  )

  const goalContributions = sumAmounts(activeGoals, (goal) => goal.monthly_contribution)
  const fixedCostsTotal = sumAmounts(activeFixedCosts, (cost) => cost.amount)
  const spentThisMonth = sumAmounts(expensesThisMonth, (transaction) => transaction.amount)
  const totalIncomeThisMonth = sumAmounts(incomeThisMonth, (entry) => entry.amount)
  const availableForVariableSpending = totalIncomeThisMonth - state.budgetSettings.required_savings - goalContributions - fixedCostsTotal
  const remainingVariableBudget = availableForVariableSpending - spentThisMonth
  const remainingDays = getRemainingDaysInMonth(reference)
  const dailySafeLimit = remainingVariableBudget / remainingDays
  const weeklySafeLimit = dailySafeLimit * 7

  const status: "safe" | "caution" | "danger" =
    remainingVariableBudget < 0
      ? "danger"
      : remainingVariableBudget <= dailySafeLimit * 3
        ? "caution"
        : "safe"

  return {
    activeGoals,
    activeFixedCosts,
    incomeThisMonth,
    expensesThisMonth,
    goalContributions,
    fixedCostsTotal,
    spentThisMonth,
    totalIncomeThisMonth,
    availableForVariableSpending,
    remainingVariableBudget,
    remainingDays,
    dailySafeLimit,
    weeklySafeLimit,
    status,
  }
}

export function getPurchaseRecommendation(args: {
  price: number
  dailySafeLimit: number
  remainingVariableBudget: number
}) {
  const { price, dailySafeLimit, remainingVariableBudget } = args

  if (remainingVariableBudget - price < 0 || dailySafeLimit <= 0) {
    return {
      result: "not recommended" as const,
      recommendation: "Skip this month",
    }
  }

  if (price <= dailySafeLimit * 0.2) {
    return {
      result: "recommended" as const,
      recommendation: "Buy now",
    }
  }

  if (price <= dailySafeLimit * 0.75) {
    return {
      result: "caution" as const,
      recommendation: "Wait 48 hours",
    }
  }

  return {
    result: "not recommended" as const,
    recommendation: "Skip this month",
  }
}

export function statusTone(status: "safe" | "caution" | "danger") {
  if (status === "safe") return "safe"
  if (status === "caution") return "caution"
  return "danger"
}
