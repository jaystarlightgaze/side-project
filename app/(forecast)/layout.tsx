import { ForecastFlowProvider } from "@/app/_flow/flow";
import { loadAccount } from "@/app/_flow/load-account";

export default async function ForecastLayout({ children }: LayoutProps<"/">) {
  const { userId, account } = await loadAccount();
  return (
    // Remount on sign-in/out so one account's forecast never stays on screen for another.
    <ForecastFlowProvider key={userId ?? "signed-out"} account={account}>
      {children}
    </ForecastFlowProvider>
  );
}
