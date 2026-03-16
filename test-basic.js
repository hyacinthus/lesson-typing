// 基础功能测试
import { lessonToCharacters, isCJKCharacter } from './src/utils/lessonLoader.ts';

console.log('Testing lessonToCharacters...');
const content = "你好世界";
const chars = lessonToCharacters(content);
console.log('✓ Characters:', chars.map(c => c.char));

console.log('\nTesting isCJKCharacter...');
console.log('✓ 你:', isCJKCharacter('你'));
console.log('✓ A:', isCJKCharacter('A'));
console.log('✓ ,:', isCJKCharacter(','));

console.log('\n✅ All basic tests passed!');
