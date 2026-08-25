-- ============================================================
-- BOATLY
-- Migration: Foundation Extensions
-- ============================================================
--
-- Purpose:
--   Prepare the PostgreSQL extensions required by the approved
--   Boatly database architecture.
--
-- This migration intentionally creates no application tables.
-- ============================================================

begin;


-- ------------------------------------------------------------
-- Extensions schema
-- ------------------------------------------------------------

create schema if not exists extensions;


-- ------------------------------------------------------------
-- PostGIS
-- ------------------------------------------------------------
--
-- Used for geographic data and spatial queries such as:
-- - operator locations;
-- - pickup locations;
-- - destination search;
-- - distance filtering;
-- - map viewport queries.
--
-- Extension objects are kept outside the public schema.
-- ------------------------------------------------------------

create extension if not exists postgis
with schema extensions;


-- ------------------------------------------------------------
-- btree_gist
-- ------------------------------------------------------------
--
-- Required later by the Boatly availability engine.
--
-- It will allow GiST exclusion constraints that combine:
-- - boat identity;
-- - time ranges.
--
-- This is the database-level foundation for preventing
-- overlapping occupancies / double booking.
-- ------------------------------------------------------------

create extension if not exists btree_gist
with schema extensions;


commit;