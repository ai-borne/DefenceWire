/**
 * Custom stylelint rule: dw/flex-child-shrink-guard
 *
 * Prevents the class of bug fixed in the mobile nav-bar crush: a rule that
 * sets white-space: nowrap together with a non-zero min-width or min-height
 * is exactly the shape of a flex-row item (tab, pill, badge, chip) meant to
 * keep its label on one line. An explicit min-width/min-height disables the
 * browser's automatic min-content floor, so a flex parent's default
 * flex-shrink: 1 can shrink the box below its text's natural width — the
 * nowrap text then overflows into neighboring items instead of the row
 * scrolling.
 *
 * Requires either flex-shrink: 0 (or a flex shorthand whose shrink term is 0)
 * or overflow: hidden (an accepted alternative — truncates instead of
 * spilling) on any rule that combines white-space: nowrap with a non-zero
 * min-width or min-height.
 */

import stylelint from 'stylelint';

const ruleName = 'dw/flex-child-shrink-guard';
const messages = stylelint.utils.ruleMessages(ruleName, {
  expected: () =>
    'Rule sets white-space:nowrap with a non-zero min-width/min-height but has neither flex-shrink:0 ' +
    '(or flex:...0...) nor overflow:hidden. Without one of those, a flex parent can shrink this element ' +
    'below its min-size and the nowrap text will overflow into neighboring items instead of the row scrolling.'
});

function isNonZeroLength(value) {
  return value.trim() !== '0' && value.trim() !== '0px';
}

function hasZeroShrink(decls) {
  return decls.some((decl) => {
    if (decl.prop.toLowerCase() === 'flex-shrink') {
      return decl.value.trim() === '0';
    }
    if (decl.prop.toLowerCase() === 'flex') {
      // flex: <grow> <shrink> <basis> — second token is shrink.
      const parts = decl.value.trim().split(/\s+/);
      return parts[1] === '0';
    }
    return false;
  });
}

const dwFlexChildShrinkGuard = (enabled) => {
  return (root, result) => {
    if (!enabled) return;

    root.walkRules((rule) => {
      const decls = rule.nodes ? rule.nodes.filter((n) => n.type === 'decl') : [];

      const isNowrap = decls.some(
        (d) => d.prop.toLowerCase() === 'white-space' && d.value.trim() === 'nowrap'
      );
      if (!isNowrap) return;

      const hasPinnedMinSize = decls.some(
        (d) =>
          ['min-width', 'min-height'].includes(d.prop.toLowerCase()) &&
          isNonZeroLength(d.value)
      );
      if (!hasPinnedMinSize) return;

      const hasOverflowHidden = decls.some(
        (d) => d.prop.toLowerCase() === 'overflow' && d.value.trim() === 'hidden'
      );
      if (hasOverflowHidden) return;

      if (hasZeroShrink(decls)) return;

      stylelint.utils.report({
        message: messages.expected(),
        node: rule,
        result,
        ruleName
      });
    });
  };
};

export default stylelint.createPlugin(ruleName, dwFlexChildShrinkGuard);
