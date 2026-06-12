import { getSupabaseServerClient } from "@/lib/supabase"
import { seedFinanceState, type FinanceState } from "@/lib/finance"

function asNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0)
}

export async function getInitialFinanceState(): Promise<FinanceState> {
  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return seedFinanceState
  }

  try {
    const ownerId = "vlad"

    const [
      budgetSettingsResult,
      incomeEntriesResult,
      transactionsResult,
      fixedCostsResult,
      goalsResult,
      purchaseChecksResult,
    ] = await Promise.all([
      supabase
        .from("budget_settings")
        .select("*")
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("income_entries")
        .select("*")
        .eq("owner_id", ownerId)
        .order("income_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("transactions")
        .select("*")
        .eq("owner_id", ownerId)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("fixed_costs")
        .select("*")
        .eq("owner_id", ownerId)
        .order("due_day", { ascending: true }),
      supabase
        .from("goals")
        .select("*")
        .eq("owner_id", ownerId)
        .order("priority", { ascending: true }),
      supabase
        .from("purchase_checks")
        .select("*")
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false }),
    ])

    if (
      budgetSettingsResult.error ||
      incomeEntriesResult.error ||
      transactionsResult.error ||
      fixedCostsResult.error ||
      goalsResult.error ||
      purchaseChecksResult.error ||
      !budgetSettingsResult.data?.[0]
    ) {
      return seedFinanceState
    }

    const budgetRow = budgetSettingsResult.data[0] as FinanceState["budgetSettings"]

    return {
      budgetSettings: {
        ...budgetRow,
        required_savings: asNumber(budgetRow.required_savings),
      },
      incomeEntries: (incomeEntriesResult.data?.map((entry) => ({
        ...(entry as Record<string, unknown>),
        amount: asNumber((entry as { amount: unknown }).amount),
      })) ?? []) as FinanceState["incomeEntries"],
      transactions: (transactionsResult.data?.map((transaction) => ({
        ...(transaction as Record<string, unknown>),
        amount: asNumber((transaction as { amount: unknown }).amount),
      })) ?? []) as FinanceState["transactions"],
      fixedCosts: (fixedCostsResult.data?.map((cost) => ({
        ...(cost as Record<string, unknown>),
        amount: asNumber((cost as { amount: unknown }).amount),
      })) ?? []) as FinanceState["fixedCosts"],
      goals: (goalsResult.data?.map((goal) => ({
        ...(goal as Record<string, unknown>),
        target_amount:
          (goal as { target_amount: unknown }).target_amount === null
            ? null
            : asNumber((goal as { target_amount: unknown }).target_amount),
        current_amount: asNumber((goal as { current_amount: unknown }).current_amount),
        monthly_contribution: asNumber((goal as { monthly_contribution: unknown }).monthly_contribution),
      })) ?? []) as FinanceState["goals"],
      purchaseChecks: (purchaseChecksResult.data?.map((check) => ({
        ...(check as Record<string, unknown>),
        price: asNumber((check as { price: unknown }).price),
        daily_limit_before: asNumber((check as { daily_limit_before: unknown }).daily_limit_before),
        daily_limit_after: asNumber((check as { daily_limit_after: unknown }).daily_limit_after),
      })) ?? []) as FinanceState["purchaseChecks"],
    }
  } catch {
    return seedFinanceState
  }
}
