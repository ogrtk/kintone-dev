(() => {
  const TARGET_FIELD_CD = "targetFieldCd";

  formBridge.events.on("form.show", (context) => {
    const uuid = self.crypto.randomUUID();
    context.setFieldValue(TARGET_FIELD_CD, uuid);
  });
})();
