
const createViewModel = require("./controllers-view-model").createViewModel;

export function pageLoaded(args) {
    const page = args.object;
    // const backButton = page.getViewById("backButton");
    // const forwardButton = page.getViewById("forwardButton");

    page.bindingContext = createViewModel({
      onForward: page.onForward,
      // onForward:()=> console.log("works?"),
      onBack: page.onBack,
      skipInterval: page.skipInterval,
      killPlayer: page.killPlayer
      // backButton: backButton,
      // forwardButton: forwardButton,
      // onClear: page.onClear
    });
}