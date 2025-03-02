import type {
  FieldValues,
  Path,
  PathValue,
  UseFormReturn,
} from "react-hook-form";
import { ErrorMessage } from "./ErrorMessage";
import "@ogrtk/shared-styles";
import { useEffect } from "react";

type BooleanKeys<T> = {
  [K in Path<T>]: PathValue<T, K> extends boolean ? K : never;
}[Path<T>];

type KintoneLikeBooleanCheckBoxProps<
  T extends FieldValues,
  K extends BooleanKeys<T>,
> = {
  rhfMethods: UseFormReturn<T>;
  label: string;
  description: string;
  checkBoxLabel: string;
  name: K;
  defaultValue?: boolean;
  required?: boolean;
};

export function KintoneLikeBooleanCheckBox<
  T extends FieldValues,
  K extends BooleanKeys<T>,
>({
  rhfMethods,
  label,
  description,
  checkBoxLabel,
  name,
  defaultValue,
  required,
}: KintoneLikeBooleanCheckBoxProps<T, K>) {
  return (
    <div className="setting">
      <p className="kintoneplugin-label kintone-like-checkbox-group">{label}</p>
      {required && <span className="kintoneplugin-require"> * </span>}
      <div className="kintoneplugin-desc">{description}</div>
      <KintoneLikeBooleanCheckBoxWithoutLabel
        rhfMethods={rhfMethods}
        checkBoxLabel={checkBoxLabel}
        name={name}
        defaultValue={defaultValue}
      />
    </div>
  );
}

type KintoneLikeBooleanCheckBoxWithoutLabelProps<
  T extends FieldValues,
  K extends BooleanKeys<T>,
> = {
  rhfMethods: UseFormReturn<T>;
  checkBoxLabel: string;
  name: K;
  defaultValue?: boolean;
};

export function KintoneLikeBooleanCheckBoxWithoutLabel<
  T extends FieldValues,
  K extends BooleanKeys<T>,
>({
  rhfMethods,
  checkBoxLabel,
  name,
  defaultValue,
}: KintoneLikeBooleanCheckBoxWithoutLabelProps<T, K>) {
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
      setValue(
        name,
        (defaultValue !== undefined ? defaultValue : false) as PathValue<T, K>,
      );
    }
  }, [setValue, getValues, name, defaultValue]);

  return (
    <div className="kintoneplugin-input-checkbox">
      <span className="kintoneplugin-input-checkbox-item">
        <input
          id={name}
          className="kintone-like-input"
          type="checkbox"
          checked={currentCheckValue}
          onChange={(e) => setValue(name, e.target.checked as PathValue<T, K>)}
        />
        <label htmlFor={name}>{checkBoxLabel}</label>
      </span>
      <input type="hidden" {...register(name)} />
      <ErrorMessage path={name} errors={errors} />
    </div>
  );
}
