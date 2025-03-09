import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { ErrorMessage } from "./ErrorMessage";
import "../index.css";

type KintoneLikeCheckBoxProps<T extends FieldValues> = {
  rhfMethods: UseFormReturn<T>;
  label: string;
  description: string;
  name: Path<T>;
  options: readonly { code: string; label: string }[];
  required?: boolean;
};

export function KintoneLikeCheckBox<T extends FieldValues>({
  rhfMethods,
  label,
  description,
  name,
  options,
  required,
}: KintoneLikeCheckBoxProps<T>) {
  return (
    <div className="setting">
      <p className="kintoneplugin-label kintone-like-checkbox-group-label">
        {label}
      </p>
      {required && <span className="kintoneplugin-require"> * </span>}
      <div className="kintoneplugin-desc">{description}</div>
      <KintoneLikeCheckBoxWithoutLabel
        name={name}
        options={options}
        rhfMethods={rhfMethods}
      />
    </div>
  );
}

type KintoneLikeCheckBoxWithoutLabelProps<T extends FieldValues> = {
  rhfMethods: UseFormReturn<T>;
  name: Path<T>;
  options: readonly { code: string; label: string }[];
};

export function KintoneLikeCheckBoxWithoutLabel<T extends FieldValues>({
  rhfMethods,
  name,
  options,
}: KintoneLikeCheckBoxWithoutLabelProps<T>) {
  const {
    register,
    formState: { errors },
  } = rhfMethods;
  return (
    <div className="setting kintone-like-checkbox-group">
      {options.map((option) => {
        return (
          <div key={option.code} className="kintoneplugin-input-checkbox">
            <span className="kintoneplugin-input-checkbox-item">
              <input
                className="kintone-like-input"
                type="checkbox"
                value={option.code}
                id={`${name}-${option.code}`}
                {...register(name)}
              />
              <label
                className="kintone-like-input-label"
                htmlFor={`${name}-${option.code}`}
              >
                {option.label}
              </label>
            </span>
          </div>
        );
      })}
      <ErrorMessage path={name} errors={errors} />
    </div>
  );
}
