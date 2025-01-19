import {
  type ArrayPath,
  type FieldArrayPathValue,
  type FieldValues,
  type Path,
  type PathValue,
  type UseFormReturn,
  useFieldArray,
} from "react-hook-form";
// TODO: テーブル全体のエラー表示
import { ErrorMessage } from "./ErrorMessage";
import "@ogrtk/shared-styles";
import { useEffect, useRef } from "react";
import { KintoneLikeSelectWithoutLabel } from "./KintoneLikeSelect";
import { KintoneLikeSingleTextWithoutLabel } from "./KintoneLikeSingleText";

type FieldMetaBase = {
  key: string;
  label: string;
  required?: boolean;
};

type FieldMetaSingleText = {
  type: "singletext";
} & FieldMetaBase;

type FieldMetaSelect = {
  type: "select";
  options: { code: string; label: string }[];
} & FieldMetaBase;

type FieldMeta = FieldMetaSingleText | FieldMetaSelect;

type KintoneLikeTableProps<T extends FieldValues, K extends ArrayPath<T>> = {
  rhfMethods: UseFormReturn<T>;
  label: string;
  description: string;
  name: K;
  fieldMetas: FieldMeta[];
  defaultValue: Exclude<FieldArrayPathValue<T, K>, undefined>[number];
  visible?: boolean;
  required?: boolean;
};

export function KintoneLikeTable<
  T extends FieldValues,
  K extends ArrayPath<T>,
>({
  rhfMethods,
  label,
  description,
  name,
  fieldMetas,
  defaultValue,
  visible = true,
  required,
}: KintoneLikeTableProps<T, K>) {
  const preservedRef = useRef<PathValue<T, K> | undefined>(undefined);
  const {
    register,
    formState: { errors },
    control,
    getValues,
    setValue,
  } = rhfMethods;
  const { fields, append, remove } = useFieldArray<T>({
    control,
    name: name,
  });

  if (visible && fields.length === 0) {
    append(defaultValue);
  }

  useEffect(() => {
    if (visible) {
      console.log("open");

      setValue(name as Path<T>, preservedRef.current as PathValue<T, Path<T>>);
      console.log(getValues(name as Path<T>));
    } else {
      console.log("closed");

      preservedRef.current = getValues(name as Path<T>);
      setValue(name as Path<T>, undefined as PathValue<T, Path<T>>);
      console.log(getValues(name as Path<T>));
    }
  }, [visible, name, setValue, getValues]);

  return (
    <>
      <div className="setting" style={{ display: visible ? "block" : "none" }}>
        <label className="kintoneplugin-label" htmlFor={name}>
          {label}
          {required && <span className="kintoneplugin-require"> * </span>}
        </label>
        <div className="kintoneplugin-desc">{description}</div>

        <table className="kintoneplugin-table">
          <thead>
            <tr>
              {fieldMetas.map((fieldMeta) => (
                <>
                  <th key={fieldMeta.key} className="kintoneplugin-table-th">
                    <span className="title">{fieldMeta.label}</span>
                  </th>
                </>
              ))}
              <th className="kintoneplugin-table-th-blankspace" />
            </tr>
          </thead>
          <tbody>
            {fields.map((fieldObj, index) => (
              <tr key={fieldObj.id}>
                {Object.keys(fieldObj)
                  .filter((key) => key !== "id")
                  .map((key) => {
                    const fieldMeta = fieldMetas.find(
                      (meta) => meta.key === key,
                    );
                    if (!fieldMeta)
                      throw new Error(
                        `項目のメタデータが設定されていません:${key}`,
                      );
                    switch (fieldMeta.type) {
                      case "singletext":
                        return (
                          <td key={key}>
                            <div className="kintoneplugin-table-td-control">
                              <div className="kintoneplugin-table-td-control-value">
                                <KintoneLikeSingleTextWithoutLabel
                                  name={`${name}.${index}.${key}` as Path<T>}
                                  register={register}
                                  errors={errors}
                                />
                              </div>
                            </div>
                          </td>
                        );
                      case "select":
                        return (
                          <td key={key}>
                            <div className="kintoneplugin-table-td-control">
                              <div className="kintoneplugin-table-td-control-value">
                                <KintoneLikeSelectWithoutLabel
                                  name={`${name}.${index}.${key}` as Path<T>}
                                  options={fieldMeta.options}
                                  register={register}
                                  errors={errors}
                                />
                              </div>
                            </div>
                          </td>
                        );
                      default:
                        //TODO:
                        return <></>;
                    }
                  })}
                <td className="kintoneplugin-table-td-operation">
                  <button
                    className="kintoneplugin-button-remove-row-image"
                    title="Delete this row"
                    type="button"
                    onClick={() => remove(index)}
                  />

                  {index === fields.length - 1 && (
                    <button
                      className="kintoneplugin-button-add-row-image"
                      title="Add row"
                      type="button"
                      onClick={() => append([defaultValue])}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
