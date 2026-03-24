const express = require('express');
const app = express();

const PORT = 3000;

const BRANCH = process.env.BRANCH || "unknown";

app.get('/', (req, res) => {
    res.send(`🔥 Running from branch: ${BRANCH}`);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});