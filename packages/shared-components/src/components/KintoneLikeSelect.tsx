import type {
  FieldErrors,
  FieldValues,
  Path,
  UseFormRegister,
  UseFormReturn,
} from "react-hook-form";
import { ErrorMessage } from "./ErrorMessage";
import "@ogrtk/shared-styles";

type KintoneLikeSelectProps<T extends FieldValues> = {
  rhfMethods: UseFormReturn<T>;
  label: string;
  description: string;
  name: Path<T>;
  options: { code: string; label: string }[];
  required?: boolean;
  style?: React.CSSProperties;
};

export function KintoneLikeSelect<T extends FieldValues>({
  rhfMethods,
  label,
  description,
  name,
  options,
  required,
  style,
}: KintoneLikeSelectProps<T>) {
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
      <KintoneLikeSelectWithoutLabel
        name={name}
        options={options}
        register={register}
        errors={errors}
        style={style}
      />
    </div>
  );
}

type KintoneLikeSelectWithoutLabelProps<T extends FieldValues> = {
  name: Path<T>;
  options: { code: string; label: string }[];
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  style?: React.CSSProperties;
};

export function KintoneLikeSelectWithoutLabel<T extends FieldValues>({
  name,
  options,
  register,
  errors,
  style,
}: KintoneLikeSelectWithoutLabelProps<T>) {
  return (
    <div className="kintoneplugin-select-outer">
      <div className="kintoneplugin-select">
        <select {...register(name)} id={name} style={style}>
          {options.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <ErrorMessage path={name} errors={errors} />
    </div>
  );
}
