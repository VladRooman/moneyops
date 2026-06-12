import { AppShell } from "@/components/app-shell"
import { getInitialFinanceState } from "@/lib/finance-data"

export default async function Page() {
  const initialState = await getInitialFinanceState()
  return <AppShell initialState={initialState} />
}
