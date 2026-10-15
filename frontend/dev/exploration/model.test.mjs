import test from 'node:test';
import assert from 'node:assert/strict';
import { PLACES, POLICY, arrival, confirmVisit, claimExample, emptyState, pointAt } from './model.mjs';
const now=100000, place=PLACES[0];
const fixes=[{...place,timestamp:now-1000,accuracy:8},{...place,timestamp:now,accuracy:8}];
test('manual arrival needs two recent, accurate, distinct measurements inside radius',()=>{
 assert(arrival(place,fixes,now).ok);
 for(const bad of [fixes.slice(0,1),fixes.map(f=>({...f,accuracy:120})),fixes.map(f=>({...f,timestamp:f.timestamp-60000})),fixes.map(f=>({...f,x:place.x+POLICY.radius+1})),fixes.map(f=>({...f,timestamp:now})),fixes.map(f=>({...f,x:NaN}))])assert.equal(arrival(place,bad,now).ok,false);
});
test('confirm and claim are separate, one-time transitions without real game rewards',()=>{
 const start=emptyState();assert.strictEqual(claimExample(start,place),start);
 const visited=confirmVisit(start,place,fixes,now);assert(visited.visits[place.id]);assert.deepEqual(visited.claims,{});
 assert.strictEqual(confirmVisit(visited,place,fixes,now),visited);
 const claimed=claimExample(visited,place);assert(claimed.claims[place.id]);assert.strictEqual(claimExample(claimed,place),claimed);
 assert.deepEqual(Object.keys(claimed).sort(),['claims','notes','visits']);
});
test('same fictional route and sample places are shared across all three designs',()=>{
 assert.deepEqual(pointAt(1),{x:place.x,y:place.y});assert.equal(new Set(PLACES.map(p=>p.id)).size,3);
 assert(PLACES.every(p=>p.reward.coins===20&&p.reward.xp===10&&!('latitude' in p)));
});
