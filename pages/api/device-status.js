export default async function handler(req, res) {
  try {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/device_current_status?select=*&order=last_event_at.desc`,
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    const data = await response.json();
    return res.status(200).json({ devices: data });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}
