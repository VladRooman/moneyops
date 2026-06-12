"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coins,
  CreditCard,
  LayoutDashboard,
  Menu,
  ReceiptText,
  Settings2,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  calculateBudget,
  formatDay,
  formatMoney,
  getPurchaseRecommendation,
  getRemainingDaysInMonth,
  getDaysInMonth,
  isInCurrentMonth,
  INCOME_CATEGORIES,
  type FinanceState,
  type FixedCost,
  type Goal,
  type IncomeCategory,
  type IncomeEntry,
  type PurchaseCheck,
  normalizeFinanceState,
  seedFinanceState,
  statusTone,
} from "@/lib/finance"
import { cn } from "@/lib/utils"

type ViewId =
  | "dashboard"
  | "income"
  | "transactions"
  | "add-transaction"
  | "fixed-costs"
  | "goals"
  | "purchase-check"
  | "monthly-review"
  | "calendar-budget"
  | "insights"
  | "settings"

type TransactionFormState = {
  amount: string
  category: string
  note: string
  transaction_date: string
}

type IncomeFormState = {
  amount: string
  category: IncomeCategory | string
  source_name: string
  note: string
  income_date: string
}

type PurchaseFormState = {
  item_name: string
  price: string
  category: string
}

type BudgetFormState = {
  required_savings: string
  currency: string
}

type GoalEditState = Record<
  string,
  {
    monthly_contribution: string
    current_amount: string
    target_amount: string
  }
>

const NAV_ITEMS: Array<{ id: ViewId; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "income", label: "Venituri", icon: Wallet },
  { id: "transactions", label: "Tranzacții", icon: ReceiptText },
  { id: "add-transaction", label: "Adaugă tranzacție", icon: CreditCard },
  { id: "fixed-costs", label: "Costuri fixe", icon: Wallet },
  { id: "goals", label: "Obiective", icon: Target },
  { id: "purchase-check", label: "Verificare achiziție", icon: ShieldAlert },
  { id: "monthly-review", label: "Revizie lunară", icon: CalendarDays },
  { id: "calendar-budget", label: "Calendar buget", icon: CalendarDays },
  { id: "insights", label: "Analize", icon: TrendingUp },
  { id: "settings", label: "Setări", icon: Settings2 },
]

const STORAGE_KEY = "moneyops.finance-state.v1"

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function safeParseState(value: string | null) {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as FinanceState
  } catch {
    return null
  }
}

function colorClass(status: "safe" | "caution" | "danger" | "neutral") {
  if (status === "safe") {
    return "text-safe"
  }

  if (status === "caution") {
    return "text-caution"
  }

  if (status === "neutral") {
    return "text-foreground"
  }

  return "text-danger"
}

function badgeClass(status: "safe" | "caution" | "danger" | "neutral") {
  if (status === "safe") {
    return "border-safe/30 bg-safe/10 text-safe"
  }

  if (status === "caution") {
    return "border-caution/30 bg-caution/10 text-caution"
  }

  if (status === "danger") {
    return "border-danger/30 bg-danger/10 text-danger"
  }

  return "border-border bg-muted/30 text-muted-foreground"
}

function progressWidth(current: number, target: number | null) {
  if (!target || target <= 0) {
    return 0
  }

  return Math.min((current / target) * 100, 100)
}

function compactDateLabel(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(value))
}

function groupIncomeByCategory(entries: IncomeEntry[]) {
  return entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.category] = (acc[entry.category] ?? 0) + entry.amount
    return acc
  }, {})
}

function monthLabel(date = new Date()) {
  return new Intl.DateTimeFormat("ro-RO", {
    month: "long",
    year: "numeric",
  }).format(date)
}

function todayLabel(date = new Date()) {
  return new Intl.DateTimeFormat("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date)
}

function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
  status = "neutral",
}: {
  title: string
  value: string
  helper: string
  icon: typeof Coins
  status?: "safe" | "caution" | "danger" | "neutral"
}) {
  return (
    <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <CardDescription>{title}</CardDescription>
          <span className={cn("rounded-full border px-2 py-1", badgeClass(status))}>
            <Icon className="size-3.5" />
          </span>
        </div>
        <CardTitle className={cn("text-2xl tabular-nums", colorClass(status))}>
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="-mt-1 text-xs text-muted-foreground">{helper}</CardContent>
    </Card>
  )
}

function emptyState(title: string, description: string, icon: ReactNode) {
  return (
    <Card className="border-dashed border-border/70 bg-card/50">
      <CardContent className="flex flex-col items-start gap-3 py-8">
        <div className="rounded-2xl border border-border/70 bg-muted/40 p-3 text-muted-foreground">
          {icon}
        </div>
        <div className="space-y-1">
          <p className="font-medium text-foreground">{title}</p>
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function usePersistentState(initialState: FinanceState) {
  const [state, setState] = useState<FinanceState>(() => normalizeFinanceState(initialState))
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = safeParseState(window.localStorage.getItem(STORAGE_KEY))
    const timer = window.setTimeout(() => {
      if (stored) {
        setState(normalizeFinanceState(stored))
      }
      setHydrated(true)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [hydrated, state])

  return [state, setState] as const
}

export function FinanceApp({ initialState = seedFinanceState }: { initialState?: FinanceState }) {
  const [state, setState] = usePersistentState(normalizeFinanceState(initialState))
  const [activeView, setActiveView] = useState<ViewId>("dashboard")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [transactionForm, setTransactionForm] = useState<TransactionFormState>(() => ({
    amount: "",
    category: "General",
    note: "",
    transaction_date: new Date().toISOString().slice(0, 10),
  }))
  const [incomeForm, setIncomeForm] = useState<IncomeFormState>(() => ({
    amount: "",
    category: "Salariu",
    source_name: "",
    note: "",
    income_date: new Date().toISOString().slice(0, 10),
  }))
  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>(() => ({
    item_name: "",
    price: "",
    category: "General",
  }))
  const [budgetForm, setBudgetForm] = useState<BudgetFormState>(() => ({
    required_savings: String(initialState.budgetSettings.required_savings),
    currency: initialState.budgetSettings.currency,
  }))
  const [goalEditState, setGoalEditState] = useState<GoalEditState>({})
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBudgetForm({
        required_savings: String(state.budgetSettings.required_savings),
        currency: state.budgetSettings.currency,
      })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [state.budgetSettings.required_savings, state.budgetSettings.currency])

  const budget = useMemo(() => calculateBudget(state), [state])
  const latestPurchase = state.purchaseChecks[0]
  const currentStatus = budget.status
  const remainingDays = getRemainingDaysInMonth()

  const incomeThisMonth = state.incomeEntries.filter((entry) =>
    isInCurrentMonth(entry.income_date),
  )
  const totalIncomeThisMonth = budget.totalIncomeThisMonth
  const hasIncomeThisMonth = incomeThisMonth.length > 0
  const incomeByCategory = groupIncomeByCategory(incomeThisMonth)
  const incomeCategoryTotals = Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1])
  const incomeEntriesSorted = [...state.incomeEntries]
    .sort((a, b) => b.income_date.localeCompare(a.income_date))
    .slice(0, 5)

  const recentTransactions = [...state.transactions]
    .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
    .slice(0, 5)

  const sortedGoals = [...state.goals].sort((a, b) => a.priority - b.priority)
  const sortedFixedCosts = [...state.fixedCosts].sort((a, b) => a.due_day - b.due_day)

  const monthDays = Array.from({ length: getDaysInMonth() }, (_, index) => index + 1)
  const currentDay = new Date().getDate()
  const hasBudgetIncome = totalIncomeThisMonth > 0
  const displayStatus = hasBudgetIncome ? currentStatus : "neutral"
  const displayDailySafeLimit = hasBudgetIncome ? budget.dailySafeLimit : 0
  const displayWeeklySafeLimit = hasBudgetIncome ? budget.weeklySafeLimit : 0
  const displayRemainingVariableBudget = hasBudgetIncome ? budget.remainingVariableBudget : 0

  const handleIncomeSubmit = () => {
    const amount = Number(incomeForm.amount)
    if (!incomeForm.source_name.trim() || !incomeForm.category.trim() || !incomeForm.note.trim() || !amount || amount <= 0) {
      toast.error("Completează suma, sursa, categoria și nota.")
      return
    }

    const nextIncome: IncomeEntry = {
      id: createId("income"),
      owner_id: "vlad",
      amount,
      category: incomeForm.category.trim(),
      source_name: incomeForm.source_name.trim(),
      note: incomeForm.note.trim(),
      income_date: incomeForm.income_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setState((current) => ({
      ...current,
      incomeEntries: [nextIncome, ...current.incomeEntries],
    }))

    setIncomeForm({
      amount: "",
      category: "Salariu",
      source_name: "",
      note: "",
      income_date: new Date().toISOString().slice(0, 10),
    })
    setEditingIncomeId(null)
    toast.success("Venitul a fost salvat local.")
  }

  const saveIncomeEdit = () => {
    const amount = Number(incomeForm.amount)
    if (!incomeForm.source_name.trim() || !incomeForm.category.trim() || !incomeForm.note.trim() || !amount || amount <= 0) {
      toast.error("Completează suma, sursa, categoria și nota.")
      return
    }

    if (!editingIncomeId) {
      handleIncomeSubmit()
      return
    }

    setState((current) => ({
      ...current,
      incomeEntries: current.incomeEntries.map((entry) =>
        entry.id === editingIncomeId
          ? {
              ...entry,
              amount,
              category: incomeForm.category.trim(),
              source_name: incomeForm.source_name.trim(),
              note: incomeForm.note.trim(),
              income_date: incomeForm.income_date,
              updated_at: new Date().toISOString(),
            }
          : entry,
      ),
    }))

    setEditingIncomeId(null)
    setIncomeForm({
      amount: "",
      category: "Salariu",
      source_name: "",
      note: "",
      income_date: new Date().toISOString().slice(0, 10),
    })
    toast.success("Venitul a fost actualizat.")
  }

  const startIncomeEdit = (entry: IncomeEntry) => {
    setIncomeForm({
      amount: String(entry.amount),
      category: entry.category,
      source_name: entry.source_name,
      note: entry.note,
      income_date: entry.income_date,
    })
  }

  const deleteIncomeEntry = (entryId: string) => {
    setState((current) => ({
      ...current,
      incomeEntries: current.incomeEntries.filter((entry) => entry.id !== entryId),
    }))
    if (editingIncomeId === entryId) {
      setEditingIncomeId(null)
      setIncomeForm({
        amount: "",
        category: "Salariu",
        source_name: "",
        note: "",
        income_date: new Date().toISOString().slice(0, 10),
      })
    }
    toast.success("Venitul a fost șters.")
  }

  const handleTransactionSubmit = () => {
    const amount = Number(transactionForm.amount)
    if (!transactionForm.category || !transactionForm.note.trim() || !amount || amount <= 0) {
      toast.error("Completează suma, categoria și nota.")
      return
    }

    const nextTransaction = {
      id: createId("txn"),
      owner_id: "vlad",
      type: "expense" as const,
      amount,
      category: transactionForm.category.trim(),
      note: transactionForm.note.trim(),
      transaction_date: transactionForm.transaction_date,
      created_at: new Date().toISOString(),
    }

    setState((current) => ({
      ...current,
      transactions: [nextTransaction, ...current.transactions],
    }))

    setTransactionForm({
      amount: "",
      category: "General",
      note: "",
      transaction_date: new Date().toISOString().slice(0, 10),
    })
    setActiveView("transactions")
    toast.success("Tranzacția a fost salvată local.")
  }

  const handlePurchaseCheck = () => {
    const price = Number(purchaseForm.price)
    if (!purchaseForm.item_name.trim() || !purchaseForm.category.trim() || !price || price <= 0) {
      toast.error("Completează numele, prețul și categoria.")
      return
    }

    const decision = getPurchaseRecommendation({
      price,
      dailySafeLimit: budget.dailySafeLimit,
      remainingVariableBudget: budget.remainingVariableBudget,
    })

    const check: PurchaseCheck = {
      id: createId("check"),
      owner_id: "vlad",
      item_name: purchaseForm.item_name.trim(),
      price,
      category: purchaseForm.category.trim(),
      result: decision.result,
      daily_limit_before: budget.dailySafeLimit,
      daily_limit_after: budget.dailySafeLimit - price,
      recommendation: decision.recommendation,
      created_at: new Date().toISOString(),
    }

    setState((current) => ({
      ...current,
      purchaseChecks: [check, ...current.purchaseChecks],
    }))

    setPurchaseForm({
      item_name: "",
      price: "",
      category: "General",
    })
    toast.success("Verificarea a fost calculată.")
  }

  const handleBudgetSave = () => {
    const requiredSavings = Number(budgetForm.required_savings)

    if (requiredSavings < 0) {
      toast.error("Verifică valorile bugetului.")
      return
    }

    setState((current) => ({
      ...current,
      budgetSettings: {
        ...current.budgetSettings,
        required_savings: requiredSavings,
        currency: budgetForm.currency.trim() || current.budgetSettings.currency,
        updated_at: new Date().toISOString(),
      },
    }))

    toast.success("Setările bugetului au fost salvate.")
  }

  const updateFixedCost = (costId: string, next: Partial<FixedCost>) => {
    setState((current) => ({
      ...current,
      fixedCosts: current.fixedCosts.map((cost) =>
        cost.id === costId ? { ...cost, ...next, updated_at: new Date().toISOString() } : cost,
      ),
    }))
  }

  const updateGoal = (goalId: string, next: Partial<Goal>) => {
    setState((current) => ({
      ...current,
      goals: current.goals.map((goal) =>
        goal.id === goalId ? { ...goal, ...next, updated_at: new Date().toISOString() } : goal,
      ),
    }))
  }

  const setGoalDraft = (goal: Goal) => {
    setGoalEditState((current) => ({
      ...current,
      [goal.id]: {
        monthly_contribution: String(goal.monthly_contribution),
        current_amount: String(goal.current_amount),
        target_amount: goal.target_amount === null ? "" : String(goal.target_amount),
      },
    }))
  }

  const statusText = !hasBudgetIncome
    ? "Adauga venituri"
    : currentStatus === "safe"
      ? "Siguranta buna"
      : currentStatus === "caution"
        ? "Atentie la ritmul de cheltuieli"
        : "Bugetul este sub presiune"

  const statusDescription = !hasBudgetIncome
    ? "Bugetul se calculeaza dupa ce introduci primul venit."
    : currentStatus === "safe"
      ? "Poti cheltui cu disciplina fara sa strici luna."
      : currentStatus === "caution"
        ? "Mai exista spatiu, dar orice achizitie mare trebuie verificata."
        : "Cheltuielile curente depasesc cadrul sigur."

  const viewTitle = NAV_ITEMS.find((item) => item.id === activeView)?.label ?? "Dashboard"

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_28%),linear-gradient(180deg,#05070a_0%,#071018_55%,#05070a_100%)] text-foreground">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:28px_28px] opacity-20" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl gap-4 px-3 py-3 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-4 lg:py-4">
        <aside className="hidden rounded-[28px] border border-border/70 bg-card/80 p-4 shadow-2xl shadow-black/40 backdrop-blur xl:flex xl:flex-col">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-safe/30 bg-safe/10 text-safe">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">MoneyOps</p>
                <h1 className="font-heading text-lg font-medium">Buget personal beta</h1>
              </div>
            </div>
            <Card className="border-border/70 bg-background/40">
              <CardHeader className="space-y-2">
                <CardDescription>Stare lună curentă</CardDescription>
                <CardTitle className={cn("text-2xl", colorClass(currentStatus))}>{statusText}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{statusDescription}</p>
                <p>
                  RON rămași variabil:{" "}
                  <span className="font-medium text-foreground">
                    {formatMoney(displayRemainingVariableBudget, state.budgetSettings.currency)}
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>
          <Separator className="my-4 bg-border/80" />
          <ScrollArea className="min-h-0 flex-1 pr-2">
            <nav className="flex flex-col gap-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const active = activeView === item.id

                return (
                  <Button
                    key={item.id}
                    variant={active ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 rounded-2xl px-3 py-5 text-left",
                      active && "bg-safe/15 text-safe hover:bg-safe/20",
                    )}
                    onClick={() => setActiveView(item.id)}
                  >
                    <Icon data-icon="inline-start" />
                    <span className="flex flex-col items-start">
                      <span>{item.label}</span>
                      {item.id === "dashboard" ? (
                        <span className="text-xs text-muted-foreground">
                          {formatMoney(displayDailySafeLimit, state.budgetSettings.currency)} / zi
                        </span>
                      ) : null}
                    </span>
                  </Button>
                )
              })}
            </nav>
          </ScrollArea>
        </aside>

        <main className="flex min-w-0 w-full flex-col gap-4">
          <header className="rounded-[28px] border border-border/70 bg-card/75 px-4 py-4 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                    <Clock3 className="size-3.5" />
                    {todayLabel()}
                  </div>
                  <Badge className={badgeClass(displayStatus) as string}>
                    {statusText}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <h2 className="font-heading text-2xl font-medium tracking-tight">{viewTitle}</h2>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    Cât poți cheltui azi fără să ruinezi luna:{" "}
                    <span className={cn("font-medium", colorClass(displayStatus))}>
                      {formatMoney(displayDailySafeLimit, state.budgetSettings.currency)} / zi
                    </span>
                    {" · "}
                    {formatMoney(budget.weeklySafeLimit, state.budgetSettings.currency)} / săptămână
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 lg:hidden">
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <Button variant="outline" size="icon-sm" onClick={() => setMobileMenuOpen(true)}>
                    <Menu />
                  </Button>
                  <SheetContent side="left" className="w-[86vw] bg-card/98">
                    <SheetHeader className="border-b border-border/70 pb-4">
                      <SheetTitle>MoneyOps</SheetTitle>
                    </SheetHeader>
                    <div className="p-4">
                      <nav className="flex flex-col gap-2">
                        {NAV_ITEMS.map((item) => {
                          const Icon = item.icon
                          const active = activeView === item.id

                          return (
                            <Button
                              key={item.id}
                              variant={active ? "default" : "ghost"}
                              className={cn(
                                "w-full justify-start gap-3 rounded-2xl px-3 py-5 text-left",
                                active && "bg-safe/15 text-safe hover:bg-safe/20",
                              )}
                              onClick={() => {
                                setActiveView(item.id)
                                setMobileMenuOpen(false)
                              }}
                            >
                              <Icon data-icon="inline-start" />
                              {item.label}
                            </Button>
                          )
                        })}
                      </nav>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </header>

          {activeView === "dashboard" ? (
            <div className="flex flex-col gap-4">
              <Card className="border-safe/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.10),rgba(8,15,21,0.96))]">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardDescription>Întrebarea centrală</CardDescription>
                      <CardTitle className="max-w-3xl text-3xl leading-tight">
                        Cât poți cheltui azi fără să strici luna?
                      </CardTitle>
                    </div>
                    <Badge className={badgeClass(displayStatus) as string}>{statusText}</Badge>
                  </div>
                  <CardDescription className="max-w-2xl">
                    Calculul folosește veniturile din luna curentă, economiile obligatorii, contribuțiile la obiective,
                    costurile fixe active și tranzacțiile din luna curentă.
                  </CardDescription>
                </CardHeader>
                {!hasIncomeThisMonth ? (
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {emptyState(
                        "Nu ai adaugat niciun venit luna aceasta.",
                        "Adauga primul venit pentru a calcula bugetul lunii.",
                        <Wallet className="size-5" />,
                      )}
                      <Button onClick={() => setActiveView("income")}>
                        Adaugă venit
                        <ArrowRight data-icon="inline-end" />
                      </Button>
                    </div>
                  </CardContent>
                ) : null}
                <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    title="Limită sigură azi"
                    value={formatMoney(displayDailySafeLimit, state.budgetSettings.currency)}
                    helper={`${remainingDays} zile rămase în lună`}
                    icon={Coins}
                    status={displayStatus}
                  />
                  <MetricCard
                    title="Limită sigură pe săptămână"
                    value={formatMoney(displayWeeklySafeLimit, state.budgetSettings.currency)}
                    helper="Ritmul maxim recomandat"
                    icon={TrendingUp}
                    status={displayStatus}
                  />
                  <MetricCard
                    title="Buget variabil rămas"
                    value={formatMoney(displayRemainingVariableBudget, state.budgetSettings.currency)}
                    helper="După costurile fixe și economii"
                    icon={Wallet}
                    status={displayStatus}
                  />
                  <MetricCard
                    title="Cheltuit luna aceasta"
                    value={formatMoney(budget.spentThisMonth, state.budgetSettings.currency)}
                    helper={`${state.transactions.filter((transaction) => isInCurrentMonth(transaction.transaction_date)).length} tranzacții în luna curentă`}
                    icon={TrendingDown}
                    status={budget.spentThisMonth > 0 ? "caution" : "neutral"}
                  />
                </CardContent>
              </Card>

              <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
                <Card className="border-border/70 bg-card/80">
                  <CardHeader>
                    <CardTitle>Status operațional</CardTitle>
                    <CardDescription>
                      Verde = safe, galben = caution, roșu = danger.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Semnal curent</p>
                        <p className={cn("text-2xl font-medium", colorClass(displayStatus))}>{statusText}</p>
                      </div>
                      <div className={cn("rounded-2xl border px-4 py-3", badgeClass(displayStatus))}>
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Daily safe</p>
                        <p className="text-lg font-medium tabular-nums">
                          {formatMoney(displayDailySafeLimit, state.budgetSettings.currency)}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span>Venit total luna aceasta</span>
                        <span className="font-medium">{formatMoney(totalIncomeThisMonth, state.budgetSettings.currency)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span>Economii obligatorii</span>
                        <span className="font-medium">{formatMoney(state.budgetSettings.required_savings, state.budgetSettings.currency)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span>Costuri fixe active</span>
                        <span className="font-medium">{formatMoney(budget.fixedCostsTotal, state.budgetSettings.currency)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span>Contribuții obiective</span>
                        <span className="font-medium">{formatMoney(budget.goalContributions, state.budgetSettings.currency)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => setActiveView("add-transaction")}>
                        <Coins data-icon="inline-start" />
                        Adaugă cheltuială
                      </Button>
                      <Button variant="outline" onClick={() => setActiveView("purchase-check")}>
                        <ShieldAlert data-icon="inline-start" />
                        Verifică achiziție
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-card/80">
                  <CardHeader>
                    <CardTitle>Următoarele scadențe</CardTitle>
                    <CardDescription>Costurile fixe active ordonate după zi.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {sortedFixedCosts.slice(0, 4).map((cost) => (
                      <div key={cost.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 px-3 py-3">
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground">{cost.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Ziua {cost.due_day} · {cost.category}
                          </p>
                        </div>
                        <p className="font-medium tabular-nums">{formatMoney(cost.amount, state.budgetSettings.currency)}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <Card className="border-border/70 bg-card/80">
                  <CardHeader>
                    <CardTitle>Obiective active</CardTitle>
                    <CardDescription>Contribuțiile lunare intră direct în calculul bugetului.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {sortedGoals.filter((goal) => goal.is_active).map((goal) => (
                      <div key={goal.id} className="space-y-2 rounded-2xl border border-border/60 bg-background/40 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">{goal.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {goal.target_amount === null
                                ? "Setează o țintă pentru acest obiectiv."
                                : `${formatMoney(goal.current_amount, state.budgetSettings.currency)} din ${formatMoney(goal.target_amount, state.budgetSettings.currency)}`}
                            </p>
                          </div>
                          <Badge variant="outline">{formatMoney(goal.monthly_contribution, state.budgetSettings.currency)} / lună</Badge>
                        </div>
                        <div className="h-2 rounded-full bg-muted/50">
                          <div
                            className="h-2 rounded-full bg-safe"
                            style={{ width: `${progressWidth(goal.current_amount, goal.target_amount)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-card/80">
                  <CardHeader>
                    <CardTitle>Tranzacții recente</CardTitle>
                    <CardDescription>Ultimele mișcări reale din cont.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recentTransactions.length > 0 ? (
                      recentTransactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 px-3 py-3">
                          <div className="space-y-0.5">
                            <p className="font-medium">{transaction.note}</p>
                            <p className="text-xs text-muted-foreground">
                              {transaction.category} · {compactDateLabel(transaction.transaction_date)}
                            </p>
                          </div>
                          <p
                            className={cn(
                              "font-medium tabular-nums",
                              transaction.type === "income" ? "text-safe" : "text-danger",
                            )}
                          >
                            {transaction.type === "income" ? "+" : "-"}
                            {formatMoney(transaction.amount, state.budgetSettings.currency)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="py-2 text-sm text-muted-foreground">
                        Nu ai tranzactii inregistrate luna aceasta.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}

          {activeView === "income" ? (
            <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <Card className="border-border/70 bg-card/80">
                <CardHeader>
                  <CardTitle>Venituri</CardTitle>
                  <CardDescription>
                    Adaugi veniturile manual. Bugetul lunar se calculează doar din ce este introdus aici.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <MetricCard
                      title="Total luna aceasta"
                      value={formatMoney(totalIncomeThisMonth, state.budgetSettings.currency)}
                      helper={hasIncomeThisMonth ? `${incomeThisMonth.length} venituri în luna curentă` : "Niciun venit introdus"}
                      icon={TrendingUp}
                      status={hasIncomeThisMonth ? "safe" : "neutral"}
                    />
                    <MetricCard
                      title="Categorii active"
                      value={String(incomeCategoryTotals.length || 0)}
                      helper="Distribuție pe categorii"
                      icon={Sparkles}
                      status="neutral"
                    />
                    <MetricCard
                      title="Ultima dată"
                      value={incomeEntriesSorted[0] ? formatDay(incomeEntriesSorted[0].income_date) : "—"}
                      helper="Ultimul venit introdus"
                      icon={CalendarDays}
                      status="neutral"
                    />
                  </div>

                  {!hasIncomeThisMonth ? (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
                      Nu ai adaugat niciun venit luna aceasta.
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="income-date">Data venitului</Label>
                      <Input
                        id="income-date"
                        type="date"
                        value={incomeForm.income_date}
                        onChange={(event) =>
                          setIncomeForm((current) => ({ ...current, income_date: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="income-amount">Sumă</Label>
                      <Input
                        id="income-amount"
                        type="number"
                        min="0"
                        step="1"
                        value={incomeForm.amount}
                        onChange={(event) =>
                          setIncomeForm((current) => ({ ...current, amount: event.target.value }))
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="income-category">Categorie</Label>
                      <select
                        id="income-category"
                        className="h-8 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                        value={incomeForm.category}
                        onChange={(event) =>
                          setIncomeForm((current) => ({ ...current, category: event.target.value }))
                        }
                      >
                        {INCOME_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="income-source">Sursa</Label>
                      <Input
                        id="income-source"
                        value={incomeForm.source_name}
                        onChange={(event) =>
                          setIncomeForm((current) => ({ ...current, source_name: event.target.value }))
                        }
                        placeholder="Ex: companie, client, transfer"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="income-note">Notă</Label>
                      <Textarea
                        id="income-note"
                        value={incomeForm.note}
                        onChange={(event) =>
                          setIncomeForm((current) => ({ ...current, note: event.target.value }))
                        }
                        placeholder="Detalii scurte"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {editingIncomeId ? (
                      <Button onClick={saveIncomeEdit}>
                        Salvează modificarea
                        <ArrowRight data-icon="inline-end" />
                      </Button>
                    ) : (
                      <Button onClick={handleIncomeSubmit}>
                        Adaugă venit
                        <ArrowRight data-icon="inline-end" />
                      </Button>
                    )}
                    {editingIncomeId ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingIncomeId(null)
                          setIncomeForm({
                            amount: "",
                            category: "Salariu",
                            source_name: "",
                            note: "",
                            income_date: new Date().toISOString().slice(0, 10),
                          })
                        }}
                      >
                        Anulează editarea
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/80">
                <CardHeader>
                  <CardTitle>Venituri pe categorii</CardTitle>
                  <CardDescription>Distribuția lunii curente.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {incomeCategoryTotals.length > 0 ? (
                    incomeCategoryTotals.map(([category, amount]) => (
                      <div key={category} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 px-3 py-3">
                        <span>{category}</span>
                        <span className="font-medium tabular-nums">{formatMoney(amount, state.budgetSettings.currency)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">Nu ai adaugat niciun venit luna aceasta.</div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/80 xl:col-span-2">
                <CardHeader>
                  <CardTitle>Istoric venituri</CardTitle>
                  <CardDescription>Editezi sau ștergi fiecare intrare direct de aici.</CardDescription>
                </CardHeader>
                <CardContent>
                  {state.incomeEntries.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dată</TableHead>
                          <TableHead>Categorie</TableHead>
                          <TableHead>Sursă</TableHead>
                          <TableHead>Notă</TableHead>
                          <TableHead className="text-right">Sumă</TableHead>
                          <TableHead>Acțiuni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...state.incomeEntries]
                          .sort((a, b) => b.income_date.localeCompare(a.income_date))
                          .map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>{formatDay(entry.income_date)}</TableCell>
                              <TableCell>{entry.category}</TableCell>
                              <TableCell>{entry.source_name}</TableCell>
                              <TableCell className="max-w-[220px] whitespace-normal text-muted-foreground">
                                {entry.note}
                              </TableCell>
                              <TableCell className="text-right font-medium tabular-nums text-safe">
                                {formatMoney(entry.amount, state.budgetSettings.currency)}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingIncomeId(entry.id)
                                      startIncomeEdit(entry)
                                    }}
                                  >
                                    Editează
                                  </Button>
                                  <Button variant="destructive" size="sm" onClick={() => deleteIncomeEntry(entry.id)}>
                                    Șterge
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  ) : (
                    emptyState(
                      "Nu ai adaugat niciun venit luna aceasta.",
                      "Adauga primul venit pentru a calcula bugetul lunii.",
                      <Wallet className="size-5" />,
                    )
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          {activeView === "transactions" ? (
            <Card className="border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle>Tranzacții</CardTitle>
                <CardDescription>
                  Intrări și ieșiri reale, ordonate după data tranzacției.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {state.transactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dată</TableHead>
                        <TableHead>Tip</TableHead>
                        <TableHead>Categorie</TableHead>
                        <TableHead>Notă</TableHead>
                        <TableHead className="text-right">Sumă</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...state.transactions]
                        .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
                        .map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{formatDay(transaction.transaction_date)}</TableCell>
                            <TableCell>
                              <Badge
                                className={cn(
                                  "capitalize",
                                  transaction.type === "income" ? "border-safe/30 bg-safe/10 text-safe" : "border-danger/30 bg-danger/10 text-danger",
                                )}
                                variant="outline"
                              >
                                {transaction.type === "income" ? "Venit" : "Cheltuială"}
                              </Badge>
                            </TableCell>
                            <TableCell>{transaction.category}</TableCell>
                            <TableCell className="max-w-[220px] whitespace-normal text-muted-foreground">
                              {transaction.note}
                            </TableCell>
                            <TableCell className={cn("text-right font-medium tabular-nums", transaction.type === "income" ? "text-safe" : "text-danger")}>
                              {transaction.type === "income" ? "+" : "-"}
                              {formatMoney(transaction.amount, state.budgetSettings.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                ) : (
                  emptyState(
                    "Nu ai tranzactii inregistrate luna aceasta.",
                    "Adaugă prima tranzacție reală pentru a activa calculele și analizele.",
                    <ReceiptText className="size-5" />,
                  )
                )}
              </CardContent>
            </Card>
          ) : null}

          {activeView === "add-transaction" ? (
            <Card className="border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle>Adaugă tranzacție</CardTitle>
                <CardDescription>
                  Fără valori demonstrative. Tot ce salvezi aici intră direct în calculele lunii curente.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="transaction-date">Data</Label>
                  <Input
                    id="transaction-date"
                    type="date"
                    value={transactionForm.transaction_date}
                    onChange={(event) =>
                      setTransactionForm((current) => ({ ...current, transaction_date: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transaction-amount">Sumă</Label>
                  <Input
                    id="transaction-amount"
                    type="number"
                    min="0"
                    step="1"
                    value={transactionForm.amount}
                    onChange={(event) =>
                      setTransactionForm((current) => ({ ...current, amount: event.target.value }))
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transaction-category">Categorie</Label>
                  <Input
                    id="transaction-category"
                    value={transactionForm.category}
                    onChange={(event) =>
                      setTransactionForm((current) => ({ ...current, category: event.target.value }))
                    }
                    placeholder="General"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="transaction-note">Notă</Label>
                  <Textarea
                    id="transaction-note"
                    value={transactionForm.note}
                    onChange={(event) =>
                      setTransactionForm((current) => ({ ...current, note: event.target.value }))
                    }
                    placeholder="Descriere scurtă și clară"
                    rows={4}
                  />
                </div>
                <div className="flex flex-wrap gap-2 md:col-span-2">
                  <Button onClick={handleTransactionSubmit}>
                    Salvează tranzacția
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                  <Button variant="outline" onClick={() => setActiveView("transactions")}>
                    Vezi istoricul
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeView === "fixed-costs" ? (
            <Card className="border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle>Costuri fixe</CardTitle>
                <CardDescription>
                  Activezi sau oprești fiecare cost, iar totalul intră automat în bugetul lunar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  <MetricCard
                    title="Total activ"
                    value={formatMoney(budget.fixedCostsTotal, state.budgetSettings.currency)}
                    helper="Costurile fixe active"
                    icon={Wallet}
                    status="caution"
                  />
                  <MetricCard
                    title="Număr activ"
                    value={String(budget.activeFixedCosts.length)}
                    helper="Costuri fixe în lucru"
                    icon={CheckCircle2}
                    status="safe"
                  />
                  <MetricCard
                    title="Ziua cea mai apropiată"
                    value={`Ziua ${sortedFixedCosts[0]?.due_day ?? "-"}`}
                    helper="Primul termen din lună"
                    icon={CalendarDays}
                    status="neutral"
                  />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nume</TableHead>
                      <TableHead>Categorie</TableHead>
                      <TableHead>Scadență</TableHead>
                      <TableHead>Sumă</TableHead>
                      <TableHead>Activ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedFixedCosts.map((cost) => (
                      <TableRow key={cost.id}>
                        <TableCell className="font-medium">{cost.name}</TableCell>
                        <TableCell>{cost.category}</TableCell>
                        <TableCell>Ziua {cost.due_day}</TableCell>
                        <TableCell className="tabular-nums">{formatMoney(cost.amount, state.budgetSettings.currency)}</TableCell>
                        <TableCell>
                          <Switch
                            checked={cost.is_active}
                            onCheckedChange={(checked) => updateFixedCost(cost.id, { is_active: Boolean(checked) })}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          {activeView === "goals" ? (
            <Card className="border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle>Obiective</CardTitle>
                <CardDescription>
                  Țintele active reduc bugetul disponibil doar când ai o contribuție lunară setată.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 xl:grid-cols-2">
                  {sortedGoals.map((goal) => {
                    const draft = goalEditState[goal.id] ?? {
                      monthly_contribution: String(goal.monthly_contribution),
                      current_amount: String(goal.current_amount),
                      target_amount: goal.target_amount === null ? "" : String(goal.target_amount),
                    }

                    return (
                      <div key={goal.id} className="space-y-3 rounded-2xl border border-border/60 bg-background/40 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-medium">{goal.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {goal.target_amount === null
                                ? "Seteaza o tinta pentru acest obiectiv."
                                : `${formatMoney(goal.current_amount, state.budgetSettings.currency)} din ${formatMoney(goal.target_amount, state.budgetSettings.currency)}`}
                            </p>
                          </div>
                          <Switch
                            checked={goal.is_active}
                            onCheckedChange={(checked) => updateGoal(goal.id, { is_active: Boolean(checked) })}
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="h-2 rounded-full bg-muted/50">
                            <div
                              className="h-2 rounded-full bg-safe"
                              style={{ width: `${progressWidth(goal.current_amount, goal.target_amount)}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Prioritate {goal.priority}
                          </p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3">
                          <div className="space-y-1">
                            <Label htmlFor={`${goal.id}-current`}>Curent</Label>
                            <Input
                              id={`${goal.id}-current`}
                              type="number"
                              min="0"
                              step="1"
                              value={draft.current_amount}
                              onChange={(event) =>
                                setGoalEditState((current) => ({
                                  ...current,
                                  [goal.id]: { ...draft, current_amount: event.target.value },
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`${goal.id}-target`}>Țintă</Label>
                            <Input
                              id={`${goal.id}-target`}
                              type="number"
                              min="0"
                              step="1"
                              value={draft.target_amount}
                              onChange={(event) =>
                                setGoalEditState((current) => ({
                                  ...current,
                                  [goal.id]: { ...draft, target_amount: event.target.value },
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`${goal.id}-contribution`}>Contribuție</Label>
                            <Input
                              id={`${goal.id}-contribution`}
                              type="number"
                              min="0"
                              step="1"
                              value={draft.monthly_contribution}
                              onChange={(event) =>
                                setGoalEditState((current) => ({
                                  ...current,
                                  [goal.id]: { ...draft, monthly_contribution: event.target.value },
                                }))
                              }
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() => {
                              updateGoal(goal.id, {
                                current_amount: Number(draft.current_amount) || 0,
                                target_amount: draft.target_amount === "" ? null : Number(draft.target_amount) || null,
                                monthly_contribution: Number(draft.monthly_contribution) || 0,
                              })
                              toast.success("Obiectivul a fost actualizat.")
                            }}
                          >
                            Salvează obiectivul
                          </Button>
                          <Button variant="outline" onClick={() => setGoalDraft(goal)}>
                            Reîncarcă valorile
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeView === "purchase-check" ? (
            <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <Card className="border-border/70 bg-card/80">
                <CardHeader>
                  <CardTitle>Verificare achiziție</CardTitle>
                  <CardDescription>
                    Introdu articolul, prețul și categoria. Aplicația calculează direct dacă merită cumpărat acum.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="purchase-item">Nume articol</Label>
                    <Input
                      id="purchase-item"
                      value={purchaseForm.item_name}
                      onChange={(event) =>
                        setPurchaseForm((current) => ({ ...current, item_name: event.target.value }))
                      }
                      placeholder="Ex: baterie auto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchase-price">Preț</Label>
                    <Input
                      id="purchase-price"
                      type="number"
                      min="0"
                      step="1"
                      value={purchaseForm.price}
                      onChange={(event) =>
                        setPurchaseForm((current) => ({ ...current, price: event.target.value }))
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchase-category">Categorie</Label>
                    <Input
                      id="purchase-category"
                      value={purchaseForm.category}
                      onChange={(event) =>
                        setPurchaseForm((current) => ({ ...current, category: event.target.value }))
                      }
                      placeholder="General"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handlePurchaseCheck}>
                      Analizează achiziția
                      <ArrowRight data-icon="inline-end" />
                    </Button>
                    <Button variant="outline" onClick={() => setActiveView("insights")}>
                      Vezi analizele
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/80">
                <CardHeader>
                  <CardTitle>Rezultat recent</CardTitle>
                  <CardDescription>
                    Fiecare verificare se salvează în istoric, împreună cu recomandarea și limitele calculate.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {latestPurchase ? (
                    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{latestPurchase.item_name}</p>
                          <p className="text-xs text-muted-foreground">{latestPurchase.category}</p>
                        </div>
                        <Badge className={badgeClass(statusTone(latestPurchase.result === "recommended" ? "safe" : latestPurchase.result === "caution" ? "caution" : "danger")) as string}>
                          {latestPurchase.result === "recommended"
                            ? "recommended"
                            : latestPurchase.result === "caution"
                              ? "caution"
                              : "not recommended"}
                        </Badge>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl border border-border/60 bg-card/70 p-3">
                          <p className="text-xs text-muted-foreground">Daily limit before</p>
                          <p className="font-medium tabular-nums">{formatMoney(latestPurchase.daily_limit_before, state.budgetSettings.currency)}</p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-card/70 p-3">
                          <p className="text-xs text-muted-foreground">Daily limit after</p>
                          <p className="font-medium tabular-nums">{formatMoney(latestPurchase.daily_limit_after, state.budgetSettings.currency)}</p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-card/70 p-3">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Recommendation</p>
                        <p className="text-lg font-medium">{latestPurchase.recommendation}</p>
                      </div>
                    </div>
                  ) : (
                    emptyState(
                      "Nu există încă verificări.",
                      "Când salvezi prima achiziție, rezultatul și recomandarea apar aici.",
                      <AlertTriangle className="size-5" />,
                    )
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/80 xl:col-span-2">
                <CardHeader>
                  <CardTitle>Istoric de verificări</CardTitle>
                  <CardDescription>Scurtă arhivă pentru deciziile de cumpărare.</CardDescription>
                </CardHeader>
                <CardContent>
                  {state.purchaseChecks.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Articol</TableHead>
                          <TableHead>Categorie</TableHead>
                          <TableHead>Rezultat</TableHead>
                          <TableHead>Recomandare</TableHead>
                          <TableHead className="text-right">Preț</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {state.purchaseChecks.map((check) => (
                          <TableRow key={check.id}>
                            <TableCell className="font-medium">{check.item_name}</TableCell>
                            <TableCell>{check.category}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("capitalize", badgeClass(check.result === "recommended" ? "safe" : check.result === "caution" ? "caution" : "danger"))}>
                                {check.result}
                              </Badge>
                            </TableCell>
                            <TableCell>{check.recommendation}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatMoney(check.price, state.budgetSettings.currency)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Încă nu există istoric de verificări.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          {activeView === "monthly-review" ? (
            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <Card className="border-border/70 bg-card/80">
                <CardHeader>
                  <CardTitle>Revizie lunară</CardTitle>
                  <CardDescription>
                    Vezi dacă luna curentă rămâne în parametri după economii, obiective și costuri fixe.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MetricCard
                      title="Disponibil pentru variabil"
                      value={formatMoney(budget.availableForVariableSpending, state.budgetSettings.currency)}
                      helper="Înainte de tranzacții"
                      icon={Wallet}
                      status={budget.availableForVariableSpending < 0 ? "danger" : budget.availableForVariableSpending < budget.dailySafeLimit * 3 ? "caution" : "safe"}
                    />
                    <MetricCard
                      title="Cheltuit luna aceasta"
                      value={formatMoney(budget.spentThisMonth, state.budgetSettings.currency)}
                      helper="Doar expense"
                      icon={TrendingDown}
                      status={budget.spentThisMonth > 0 ? "caution" : "neutral"}
                    />
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">Mesaj de revizie</p>
                      <Badge className={badgeClass(statusTone(currentStatus)) as string}>{statusText}</Badge>
                    </div>
                    <p className="mt-2 text-base text-foreground">{statusDescription}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Puncte de control</p>
                      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 size-4 text-safe" />
                          Economiile obligatorii sunt rezervate înainte de cheltuieli.
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 size-4 text-safe" />
                          Costurile fixe active sunt incluse în calcul.
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 size-4 text-safe" />
                          Obiectivele active reduc bugetul variabil.
                        </li>
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Recomandare</p>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Dacă bugetul intră în roșu, oprește achizițiile neesențiale și revizuiește costurile fixe active.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/80">
                <CardHeader>
                  <CardTitle>Rezumat lună</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 px-3 py-3">
                    <span>Tranzacții înregistrate</span>
                    <span className="font-medium">{state.transactions.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 px-3 py-3">
                    <span>Verificări achiziții</span>
                    <span className="font-medium">{state.purchaseChecks.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 px-3 py-3">
                    <span>Obiective active</span>
                    <span className="font-medium">{budget.activeGoals.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 px-3 py-3">
                    <span>Costuri fixe active</span>
                    <span className="font-medium">{budget.activeFixedCosts.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {activeView === "calendar-budget" ? (
            <Card className="border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle>Calendar buget</CardTitle>
                <CardDescription>
                  Distribuție simplă pe zile: vezi scadențele fixe și ritmul sigur zilnic pentru luna {monthLabel()}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricCard
                    title="Limita zilnică"
                    value={formatMoney(budget.dailySafeLimit, state.budgetSettings.currency)}
                    helper="Baza pe care te poți sprijini"
                    icon={CalendarDays}
                    status={currentStatus}
                  />
                  <MetricCard
                    title="Zile rămase"
                    value={String(budget.remainingDays)}
                    helper="Până la finalul lunii"
                    icon={Clock3}
                    status="neutral"
                  />
                  <MetricCard
                    title="Cheltuieli fixe"
                    value={formatMoney(budget.fixedCostsTotal, state.budgetSettings.currency)}
                    helper="Active și incluse"
                    icon={Wallet}
                    status="caution"
                  />
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {monthDays.map((day) => {
                    const isToday = day === currentDay
                    const dueCosts = sortedFixedCosts.filter((cost) => cost.is_active && cost.due_day === day)
                    return (
                      <div
                        key={day}
                        className={cn(
                          "min-h-24 rounded-2xl border border-border/60 bg-background/40 p-2",
                          isToday && "border-safe/40 bg-safe/10",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Ziua</span>
                          <span className={cn("text-sm font-medium", isToday && "text-safe")}>{day}</span>
                        </div>
                        <div className="mt-3 space-y-1">
                          {dueCosts.length > 0 ? (
                            dueCosts.map((cost) => (
                              <div key={cost.id} className="rounded-xl border border-safe/20 bg-safe/10 px-2 py-1 text-[11px] text-safe">
                                {cost.name}
                              </div>
                            ))
                          ) : (
                            <p className="text-[11px] text-muted-foreground">Fără scadențe</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeView === "insights" ? (
            <Card className="border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle>Insights</CardTitle>
                <CardDescription>Analize simple, fără grafice false dacă nu există suficiente date.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {budget.expensesThisMonth.length === 0 ? (
                  emptyState(
                    "Nu exista suficiente date pentru analiza.",
                    "Adaugă tranzacții reale ca să apară tendințe, categorii dominante și ritm de cheltuire.",
                    <TrendingUp className="size-5" />,
                  )
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-3">
                      <MetricCard
                        title="Cheltuială medie"
                        value={formatMoney(
                          budget.expensesThisMonth.length > 0
                            ? budget.spentThisMonth / budget.expensesThisMonth.length
                            : 0,
                          state.budgetSettings.currency,
                        )}
                        helper="Media cheltuielilor din luna curentă"
                        icon={Coins}
                        status="caution"
                      />
                      <MetricCard
                        title="Venituri înregistrate"
                        value={formatMoney(budget.totalIncomeThisMonth, state.budgetSettings.currency)}
                        helper="Totalul veniturilor din luna curentă"
                        icon={TrendingUp}
                        status="safe"
                      />
                      <MetricCard
                        title="Categorie dominantă"
                        value={(() => {
                          const totals = budget.expensesThisMonth.reduce<Record<string, number>>((acc, transaction) => {
                            acc[transaction.category] = (acc[transaction.category] ?? 0) + transaction.amount
                            return acc
                          }, {})
                          return Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "General"
                        })()}
                        helper="Pe baza cheltuielilor din luna curentă"
                        icon={Sparkles}
                        status="neutral"
                      />
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                      <p className="text-sm font-medium text-foreground">Observații</p>
                      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 size-4 text-safe" />
                          Ritmul actual al lunii poate fi comparat direct cu limita zilnică.
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 size-4 text-safe" />
                          Dacă apare o categorie repetată, merită urmărită separat în luna următoare.
                        </li>
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : null}

          {activeView === "settings" ? (
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <Card className="border-border/70 bg-card/80">
                <CardHeader>
                  <CardTitle>Setări</CardTitle>
                  <CardDescription>
                    Pregătit pentru autentificare ulterioră. Momentan totul rulează sub owner_id = vlad.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Owner</p>
                    <p className="mt-2 font-medium">vlad</p>
                    <p className="text-sm text-muted-foreground">Toate rândurile din beta folosesc acest identificator.</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Supabase</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Schema este pregătită pentru Postgres, iar clientul este inițializat lazy. Când adaugi cheile de mediu,
                      datele pot fi mutate din starea locală către baza de date.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/80">
                <CardHeader>
                  <CardTitle>Buget de bază</CardTitle>
                  <CardDescription>
                    Modifică economiile obligatorii și moneda fără să schimbi structura aplicației.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2 sm:col-span-1">
                      <Label htmlFor="required-savings">Economii obligatorii</Label>
                      <Input
                        id="required-savings"
                        type="number"
                        min="0"
                        step="1"
                        value={budgetForm.required_savings}
                        onChange={(event) =>
                          setBudgetForm((current) => ({ ...current, required_savings: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-1">
                      <Label htmlFor="currency">Monedă</Label>
                      <Input
                        id="currency"
                        value={budgetForm.currency}
                        onChange={(event) =>
                          setBudgetForm((current) => ({ ...current, currency: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleBudgetSave}>
                      Salvează setările
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setState((current) => ({
                          ...seedFinanceState,
                          budgetSettings: {
                            ...seedFinanceState.budgetSettings,
                            created_at: current.budgetSettings.created_at,
                            updated_at: new Date().toISOString(),
                          },
                        }))
                      }
                    >
                      Resetează la valorile inițiale
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Venitul lunar este colectat din ecranul Venituri.
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  )
}
