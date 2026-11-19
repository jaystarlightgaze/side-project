import { redirect } from "next/navigation";

import { EntryRedirect } from "@/app/_flow/entry-redirect";
import { loadAccount } from "@/app/_flow/load-account";

/** "/" only decides where to go; it never stays in the history. */
export default async function Home() {
  const { account } = await loadAccount();
  if (account) redirect(account.input ? "/today" : "/setup");
  return <EntryRedirect />;
}
