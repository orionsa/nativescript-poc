const createViewModel = require("./video-page-vm").createViewModel;

function onPageLoaded(args) {
  const page = args.object;
  const locationBox = page.getViewById("locationBox");
  const scrollView = page.getViewById("scrollView");
  const framesView = page.getViewById("framesView");
  const firstVideo = page.getViewById("videoPlayer");
  const secondVideo = page.getViewById("secondVideoPlayer");

  const mainViewModel = createViewModel({ locationBox, scrollView, firstVideo, framesView, secondVideo });
  page.bindingContext = mainViewModel;
}
exports.onPageLoaded = onPageLoaded;