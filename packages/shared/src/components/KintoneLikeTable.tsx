import {
  type ArrayPath,
  type FieldArrayPathValue,
  type FieldValues,
  type Path,
  type UseFormReturn,
  useFieldArray,
} from "react-hook-form";
// TODO: テーブル全体のエラー表示
import { ErrorMessage } from "./ErrorMessage";
import "../index.css";
import type React from "react";
import { Fragment, useEffect } from "react";
import { KintoneLikeSelectWithoutLabel } from "./KintoneLikeSelect";
import { KintoneLikeSingleTextWithoutLabel } from "./KintoneLikeSingleText";

type FieldMetaBase = {
  key: string;
  label: string;
  required?: boolean;
  style?: React.CSSProperties;
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
  required,
}: KintoneLikeTableProps<T, K>) {
  const {
    register,
    formState: { errors },
    control,
  } = rhfMethods;
  const { fields, append, remove } = useFieldArray<T>({
    control,
    name: name,
  });

  // if (fields.length === 0) {
  //   append([defaultValue]);
  // }

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (fields.length === 0) {
      append([defaultValue]);
    }
  }, []);

  return (
    <div className="setting">
      {/* biome-ignore lint/a11y/noLabelWithoutControl: label by aria */}
      <label id={name} className="kintoneplugin-label">
        {label}
      </label>
      {required && <span className="kintoneplugin-require"> * </span>}
      <div className="kintoneplugin-desc">{description}</div>

      <table aria-labelledby={name} className="kintoneplugin-table">
        <thead>
          <tr>
            {fieldMetas.map((fieldMeta) => (
              <Fragment key={fieldMeta.key}>
                <th key={fieldMeta.key} className="kintoneplugin-table-th">
                  <span className="title">{fieldMeta.label}</span>
                </th>
              </Fragment>
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
                  const fieldMeta = fieldMetas.find((meta) => meta.key === key);
                  if (!fieldMeta)
                    throw new Error(
                      `項目のメタデータが設定されていません:${key}`,
                    );
                  switch (fieldMeta.type) {
                    case "singletext":
                      return (
                        <td key={`${key}-${fieldObj.id}`}>
                          <div className="kintoneplugin-table-td-control">
                            <div className="kintoneplugin-table-td-control-value">
                              <KintoneLikeSingleTextWithoutLabel
                                name={`${name}.${index}.${key}` as Path<T>}
                                register={register}
                                errors={errors}
                                style={fieldMeta.style}
                              />
                            </div>
                          </div>
                        </td>
                      );
                    case "select":
                      return (
                        <td key={`${key}-${fieldObj.id}`}>
                          <div className="kintoneplugin-table-td-control">
                            <div className="kintoneplugin-table-td-control-value">
                              <KintoneLikeSelectWithoutLabel
                                name={`${name}.${index}.${key}` as Path<T>}
                                options={fieldMeta.options}
                                register={register}
                                errors={errors}
                                style={fieldMeta.style}
                              />
                            </div>
                          </div>
                        </td>
                      );
                    default:
                      //TODO: 他種類のコンポーネント追加
                      return <div key={key} />;
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
  );
}
