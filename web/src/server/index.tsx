import { Hono } from "hono";
import { renderer } from "./renderer";

const app = new Hono();

app.get("/api/slide-info", async (c) => {
	const url = c.req.query("url");
	if (!url) {
		return c.json({ error: "URL parameter is required" }, 400);
	}

	try {
		const response = await fetch(
			`https://script.google.com/macros/s/AKfycbzn93mgAasyQMF1URQ_fJooXBXNbRIKCvnH3HXExBpMfTo2e_XTrNOlrJw557uJgUvG/exec?url=${encodeURIComponent(url)}`,
		);
		const data = (await response.json()) as Record<string, unknown>;
		return c.json(data);
	} catch (error) {
		return c.json({ error: "Failed to fetch data" }, 500);
	}
});

app.get("/api/screenshot", async (c) => {
	const accountID = c.req.header("X-Account-ID");
	const apiToken = c.req.header("X-API-Token");

	if (!accountID || !apiToken) {
		return c.json({ error: "Authentication headers are required" }, 401);
	}

	const url = c.req.query("url");
	if (!url) {
		return c.json({ error: "URL parameter is required" }, 400);
	}
	const name = c.req.query("name") || "screenshot";

	try {
		const response = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${accountID}/browser-rendering/screenshot`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					url,
					viewport: {
						width: 1280,
						height: 720,
					},
					gotoOptions: {
						waitUntil: "networkidle0",
						timeout: 45000,
					},
				}),
			},
		);

		if (!response.ok) {
			throw new Error("Failed to fetch screenshot");
		}

		const buffer = await response.arrayBuffer();
		return new Response(buffer, {
			headers: {
				"Content-Type": "image/png",
				"Content-Disposition": `attachment; filename="${name}.png"`,
			},
		});
	} catch (error) {
		return c.json({ error: "Failed to fetch screenshot" }, 500);
	}
});

app.use(renderer);

app.get("/", (c) => {
	return c.render(<div id="root" />);
});

export default app;
