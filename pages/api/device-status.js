import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const { data, error } = await supabase
    .from('device_current_status')
    .select('*')
    .order('last_event_at', { ascending: false });

  if (error) return res.status(500).json({ error });
  return res.status(200).json({ devices: data });
}
