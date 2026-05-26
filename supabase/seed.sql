insert into public.rooms (room_number, sharing_type, meter_number, status)
values ('204', 4, 'MTR-204', 'active')
on conflict (room_number) do nothing;
