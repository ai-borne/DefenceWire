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

/** @param {string} value */
function isNonZeroLength(value) {
  return value.trim() !== '0' && value.trim() !== '0px';
}

/** @param {any[]} decls postcss Declaration nodes (stylelint's postcss types aren't imported here) */
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

/** @param {boolean} enabled */
const dwFlexChildShrinkGuard = (enabled) => {
  /**
   * @param {any} root postcss Root
   * @param {any} result stylelint Result
   */
  return (root, result) => {
    if (!enabled) return;

    root.walkRules((/** @type {any} */ rule) => {
      const decls = rule.nodes ? rule.nodes.filter((/** @type {any} */ n) => n.type === 'decl') : [];

      const isNowrap = decls.some(
        (/** @type {any} */ d) => d.prop.toLowerCase() === 'white-space' && d.value.trim() === 'nowrap'
      );
      if (!isNowrap) return;

      const hasPinnedMinSize = decls.some(
        (/** @type {any} */ d) =>
          ['min-width', 'min-height'].includes(d.prop.toLowerCase()) &&
          isNonZeroLength(d.value)
      );
      if (!hasPinnedMinSize) return;

      const hasOverflowHidden = decls.some(
        (/** @type {any} */ d) => d.prop.toLowerCase() === 'overflow' && d.value.trim() === 'hidden'
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

// @ts-expect-error — stylelint's real runtime API accepts a plain rule
// function here (the documented plugin pattern this follows); the
// installed @types/stylelint's Rule<> signature doesn't reflect that.
export default stylelint.createPlugin(ruleName, dwFlexChildShrinkGuard);
