import joplin from 'api';

joplin.plugins.register({
	onStart: async function() {
		// eslint-disable-next-line no-console
		console.info('Hello world. Test plugin started! 42');

		// Create the panel object
		const panel = await joplin.views.panels.create('panel_1');

		// Set some initial content while the TOC is being created
		await joplin.views.panels.setHtml(panel, `
			<div class="container">Loading...</div>
			<div id="root"></div>
		`);

		await joplin.views.panels.addScript(panel, "gui/app.css")
		await joplin.views.panels.addScript(panel, "gui/index.js")


		// ...
	},
});
