(() => {
  const TARGET_FIELD_CD = "targetFieldCode";

  fb.events.form.mounted = [
    (state) => {
      const uuid = self.crypto.randomUUID();
      state.record[TARGET_FIELD_CD].value = uuid;

      return state;
    },
  ];
})();
