const FONT_LINE_HEIGHT_RATIOS = {
  regular: 2444 / 2048,
  medium: 2444 / 2048,
  semiBold: 2444 / 2048,
  bold: 2444 / 2048,
  extraBold: 2444 / 2048,
  gothicA1Regular: 1616 / 1024,
  gothicA1SemiBold: 1616 / 1024,
  gothicA1Bold: 1616 / 1024,
  gothicA1ExtraBold: 1616 / 1024,
  giantsRegular: 1410 / 1000,
};

function findProperty(node, propertyName) {
  return node.properties.find(
    (property) =>
      property.type === "Property" &&
      !property.computed &&
      property.key.type === "Identifier" &&
      property.key.name === propertyName
  );
}

function getFontFamilyName(node) {
  if (
    node.type !== "MemberExpression" ||
    node.computed ||
    node.object.type !== "Identifier" ||
    node.object.name !== "fontFamilies" ||
    node.property.type !== "Identifier"
  ) {
    return null;
  }

  return node.property.name;
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent custom-font line heights that clip the font's vertical metrics",
    },
    messages: {
      dynamicLineHeight:
        "Custom-font line heights must use getSafeLineHeight() when they cannot be checked statically.",
      unsafeLineHeight:
        "{{fontFamily}} at {{fontSize}}px needs a line height of at least {{minimumLineHeight}}px. Use getSafeLineHeight() so the text cannot be clipped.",
    },
    schema: [],
  },

  create(context) {
    return {
      ObjectExpression(node) {
        const fontFamilyProperty = findProperty(node, "fontFamily");
        const fontSizeProperty = findProperty(node, "fontSize");
        const lineHeightProperty = findProperty(node, "lineHeight");

        if (!fontFamilyProperty || !fontSizeProperty || !lineHeightProperty) {
          return;
        }

        const fontFamily = getFontFamilyName(fontFamilyProperty.value);
        const usesSafeLineHeight =
          lineHeightProperty.value.type === "CallExpression" &&
          lineHeightProperty.value.callee.type === "Identifier" &&
          lineHeightProperty.value.callee.name === "getSafeLineHeight";
        const fontSize = fontSizeProperty.value.value;
        const lineHeight = lineHeightProperty.value.value;
        const ratio = fontFamily ? FONT_LINE_HEIGHT_RATIOS[fontFamily] : null;

        if (!ratio || usesSafeLineHeight) {
          return;
        }

        if (typeof fontSize !== "number" || typeof lineHeight !== "number") {
          context.report({
            node: lineHeightProperty.value,
            messageId: "dynamicLineHeight",
          });
          return;
        }

        const minimumLineHeight = Math.ceil(fontSize * ratio);

        if (lineHeight < minimumLineHeight) {
          context.report({
            node: lineHeightProperty.value,
            messageId: "unsafeLineHeight",
            data: {
              fontFamily: `fontFamilies.${fontFamily}`,
              fontSize,
              minimumLineHeight,
            },
          });
        }
      },
    };
  },
};
