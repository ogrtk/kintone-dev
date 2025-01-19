import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { ErrorMessage } from "./ErrorMessage";
import "@ogrtk/shared-styles";

type KintoneLikeCheckBoxProps<T extends FieldValues> = {
  rhfMethods: UseFormReturn<T>;
  label: string;
  description: string;
  name: Path<T>;
  options: readonly { code: string; label: string }[];
  noSpecifyValue?: boolean;
  required?: boolean;
};

export function KintoneLikeCheckBox<T extends FieldValues>({
  rhfMethods,
  label,
  description,
  name,
  options,
  noSpecifyValue = false,
  required,
}: KintoneLikeCheckBoxProps<T>) {
  const {
    register,
    formState: { errors },
  } = rhfMethods;

  return (
    <div className="setting">
      <p className="kintoneplugin-label">
        {label}
        {required && <span className="kintoneplugin-require"> * </span>}
      </p>
      <div className="kintoneplugin-desc">{description}</div>
      {options.map((option) => {
        return (
          <div key={option.code} className="kintoneplugin-input-checkbox">
            <span className="kintoneplugin-input-checkbox-item">
              <input
                type="checkbox"
                value={noSpecifyValue ? undefined : option.code}
                id={`${name}-${option.code}`}
                {...register(name)}
              />
              <label htmlFor={`${name}-${option.code}`}>{option.label}</label>
            </span>
          </div>
        );
      })}
      <ErrorMessage path={name} errors={errors} />
    </div>
  );
}
