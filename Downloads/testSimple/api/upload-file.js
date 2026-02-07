export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileName, fileContentBase64 } = req.body;

    const response = await fetch(
      "https://dbc-1b7ba151-05e9.cloud.databricks.com/api/2.0/dbfs/put",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DATABRICKS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: `/FileStore/uploads/${fileName}`,
          contents: fileContentBase64,
          overwrite: true,
        }),
      }
    );

    const data = await response.json();
    res.status(200).json({ success: true, databricks: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
