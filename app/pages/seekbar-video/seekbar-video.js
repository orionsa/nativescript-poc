const createViewModel = require("./seekbar-video-vm").createViewModel;

function onNavigatingTo(args) {
    const page = args.object;
    const slider = page.getViewById("slider");

    const mainViewModel = createViewModel({ slider });
    page.bindingContext = mainViewModel;
}
exports.onNavigatingTo = onNavigatingTo;
