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
};

export function KintoneLikeSingleText<T extends FieldValues>({
  rhfMethods,
  label,
  description,
  name,
  required,
}: KintoneLikeSingleTextProps<T>) {
  const {
    register,
    formState: { errors },
  } = rhfMethods;

  return (
    <div className="setting">
      <label className="kintoneplugin-label" htmlFor={name}>
        {label}
        {required && <span className="kintoneplugin-require"> * </span>}
      </label>
      <div className="kintoneplugin-desc">{description}</div>
      <KintoneLikeSingleTextWithoutLabel
        name={name}
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
};
export function KintoneLikeSingleTextWithoutLabel<T extends FieldValues>({
  name,
  register,
  errors,
}: KintoneLikeSingleTextWithoutLabelProps<T>) {
  return (
    <div className="kintoneplugin-input-outer">
      <input
        id={name}
        className="kintoneplugin-input-text"
        type="text"
        {...register(name)}
      />
      <ErrorMessage path={name} errors={errors} />
    </div>
  );
}
