-- One-time migration helper.
-- Creates "Bed 1".."Bed N" rows (N = rooms.sharing_type) for every existing room,
-- then links currently-active occupancy_logs (check_out is null, bed_id is null)
-- to those beds in check-in order (oldest first), one tenant per bed.
-- Run this file once in the Supabase SQL Editor after applying schema.sql.

do $$
declare
  room_row record;
  log_row record;
  new_bed_label text;
  matched_bed_id uuid;
  seat_number int;
  position_counter int;
begin
  for room_row in select id, owner_id, sharing_type from public.rooms loop
    for seat_number in 1..room_row.sharing_type loop
      new_bed_label := 'Bed ' || seat_number;

      if not exists (
        select 1 from public.beds
        where room_id = room_row.id and bed_label = new_bed_label
      ) then
        insert into public.beds (owner_id, room_id, bed_label, status)
        values (room_row.owner_id, room_row.id, new_bed_label, 'vacant');
      end if;
    end loop;
  end loop;

  for room_row in select id, owner_id from public.rooms loop
    position_counter := 0;

    for log_row in
      select id, tenant_id, check_in
      from public.occupancy_logs
      where room_id = room_row.id
        and check_out is null
        and bed_id is null
      order by check_in asc
    loop
      select id into matched_bed_id
      from public.beds
      where room_id = room_row.id
        and bed_label = 'Bed ' || (position_counter + 1)
      limit 1;

      if matched_bed_id is null then
        exit;
      end if;

      update public.occupancy_logs
      set bed_id = matched_bed_id
      where id = log_row.id;

      update public.beds
      set status = 'occupied'
      where id = matched_bed_id;

      position_counter := position_counter + 1;
    end loop;
  end loop;
end $$;
