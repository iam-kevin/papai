import express from "express";
import * as path from "path";

const expressSvelte = require("express-svelte");
const app = express();
const port = 3000;

// setup svelte
app.use(
	expressSvelte({
		// Support legacy browsers only on production
		legacy: process.env.NODE_ENV !== "development",
		hydratable: true,
		viewsDirname: __dirname + "/../views",
		bundlesDirname: __dirname + "/../build",
		bundlesHost: "/../build",
		bundlesPattern: "[name][extname]",
		env: "development",
	})
);

app.get("/", (req, res) => {
	// @ts-ignore
	res.svelte("index.svelte");
});

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});
