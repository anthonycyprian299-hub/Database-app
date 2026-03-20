app.post('/webhook', (req, res) => {
  console.log("BODY RECEIVED:", req.body);
  res.json({ status: "received", body: req.body });
}); 
