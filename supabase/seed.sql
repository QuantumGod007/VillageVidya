-- Generated from the Phase 4 original-practice catalog; do not hand edit.

-- No identities, real consent or tutor verification are seeded here.

begin;

insert into public.academic_boards (id,name,coverage,is_published) values
  ('cbse','CBSE','Limited NCERT reference sample and original supplementary practice. Not a complete or current-year syllabus.',true),
  ('maharashtra','Maharashtra State Board','No verified curriculum has been added for this board yet.',true)
on conflict do nothing;

insert into public.academic_grades (id,board_id,number,is_published) values
  ('cbse-4','cbse',4,true),
  ('cbse-5','cbse',5,true),
  ('cbse-6','cbse',6,true),
  ('cbse-7','cbse',7,true),
  ('cbse-8','cbse',8,true),
  ('cbse-9','cbse',9,true),
  ('cbse-10','cbse',10,true),
  ('maharashtra-4','maharashtra',4,true),
  ('maharashtra-5','maharashtra',5,true),
  ('maharashtra-6','maharashtra',6,true),
  ('maharashtra-7','maharashtra',7,true),
  ('maharashtra-8','maharashtra',8,true),
  ('maharashtra-9','maharashtra',9,true),
  ('maharashtra-10','maharashtra',10,true)
on conflict do nothing;

insert into public.academic_subjects (id,grade_id,name,is_published) values
  ('cbse-6-mathematics','cbse-6','Mathematics',true),
  ('cbse-8-mathematics','cbse-8','Mathematics',true),
  ('cbse-7-science','cbse-7','Science',true),
  ('cbse-6-english','cbse-6','English',true),
  ('cbse-6-science','cbse-6','Science',true),
  ('cbse-6-social-science','cbse-6','Social Science',true),
  ('cbse-10-mathematics','cbse-10','Mathematics',true)
on conflict do nothing;

insert into public.curriculum_sources (id,title,url,edition,verified_on,is_published) values
  ('source-cbse-8-math-linear-equations','NCERT Mathematics, Class VIII · Chapter 2','https://www.ncert.nic.in/textbook/pdf/hemh102.pdf','Reprint 2024–25','2026-10-22',true),
  ('source-cbse-10-math-real-numbers','NCERT Mathematics, Class X · Chapter 1','https://www.ncert.nic.in/textbook/pdf/jemh1ps.pdf','Reprint 2025–26 · contents, section 1.2','2026-10-22',true)
on conflict do nothing;

insert into public.chapters (id,subject_id,title,position,kind,source_id,is_published) values
  ('supplementary-fractions','cbse-6-mathematics','Supplementary: Fractions',1,'supplementary',null,true),
  ('supplementary-photosynthesis','cbse-7-science','Supplementary: Plant nutrition',2,'supplementary',null,true),
  ('supplementary-tenses','cbse-6-english','Supplementary: Verb tenses',3,'supplementary',null,true),
  ('supplementary-water','cbse-6-science','Supplementary: Water cycle',4,'supplementary',null,true),
  ('supplementary-panchayat','cbse-6-social-science','Supplementary: Local government',5,'supplementary',null,true),
  ('cbse-8-math-linear-equations','cbse-8-mathematics','Linear Equations in One Variable',2,'reference','source-cbse-8-math-linear-equations',true),
  ('cbse-10-math-real-numbers','cbse-10-mathematics','Real Numbers',1,'reference','source-cbse-10-math-real-numbers',true)
on conflict do nothing;

insert into public.lessons (id,chapter_id,language,title,subtitle,minutes,concept,steps,example,keywords,position,content_origin,is_published) values
  ('fractions','supplementary-fractions','English','Fractions, made familiar','A whole new way to see the parts.',8,'A fraction tells us how many equal parts of a whole we have. The denominator names the equal parts. The numerator counts the parts we take.',array['Start with one roti. Divide it into 4 equal pieces. Each piece is one fourth, or 1/4.','Take 3 pieces. You now have 3/4. The 4 names the size of each part; the 3 counts your pieces.','To add fractions with the same denominator, count the pieces: 1/4 + 2/4 = 3/4.','For different denominators, first rename the fractions with equal-sized pieces: 1/2 = 2/4, so 1/2 + 1/4 = 3/4.']::text[],'Two friends share a roti equally. Each gets 1/2. If one friend shares their half equally again, each new piece is 1/4 of the original roti.',array['fraction','roti','half','quarter','denominator','numerator']::text[],1,'original_practice',true),
  ('equations','cbse-8-math-linear-equations','English','Keeping the balance','Your first steps with linear equations.',10,'An equation is like a balanced weighing scale. Whatever you do to one side, you must do to the other.',array['In x + 5 = 12, x is an unknown number.','Subtract 5 from both sides: x + 5 − 5 = 12 − 5.','Simplify both sides: x = 7.','Check by replacing x in the original equation: 7 + 5 = 12. Both sides are equal.']::text[],'A bag of mangoes and 5 loose mangoes weigh the same as 12 loose mangoes. Remove 5 mangoes from both sides. The bag holds 7.',array['equation','algebra','linear','balance','solve','2x']::text[],2,'original_practice',true),
  ('photosynthesis','supplementary-photosynthesis','English','A leaf’s little kitchen','How plants make their own food.',7,'Green plants use light energy to turn carbon dioxide and water into sugars. This process is called photosynthesis. Oxygen is released.',array['Roots absorb water from the soil. It travels to the leaves.','Leaves take in carbon dioxide through tiny openings called stomata.','Chlorophyll, the green pigment, captures sunlight.','Using light energy, the plant makes sugars from water and carbon dioxide and releases oxygen.']::text[],'Think of a leaf as a kitchen. Water and carbon dioxide are ingredients; sunlight supplies energy. The plant makes sugar, its food.',array['photo','plant','leaf','chlorophyll','oxygen','carbon','sunlight']::text[],3,'original_practice',true),
  ('tenses','supplementary-tenses','English','A story in three times','Past, present, and possibilities.',6,'Verb tenses help us understand when an action happens. We can talk about the past, the present, or the future.',array['Simple present describes habits: “I walk to school every day.”','Simple past describes a completed action: “I walked to school yesterday.”','Simple future describes an action yet to happen: “I will walk to school tomorrow.”','Look for time words such as yesterday, every day, and tomorrow to help choose a tense.']::text[],'Every day, Riya waters her plant. Yesterday, she watered it early. Tomorrow, she will water it after breakfast.',array['tense','verb','grammar','past','present','future','english']::text[],4,'original_practice',true),
  ('water','supplementary-water','English','The journey of a raindrop','Round and round the water cycle.',7,'Water moves between land, oceans, and the atmosphere through evaporation, condensation, and precipitation.',array['The Sun heats water. Some liquid water becomes water vapour: evaporation.','As moist air cools, water vapour condenses into tiny droplets, forming clouds.','When droplets grow heavy enough, water falls as rain or other precipitation.','Water collects in rivers, lakes, and oceans. Some soaks into the ground. The cycle continues.']::text[],'A puddle dries after a sunny day. The water has evaporated; it has not disappeared from Earth.',array['water','rain','cloud','evaporation','condensation']::text[],5,'original_practice',true),
  ('panchayat','supplementary-panchayat','English','Your village, your voice','Meet local self-government.',8,'A Gram Sabha brings together adult voters in a village. A Gram Panchayat is an elected local body that works on village needs.',array['The Gram Sabha includes people aged 18 or above who are registered voters in its area.','People elect representatives to the Gram Panchayat.','The Panchayat works on local matters such as water, sanitation, and village roads.','The Gram Sabha can discuss plans and ask questions about the Panchayat’s work.']::text[],'If a village water pump needs repair, residents can raise it in the Gram Sabha and ask the Panchayat about a plan.',array['village','panchayat','sabha','civics','government']::text[],6,'original_practice',true),
  ('prime-factors','cbse-10-math-real-numbers','English','The building blocks of a number','Prime factorisation and why it is unique.',8,'Every composite number can be written as a product of prime numbers. The prime factors are unique, apart from their order. This is the Fundamental Theorem of Arithmetic.',array['Start with 60. It is even, so 60 = 2 × 30.','Split 30 into 2 × 15, then split 15 into 3 × 5.','Now every factor is prime: 60 = 2 × 2 × 3 × 5 = 2² × 3 × 5.','Starting with 60 = 6 × 10 leads to the same prime factors. Only their order changes.']::text[],'A factor tree can branch in different ways. Like taking different routes to a village, each route ends at the same set of prime building blocks.',array['prime','factor','arithmetic','real number']::text[],7,'original_practice',true),
  ('hcf-lcm','cbse-10-math-real-numbers','English','Finding common ground','Use prime factors to find HCF and LCM.',9,'The HCF uses the smallest powers of the prime factors shared by two positive integers. The LCM uses the largest powers of every prime factor present.',array['Write 12 = 2² × 3 and 18 = 2 × 3².','For the HCF, take the smaller shared powers: 2 × 3 = 6.','For the LCM, take the larger powers: 2² × 3² = 36.','Check: for two positive integers, HCF × LCM = the product of the integers. Here 6 × 36 = 12 × 18 = 216.']::text[],'To divide 12 pencils and 18 erasers into the greatest number of identical sets without leftovers, make 6 sets. Each has 2 pencils and 3 erasers.',array['hcf','lcm','common','multiple']::text[],8,'original_practice',true)
on conflict do nothing;

insert into public.assessments (id,lesson_id,question,options,answer_index,explanation,is_published) values
  ('fractions-checkpoint','fractions','You have 1/2 of a roti and receive another 1/4. How much do you have?',array['2/6 of a roti','3/4 of a roti','1/8 of a roti']::text[],1,'1/2 is the same as 2/4. Add 2/4 and 1/4 to get 3/4. We count equal-sized parts, so the denominator stays 4.',true),
  ('equations-checkpoint','equations','What is x if 2x = 14?',array['7','12','28']::text[],0,'Divide both sides by 2. That gives x = 7. Check: 2 × 7 = 14.',true),
  ('photosynthesis-checkpoint','photosynthesis','Which gas do plants take in for photosynthesis?',array['Oxygen','Nitrogen','Carbon dioxide']::text[],2,'Plants use carbon dioxide and water to make sugars using light energy. Oxygen is a product of this process.',true),
  ('tenses-checkpoint','tenses','Which sentence describes a completed action?',array['I play cricket every day.','I played cricket yesterday.','I will play cricket tomorrow.']::text[],1,'“Played” is in the simple past. “Yesterday” tells us that the action is completed.',true),
  ('water-checkpoint','water','What do we call water vapour cooling into liquid droplets?',array['Evaporation','Condensation','Precipitation']::text[],1,'Condensation changes water vapour into liquid water, like droplets on the outside of a cold glass.',true),
  ('panchayat-checkpoint','panchayat','Who can participate as a member of the Gram Sabha?',array['Only elected representatives','All registered adult voters in its area','Only school teachers']::text[],1,'The Gram Sabha includes all registered adult voters in the area, giving residents a voice in local decisions.',true),
  ('prime-factors-checkpoint','prime-factors','Which is the prime factorisation of 84?',array['2 × 6 × 7','2² × 3 × 7','2 × 3² × 7']::text[],1,'84 = 2 × 42 = 2 × 2 × 21 = 2² × 3 × 7. Every factor in the final product is prime.',true),
  ('hcf-lcm-checkpoint','hcf-lcm','What are the HCF and LCM of 8 and 12?',array['2 and 48','4 and 24','4 and 96']::text[],1,'8 = 2³ and 12 = 2² × 3. HCF = 2² = 4; LCM = 2³ × 3 = 24. Their product is 96, the same as 8 × 12.',true)
on conflict do nothing;

commit;

