import { useEffect, useState } from "react";
import { getHealth } from "../services/analyze";
import type { HealthStatus } from "../types/extraction";

export function useHealth(): HealthStatus | null {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    let active = true;
    getHealth().then((result) => {
      if (active) setHealth(result);
    });
    return () => {
      active = false;
    };
  }, []);

  return health;
}
