-- ============================================================
-- BOATLY
-- Migration: Seed Boat Types for Fleet Management
-- ============================================================

begin;


insert into public.boat_types (
  code,
  name,
  slug,
  description,
  is_active,
  sort_order
)

select
  seed.code,
  seed.name,
  seed.slug,
  seed.description,
  true,
  seed.sort_order

from (
  values

    (
      'MOTORBOAT',
      'Barca a motore',
      'barca-a-motore',
      'Imbarcazione o natante a propulsione principalmente motorizzata.',
      10
    ),

    (
      'RIB',
      'Gommone',
      'gommone',
      'Unità pneumatica o semirigida destinata alla navigazione da diporto.',
      20
    ),

    (
      'SAILBOAT',
      'Barca a vela',
      'barca-a-vela',
      'Unità a vela destinata alla navigazione da diporto.',
      30
    ),

    (
      'CATAMARAN',
      'Catamarano',
      'catamarano',
      'Unità multiscafo con due scafi principali.',
      40
    ),

    (
      'MOTOR_YACHT',
      'Yacht a motore',
      'yacht-a-motore',
      'Yacht a propulsione motorizzata.',
      50
    ),

    (
      'SAILING_YACHT',
      'Yacht a vela',
      'yacht-a-vela',
      'Yacht con propulsione principalmente velica.',
      60
    )

) as seed(
  code,
  name,
  slug,
  description,
  sort_order
)

where not exists (
  select 1

  from public.boat_types bt

  where bt.code = seed.code
     or bt.slug = seed.slug
);


commit;