import type {
  FieldErrors,
  FieldValues,
  Path,
  UseFormRegister,
  UseFormReturn,
} from "react-hook-form";
import { ErrorMessage } from "./ErrorMessage";
import "@ogrtk/shared-styles";

type KintoneLikeSingleTextProps<T extends FieldValues> = {
  rhfMethods: UseFormReturn<T>;
  label: string;
  description: string;
  name: Path<T>;
  required?: boolean;
  style?: React.CSSProperties;
};

export function KintoneLikeSingleText<T extends FieldValues>({
  rhfMethods,
  label,
  description,
  name,
  required,
  style,
}: KintoneLikeSingleTextProps<T>) {
  const {
    register,
    formState: { errors },
  } = rhfMethods;

  return (
    <div className="setting">
      <label className="kintoneplugin-label" htmlFor={name}>
        {label}
      </label>
      {required && <span className="kintoneplugin-require"> * </span>}
      <div className="kintoneplugin-desc">{description}</div>
      <KintoneLikeSingleTextWithoutLabel
        name={name}
        style={style}
        register={register}
        errors={errors}
      />
    </div>
  );
}

type KintoneLikeSingleTextWithoutLabelProps<T extends FieldValues> = {
  name: Path<T>;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  style?: React.CSSProperties;
};
export function KintoneLikeSingleTextWithoutLabel<T extends FieldValues>({
  name,
  register,
  errors,
  style,
}: KintoneLikeSingleTextWithoutLabelProps<T>) {
  return (
    <div className="kintoneplugin-input-outer">
      <input
        id={name}
        className="kintoneplugin-input-text kintone-like-input"
        type="text"
        style={style}
        {...register(name)}
      />
      <ErrorMessage path={name} errors={errors} />
    </div>
  );
}
