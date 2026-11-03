import { useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";

let reduced = true;
let generation = 0;
let listener: ReturnType<typeof AccessibilityInfo.addEventListener> | undefined;
const subscribers = new Set<() => void>();
function publish(value: boolean) {
  if (reduced === value) return;
  reduced = value;
  subscribers.forEach((notify) => notify());
}
function subscribe(notify: () => void) {
  subscribers.add(notify);
  if (subscribers.size === 1) {
    const current = ++generation;
    listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      publish,
    );
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (current === generation) publish(value);
      })
      .catch(() => {
        if (current === generation) publish(true);
      });
  }
  return () => {
    subscribers.delete(notify);
    if (!subscribers.size) {
      generation++;
      listener?.remove();
      listener = undefined;
    }
  };
}
const snapshot = () => reduced;
const serverSnapshot = () => true;
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
