import {test} from 'node:test';
import assert from 'node:assert/strict';
import {highContrastTextColor,textMetrics} from '../src/mobile/textAppearance';

test('larger text preserves body hierarchy and expands each line height with its own size',()=>{
  assert.deepEqual(textMetrics(10,15,true),{fontSize:13,lineHeight:20});
  assert.deepEqual(textMetrics(14,21,true),{fontSize:18,lineHeight:27});
  assert.deepEqual(textMetrics(17,24,true),{fontSize:22,lineHeight:32});
  assert.deepEqual(textMetrics(29,36,true),{fontSize:29,lineHeight:36});
  assert.deepEqual(textMetrics(13,20,false),{fontSize:13,lineHeight:20});
  assert.deepEqual(textMetrics(14,20.5,false),{fontSize:14,lineHeight:20.5});
  assert.deepEqual(textMetrics(13,undefined,true),{fontSize:17});
});
test('high contrast keeps dark text readable on light labels and brightens pond text',()=>{
  assert.equal(highContrastTextColor('#91adae'),'#f3fff5');
  assert.equal(highContrastTextColor('#153438'),'#031014');
  assert.equal(highContrastTextColor('#abc'),'#f3fff5');
  assert.equal(highContrastTextColor('#000'),'#031014');
  assert.equal(highContrastTextColor('white'),'white');
  const dynamic={semantic:['labelColor']};assert.equal(highContrastTextColor(dynamic),dynamic);
});
