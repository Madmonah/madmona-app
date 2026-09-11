-- 📨 (١١/٩/٢٠٢٦) قناة تليجرام @madmona_cairo بقت منصة نشر للريلز — قيد campaign_posts.platform كان بيرفض 'telegram'
alter table public.campaign_posts drop constraint if exists campaign_posts_platform_check;
alter table public.campaign_posts add constraint campaign_posts_platform_check
  check (platform = any (array['instagram','tiktok','facebook','youtube','threads','linkedin','x','whatsapp','telegram','other']));
