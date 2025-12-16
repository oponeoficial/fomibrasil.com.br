export default async function handler() {
  const response = await fetch(
    "https://mqnrsxyfecsnbyaiopnl.supabase.co/functions/v1/google-places",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action: "bulk_seed" })
    }
  );
  
  return Response.json(await response.json());
}