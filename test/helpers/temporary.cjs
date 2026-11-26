const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function temporary(test, prefix = "svg-plugin-test-") {
    const parent = path.resolve(os.tmpdir());
    const directory = fs.mkdtempSync(path.join(parent, prefix));
    test.after(() => {
        if (path.dirname(directory) !== parent || !path.basename(directory).startsWith(prefix)) throw new Error("Unexpected temporary target");
        fs.rmSync(directory, { recursive: true, force: true });
    });
    return directory;
}
module.exports = { temporary };
