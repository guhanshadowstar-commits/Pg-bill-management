-- Optional migration helper.
-- Use only if you entered real data before owner-account signup was added.
-- Step 1: Create the owner account from the app login screen first.
-- Step 2: Replace guhan below with that owner account username.
-- Step 3: Run this file in Supabase SQL Editor.

do $$
declare
  target_owner_id text;
begin
  select id::text into target_owner_id
  from public.owner_accounts
  where username = 'guhan';

  if target_owner_id is null then
    raise exception 'Owner username not found. Create the owner account first, then update the username in this SQL file.';
  end if;

  update public.rooms set owner_id = target_owner_id where owner_id = 'owner';
  update public.tenants set owner_id = target_owner_id where owner_id = 'owner';
  update public.occupancy_logs set owner_id = target_owner_id where owner_id = 'owner';
  update public.electricity_bills set owner_id = target_owner_id where owner_id = 'owner';
  update public.bill_splits set owner_id = target_owner_id where owner_id = 'owner';
  update public.payments set owner_id = target_owner_id where owner_id = 'owner';
end $$;
