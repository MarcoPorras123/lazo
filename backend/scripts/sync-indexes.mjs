import {readFileSync,writeFileSync} from 'node:fs';
const doc=readFileSync('docs/data-model.md','utf8');
const indexes=doc.split('\n').filter(l=>/^\| I\d+ \|/.test(l)).map(l=>{const p=l.split('|').map(x=>x.trim());return{collectionGroup:p[2],queryScope:'COLLECTION',fields:p[3].replaceAll('`','').split(', ').map(f=>{const [fieldPath,order]=f.split(' ');return order==='ARRAY_CONTAINS'?{fieldPath,arrayConfig:'CONTAINS'}:{fieldPath,order:order==='ASC'?'ASCENDING':'DESCENDING'}})}});
const fieldOverrides=[['outbox','payload'],['auditLogs','before'],['auditLogs','after'],['idempotencyKeys','response'],['providerEvents','payload'],['idempotencyKeys','expiresAt'],['processedEvents','expiresAt']].map(([collectionGroup,fieldPath])=>({collectionGroup,fieldPath,indexes:[]}));
writeFileSync('backend/firestore/firestore.indexes.json',JSON.stringify({indexes,fieldOverrides},null,2)+'\n');
console.log(indexes.length+' indexes written');
