import { useEffect } from "react";

export function UseEffectErrorAsyncChild({
  func,
}: { func: (str: string) => void | Promise<void> }) {
  useEffect(() => {
    func("child");
  }, [func]);
  return <div>sample</div>;
}
