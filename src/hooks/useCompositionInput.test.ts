import { shouldMaintainTypingFocus } from './useCompositionInput.ts';

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error('❌ ' + message);
        process.exit(1);
    }
}

console.log('Running tests for shouldMaintainTypingFocus...');

const ignoreTarget = {
    closest: (selector: string) =>
        selector === '[data-typing-focus-ignore="true"]' ? {} : null,
};

const inputTarget = {
    closest: (selector: string) =>
        selector === 'input, textarea, select, [contenteditable]' ? {} : null,
};

const dialogTarget = {
    closest: (selector: string) =>
        selector === '[role="dialog"], [role="alertdialog"]' ? {} : null,
};

const dropdownTarget = {
    closest: (selector: string) =>
        selector === '[role="menu"], [data-radix-popper-content-wrapper]' ? {} : null,
};

const normalTarget = {
    closest: () => null,
};

assert(
    shouldMaintainTypingFocus(ignoreTarget as unknown as EventTarget) === false,
    'shouldMaintainTypingFocus should return false for ignored target'
);
assert(
    shouldMaintainTypingFocus(inputTarget as unknown as EventTarget) === false,
    'shouldMaintainTypingFocus should return false for input target'
);
assert(
    shouldMaintainTypingFocus(dialogTarget as unknown as EventTarget) === false,
    'shouldMaintainTypingFocus should return false for dialog target'
);
assert(
    shouldMaintainTypingFocus(dropdownTarget as unknown as EventTarget) === false,
    'shouldMaintainTypingFocus should return false for dropdown target'
);
assert(
    shouldMaintainTypingFocus(normalTarget as unknown as EventTarget) === true,
    'shouldMaintainTypingFocus should return true for normal target'
);
assert(
    shouldMaintainTypingFocus(null) === true,
    'shouldMaintainTypingFocus should return true for null target'
);

console.log('\n✅ All shouldMaintainTypingFocus tests passed!');
