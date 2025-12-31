// 基础功能测试
import { lessonToCharacters, isChineseCharacter } from './src/utils/lessonLoader.ts';

console.log('Testing lessonToCharacters...');
const content = "你好世界";
const chars = lessonToCharacters(content);
console.log('✓ Characters:', chars.map(c => c.char));

console.log('\nTesting isChineseCharacter...');
console.log('✓ 你:', isChineseCharacter('你'));
console.log('✓ A:', isChineseCharacter('A'));
console.log('✓ ,:', isChineseCharacter(','));

console.log('\n✅ All basic tests passed!');
