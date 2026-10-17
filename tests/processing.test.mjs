import test from 'node:test';
import assert from 'node:assert/strict';
await import('../processing.js');
const { normalized, validateParameters, processImage } = globalThis.LabProcessing;
test('display normalization preserves sign and scales magnitude without saturation', () => {
  assert.deepEqual([...normalized(new Float32Array([0,300,600])).pixels],[0,128,255]);
  assert.deepEqual([...normalized(new Float32Array([-100,0,100]),true).pixels],[0,128,255]);
  assert.deepEqual([...normalized(new Float32Array([0,0,0])).pixels],[0,0,0]);
  assert.deepEqual([...normalized(new Float32Array([0,0,0]),true).pixels],[128,128,128]);
});
test('all supported blur settings and gradient threshold range are accepted', () => {
  for(const blur of [0,3,5,7])validateParameters({blur,low:0,high:1020});
  validateParameters({blur:3,low:100,high:200});
});
test('invalid parameters and oversized or malformed image buffers fail before OpenCV allocation', () => {
  for(const parameters of [{blur:2,low:100,high:200},{blur:3,low:300,high:200},{blur:3,low:-1,high:200},{blur:3,low:100,high:1021},{blur:3,low:1.5,high:200}])assert.throws(()=>validateParameters(parameters));
  assert.throws(()=>processImage(null,new Uint8Array(0),6001,1000,{blur:3,low:100,high:200}));
  assert.throws(()=>processImage(null,new Uint8Array(2),2,2,{blur:3,low:100,high:200}));
});
