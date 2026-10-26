import { useReducedMotion as useFramerReducedMotion } from "framer-motion";

export function useReducedMotion(): boolean {
  const shouldReduce = useFramerReducedMotion();
  return Boolean(shouldReduce);
}
