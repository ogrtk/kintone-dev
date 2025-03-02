import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { ErrorMessage } from "./ErrorMessage";
import "@ogrtk/shared-styles";

type KintoneLikeRadioProps<T extends FieldValues> = {
  rhfMethods: UseFormReturn<T>;
  label: string;
  description: string;
  name: Path<T>;
  options: readonly { code: string; label: string }[];
  required?: boolean;
};

export function KintoneLikeRadio<T extends FieldValues>({
  rhfMethods,
  label,
  description,
  name,
  options,
  required,
}: KintoneLikeRadioProps<T>) {
  const {
    register,
    formState: { errors },
  } = rhfMethods;

  return (
    <div className="setting">
      <p className="kintoneplugin-label">{label}</p>
      {required && <span className="kintoneplugin-require"> * </span>}
      <div className="kintoneplugin-desc">{description}</div>
      <div className="kintoneplugin-input-radio setting">
        {options.map((option) => {
          return (
            <span key={option.code} className="kintoneplugin-input-radio-item">
              <input
                className="kintone-like-input"
                type="radio"
                value={option.code}
                id={`${name}-${option.code}`}
                {...register(name)}
              />
              <label htmlFor={`${name}-${option.code}`}>{option.label}</label>
            </span>
          );
        })}
      </div>
      <ErrorMessage path={name} errors={errors} />
    </div>
  );
}
