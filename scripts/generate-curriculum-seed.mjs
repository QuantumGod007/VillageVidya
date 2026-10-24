import { build } from 'vite';
import { writeFile, readFile } from 'node:fs/promises';
const bundle = await build({configFile:false,logLevel:'silent',build:{write:false,minify:false,lib:{entry:'scripts/db/catalog-entry.ts',formats:['es']}}});
const {curriculum:c,validateCatalog}=await import(`data:text/javascript;base64,${Buffer.from((Array.isArray(bundle) ? bundle[0] : bundle).output[0].code).toString('base64')}`);
  const errors = validateCatalog(c); if(errors.length) throw new Error(errors.join('\n'));
  const sqlValue = v => v === null ? 'null' : Array.isArray(v) ? `array[${v.map(sqlValue).join(',')}]::text[]` : typeof v === 'boolean' || typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'","''")}'`;
  const statements = ['-- Generated from the Phase 4 original-practice catalog; do not hand edit.', '-- No identities, real consent or tutor verification are seeded here.','begin;'];
  function insert(table, rows) {
    if(!rows.length) return;
    const cols=Object.keys(rows[0]);
    statements.push(`insert into public.${table} (${cols.join(',')}) values\n${rows.map(row=>`  (${cols.map(k=>sqlValue(row[k])).join(',')})`).join(',\n')}\non conflict do nothing;`);
  }
  insert('academic_boards',c.boards.map(b=>({id:b.id,name:b.name,coverage:b.coverage,is_published:true})));
  insert('academic_grades',c.grades.map(g=>({id:g.id,board_id:g.boardId,number:g.number,is_published:true})));
  insert('academic_subjects',c.subjects.map(s=>({id:s.id,grade_id:s.gradeId,name:s.name,is_published:true})));
  insert('curriculum_sources',c.chapters.filter(ch=>ch.source).map(ch=>({id:`source-${ch.id}`,title:ch.source.title,url:ch.source.url,edition:ch.source.edition,verified_on:ch.source.verifiedOn,is_published:true})));
  insert('chapters',c.chapters.map(ch=>({id:ch.id,subject_id:ch.subjectId,title:ch.title,position:ch.order,kind:ch.kind,source_id:ch.source ? `source-${ch.id}` : null,is_published:true})));
  insert('lessons',c.lessons.map((l,i)=>({id:l.id,chapter_id:l.chapterId,language:l.language,title:l.title,subtitle:l.subtitle,minutes:l.minutes,concept:l.concept,steps:l.steps,example:l.example,keywords:l.keywords,position:i+1,content_origin:'original_practice',is_published:true})));
  insert('assessments',c.assessments.map(a=>({id:a.id,lesson_id:a.lessonId,question:a.question,options:a.options,answer_index:a.answer,explanation:a.explanation,is_published:true})));
  statements.push('commit;',''); const sql=statements.join('\n\n');
  if(process.argv.includes('--check')) {if(await readFile('supabase/seed.sql','utf8')!==sql) throw new Error('Curriculum seed differs. Run npm run db:seed:generate.');}
  else await writeFile('supabase/seed.sql',sql);

