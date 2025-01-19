const config = {
  useCase: {
    listSearch: {
      additionalQuery: "query1",
    },
    listRegist: {
      addtionalValues: [{ field: "updateField", value: "value" }],
    },
    listUpdate: {
      additionalQuery: "query1",
      update: [{ field: "updateField", value: "value" }],
    },
    record: {
      space: "space",
    },
  },
  data: {
    dataName: "コード",
    field: "field",
  },
};
