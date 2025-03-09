import type {
  FieldError,
  FieldErrors,
  FieldValues,
  Path,
} from "react-hook-form";
import "../index.css";

type ErrorMessageProps<T extends FieldValues> = {
  path: Path<T>;
  errors: FieldErrors<T>;
};

export function ErrorMessage<T extends FieldValues>({
  path,
  errors,
}: ErrorMessageProps<T>) {
  // エラーメッセージを取得
  const errorMessage = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, errors) as FieldError | undefined;

  return errorMessage?.message ? (
    <p className="kintoneplugin-alert">{errorMessage.message}</p>
  ) : null;
}
