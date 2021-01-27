const createViewModel = require("./video-page-vm").createViewModel;

// function onNavigatingTo(args) {
//   const page = args.object;
//   const locationBox = page.getViewById("locationBox");

//   const mainViewModel = createViewModel({ locationBox });
//   page.bindingContext = mainViewModel;
// }

function onPageLoaded(args) {
  const page = args.object;
  const locationBox = page.getViewById("locationBox");
  const scrollView = page.getViewById("scrollView");
  const framesView = page.getViewById("framesView");

  const mainViewModel = createViewModel({ locationBox, scrollView, framesView });
  page.bindingContext = mainViewModel;
}
exports.onPageLoaded = onPageLoaded;

// exports.onNavigatingTo = onNavigatingTo;