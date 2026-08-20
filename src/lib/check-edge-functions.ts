/**
 * Quick diagnostic to check if critical edge functions are deployed.
 * Call once on app load and log the result so developers can see it.
 */
import { supabase } from "@/integrations/supabase/client";

const CRITICAL_FUNCTIONS = ["crop-doctor", "kisan-chat", "weather", "mandi-prices"];

export async function checkEdgeFunctions(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  await Promise.all(
    CRITICAL_FUNCTIONS.map(async (fn) => {
      try {
        const { error } = await supabase.functions.invoke(fn, {
          body: { _health: true },
        });
        // If we get ANY response (even 400/401/500), the function exists.
        // A 404 or network error means it's not deployed.
        if (error) {
          const msg = String(error?.message || error || "");
          results[fn] = !msg.includes("not found") && !msg.includes("Failed to send") && !msg.includes("temporary");
        } else {
          results[fn] = true;
        }
      } catch {
        results[fn] = false;
      }
    })
  );

  const missing = Object.entries(results)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);

  if (missing.length > 0) {
    console.error(
      `[AgriConnect] Edge functions NOT deployed: ${missing.join(", ")}. ` +
      `Run: npx supabase functions deploy ${missing.join(" ")}`
    );
  } else {
    console.log("[AgriConnect] All critical edge functions are deployed.");
  }

  return results;
}
