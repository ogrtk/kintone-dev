import type {
  FieldValues,
  Path,
  PathValue,
  UseFormReturn,
} from "react-hook-form";
import { ErrorMessage } from "./ErrorMessage";
import "@ogrtk/shared-styles";
import { useEffect } from "react";

type KintoneLikeBooleanCheckBoxProps<
  T extends FieldValues,
  K extends Path<T>,
> = PathValue<T, K> extends boolean
  ? {
      rhfMethods: UseFormReturn<T>;
      label: string;
      description: string;
      checkBoxLabel: string;
      name: K;
      defaultValue?: boolean;
      required?: boolean;
    }
  : never;

export function KintoneLikeBooleanCheckBox<
  T extends FieldValues,
  K extends Path<T>,
>({
  rhfMethods,
  label,
  description,
  checkBoxLabel,
  name,
  defaultValue,
  required,
}: KintoneLikeBooleanCheckBoxProps<T, K>) {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = rhfMethods;

  // React Hook Form の値を監視
  const currentCheckValue = watch(name);

  // 値がrfhに渡されない場合に、初期値を設定する
  useEffect(() => {
    const value = getValues(name);
    if (!value) {
      setValue(name, (defaultValue ?? false) as PathValue<T, K>);
    }
  }, [setValue, getValues, name, defaultValue]);

  return (
    <div className="setting">
      <p className="kintoneplugin-label">
        {label}
        {required && <span className="kintoneplugin-require"> * </span>}
      </p>
      <div className="kintoneplugin-desc">{description}</div>
      <div className="kintoneplugin-input-checkbox">
        <span className="kintoneplugin-input-checkbox-item">
          <input
            id={name}
            type="checkbox"
            checked={currentCheckValue}
            onChange={(e) =>
              setValue(name, e.target.checked as PathValue<T, K>)
            }
          />
          <label htmlFor={name}>{checkBoxLabel}</label>
        </span>
        <input type="hidden" {...register(name)} />
      </div>

      <ErrorMessage path={name} errors={errors} />
    </div>
  );
}
