import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { DAILY_SENTENCES, SENTENCE_TOPICS } from '../content/dailySentences.js';
import { dailySentence, SENTENCE_ANCHOR } from './dailySentence.js';

test('60 unique drafts, seven balanced topics and interleaved order',()=>{
  assert.equal(DAILY_SENTENCES.length,60); assert.equal(new Set(DAILY_SENTENCES.map(s=>s.text)).size,60);
  assert.equal(new Set(DAILY_SENTENCES.map(s=>s.id)).size,60); assert.equal(SENTENCE_TOPICS.length,7);
  for(const topic of SENTENCE_TOPICS)assert.ok([8,9].includes(topic.sentences.length));
  for(let i=1;i<60;i++)assert.notEqual(DAILY_SENTENCES[i].topic,DAILY_SENTENCES[i-1].topic);
  assert.notEqual(DAILY_SENTENCES[59].topic,DAILY_SENTENCES[0].topic);
});
test('Seoul 23:59:59 to 00:00:00 selects next sentence',()=>{
  const before=dailySentence(new Date('2026-10-14T14:59:59Z')),after=dailySentence(new Date('2026-10-14T15:00:00Z'));
  assert.equal(before.day,'2026-10-14');assert.equal(after.day,'2026-10-15');assert.notEqual(before.id,after.id);
  assert.equal((before.index+1)%60,after.index);
});
test('all users/characters, refresh and foreground resampling use the same date rule without storage',()=>{
  const a=dailySentence(new Date('2026-10-14T15:01:00Z'));
  for(let i=0;i<12;i++)assert.deepEqual(dailySentence(new Date('2026-10-15T13:00:00+09:00')),a);
  assert.notEqual(dailySentence(new Date('2026-10-16T00:00:00+09:00')).id,a.id);
});
test('sixty consecutive dates do not repeat; day 61 repeats; pre-anchor dates wrap safely',()=>{
  const start=Date.parse(`${SENTENCE_ANCHOR}T03:00:00Z`);
  const ids=Array.from({length:60},(_,i)=>dailySentence(new Date(start+i*86400000)).id);
  assert.equal(new Set(ids).size,60);assert.equal(dailySentence(new Date(start+60*86400000)).id,ids[0]);
  assert.equal(dailySentence(new Date(start-86400000)).index,59);
});
test('selection is independent of actual device timezone (UTC, Los Angeles, Tokyo)',()=>{
  const url=new URL('./dailySentence.js',import.meta.url).href;
  const script=`import {dailySentence} from ${JSON.stringify(url)}; console.log(JSON.stringify(dailySentence(new Date('2026-10-14T15:00:00Z'))));`;
  const values=['UTC','America/Los_Angeles','Asia/Tokyo'].map(TZ=>execFileSync(process.execPath,['--input-type=module','-e',script],{env:{...process.env,TZ},encoding:'utf8'}).trim());
  assert.equal(new Set(values).size,1);
});
