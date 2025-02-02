/**
 * kintoneアプリのレコードを表す型
 */
export type KintoneRecord = {
  [fieldCode: string]: {
    value: unknown;
  };
};

type RecordUrlBase = {
  app: number;
};
type RecordUrlShow = RecordUrlBase & {
  mode: "show";
  recordId: string;
};
type RecordUrlEdit = RecordUrlBase & {
  mode: "edit";
  recordId: string;
};
type RecordUrlAdd = RecordUrlBase & {
  mode: "add";
};
type RecordUrlParam = RecordUrlShow | RecordUrlEdit | RecordUrlAdd;
export function getRecordUrl(param: RecordUrlParam): string {
  const common = `${location.origin}/k/${param.app}/`;

  switch (param.mode) {
    case "show":
      return `${common}show#record=${param.recordId}`;
    case "edit":
      return `${common}show#record=${param.recordId}&mode=edit`;
    case "add":
      return `${common}edit`;
  }
}
