import { useState, useEffect } from "react";
import { Observable } from "rxjs";

export default function UseObservable<TValue>(value$: Observable<TValue>, defaultValue: TValue) {
  const [value, setValue] = useState<TValue>(defaultValue);

  useEffect(() => {
    const subscription = value$.subscribe(setValue);

    return () => {
      subscription.unsubscribe();
    };
  }, [value$]);

  return value;
}
