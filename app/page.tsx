import { LingbotAppLoader } from "./LingbotAppLoader";
import { SetupRequired } from "./SetupRequired";

export const dynamic = "force-dynamic";

export default function Page() {
  const hasKey = !!process.env.REACTOR_API_KEY;
  return hasKey ? <LingbotAppLoader /> : <SetupRequired />;
}
