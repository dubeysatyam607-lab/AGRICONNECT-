-- Real "Mandi Data" stats for the admin console. Reads ONLY synced AGMARKNET
-- records and the real sync log — never fabricated numbers.

create or replace function public.mandi_stats()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'records', (select count(*) from public.mandi_price_records),
    'states', (select count(distinct state) from public.mandi_price_records),
    'districts', (select count(distinct district) from public.mandi_price_records),
    'markets', (select count(distinct market) from public.mandi_price_records),
    'commodities', (select count(distinct commodity) from public.mandi_price_records),
    'latestArrivalDate', (select max(arrival_date)::text from public.mandi_price_records),
    'lastSync', (
      select json_build_object(
        'status', status,
        'records_fetched', records_fetched,
        'records_upserted', records_upserted,
        'error_message', error_message,
        'started_at', started_at,
        'finished_at', finished_at
      )
      from public.mandi_sync_log
      order by started_at desc
      limit 1
    ),
    'syncHistory', (
      select coalesce(json_agg(row_to_json(s) order by s.started_at desc), '[]')
      from (
        select id, status, records_fetched, records_upserted, error_message, started_at, finished_at, duration_ms
        from public.mandi_sync_log
        limit 5
      ) s
    )
  );
$$;

revoke execute on function public.mandi_stats() from public, anon;
grant execute on function public.mandi_stats() to authenticated;