-- Readable course URLs: /home/claude-code-basics rather than /home/<uuid>.
--
-- The slug is derived from the topic, but it is stored rather than computed on
-- read. A computed slug changes when the topic is renamed, which would break
-- every link anyone had to that course; a stored one is the course's address
-- and stays put.
--
-- Unique per user, not globally. Two people studying "Photosynthesis" should
-- both get /home/photosynthesis, and a global constraint would hand the URL to
-- whoever typed it first and give the second person a numbered suffix for no
-- reason they could see.
alter table public.courses
  add column if not exists slug text;

-- Backfill: lowercase, non-alphanumerics to hyphens, trimmed, de-duplicated
-- per user by appending a counter in creation order.
with slugged as (
  select
    id,
    user_id,
    nullif(
      trim(both '-' from regexp_replace(lower(topic), '[^a-z0-9]+', '-', 'g')),
      ''
    ) as base,
    row_number() over (
      partition by user_id,
        nullif(
          trim(both '-' from regexp_replace(lower(topic), '[^a-z0-9]+', '-', 'g')),
          ''
        )
      order by created_at
    ) as n
  from public.courses
  where slug is null
)
update public.courses as c
set slug = case
  when slugged.base is null then left(c.id::text, 8)
  when slugged.n = 1 then slugged.base
  else slugged.base || '-' || slugged.n
end
from slugged
where c.id = slugged.id;

-- Not null only after the backfill, so an existing row cannot fail the
-- constraint on the way in.
alter table public.courses
  alter column slug set not null;

create unique index if not exists courses_user_slug_idx
  on public.courses (user_id, slug);
